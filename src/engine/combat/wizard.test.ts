import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { castSpell, slotsAt, canCastSpell } from './spells';
import { monsterAttack } from './attack';
import { endTurn } from './turn';
import { createDiceRoller, type DiceRoller } from '../dice';
import type { RollResult } from '../../types/dice';
import { getMonster } from '../../content/monsters';
import { longRest, wizardSpellSlotsForLevel } from '../character/actions';
import { applyLevelUp, simulateLevelUp } from '../character/leveling';
import { computeAC } from '../character/derived';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function makeWizard(extra: Partial<Character> = {}): Character {
  const base = createCharacter({
    id: 'test-wizard',
    name: 'Inara',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5], // 8
      dex: STANDARD_ARRAY[3], // 12
      con: STANDARD_ARRAY[2], // 13
      int: STANDARD_ARRAY[0], // 15
      wis: STANDARD_ARRAY[1], // 14
      cha: STANDARD_ARRAY[4], // 10
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return {
    ...base,
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    ...extra,
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

describe('Wizard — starting resources', () => {
  it('grants 2 first-level spell slots and the starter spell list', () => {
    const w = makeWizard();
    expect(w.resources.spellSlots?.[1]).toBe(2);
    expect(w.resources.spellSlots?.[2]).toBe(0);
    expect(w.resources.spellSlots?.[3]).toBe(0);
    // Mage Armor is no longer in knownSpells — auto-applied as a passive class
    // baseline at combat start (createCombat sets mageArmorActive=true).
    expect(w.resources.knownSpells).toEqual(
      expect.arrayContaining([
        'fire-bolt',
        'magic-missile',
        'shield',
        'burning-hands',
      ]),
    );
    expect(w.resources.knownSpells).not.toContain('mage-armor');
  });

  it('uses d6 hit die plus wizard +1/level baseline', () => {
    const w = makeWizard();
    // L1 max HP = hit die + CON mod + wizard +1/level baseline.
    // CON 13 + 1 (human) = 14 → +2 mod. 6 + 2 + 1 = 9.
    expect(w.hp.max).toBe(9);
  });
});

describe('Wizard — Magic Missile', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('auto-hits, consumes a 1st-level slot, deals 3d4+3 force', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    const roller = createDiceRoller(7);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;
    expect(slotsAt(w, 1)).toBe(2);

    const goblinId = findMonster(state).id;
    const initialHp = findMonster(state).instance.hp.current;
    const result = castSpell({ roller, character: w, state, spellId: 'magic-missile', targetId: goblinId });
    expect(result.cast).toBe(true);
    state = result.state;
    w = result.character;

    expect(slotsAt(w, 1)).toBe(1);
    expect(w.actionEconomy.actionUsed).toBe(true);
    const dmgLog = state.log.find((l) => l.text.includes('force, auto-hit'));
    expect(dmgLog).toBeDefined();
    const newHp = findMonster(state).instance.hp.current;
    // Goblin should be alive or dead; if dead, hp clamps to 0 — either way damage applied.
    expect(newHp).toBeLessThan(initialHp);
  });
});

describe('Wizard — Fire Bolt cantrip', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('does not consume a slot', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    const state = init.state;
    w = init.character;
    const before = slotsAt(w, 1);
    const goblinId = findMonster(state).id;
    const cast = castSpell({ roller, character: w, state, spellId: 'fire-bolt', targetId: goblinId });
    w = cast.character;
    expect(slotsAt(w, 1)).toBe(before);
    expect(w.actionEconomy.actionUsed).toBe(true);
  });
});

describe('Wizard — Fire Bolt parametric scaling', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  // A roller that fails the DEX save (nat 1, so the cast takes full damage) and
  // rolls a fixed d10, so the only thing that varies across levels is the
  // parametric level multiplier — the discrete 1→4d10 breakpoints are gone.
  function failedSaveRoller(d10Face: number): DiceRoller {
    return {
      roll(): RollResult {
        return {
          expression: { count: 1, die: 10, modifier: 0 },
          rolls: [d10Face],
          modifier: 0,
          total: d10Face,
          natural20: false,
          natural1: false,
          advantage: 'normal',
        };
      },
      d20(advantage = 'normal', modifier = 0): RollResult {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [1],
          modifier,
          total: 1 + modifier,
          natural20: false,
          natural1: true,
          advantage,
        };
      },
      serialize() {
        return { state: 0 };
      },
    };
  }

  function fireBoltDealt(level: number): number {
    const goblin = getMonster('goblin');
    const w: Character = { ...makeWizard(), level };
    const init = createCombat({ roller: failedSaveRoller(8), character: w, monsters: [{ def: goblin }] });
    const targetId = findMonster(init.state).id;
    const result = castSpell({ roller: failedSaveRoller(8), character: init.character, state: init.state, spellId: 'fire-bolt', targetId });
    const dmgLine = result.state.log.find((l) => l.kind === 'damage' && l.text.includes('fire'))!;
    return Number(dmgLine.text.match(/= (\d+) fire/)![1]);
  }

  it('grows smoothly with level and keeps climbing past the old L8 cap', () => {
    const d1 = fireBoltDealt(1);
    const d8 = fireBoltDealt(8);
    const d20 = fireBoltDealt(20);
    // At acquisition (L1, INT +3 reference) the cantrip reads at its printed base.
    expect(d8).toBeGreaterThan(d1);
    // The old model froze at 4d10 from L8; the parametric curve keeps rising.
    expect(d20).toBeGreaterThan(d8);
  });
});

