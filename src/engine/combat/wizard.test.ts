import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { castSpell, slotsAt, canCastSpell } from './spells';
import { monsterAttack } from './attack';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { longRest, wizardSpellSlotsForLevel } from '../character/actions';
import { applyLevelUp } from '../character/leveling';
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
    let state = init.state;
    w = init.character;
    const before = slotsAt(w, 1);
    const goblinId = findMonster(state).id;
    const cast = castSpell({ roller, character: w, state, spellId: 'fire-bolt', targetId: goblinId });
    state = cast.state;
    w = cast.character;
    expect(slotsAt(w, 1)).toBe(before);
    expect(w.actionEconomy.actionUsed).toBe(true);
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
  it('adds +3 AC when no body armor is worn', () => {
    const w = makeWizard();
    const baseAC = computeAC(w);
    w.resources = { ...w.resources, mageArmorActive: true };
    expect(computeAC(w)).toBe(baseAC + 3);
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
    state = et.state;
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
      w = ma.character;
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

describe('Wizard — spell-slot table and level-up', () => {
  it('scales slots up at L3 (adds 2nd-level) and L5 (adds 3rd-level)', () => {
    expect(wizardSpellSlotsForLevel(1)).toEqual({ 1: 2, 2: 0, 3: 0, 4: 0 });
    expect(wizardSpellSlotsForLevel(2)).toEqual({ 1: 3, 2: 0, 3: 0, 4: 0 });
    expect(wizardSpellSlotsForLevel(3)).toEqual({ 1: 4, 2: 2, 3: 0, 4: 0 });
    expect(wizardSpellSlotsForLevel(5)).toEqual({ 1: 4, 2: 3, 3: 2, 4: 0 });
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

  it('adds delveSpellAttackBonus to a Fire Bolt attack roll', () => {
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

  it('is auto-learned at L3 by applyLevelUp', () => {
    let w = makeWizard();
    expect(w.resources.knownSpells).not.toContain('misty-step');
    w = applyLevelUp(w); // L2
    expect(w.resources.knownSpells).not.toContain('misty-step');
    w = applyLevelUp(w); // L3
    expect(w.resources.knownSpells).toContain('misty-step');
  });

  it('costs a bonus action, consumes a 2nd-level slot, and grants +2 AC until next turn', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    w = applyLevelUp(w);
    w = applyLevelUp(w); // L3 — has 2nd-level slots, knows misty-step
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
    state = et.state;
    w = et.character;
    expect(w.resources.mistyStepActive).toBeFalsy();
    expect(computeAC(w)).toBe(baseAC);
  });
});

describe('Wizard — Fireball / Lightning Bolt (L5 unlock)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('L5 wizard has 2× L3 slots AND knows Fireball + Lightning Bolt', () => {
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = applyLevelUp(w); // L1 → L5
    expect(w.level).toBe(5);
    expect(w.resources.spellSlots?.[3]).toBe(2);
    expect(w.resources.knownSpells).toContain('fireball');
    expect(w.resources.knownSpells).toContain('lightning-bolt');
    expect(w.resources.knownSpells).toContain('misty-step');
  });

  it('Fireball damages every living monster and consumes a 3rd-level slot', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = applyLevelUp(w); // L5
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

  it('Lightning Bolt damages every living monster and consumes a 3rd-level slot', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = applyLevelUp(w); // L5
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
    for (let i = 0; i < 4; i++) w = applyLevelUp(w); // L5
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

  it('L5 evoker rolls 9d6 Lightning Bolt', () => {
    const goblin = getMonster('goblin');
    let w = makeWizard();
    for (let i = 0; i < 4; i++) w = applyLevelUp(w); // L5
    const roller = createDiceRoller(33);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    let state = init.state;
    w = init.character;

    const cast = castSpell({ roller, character: w, state, spellId: 'lightning-bolt' });
    expect(cast.cast).toBe(true);
    state = cast.state;
    const roll = state.log.find((l) => l.text.includes('white arc of lightning'))!;
    const diceCount = roll.text.split(' = ')[0].split('+').length;
    expect(diceCount).toBe(9);
    expect(roll.text).toContain('Sculpt Spells');
  });
});

describe('Wizard — Shield true reaction', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('auto-triggers on an incoming hit that Shield would flip to a miss', () => {
    const goblin = getMonster('goblin');
    // Find a seed where the goblin hits, but a +5 Shield would save the wizard.
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      let w = makeWizard();
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

      const shieldLog = state.log.find((l) => l.text.includes('casts Shield'));
      if (!shieldLog) continue;

      // Shield triggered: slot consumed, reaction marked, shieldActive set,
      // AC bumped +5, attack reported as miss in lastAttack.
      expect(slotsAt(w, 1)).toBe(slotsBefore - 1);
      expect(w.actionEconomy.reactionUsed).toBe(true);
      expect(w.resources.shieldActive).toBe(true);
      expect(computeAC(w)).toBe(baseAc + 5);
      expect(state.lastAttack?.hit).toBe(false);
      expect(shieldLog.text).toContain(`AC ${baseAc} → ${baseAc + 5}`);
      expect(shieldLog.text).toContain('attack now misses');
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
      w = result.character;

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
      state = et.state;
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
