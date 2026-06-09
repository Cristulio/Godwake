import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSpriteFloat, isBatchedMultiattack, type FloatSelf } from './FloatingDamage';
import type { AttackEvent, MonsterCombatant } from '../../types/combat';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../../engine/combat/createCombat';
import { playerAttack } from '../../engine/combat/attack';
import { createDiceRoller } from '../../engine/dice';
import { getMonster } from '../../content/monsters';

function playerHit(over: Partial<AttackEvent> = {}): AttackEvent {
  return {
    id: 1,
    attackerName: 'Brick',
    targetName: 'Goblin',
    attackerKind: 'player',
    weaponName: 'Longsword',
    attackBonus: 5,
    natural: 14,
    total: 19,
    targetAC: 13,
    hit: true,
    crit: false,
    damageDealt: 8,
    ...over,
  };
}

const goblin: FloatSelf = { kind: 'monster', displayName: 'Goblin' };

describe('resolveSpriteFloat', () => {
  it('shows the true rolled damage on a fresh landing hit, ignoring tiny HP delta (the "1-damage" bug)', () => {
    // A crit deals 18 but the goblin only had 1 HP left — the clamped HP delta
    // is 1. The float must read the event's damageDealt, not the delta.
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 7, crit: true, damageDealt: 18 }),
      self: goblin,
      hpDelta: 1,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 18, kind: 'crit' });
  });

  it('shows the full number on a non-crit overkill (delta clamped below damage)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 3, damageDealt: 12 }),
      self: goblin,
      hpDelta: 4,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 12, kind: 'damage' });
  });

  it('surfaces the hit even when temp HP soaks the whole blow (no HP delta)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 4, damageDealt: 9 }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 9, kind: 'damage' });
  });

  it('damageDealt already folds in off-type/affix bonuses — whatever it is, that is what shows', () => {
    // weapon-type 6 + 2 radiant off-type = 8 baked into damageDealt.
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 5, damageDealt: 8 }),
      self: goblin,
      hpDelta: 8,
      isNewAttack: true,
    });
    expect(float?.amount).toBe(8);
  });

  it('falls back to the HP delta for non-attack damage (stale event, e.g. a poison tick)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 7, damageDealt: 18, crit: true }),
      self: goblin,
      hpDelta: 2,
      isNewAttack: false, // same id already processed — this drop is a tick
    });
    expect(float).toEqual({ amount: 2, kind: 'damage' });
  });

  it('does not steal another monster\'s hit (target name mismatch)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 8, targetName: 'Orc', damageDealt: 10 }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toBeNull();
  });

  it('floats heals on HP gain', () => {
    const float = resolveSpriteFloat({
      lastAttack: undefined,
      self: { kind: 'player' },
      hpDelta: -6,
      isNewAttack: false,
    });
    expect(float).toEqual({ amount: 6, kind: 'heal' });
  });

  it('a player-target sprite reads monster attacks, not the player\'s own swings', () => {
    const self: FloatSelf = { kind: 'player' };
    // Player swinging at a goblin must not float on the player sprite.
    expect(
      resolveSpriteFloat({ lastAttack: playerHit({ id: 9, damageDealt: 8 }), self, hpDelta: 0, isNewAttack: true }),
    ).toBeNull();
    // A monster's blow on the player does.
    const incoming = playerHit({ id: 10, attackerKind: 'monster', attackerName: 'Goblin', targetName: 'Brick', damageDealt: 5 });
    expect(
      resolveSpriteFloat({ lastAttack: incoming, self, hpDelta: 5, isNewAttack: true }),
    ).toEqual({ amount: 5, kind: 'damage' });
  });

  it('a missed attack with no HP change floats nothing', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 11, hit: false, damageDealt: undefined }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toBeNull();
  });
});

function monsterHit(over: Partial<AttackEvent> = {}): AttackEvent {
  return {
    id: 1,
    attackerName: 'Goblin',
    targetName: 'Brick',
    attackerKind: 'monster',
    weaponName: 'Scimitar',
    attackBonus: 4,
    natural: 12,
    total: 16,
    targetAC: 15,
    hit: true,
    crit: false,
    damageDealt: 6,
    ...over,
  };
}