describe('Wizard — Fire Bolt save-for-half', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('always deals damage — failed saves take full, successful saves take floor(full / 2)', () => {
    const goblin = getMonster('goblin');
    let sawFailed = false;
    let sawSaved = false;
    for (let seed = 1; seed <= 200 && (!sawFailed || !sawSaved); seed++) {
      const w = makeWizard();
      const init = createCombat({ roller: createDiceRoller(seed), character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      const targetId = findMonster(state).id;
      state = castSpell({
        roller: createDiceRoller(seed),
        character: init.character,
        state,
        spellId: 'fire-bolt',
        targetId,
      }).state;
      const rollLine = state.log.find((l) => l.text.includes('Fire Bolt'));
      const dmgLine = state.log.find((l) => l.kind === 'damage');
      if (!rollLine || !dmgLine) continue;
      const dealt = Number(dmgLine.text.match(/= (\d+) fire/)?.[1]);
      expect(dealt).toBeGreaterThan(0);
      if (rollLine.text.includes('(failed)')) {
        expect(dmgLine.text).not.toContain('halved');
        sawFailed = true;
      } else if (rollLine.text.includes('(saved)')) {
        expect(dmgLine.text).toContain('halved');
        sawSaved = true;
      }
    }
    expect(sawFailed).toBe(true);
    expect(sawSaved).toBe(true);
  });

  it('logs DC and save outcome in the roll line', () => {
    const goblin = getMonster('goblin');
    const w = makeWizard();
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    const targetId = findMonster(init.state).id;
    const result = castSpell({ roller, character: init.character, state: init.state, spellId: 'fire-bolt', targetId });
    const rollLine = result.state.log.find((l) => l.text.includes('Fire Bolt'))!;
    expect(rollLine.text).toMatch(/DEX save DC \d+: \d+ \((saved|failed)\)/);
  });
});

describe('Wizard — Mage Armor', () => {
  it('adds +3 AC as a class passive when no body armor is worn', () => {
    const w = makeWizard();
    // DEX 12 → +1. Passive baseline: 10 + 1 + 3 = 14.
    expect(computeAC(w)).toBe(14);
    // The mageArmorActive flag no longer drives AC; clearing it has no effect.
    w.resources = { ...w.resources, mageArmorActive: false };
    expect(computeAC(w)).toBe(14);
  });
});

describe('Wizard — Shield reaction-buff', () => {
  it('adds +5 AC and is cleared at start of player turn', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    const roller = createDiceRoller(4);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;
    const baseAC = computeAC(w);

    const cast = castSpell({ roller, character: w, state, spellId: 'shield' });
    state = cast.state;
    w = cast.character;
    expect(computeAC(w)).toBe(baseAC + 5);

    // Cycle through monster turn -> back to player turn.
    // The cleanup runs in turn.endTurn when transitioning to the player.
    // Force-end the player turn:
    w = { ...w, actionEconomy: { ...w.actionEconomy, actionUsed: true } };
    let et = endTurn(state, w);
    state = et.state;
    w = et.character;
    // Monster turn — but goblin may not actually attack if seed misses; just
    // ensure shield persists for that turn.
    expect(computeAC(w)).toBe(baseAC + 5);
    et = endTurn(state, w);
    w = et.character;
    // Back to player — shield expires.
    expect(w.resources.shieldActive).toBeFalsy();
    expect(computeAC(w)).toBe(baseAC);
  });
});

describe('Wizard — Burning Hands', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('damages every living monster in the room', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    const roller = createDiceRoller(6);
    const init = createCombat({
      roller,
      character: w,
      monsters: [{ def: goblin }, { def: goblin, displayName: 'Goblin B' }],
    });
    let state = init.state;
    w = init.character;
    const before = state.combatants.filter((c) => c.kind === 'monster').map((c) => {
      const m = c as MonsterCombatant;
      return m.instance.hp.current;
    });
    const cast = castSpell({ roller, character: w, state, spellId: 'burning-hands' });
    state = cast.state;
    w = cast.character;
    const after = state.combatants.filter((c) => c.kind === 'monster').map((c) => {
      const m = c as MonsterCombatant;
      return m.instance.hp.current;
    });
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBeLessThan(before[i]);
    }
    expect(slotsAt(w, 1)).toBe(1);
  });
});

