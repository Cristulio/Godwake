import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { computeAC } from '../character/derived';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack } from './attack/monsterAttack';
import { tryShieldReaction } from './spells/shield';
import { wizardSpellSlotsForLevel } from '../character/actions';
import { createDiceRoller, parseDiceExpression } from '../dice';
import type { DiceRoller } from '../dice';
import type { RollResult } from '../../types/dice';
import { getMonster as getDef } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

/**
 * Scripted d20-face queue (damage dice fall back to per-die averages, which
 * for the Blood-Fiend's 2d12 is a steady [6,6] = 12). Mirrors the Power Word
 * Kill suite's roller.
 */
function makeScriptedRoller(d20Faces: number[]): DiceRoller {
  let di = 0;
  const face = () => (di < d20Faces.length ? d20Faces[di++] : 10);
  return {
    d20(advantage = 'normal', modifier = 0): RollResult {
      const first = face();
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [first],
        modifier,
        total: first + modifier,
        natural20: first === 20,
        natural1: first === 1,
        advantage,
      };
    },
    roll(expression, advantage = 'normal'): RollResult {
      const expr =
        typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      const dice = Array.from({ length: expr.count }, () => Math.max(1, Math.floor(expr.die / 2)));
      const sum = dice.reduce((a, b) => a + b, 0);
      return {
        expression: expr,
        rolls: dice,
        modifier: expr.modifier,
        total: sum + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

/** A tough, unarmoured human fighter whose raw AC is pinned exactly at `rawAc`
 *  via the permanent-bonus seam, with an HP pool deep enough to absorb every
 *  scripted swing un-floored. */
function makeWall(rawAc: number): Character {
  const base = createCharacter({
    id: 'wall',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    skillProficiencies: ['athletics', 'perception'],
  });
  const withGear: Character = {
    ...base,
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    hp: { current: 500, max: 500, temp: 0 },
  };
  const delta = rawAc - computeAC(withGear);
  return {
    ...withGear,
    permanentBonuses: { ...(withGear.permanentBonuses ?? {}), ac: delta },
  };
}

function firstMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster')!;
}

/** Spawn the Blood-Fiend (single attack: +14, 2d12+9 necrotic, lifeDrain 0.5)
 *  against the wall. `rank` drives the elite/boss stamp via createCombat. */
function spawnFiendFight(
  character: Character,
  rank: 'elite' | 'boss' | 'none',
): { state: CombatState; character: Character; fiendId: string } {
  const init = createCombat({
    roller: createDiceRoller(1),
    character,
    monsters: [{ def: getDef('blood-fiend') }],
    isElite: rank === 'elite',
    isBoss: rank === 'boss',
  });
  return { state: init.state, character: init.character, fiendId: firstMonster(init.state).id };
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

// Blood-Fiend: attackBonus +14, damage 2d12+9 (scripted dice land [6,6] → raw
// blow 21). Against raw AC 34 the effective AC is 28, so a d20 face of:
//   14 → total 28 = full hit (21), 13 → 27 = graze, 12 → 26 = graze,
//   11 → 25 = clean miss. Graze = max(1, floor(21 × 0.5)) = 10.
const FULL_BLOW = 21;
const GRAZE_CHIP = 10;

describe('effective AC at monster-attack resolution', () => {
  it('rolls against the compressed value and logs it (raw 34 resolves — and prints — as 28)', () => {
    const hero = makeWall(34);
    const fight = spawnFiendFight(hero, 'elite');
    // Face 14 → total 28: a full hit against eff 28 even though raw AC is 34.
    const r = monsterAttack(
      { roller: makeScriptedRoller([14]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.state.lastAttack?.targetAC).toBe(28);
    expect(r.character.hp.max - r.character.hp.current).toBe(FULL_BLOW);
    const rollLine = r.state.log.find((l) => /attacks Brick/.test(l.text));
    expect(rollLine?.text).toContain('vs AC 28');
    expect(rollLine?.text).not.toContain('vs AC 34');
  });

  it('leaves AC at or below 20 exactly as it was (raw 16 resolves as 16)', () => {
    const hero = makeWall(16);
    const fight = spawnFiendFight(hero, 'none');
    // Face 2 → total 16: hits AC 16 on the nose.
    const r = monsterAttack(
      { roller: makeScriptedRoller([2]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.state.lastAttack?.targetAC).toBe(16);
  });
});

describe('graze — elite/boss near-misses chip for half weapon damage', () => {
  it('a miss by 1 against effective AC grazes for half, logged as its own line', () => {
    const hero = makeWall(34);
    const fight = spawnFiendFight(hero, 'elite');
    const r = monsterAttack(
      { roller: makeScriptedRoller([13]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.hit).toBe(false);
    expect(r.state.lastAttack?.graze).toBe(true);
    expect(r.state.lastAttack?.damageDealt).toBe(GRAZE_CHIP);
    expect(r.character.hp.max - r.character.hp.current).toBe(GRAZE_CHIP);
    expect(r.state.log.some((l) => /miss \(graze\)/.test(l.text))).toBe(true);
    expect(r.state.log.some((l) => new RegExp(`Graze: ${GRAZE_CHIP} necrotic`).test(l.text))).toBe(true);
  });

  it('a miss by 2 grazes; a miss by 3 is a clean miss (band pinned at 2)', () => {
    const hero = makeWall(34);
    const grazeFight = spawnFiendFight(hero, 'elite');
    const grazed = monsterAttack(
      { roller: makeScriptedRoller([12]), character: grazeFight.character, state: grazeFight.state },
      grazeFight.fiendId,
    );
    expect(grazed.state.lastAttack?.graze).toBe(true);
    expect(grazed.character.hp.max - grazed.character.hp.current).toBe(GRAZE_CHIP);

    _resetMonsterInstanceCounter();
    const missFight = spawnFiendFight(hero, 'elite');
    const missed = monsterAttack(
      { roller: makeScriptedRoller([11]), character: missFight.character, state: missFight.state },
      missFight.fiendId,
    );
    expect(missed.state.lastAttack?.hit).toBe(false);
    expect(missed.state.lastAttack?.graze).toBeUndefined();
    expect(missed.character.hp.current).toBe(missed.character.hp.max);
  });

  it('boss rank grazes too', () => {
    const hero = makeWall(34);
    const fight = spawnFiendFight(hero, 'boss');
    const r = monsterAttack(
      { roller: makeScriptedRoller([13]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.graze).toBe(true);
    expect(r.character.hp.max - r.character.hp.current).toBe(GRAZE_CHIP);
  });

  it('a rank-and-file attacker never grazes, same roll', () => {
    const hero = makeWall(34);
    const fight = spawnFiendFight(hero, 'none');
    const r = monsterAttack(
      { roller: makeScriptedRoller([13]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.hit).toBe(false);
    expect(r.state.lastAttack?.graze).toBeUndefined();
    expect(r.character.hp.current).toBe(r.character.hp.max);
  });

  it("an add fighting beside a boss never grazes — rank lives on the encounter primary", () => {
    const hero = makeWall(34);
    const init = createCombat({
      roller: createDiceRoller(1),
      character: hero,
      monsters: [{ def: getDef('goblin') }, { def: getDef('blood-fiend') }],
      isBoss: true,
    });
    const fiend = init.state.combatants.find(
      (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.defId === 'blood-fiend',
    )!;
    expect(fiend.instance.rank).toBeUndefined();
    const r = monsterAttack(
      { roller: makeScriptedRoller([13]), character: init.character, state: init.state },
      fiend.id,
    );
    expect(r.state.lastAttack?.graze).toBeUndefined();
    expect(r.character.hp.current).toBe(r.character.hp.max);
  });

  it('a natural 1 in the graze band stays a clean whiff', () => {
    // Raw 16 (eff 16): face 1 → total 15 = miss by 1, inside the band — but a
    // 1 is a 1.
    const hero = makeWall(16);
    const fight = spawnFiendFight(hero, 'elite');
    const r = monsterAttack(
      { roller: makeScriptedRoller([1]), character: fight.character, state: fight.state },
      fight.fiendId,
    );
    expect(r.state.lastAttack?.graze).toBeUndefined();
    expect(r.character.hp.current).toBe(r.character.hp.max);
  });

  it('riders never apply on a graze: the Blood-Fiend does not life-drain its chip', () => {
    const hero = makeWall(34);
    const fight = spawnFiendFight(hero, 'elite');
    // Wound the fiend so any drain would be visible as healing.
    const woundedState: CombatState = {
      ...fight.state,
      combatants: fight.state.combatants.map((c) =>
        c.kind === 'monster' ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 100 } } } : c,
      ),
    };
    const grazed = monsterAttack(
      { roller: makeScriptedRoller([13]), character: fight.character, state: woundedState },
      fight.fiendId,
    );
    expect(grazed.character.hp.max - grazed.character.hp.current).toBe(GRAZE_CHIP);
    expect(firstMonster(grazed.state).instance.hp.current).toBe(100);

    // Control: the same fiend's FULL hit drains half the damage it dealt.
    _resetMonsterInstanceCounter();
    const hitFight = spawnFiendFight(hero, 'elite');
    const hitWounded: CombatState = {
      ...hitFight.state,
      combatants: hitFight.state.combatants.map((c) =>
        c.kind === 'monster' ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 100 } } } : c,
      ),
    };
    const hitR = monsterAttack(
      { roller: makeScriptedRoller([14]), character: hitFight.character, state: hitWounded },
      hitFight.fiendId,
    );
    expect(hitR.character.hp.max - hitR.character.hp.current).toBe(FULL_BLOW);
    expect(firstMonster(hitR.state).instance.hp.current).toBe(100 + Math.floor(FULL_BLOW * 0.5));
  });
});

describe('monotonicity — raising AC never increases damage taken', () => {
  it('the same roll sequence, swept across rising raw AC, deals nonincreasing total damage', () => {
    const faces = [2, 5, 8, 11, 13, 14, 17, 20];
    const totals: number[] = [];
    for (const rawAc of [19, 22, 26, 30, 34, 38]) {
      _resetMonsterInstanceCounter();
      const hero = makeWall(rawAc);
      const fight = spawnFiendFight(hero, 'elite');
      const roller = makeScriptedRoller(faces);
      let state = fight.state;
      let character = fight.character;
      for (let i = 0; i < faces.length; i++) {
        const r = monsterAttack({ roller, character, state }, fight.fiendId);
        state = r.state;
        character = r.character;
      }
      totals.push(character.hp.max - character.hp.current);
    }
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i], `AC step ${i}: ${totals.join(' → ')}`).toBeLessThanOrEqual(totals[i - 1]);
    }
    // The sweep crosses real regimes: the lowest AC takes real hits, the
    // highest takes strictly less, with grazes carrying the middle.
    expect(totals[0]).toBeGreaterThan(totals[totals.length - 1]);
  });
});

describe('Shield reaction under the softcap', () => {
  function makeShieldWizard(rawAc: number): Character {
    const base = createCharacter({
      id: 'w1',
      name: 'Veyra',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: { str: 8, dex: 14, con: 12, int: 15, wis: 10, cha: 13 },
      skillProficiencies: ['arcana', 'history'],
    });
    const withHp: Character = {
      ...base,
      // At/below half HP so the clutch-only gate opens.
      hp: { current: 4, max: 10, temp: 0 },
      resources: {
        ...base.resources,
        spellSlots: wizardSpellSlotsForLevel(3),
        knownSpells: [...(base.resources.knownSpells ?? []), 'shield'],
      },
    };
    const delta = rawAc - computeAC(withHp);
    return { ...withHp, permanentBonuses: { ...(withHp.permanentBonuses ?? {}), ac: delta } };
  }

  it('checks the +5 against the COMPRESSED shielded AC, not effective+5', () => {
    const wizard = makeShieldWizard(20);
    const fight = spawnFiendFight(wizard, 'none');
    // Raw 20 + 5 = 25 → effective 24. A 24 still hits the shielded guard:
    // Shield must NOT fire (the slot would be wasted).
    expect(tryShieldReaction(wizard, fight.state, 20, 24)).toBeNull();
    // A 23 would be turned — it fires, and the log names the honest 20 → 24.
    const fired = tryShieldReaction(wizard, fight.state, 20, 23);
    expect(fired).not.toBeNull();
    expect(fired!.state.log.at(-1)?.text).toContain('24');
  });

  it('below the softcap nothing changes (raw 13: fires under 18, never at 18)', () => {
    const wizard = makeShieldWizard(13);
    const fight = spawnFiendFight(wizard, 'none');
    expect(tryShieldReaction(wizard, fight.state, 13, 18)).toBeNull();
    expect(tryShieldReaction(wizard, fight.state, 13, 17)).not.toBeNull();
  });
});
