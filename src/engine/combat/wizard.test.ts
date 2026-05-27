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
import type { MonsterCombatant } from '../../types/combat';
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

function findMonster(state: ReturnType<typeof createCombat>): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

describe('Wizard — starting resources', () => {
  it('grants 2 first-level spell slots and the starter spell list', () => {
    const w = makeWizard();
    expect(w.resources.spellSlots?.[1]).toBe(2);
    expect(w.resources.spellSlots?.[2]).toBe(0);
    expect(w.resources.spellSlots?.[3]).toBe(0);
    expect(w.resources.knownSpells).toEqual(
      expect.arrayContaining([
        'fire-bolt',
        'mage-armor',
        'magic-missile',
        'shield',
        'burning-hands',
      ]),
    );
  });

  it('uses d6 hit die', () => {
    const w = makeWizard();
    // L1 max HP = hit die + CON mod. CON 13 + 1 (human) = 14 → +2 mod. 6 + 2 = 8.
    expect(w.hp.max).toBe(8);
  });
});

describe('Wizard — Magic Missile', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('auto-hits, consumes a 1st-level slot, deals 3d4+3 force', () => {
    const goblin = getMonster('goblin');
    const w = makeWizard();
    const roller = createDiceRoller(7);
    let state = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    expect(slotsAt(w, 1)).toBe(2);

    const goblinId = findMonster(state).id;
    const initialHp = findMonster(state).instance.hp.current;
    const result = castSpell({ roller, character: w, state, spellId: 'magic-missile', targetId: goblinId });
    expect(result.cast).toBe(true);
    state = result.state;

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
    const w = makeWizard();
    const roller = createDiceRoller(3);
    let state = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    const before = slotsAt(w, 1);
    const goblinId = findMonster(state).id;
    state = castSpell({ roller, character: w, state, spellId: 'fire-bolt', targetId: goblinId }).state;
    expect(slotsAt(w, 1)).toBe(before);
    expect(w.actionEconomy.actionUsed).toBe(true);
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
    const w = makeWizard();
    const roller = createDiceRoller(4);
    let state = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    const baseAC = computeAC(w);

    state = castSpell({ roller, character: w, state, spellId: 'shield' }).state;
    expect(computeAC(w)).toBe(baseAC + 5);

    // Cycle through monster turn -> back to player turn.
    // The cleanup runs in turn.endTurn when transitioning to the player.
    // Force-end the player turn:
    w.actionEconomy = { ...w.actionEconomy, actionUsed: true };
    state = endTurn(state, w).state;
    // Monster turn — but goblin may not actually attack if seed misses; just
    // ensure shield persists for that turn.
    expect(computeAC(w)).toBe(baseAC + 5);
    state = endTurn(state, w).state;
    // Back to player — shield expires.
    expect(w.resources.shieldActive).toBeFalsy();
    expect(computeAC(w)).toBe(baseAC);
  });
});

describe('Wizard — Burning Hands', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('damages every living monster in the room', () => {
    const goblin = getMonster('goblin');
    const w = makeWizard();
    const roller = createDiceRoller(6);
    let state = createCombat({
      roller,
      character: w,
      monsters: [{ def: goblin }, { def: goblin, displayName: 'Goblin B' }],
    });
    const before = state.combatants.filter((c) => c.kind === 'monster').map((c) => {
      const m = c as MonsterCombatant;
      return m.instance.hp.current;
    });
    state = castSpell({ roller, character: w, state, spellId: 'burning-hands' }).state;
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
    const w: Character = { ...makeWizard(), level: 3 };
    // Bump the slot table to L3 so 2nd-level slots exist.
    w.resources = { ...w.resources, spellSlots: wizardSpellSlotsForLevel(3) };
    expect(slotsAt(w, 2)).toBeGreaterThan(0);

    // Run several seeds until the save actually fails (monster wis-mod = 0,
    // so DC ~13 should fail more often than not).
    let validated = false;
    for (let seed = 1; seed <= 60 && !validated; seed++) {
      // Reset wizard state every iteration — character mutates during cast.
      w.resources = { ...w.resources, spellSlots: wizardSpellSlotsForLevel(3) };
      w.actionEconomy = { ...w.actionEconomy, actionUsed: false };
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
      const goblinId = findMonster(state).id;
      const slotsBefore = slotsAt(w, 2);
      const result = castSpell({ roller, character: w, state, spellId: 'hold-person', targetId: goblinId });
      if (!result.cast) continue;
      state = result.state;
      expect(slotsAt(w, 2)).toBe(slotsBefore - 1);
      const target = findMonster(state);
      const isParalyzed = target.instance.conditions.some((c) => c.name === 'paralyzed');
      if (!isParalyzed) continue;

      // Run the goblin's turn — it should lose the attack.
      state = monsterAttack({ roller, character: w, state }, goblinId).state;
      const log = state.log[state.log.length - 1];
      expect(log.text).toContain('paralyzed');
      validated = true;
    }
    expect(validated).toBe(true);
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