describe('isBatchedMultiattack — when the main float effect must defer to the batch effect', () => {
  const player: FloatSelf = { kind: 'player' };

  it('a real monster multiattack on the player IS batched (defer to the per-swing float)', () => {
    const batch = [monsterHit({ id: 20 }), monsterHit({ id: 21 })];
    // lastAttack is the tail of the batch, aimed at the player.
    expect(isBatchedMultiattack(batch, batch[1], player)).toBe(true);
  });

  it('a stale monster batch does NOT capture the player\'s own fresh swing (the reported bug)', () => {
    // attackEvents lingers from the monster's last multiattack (it is only ever
    // reset by the next monsterAttack), but lastAttack is now the player's swing
    // at a monster. The player swing must float its OWN damage, not defer.
    const staleMonsterBatch = [monsterHit({ id: 20 }), monsterHit({ id: 21 })];
    const playerSwing = playerHit({ id: 22, damageDealt: 14 });
    expect(isBatchedMultiattack(staleMonsterBatch, playerSwing, goblin)).toBe(false);
    // And the float resolver then surfaces the player's real damage.
    const float = resolveSpriteFloat({ lastAttack: playerSwing, self: goblin, hpDelta: 14, isNewAttack: true });
    expect(float).toEqual({ amount: 14, kind: 'damage' });
  });

  it('a single-swing batch is not a multiattack', () => {
    const batch = [monsterHit({ id: 20 })];
    expect(isBatchedMultiattack(batch, batch[0], player)).toBe(false);
  });

  it('an empty / absent batch is never batched', () => {
    expect(isBatchedMultiattack([], monsterHit({ id: 20 }), player)).toBe(false);
    expect(isBatchedMultiattack(undefined, monsterHit({ id: 20 }), player)).toBe(false);
  });

  it('a batch aimed at a different sprite does not defer this one', () => {
    // Two swings on the player; the monster sprite must not treat them as its own.
    const batch = [monsterHit({ id: 20 }), monsterHit({ id: 21 })];
    expect(isBatchedMultiattack(batch, batch[1], goblin)).toBe(false);
  });
});

// Integration guard for the reported bug: the float over a struck enemy must
// read the DAMAGE DEALT, never the target's remaining HP. Drives the real
// engine so a regression in playerAttack's `damageDealt` plumbing is caught at
// the same surface the battlefield sprite renders from.
describe('floating number reflects damage dealt, not remaining HP (real attack)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function brick() {
    return {
      ...createCharacter({
        id: 'f1',
        name: 'Brick',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: STANDARD_ARRAY[0],
          con: STANDARD_ARRAY[1],
          dex: STANDARD_ARRAY[2],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
          int: STANDARD_ARRAY[5],
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      inventory: [{ itemId: 'longsword' }],
      equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    };
  }

  it('shows the rolled damage over a high-HP foe, not its leftover HP', () => {
    const init = createCombat({
      roller: createDiceRoller(5),
      character: brick(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = init.state.combatants.find(
      (c): c is MonsterCombatant => c.kind === 'monster',
    )!;
    // Fat HP pool + soft guard: the hit lands but leaves plenty of HP, so a
    // "remaining HP" bug would surface a large wrong number.
    goblin.instance.ac = 2;
    goblin.instance.hp = { ...goblin.instance.hp, current: 200, max: 200 };

    const before = goblin.instance.hp.current;
    const { state } = playerAttack(
      { roller: createDiceRoller(5), character: init.character, state: init.state },
      goblin.id,
      'longsword',
    );
    const attack = state.lastAttack!;
    const struck = state.combatants.find(
      (c): c is MonsterCombatant => c.kind === 'monster' && c.id === goblin.id,
    )!;
    const remaining = struck.instance.hp.current;
    const dealt = before - remaining;

    expect(attack.hit).toBe(true);
    expect(attack.damageDealt).toBe(dealt);

    const float = resolveSpriteFloat({
      lastAttack: attack,
      self: { kind: 'monster', displayName: goblin.instance.displayName },
      hpDelta: dealt,
      isNewAttack: true,
    });
    expect(float?.amount).toBe(dealt);
    expect(float?.amount).not.toBe(remaining);
  });

  it('shows the full crit damage even when it overkills (HP clamps, number does not)', () => {
    let attack: AttackEvent | undefined;
    // Roll until we land a crit (nat 20 widens via critRange) on a 1-HP goblin —
    // the HP delta clamps to 1, but the float must show the full rolled damage.
    for (let seed = 1; seed < 80; seed++) {
      const c = createCombat({
        roller: createDiceRoller(seed),
        character: brick(),
        monsters: [{ def: getMonster('goblin') }],
      });
      const g = c.state.combatants.find(
        (m): m is MonsterCombatant => m.kind === 'monster',
      )!;
      g.instance.ac = 2;
      g.instance.hp = { ...g.instance.hp, current: 1, max: 1 };
      const { state } = playerAttack(
        { roller: createDiceRoller(seed), character: c.character, state: c.state },
        g.id,
        'longsword',
      );
      if (state.lastAttack?.crit) {
        attack = state.lastAttack;
        break;
      }
    }
    expect(attack).toBeDefined();
    // The overkill: damageDealt is well above the 1 HP the goblin had.
    expect(attack!.damageDealt!).toBeGreaterThan(1);
    const float = resolveSpriteFloat({
      lastAttack: attack!,
      self: { kind: 'monster', displayName: 'Goblin' },
      hpDelta: 1, // clamped HP delta
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: attack!.damageDealt, kind: 'crit' });
  });
});