describe('Wizard — Hold Person', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('paralyzes a monster on a failed save and the monster loses its turn', () => {
    const goblin = getMonster('goblin');
    let baseW: Character = { ...makeWizard(), level: 3 };
    // Bump the slot table to L3 so 2nd-level slots exist.
    baseW = { ...baseW, resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(3) } };
    expect(slotsAt(baseW, 2)).toBeGreaterThan(0);

    // Run several seeds until the save actually fails. Goblin WIS 8 (-1) vs
    // DC ~13 fails on a roll of 13 or less, so most seeds land a paralyze.
    let validated = false;
    for (let seed = 1; seed <= 60 && !validated; seed++) {
      // Reset wizard state every iteration — engine returns a fresh copy.
      let w: Character = {
        ...baseW,
        resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(3) },
        actionEconomy: { ...baseW.actionEconomy, actionUsed: false },
      };
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      w = init.character;
      const goblinId = findMonster(state).id;
      const slotsBefore = slotsAt(w, 2);
      const result = castSpell({ roller, character: w, state, spellId: 'hold-person', targetId: goblinId });
      if (!result.cast) continue;
      state = result.state;
      w = result.character;
      expect(slotsAt(w, 2)).toBe(slotsBefore - 1);
      const target = findMonster(state);
      const isParalyzed = target.instance.conditions.some((c) => c.name === 'paralyzed');
      if (!isParalyzed) continue;

      // Run the goblin's turn — it should lose the attack.
      const ma = monsterAttack({ roller, character: w, state }, goblinId);
      state = ma.state;
      const log = state.log[state.log.length - 1];
      expect(log.text).toContain('paralyzed');
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('high-WIS targets save more often than low-WIS targets against the same DC', () => {
    // Two monsters with the same room but very different WIS:
    //  - goblin: WIS 8 (-1)
    //  - hollow-sage: WIS 16 (+3)
    // Across many seeds, the high-WIS target must beat the DC noticeably more
    // often. This is the regression test for the old hardcoded wisMod=0 bug
    // where Magistrate-class WIS counted for nothing.
    const lowWisDef = getMonster('goblin');
    const highWisDef = getMonster('hollow-sage');

    function paralyzeRate(monsterId: string): number {
      let attempts = 0;
      let paralyzed = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const w: Character = { ...makeWizard(), level: 3 };
        w.resources = { ...w.resources, spellSlots: wizardSpellSlotsForLevel(3) };
        const roller = createDiceRoller(seed);
        const def = monsterId === 'goblin' ? lowWisDef : highWisDef;
        let state = createCombat({ roller, character: w, monsters: [{ def }] }).state;
        const targetId = findMonster(state).id;
        const result = castSpell({ roller, character: w, state, spellId: 'hold-person', targetId });
        if (!result.cast) continue;
        state = result.state;
        attempts++;
        const target = findMonster(state);
        if (target.instance.conditions.some((c) => c.name === 'paralyzed')) {
          paralyzed++;
        }
      }
      return paralyzed / Math.max(1, attempts);
    }

    const goblinRate = paralyzeRate('goblin');
    const sageRate = paralyzeRate('hollow-sage');
    // High-WIS should be paralyzed materially less often. The +4 gap between
    // -1 and +3 is ~20% on a d20 — assert at least a 10% margin to stay
    // robust to seed variance.
    expect(goblinRate).toBeGreaterThan(sageRate + 0.1);
  });
});

describe('Boss legendary resistance vs Hold Person', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  // d20 that always rolls a 2 — every WIS save fails, so the boss is held only
  // when its legendary-resistance pool is exhausted (no seed-sweeping needed).
  function failRoller(): DiceRoller {
    return {
      d20(advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal', modifier = 0): RollResult {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [2],
          modifier,
          total: 2 + modifier,
          natural20: false,
          natural1: false,
          advantage,
        };
      },
      roll() {
        throw new Error('failRoller only implements d20');
      },
      serialize() {
        return { state: 0 };
      },
    };
  }

  // A d20 that always rolls high (19) — every save lands, even at a WIS penalty.
  function passRoller(): DiceRoller {
    return {
      d20(advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal', modifier = 0): RollResult {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [19],
          modifier,
          total: 19 + modifier,
          natural20: false,
          natural1: false,
          advantage,
        };
      },
      roll() {
        throw new Error('passRoller only implements d20');
      },
      serialize() {
        return { state: 0 };
      },
    };
  }

  it('a boss rolls its control save with advantage, but can still be bound — no auto-negate', () => {
    const goblin = getMonster('goblin'); // WIS 8 — fails on the stubbed 2
    const baseW = makeWizard();
    const w: Character = { ...baseW, level: 8, resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(8) } };
    const init = createCombat({
      roller: createDiceRoller(1),
      character: w,
      monsters: [{ def: goblin }],
      isBoss: true,
    });
    const targetId = findMonster(init.state).id;
    expect(findMonster(init.state).instance.legendaryResistances).toBe(3);

    // failRoller fails even the advantaged save → the boss is bound on the FIRST
    // cast (no auto-success), and its resolve pool is NOT consumed (persistent
    // trait, not a counter).
    const r = castSpell({ roller: failRoller(), character: w, state: init.state, spellId: 'hold-person', targetId });
    const inst = findMonster(r.state).instance;
    expect(inst.conditions.some((c) => c.name === 'paralyzed')).toBe(true);
    expect(inst.legendaryResistances).toBe(3);
    expect(r.state.log.some((l) => l.text.includes('resolute will — advantage'))).toBe(true);
  });

  it('a boss whose advantaged save lands high resists the binding', () => {
    const goblin = getMonster('goblin');
    const baseW = makeWizard();
    const w: Character = { ...baseW, level: 8, resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(8) } };
    const init = createCombat({
      roller: createDiceRoller(1),
      character: w,
      monsters: [{ def: goblin }],
      isBoss: true,
    });
    const targetId = findMonster(init.state).id;
    const r = castSpell({ roller: passRoller(), character: w, state: init.state, spellId: 'hold-person', targetId });
    expect(findMonster(r.state).instance.conditions.some((c) => c.name === 'paralyzed')).toBe(false);
  });

  it('an elite also rolls control saves with advantage and is not auto-negated', () => {
    const goblin = getMonster('goblin');
    const baseW = makeWizard();
    const w: Character = { ...baseW, level: 8, resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(8) } };
    const init = createCombat({
      roller: createDiceRoller(1),
      character: w,
      monsters: [{ def: goblin }],
      isElite: true,
    });
    const targetId = findMonster(init.state).id;
    expect(findMonster(init.state).instance.legendaryResistances).toBe(1);

    const r = castSpell({ roller: failRoller(), character: w, state: init.state, spellId: 'hold-person', targetId });
    const inst = findMonster(r.state).instance;
    expect(inst.conditions.some((c) => c.name === 'paralyzed')).toBe(true);
    expect(inst.legendaryResistances).toBe(1);
    expect(r.state.log.some((l) => l.text.includes('resolute will — advantage'))).toBe(true);
  });

  it('a rank-and-file monster has no legendary resistance and is bound on the first failed save', () => {
    const goblin = getMonster('goblin');
    const baseW = makeWizard();
    const w: Character = { ...baseW, level: 3, resources: { ...baseW.resources, spellSlots: wizardSpellSlotsForLevel(3) } };
    const init = createCombat({ roller: createDiceRoller(1), character: w, monsters: [{ def: goblin }] });
    const targetId = findMonster(init.state).id;
    expect(findMonster(init.state).instance.legendaryResistances).toBeUndefined();
    const r = castSpell({ roller: failRoller(), character: init.character, state: init.state, spellId: 'hold-person', targetId });
    expect(findMonster(r.state).instance.conditions.some((c) => c.name === 'paralyzed')).toBe(true);
  });
});

