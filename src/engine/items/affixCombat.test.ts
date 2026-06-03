import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../combat/createCombat';
import { playerAttack } from '../combat/attack';
import { endTurn } from '../combat/turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { ItemRef } from '../../schemas/item';

function strFighter(): Character {
  return createCharacter({
    id: 'f',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0], // 15 → +1 = 16 → +3
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: [],
  });
}

function rolledWeapon(affixes: string[]): ItemRef {
  return {
    itemId: 'longsword',
    rolled: { baseId: 'longsword', rarity: 'blue', affixes, name: 'Test Blade' },
  };
}

function enhancedWeapon(enhancement: number): ItemRef {
  return {
    itemId: 'longsword',
    rolled: { baseId: 'longsword', rarity: 'blue', affixes: [], enhancement, name: `+${enhancement} Test Blade` },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** Pre-clamp damage total from the combat-log damage headline, or null on a miss. */
function damageTotal(state: CombatState): number | null {
  const line = state.log.find((l) => l.kind === 'damage');
  if (!line) return null;
  const m = line.text.match(/Damage:\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Run a single attack with the given equipped weapon ref + seed; return result. */
function attackOnce(weapon: ItemRef, seed: string) {
  _resetMonsterInstanceCounter();
  const roller = createDiceRoller(seed);
  const character: Character = {
    ...strFighter(),
    equipped: { mainHand: weapon, offHand: null, armor: null },
  };
  const combat = createCombat({ roller, character, monsters: [{ def: getMonster('goblin') }] });
  const target = findMonster(combat.state);
  const res = playerAttack(
    { roller, character: combat.character, state: combat.state },
    target.id,
    'longsword',
  );
  return res;
}

describe('weapon affixes in playerAttack', () => {
  it('a Cruel affix deals exactly +2 damage on a hit', () => {
    // Find a seed where the plain longsword lands a hit (a damage line appears).
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      if (damageTotal(attackOnce({ itemId: 'longsword' }, `cruel-${i}`).state) !== null) {
        hitSeed = `cruel-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    const plain = attackOnce({ itemId: 'longsword' }, hitSeed!);
    const cruel = attackOnce(rolledWeapon(['cruel']), hitSeed!);
    // Pre-clamp totals: the same dice + the flat +2 from the affix.
    expect(damageTotal(cruel.state)! - damageTotal(plain.state)!).toBe(2);

    const cruelDamageLine = cruel.state.log.find((l) => l.kind === 'damage');
    expect(cruelDamageLine?.text).toContain('2 gear');
  });

  it('a +N enhancement adds N to damage on a hit (separate from affixes)', () => {
    // A +2 weapon should land more hits than a +0 (the +2 to-hit), so search a
    // seed the PLAIN weapon already hits with — then the only delta is damage.
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      if (damageTotal(attackOnce({ itemId: 'longsword' }, `enh-${i}`).state) !== null) {
        hitSeed = `enh-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    const plain = attackOnce({ itemId: 'longsword' }, hitSeed!);
    const plus2 = attackOnce(enhancedWeapon(2), hitSeed!);
    expect(damageTotal(plus2.state)! - damageTotal(plain.state)!).toBe(2);
    expect(plus2.state.log.find((l) => l.kind === 'damage')?.text).toContain('2 enhancement');
  });

  it('a +3 white out-powers a +0 blue — enhancement is a real power axis (rule 3)', () => {
    // 3 enhancement, 0 affixes vs 0 enhancement, the strongest generic 2-affix
    // blue (Cruel +2 dmg, Honed +1 atk). Same seeds → same dice/initiative, so the
    // only deltas are the +3's accuracy (more hits land) and per-hit damage.
    const white3: ItemRef = {
      itemId: 'longsword',
      rolled: { baseId: 'longsword', rarity: 'white', affixes: [], enhancement: 3, name: '+3 Longsword' },
    };
    const blue0: ItemRef = {
      itemId: 'longsword',
      rolled: { baseId: 'longsword', rarity: 'blue', affixes: ['cruel', 'honed'], enhancement: 0, name: 'Cruel Longsword of —' },
    };
    let whiteTotal = 0;
    let blueTotal = 0;
    let whiteHits = 0;
    let blueHits = 0;
    for (let i = 0; i < 300; i++) {
      const w = damageTotal(attackOnce(white3, `r3-${i}`).state);
      const b = damageTotal(attackOnce(blue0, `r3-${i}`).state);
      if (w !== null) { whiteTotal += w; whiteHits += 1; }
      if (b !== null) { blueTotal += b; blueHits += 1; }
    }
    // The +3 white wins on BOTH axes: it lands more hits and each hit bites harder.
    expect(whiteHits).toBeGreaterThan(blueHits);
    expect(whiteTotal).toBeGreaterThan(blueTotal);
  });

  it('a Relentless affix adds damage only on a follow-up swing', () => {
    // Find a seed where the longsword lands a hit.
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      if (damageTotal(attackOnce(rolledWeapon(['relentless']), `rel-${i}`).state) !== null) {
        hitSeed = `rel-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    const runAt = (attacksThisTurn: number) => {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(hitSeed!);
      const character: Character = {
        ...strFighter(),
        equipped: { mainHand: rolledWeapon(['relentless']), offHand: null, armor: null },
      };
      const combat = createCombat({ roller, character, monsters: [{ def: getMonster('goblin') }] });
      const target = findMonster(combat.state);
      return playerAttack(
        { roller, character: combat.character, state: { ...combat.state, playerAttacksThisTurn: attacksThisTurn } },
        target.id,
        'longsword',
      );
    };

    const firstSwing = runAt(0);
    const followUp = runAt(1);
    // Same seed → same dice; the only difference is the +3 follow-up bonus.
    expect(damageTotal(followUp.state)! - damageTotal(firstSwing.state)!).toBe(3);
    expect(firstSwing.state.log.find((l) => l.kind === 'damage')?.text).not.toContain('Relentless');
    expect(followUp.state.log.find((l) => l.kind === 'damage')?.text).toContain('3 Relentless');
  });

  it('a Mending affix sets regen stacks on hit and decrements them on player turn', () => {
    // Find a seed where the longsword hits AND the goblin survives (so combat stays active).
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      const plain = attackOnce({ itemId: 'longsword' }, `mend-${i}`);
      const goblin = findMonster(plain.state);
      if (goblin.instance.hp.current > 0 && goblin.instance.hp.current < goblin.instance.hp.max) {
        hitSeed = `mend-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(hitSeed!);
    const wounded: Character = {
      ...strFighter(),
      hp: { current: 5, max: 30, temp: 0 },
      equipped: { mainHand: rolledWeapon(['mending']), offHand: null, armor: null },
    };
    const combat = createCombat({ roller, character: wounded, monsters: [{ def: getMonster('goblin') }] });
    const target = findMonster(combat.state);
    const afterAttack = playerAttack(
      { roller, character: combat.character, state: combat.state },
      target.id,
      'longsword',
    );
    // Regen stacks should be 3 after a hit.
    expect(afterAttack.state.playerRegenStacks).toBe(3);

    // endTurn once → monster's turn (regen should NOT tick, stacks stay 3).
    const monsterTurn = endTurn(afterAttack.state, afterAttack.character);
    expect(monsterTurn.state.playerRegenStacks).toBe(3);

    // endTurn again → back to player's turn (regen DOES tick: stacks go to 2,
    // log contains 'mend', and HP increases).
    const playerTurn = endTurn(monsterTurn.state, monsterTurn.character);
    expect(playerTurn.state.playerRegenStacks).toBe(2);
    expect(playerTurn.state.log.some((l) => l.text.includes('mend'))).toBe(true);
    expect(playerTurn.character.hp.current).toBeGreaterThan(afterAttack.character.hp.current);
  });

  it('a Bloodletting affix applies a bleed DOT — target loses HP over turns', () => {
    // Need a hit where the goblin survives (so combat stays active for endTurn).
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      const res = attackOnce(rolledWeapon(['bloodletting']), `bleed-${i}`);
      const goblin = findMonster(res.state);
      if (goblin.instance.hp.current > 0 && (goblin.instance.bleedTurnsRemaining ?? 0) > 0) {
        hitSeed = `bleed-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(hitSeed!);
    const character: Character = {
      ...strFighter(),
      equipped: { mainHand: rolledWeapon(['bloodletting']), offHand: null, armor: null },
    };
    const combat = createCombat({ roller, character, monsters: [{ def: getMonster('goblin') }] });
    const target = findMonster(combat.state);
    const afterAttack = playerAttack(
      { roller, character: combat.character, state: combat.state },
      target.id,
      'longsword',
    );
    const goblinAfterAttack = findMonster(afterAttack.state);
    expect(goblinAfterAttack.instance.bleedTurnsRemaining).toBe(3);
    const hpAfterAttack = goblinAfterAttack.instance.hp.current;

    // endTurn once → monster's turn (no bleed tick yet).
    // endTurn again → back to player's turn (bleed ticks at start).
    const monsterTurn = endTurn(afterAttack.state, afterAttack.character);
    const playerTurn = endTurn(monsterTurn.state, monsterTurn.character);
    // Bleed ticked: goblin took 2 damage (or died, in which case status is victory).
    const goblinAfterTick = findMonster(playerTurn.state);
    expect(goblinAfterTick.instance.hp.current).toBeLessThan(hpAfterAttack);
    expect(playerTurn.state.log.some((l) => l.text.includes('bleeds'))).toBe(true);
  });
});