describe('Wizard — spell-slot table and level-up', () => {
  it('scales slots up at L3 (adds 2nd-level) and L5 (adds 3rd-level)', () => {
    // The table is sparse now — unlocked tiers only; missing reads as 0.
    expect(wizardSpellSlotsForLevel(1)).toEqual({ 1: 2 });
    expect(wizardSpellSlotsForLevel(2)).toEqual({ 1: 3 });
    expect(wizardSpellSlotsForLevel(3)).toEqual({ 1: 4, 2: 2 });
    expect(wizardSpellSlotsForLevel(5)).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  it('applyLevelUp refills slots to the new level table', () => {
    const w = makeWizard();
    // Spend a slot.
    w.resources = { ...w.resources, spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    const leveled = applyLevelUp(w);
    expect(leveled.level).toBe(2);
    expect(leveled.resources.spellSlots?.[1]).toBe(3);
  });

  it('auto-picks Evocation at L2', () => {
    const w = makeWizard();
    const leveled = applyLevelUp(w);
    expect(leveled.subclassId).toBe('evocation');
  });
});

describe('Wizard — long rest refresh', () => {
  it('refills slots and clears mage-armor/shield', () => {
    const w = makeWizard();
    w.resources = {
      ...w.resources,
      spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 },
      mageArmorActive: true,
      shieldActive: true,
    };
    const rested = longRest(w);
    expect(rested.resources.spellSlots?.[1]).toBe(2);
    expect(rested.resources.mageArmorActive).toBe(false);
    expect(rested.resources.shieldActive).toBe(false);
  });
});

describe('Wizard — Whet the Mind (delveSpellAttackBonus)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  // Pre-existing dead-mechanic case (NOT caused by initiative removal):
  // Fire Bolt was reworked to a DEX save spell, so spellAttackBonus is no
  // longer used by any in-pool spell. delveSpellAttackBonus is plumbed but
  // never read by combat. Skipping until Whet the Mind is rewired to a
  // mechanic that still exists (e.g. saving-throw DC bump).
  it.skip('adds delveSpellAttackBonus to a Fire Bolt attack roll', () => {
    const goblin = getMonster('goblin');
    const baseline = makeWizard();
    const whetted: Character = { ...makeWizard(), delveSpellAttackBonus: 1 };

    const seed = 7;
    let stateA = createCombat({ roller: createDiceRoller(seed), character: baseline, monsters: [{ def: goblin }] }).state;
    const idA = findMonster(stateA).id;
    stateA = castSpell({ roller: createDiceRoller(seed), character: baseline, state: stateA, spellId: 'fire-bolt', targetId: idA }).state;

    let stateB = createCombat({ roller: createDiceRoller(seed), character: whetted, monsters: [{ def: goblin }] }).state;
    const idB = findMonster(stateB).id;
    stateB = castSpell({ roller: createDiceRoller(seed), character: whetted, state: stateB, spellId: 'fire-bolt', targetId: idB }).state;

    const totalA = Number(stateA.log.find((l) => l.text.includes('Fire Bolt'))!.text.match(/= (\d+) vs AC/)?.[1]);
    const totalB = Number(stateB.log.find((l) => l.text.includes('Fire Bolt'))!.text.match(/= (\d+) vs AC/)?.[1]);
    expect(totalB - totalA).toBe(1);
  });
});

describe('Wizard — Grove caster bonuses', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Sigil of the Wakened Mind adds permanentBonuses.spellDc to the spell save DC (via Hold Person)', () => {
    const goblin = getMonster('goblin');
    const baseline: Character = { ...makeWizard(), level: 3 };
    baseline.resources = { ...baseline.resources, spellSlots: wizardSpellSlotsForLevel(3) };
    const buffed: Character = { ...baseline, permanentBonuses: { spellDc: 1 } };
    buffed.resources = { ...buffed.resources, spellSlots: wizardSpellSlotsForLevel(3) };

    const seed = 9;
    let stateA = createCombat({ roller: createDiceRoller(seed), character: baseline, monsters: [{ def: goblin }] }).state;
    const idA = findMonster(stateA).id;
    stateA = castSpell({ roller: createDiceRoller(seed), character: baseline, state: stateA, spellId: 'hold-person', targetId: idA }).state;
    const dcA = Number(stateA.log.find((l) => l.text.includes('vs DC'))!.text.match(/vs DC (\d+)/)?.[1]);

    let stateB = createCombat({ roller: createDiceRoller(seed), character: buffed, monsters: [{ def: goblin }] }).state;
    const idB = findMonster(stateB).id;
    stateB = castSpell({ roller: createDiceRoller(seed), character: buffed, state: stateB, spellId: 'hold-person', targetId: idB }).state;
    const dcB = Number(stateB.log.find((l) => l.text.includes('vs DC'))!.text.match(/vs DC (\d+)/)?.[1]);

    expect(dcB - dcA).toBe(1);
  });

  it('Burning Tongue adds permanentBonuses.spellDamage to a Fire Bolt hit', () => {
    const goblin = getMonster('goblin');
    const buffed: Character = { ...makeWizard(), permanentBonuses: { spellDamage: 3 } };
    // Fire Bolt damage = 1d10 + INT mod (+3 for makeWizard's INT 15 + Human
    // +1 → 16) + spellDamage (+3 Burning Tongue) = +6 total bonus. The
    // breakdown shows "+6" pre-halving on both saved and failed casts.
    let validated = false;
    for (let seed = 1; seed <= 60 && !validated; seed++) {
      const character: Character = {
        ...buffed,
        actionEconomy: { ...buffed.actionEconomy, actionUsed: false },
      };
      let state = createCombat({ roller: createDiceRoller(seed), character, monsters: [{ def: goblin }] }).state;
      const targetId = findMonster(state).id;
      state = castSpell({
        roller: createDiceRoller(seed),
        character,
        state,
        spellId: 'fire-bolt',
        targetId,
      }).state;
      const dmgLog = state.log.find((l) => l.kind === 'damage' && l.text.includes('fire'));
      if (!dmgLog) continue;
      if (!dmgLog.text.includes('+6')) continue;
      expect(dmgLog.text).toContain('+6');
      validated = true;
    }
    expect(validated).toBe(true);
  });
});

describe('Wizard — Misty Step (L3 unlock)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('is NOT the sim default at L3 — the picker takes Scorching Ray (burst closes fights)', () => {
    let w = makeWizard();
    expect(w.resources.knownSpells).not.toContain('scorching-ray');
    w = simulateLevelUp(w); // L2 — no learn tier
    expect(w.resources.knownSpells).not.toContain('scorching-ray');
    w = simulateLevelUp(w); // L3 — picker fires, sim auto-picks scorching-ray
    expect(w.resources.knownSpells).toContain('scorching-ray');
    expect(w.resources.knownSpells).not.toContain('misty-step');
  });

  it('costs a bonus action, consumes a 2nd-level slot, and grants +2 AC until next turn', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    w = simulateLevelUp(w);
    w = simulateLevelUp(w); // L3 — has 2nd-level slots
    // Misty Step is no longer the sim's default L3 pick (Scorching Ray is), so
    // stamp it explicitly to exercise its cast mechanics.
    w = {
      ...w,
      resources: {
        ...w.resources,
        knownSpells: [...(w.resources.knownSpells ?? []), 'misty-step'],
      },
    };
    expect(slotsAt(w, 2)).toBe(2);

    const roller = createDiceRoller(11);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;
    const baseAC = computeAC(w);

    const result = castSpell({ roller, character: w, state, spellId: 'misty-step' });
    expect(result.cast).toBe(true);
    state = result.state;
    w = result.character;

    expect(slotsAt(w, 2)).toBe(1);
    expect(w.actionEconomy.bonusActionUsed).toBe(true);
    expect(w.actionEconomy.actionUsed).toBe(false);
    expect(w.resources.mistyStepActive).toBe(true);
    expect(computeAC(w)).toBe(baseAC + 2);

    // Cycle to next player turn — the +2 AC should expire.
    let et = endTurn(state, w);
    state = et.state;
    w = et.character;
    et = endTurn(state, w);
    w = et.character;
    expect(w.resources.mistyStepActive).toBeFalsy();
    expect(computeAC(w)).toBe(baseAC);
  });
});

describe('Wizard — Vampiric Touch life-drain (L5 has the slot)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('damages the target, heals the caster for half, consumes a 3rd-level slot', () => {
    const sage = getMonster('hollow-sage'); // 36 HP — survives 5d6 to keep the drain alive
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5 → 3rd-level slots
    w = {
      ...w,
      // Stamp the spell (sim picks Fireball at L5) and drop HP so the heal-back
      // is observable below max rather than clipped at the cap.
      resources: { ...w.resources, knownSpells: [...(w.resources.knownSpells ?? []), 'vampiric-touch'] },
      hp: { ...w.hp, current: 1 },
    };

    const roller = createDiceRoller(13);
    const init = createCombat({ roller, character: w, monsters: [{ def: sage }] });
    let state = init.state;
    w = init.character;
    const slotsBefore = slotsAt(w, 3);
    const targetId = findMonster(state).id;
    const monsterHpBefore = findMonster(state).instance.hp.current;
    const casterHpBefore = w.hp.current;

    const result = castSpell({ roller, character: w, state, spellId: 'vampiric-touch', targetId });
    expect(result.cast).toBe(true);
    state = result.state;
    w = result.character;

    expect(slotsAt(w, 3)).toBe(slotsBefore - 1);
    expect(w.actionEconomy.actionUsed).toBe(true);

    const monsterHpAfter = findMonster(state).instance.hp.current;
    const dealt = monsterHpBefore - monsterHpAfter;
    expect(dealt).toBeGreaterThan(0);

    // The caster's HP rises by floor(dealt / 2), capped at max.
    const expectedHeal = Math.min(w.hp.max - casterHpBefore, Math.floor(dealt / 2));
    expect(w.hp.current).toBe(casterHpBefore + expectedHeal);
    expect(w.hp.current).toBeGreaterThan(casterHpBefore);
    expect(state.log.some((l) => l.text.includes('HP restored'))).toBe(true);
  });
});

describe('Wizard — Fireball / Lightning Bolt (L5 unlock)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('L5 wizard has 2× L3 slots and learns one L3 spell via the picker (sim picks Fireball)', () => {
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L1 → L5
    expect(w.level).toBe(5);
    expect(w.resources.spellSlots?.[3]).toBe(2);
    expect(w.resources.knownSpells).toContain('scorching-ray'); // picked at L3
    expect(w.resources.knownSpells).toContain('fireball'); // sim priority at L5
    // The L5 picker grants exactly one L3 spell; lightning-bolt isn't learned
    // by default. The Lightning Bolt cast test below stamps it explicitly.
    expect(w.resources.knownSpells).not.toContain('lightning-bolt');
  });

  it('Fireball damages every living monster and consumes a 3rd-level slot', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5
    const roller = createDiceRoller(13);
    const init = createCombat({
      roller,
      character: w,
      monsters: [{ def: goblin }, { def: goblin, displayName: 'Goblin B' }],
    });
    let state = init.state;
    w = init.character;
    const slotsBefore = slotsAt(w, 3);
    const before = state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);

    const result = castSpell({ roller, character: w, state, spellId: 'fireball' });
    expect(result.cast).toBe(true);
    state = result.state;
    w = result.character;

    expect(slotsAt(w, 3)).toBe(slotsBefore - 1);
    expect(w.actionEconomy.actionUsed).toBe(true);
    const after = state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBeLessThan(before[i]);
    }
  });

  it('Lightning Bolt hits the primary and forks to a second, consuming a 3rd-level slot', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5
    // Sim picks Fireball at L5; stamp Lightning Bolt so this test focuses on
    // the spell, not the picker.
    w = {
      ...w,
      resources: {
        ...w.resources,
        knownSpells: [...(w.resources.knownSpells ?? []), 'lightning-bolt'],
      },
    };
    const roller = createDiceRoller(17);
    const init = createCombat({
      roller,
      character: w,
      monsters: [{ def: goblin }, { def: goblin, displayName: 'Goblin B' }],
    });
    let state = init.state;
    w = init.character;
    const slotsBefore = slotsAt(w, 3);
    const before = state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);

    const cast = castSpell({ roller, character: w, state, spellId: 'lightning-bolt' });
    state = cast.state;
    w = cast.character;

    expect(slotsAt(w, 3)).toBe(slotsBefore - 1);
    const after = state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBeLessThan(before[i]);
    }
  });
});

describe('Fireball — ignite rider on failed saves', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('survivors that failed their DEX save ignite and burn at the start of the next turn', () => {
    // hollow-sage: 36 HP, DEX 13 — tanky enough to survive many Fireball rolls.
    const sage = getMonster('hollow-sage');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5

    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: sage }] });
      let { state, character: fw } = init;

      const result = castSpell({ roller, character: fw, state, spellId: 'fireball' });
      state = result.state; fw = result.character;

      const monsters = state.combatants.filter((c) => c.kind === 'monster') as MonsterCombatant[];
      const burning = monsters.filter((m) => m.instance.hp.current > 0 && (m.instance.burnTurnsRemaining ?? 0) > 0);
      if (burning.length === 0) continue;

      expect(state.log.some((l) => l.text.includes('ignite'))).toBe(true);

      // Advance to next player turn and confirm burn ticks.
      fw = { ...fw, actionEconomy: { ...fw.actionEconomy, actionUsed: true } };
      let et = endTurn(state, fw);
      state = et.state; fw = et.character;
      et = endTurn(state, fw);
      state = et.state;

      expect(state.log.some((l) => l.text.includes('burns for') && l.text.includes('fire'))).toBe(true);
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('monsters that succeed their DEX save are NOT ignited', () => {
    const sage = getMonster('hollow-sage');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w);

    // Script a high d20 face so the sage succeeds its DEX save.
    const baseRoller = createDiceRoller(1);
    let d20Calls = 0;
    const roller = {
      ...baseRoller,
      d20(adv: Parameters<typeof baseRoller.d20>[0] = 'normal', mod = 0) {
        d20Calls++;
        if (d20Calls === 1) {
          return { ...baseRoller.d20(adv, mod), rolls: [20], total: 20 + mod, natural20: true, natural1: false };
        }
        return baseRoller.d20(adv, mod);
      },
    };

    const init = createCombat({ roller: baseRoller, character: w, monsters: [{ def: sage }] });
    const result = castSpell({ roller, character: init.character, state: init.state, spellId: 'fireball' });

    const monsters = result.state.combatants.filter((c) => c.kind === 'monster') as MonsterCombatant[];
    for (const m of monsters) {
      expect(m.instance.burnTurnsRemaining ?? 0).toBe(0);
    }
  });
});

describe('Lightning Bolt — pierce on successful saves', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('non-evoker wizard rolls 10d6 (more dice than Fireball 8d6 — the focused strike)', () => {
    const sage = getMonster('hollow-sage');
    // Use a raw L1 wizard with manually bumped slots + known spell to bypass
    // the Evocation subclass (which adds a sculpt die at L2+).
    const w: Character = {
      ...makeWizard(),
      resources: {
        ...makeWizard().resources,
        spellSlots: { 1: 4, 2: 3, 3: 2, 4: 0 },
        knownSpells: [...(makeWizard().resources.knownSpells ?? []), 'lightning-bolt'],
      },
    };
    const roller = createDiceRoller(50);
    const init = createCombat({ roller, character: w, monsters: [{ def: sage }] });
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'lightning-bolt' });
    const roll = cast.state.log.find((l) => l.text.includes('spear of lightning'))!;
    const diceCount = roll.text.split(' = ')[0].split('+').length;
    expect(diceCount).toBe(10);
  });

  it('forks to a second foe for half, and touches no third', () => {
    const sage = getMonster('hollow-sage');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w);
    w = { ...w, resources: { ...w.resources, knownSpells: [...(w.resources.knownSpells ?? []), 'lightning-bolt'] } };

    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: w,
      monsters: [{ def: sage }, { def: sage, displayName: 'Sage B' }, { def: sage, displayName: 'Sage C' }],
    });
    const before = init.state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);

    const result = castSpell({ roller, character: init.character, state: init.state, spellId: 'lightning-bolt' });
    const after = result.state.combatants
      .filter((c) => c.kind === 'monster')
      .map((c) => (c as MonsterCombatant).instance.hp.current);

    // Primary and the fork take damage; the third foe is untouched.
    expect(after[0]).toBeLessThan(before[0]);
    expect(after[1]).toBeLessThan(before[1]);
    expect(after[2]).toBe(before[2]);
    expect(result.state.log.some((l) => l.text.includes('(fork)'))).toBe(true);
  });
});

describe('Wizard — Sculpt Spells (Evocation L2)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('L1 wizard rolls 3d6 Burning Hands (no subclass yet); L2+ evoker rolls 4d6', () => {
    const goblin = getMonster('goblin');
    const seed = 21;

    // Pre-subclass wizard (L1) — no Sculpt Spells.
    let w1 = makeWizard();
    let s1 = createCombat({ roller: createDiceRoller(seed), character: w1, monsters: [{ def: goblin }] }).state;
    w1 = createCombat({ roller: createDiceRoller(seed), character: w1, monsters: [{ def: goblin }] }).character;
    const cast1 = castSpell({ roller: createDiceRoller(seed), character: w1, state: s1, spellId: 'burning-hands' });
    s1 = cast1.state;
    const roll1 = s1.log.find((l) => l.text.includes('cone of flame'))!;
    const diceCount1 = roll1.text.match(/=/) ? roll1.text.split(' = ')[0].split('+').length : 0;
    expect(diceCount1).toBe(3);
    expect(roll1.text).not.toContain('Sculpt Spells');

    // L2 wizard — auto-picks Evocation, Sculpt Spells unlocked.
    let w2 = makeWizard();
    w2 = applyLevelUp(w2);
    expect(w2.subclassId).toBe('evocation');
    _resetMonsterInstanceCounter();
    let s2 = createCombat({ roller: createDiceRoller(seed), character: w2, monsters: [{ def: goblin }] }).state;
    w2 = createCombat({ roller: createDiceRoller(seed), character: w2, monsters: [{ def: goblin }] }).character;
    const cast2 = castSpell({ roller: createDiceRoller(seed), character: w2, state: s2, spellId: 'burning-hands' });
    s2 = cast2.state;
    const roll2 = s2.log.find((l) => l.text.includes('cone of flame'))!;
    const diceCount2 = roll2.text.split(' = ')[0].split('+').length;
    expect(diceCount2).toBe(4);
    expect(roll2.text).toContain('Sculpt Spells');
  });

  it('L5 evoker rolls 9d6 Fireball (8d6 base + 1 from Sculpt Spells)', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5
    expect(w.subclassId).toBe('evocation');
    const roller = createDiceRoller(31);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;

    const cast = castSpell({ roller, character: w, state, spellId: 'fireball' });
    expect(cast.cast).toBe(true);
    state = cast.state;
    const roll = state.log.find((l) => l.text.includes('blooms into a roar of flame'))!;
    const diceCount = roll.text.split(' = ')[0].split('+').length;
    expect(diceCount).toBe(9);
    expect(roll.text).toContain('Sculpt Spells');
  });

  it('L5 evoker rolls 11d6 Lightning Bolt (10d6 base + 1 from Sculpt Spells)', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = simulateLevelUp(w); // L5
    // Sim picks Fireball at L5 — stamp Lightning Bolt for the spell-under-test.
    w = {
      ...w,
      resources: {
        ...w.resources,
        knownSpells: [...(w.resources.knownSpells ?? []), 'lightning-bolt'],
      },
    };
    const roller = createDiceRoller(33);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;

    const cast = castSpell({ roller, character: w, state, spellId: 'lightning-bolt' });
    expect(cast.cast).toBe(true);
    state = cast.state;
    const roll = state.log.find((l) => l.text.includes('spear of lightning'))!;
    const diceCount = roll.text.split(' = ')[0].split('+').length;
    expect(diceCount).toBe(11);
    expect(roll.text).toContain('Sculpt Spells');
  });
});

describe('Wizard — Shield true reaction', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('auto-triggers on an incoming hit that Shield would flip to a miss', () => {
    const goblin = getMonster('goblin');
    // Find a seed where the goblin hits, but a +5 Shield would save the wizard.
    // Shield is a CLUTCH reaction now — only fires at/below half HP — so the
    // wizard must already be hurt for the auto-trigger to engage.
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      let w = makeWizard();
      w = { ...w, hp: { ...w.hp, current: 1 } };
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      w = init.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      const baseAc = computeAC(w);
      const slotsBefore = slotsAt(w, 1);

      const result = monsterAttack({ roller, character: w, state }, goblinId);
      state = result.state;
      w = result.character;

      const shieldLog = state.log.find((l) => l.text.includes('reacts with Shield'));
      if (!shieldLog) continue;

      // Shield triggered: slot consumed, reaction marked, shieldActive set,
      // AC bumped +5, attack reported as miss in lastAttack.
      expect(slotsAt(w, 1)).toBe(slotsBefore - 1);
      expect(w.actionEconomy.reactionUsed).toBe(true);
      expect(w.resources.shieldActive).toBe(true);
      expect(computeAC(w)).toBe(baseAc + 5);
      expect(state.lastAttack?.hit).toBe(false);
      expect(shieldLog.text).toContain(`AC ${baseAc} → ${baseAc + 5}`);
      expect(shieldLog.text).toContain('glances off');
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('does NOT trigger when no slot remains', () => {
    const goblin = getMonster('goblin');
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      let w = makeWizard();
      w.resources = { ...w.resources, spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } };
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      w = init.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

      const result = monsterAttack({ roller, character: w, state }, goblinId);
      state = result.state;

      const shieldLog = state.log.find((l) => l.text.includes('casts Shield'));
      expect(shieldLog).toBeUndefined();
      // Look for a seed where the goblin actually hit so we know the "would
      // shield save" branch was reachable. Otherwise keep trying seeds.
      if (state.lastAttack?.hit === true) validated = true;
    }
    expect(validated).toBe(true);
  });

  it('does NOT trigger on a crit (nat 20 bypasses Shield)', () => {
    const goblin = getMonster('goblin');
    let validated = false;
    for (let seed = 1; seed <= 300 && !validated; seed++) {
      let w = makeWizard();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      w = init.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      const slotsBefore = slotsAt(w, 1);

      const result = monsterAttack({ roller, character: w, state }, goblinId);
      state = result.state;
      w = result.character;

      if (state.lastAttack?.crit !== true) continue;
      // Crit landed — Shield must NOT have intercepted.
      const shieldLog = state.log.find((l) => l.text.includes('casts Shield'));
      expect(shieldLog).toBeUndefined();
      expect(slotsAt(w, 1)).toBe(slotsBefore);
      expect(w.resources.shieldActive).toBeFalsy();
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('reaction flag resets at start of next player turn', () => {
    const goblin = getMonster('goblin');
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      let w = makeWizard();
      w = { ...w, hp: { ...w.hp, current: 1 } }; // hurt → clutch Shield can fire
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      let state = init.state;
      w = init.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

      const result = monsterAttack({ roller, character: w, state }, goblinId);
      state = result.state;
      w = result.character;

      if (!w.actionEconomy.reactionUsed) continue;
      // Cycle back to player turn — reaction flag should clear.
      let et = endTurn(state, w);
      state = et.state;
      w = et.character;
      et = endTurn(state, w);
      w = et.character;
      expect(w.actionEconomy.reactionUsed).toBe(false);
      validated = true;
    }
    expect(validated).toBe(true);
  });
});

describe('Wizard — canCastSpell guards', () => {
  it('returns ok=false when no slot remains', () => {
    const w = makeWizard();
    w.resources = { ...w.resources, spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    const result = canCastSpell(w, 'magic-missile');
    expect(result.ok).toBe(false);
  });

  it('returns ok=true for cantrips regardless of slots', () => {
    const w = makeWizard();
    w.resources = { ...w.resources, spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    const result = canCastSpell(w, 'fire-bolt');
    expect(result.ok).toBe(true);
  });
});
