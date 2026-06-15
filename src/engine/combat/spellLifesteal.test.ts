import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { castSpell } from './spells';
import {
  necromancyLifestealPct,
  NECROMANCY_LIFESTEAL_PCT,
  NECROMANCY_LIFESTEAL_PCT_L10,
} from './spells/helpers';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState } from '../../types/combat';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';

/**
 * Soulthirst — the spell-vamp affix. The heal applies ONCE per cast in the
 * castSpell dispatch seam (handlers untouched): % of the summed monster HP the
 * cast removed, min 1 whenever any landed, capped at max HP. % PROVISIONAL.
 */

function soulthirstOrb(): ItemRef {
  return {
    itemId: 'crystal-orb',
    rolled: {
      baseId: 'crystal-orb',
      rarity: 'green',
      affixes: ['soulthirst'],
      name: 'Soulthirst Crystal Orb',
    },
  };
}

function makeWizard(extra: Partial<Character> = {}): Character {
  const base = createCharacter({
    id: 'test-wizard',
    name: 'Inara',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[3],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[0],
      wis: STANDARD_ARRAY[1],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return {
    ...base,
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: soulthirstOrb(), armor: null },
    ...extra,
  };
}

function monsterHpTotal(state: CombatState): number {
  return state.combatants.reduce(
    (sum, c) => (c.kind === 'monster' ? sum + Math.max(0, c.instance.hp.current) : sum),
    0,
  );
}

function firstMonsterId(state: CombatState): string {
  const m = state.combatants.find((c) => c.kind === 'monster');
  if (!m) throw new Error('no monster');
  return m.id;
}

function drinkLine(state: CombatState) {
  return state.log.find((l) => l.text.includes('back through the working'));
}

describe('Soulthirst — single-target cast', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('heals min-1 off a small auto-hit cast (4% floors to the 1-HP drink)', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeWizard(),
      monsters: [{ def: getMonster('goblin') }],
    });
    let w = { ...init.character, hp: { ...init.character.hp, current: 1 } };
    const hpBefore = monsterHpTotal(init.state);

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    w = result.character;

    const dealt = hpBefore - monsterHpTotal(result.state);
    expect(dealt).toBeGreaterThan(0);
    expect(dealt).toBeLessThan(25); // a goblin's whole pool — 4% floors to 0, min-1 must fire
    expect(w.hp.current).toBe(1 + Math.max(1, Math.floor((dealt * 4) / 100)));
    expect(w.hp.current).toBe(2);
    expect(drinkLine(result.state)?.text).toContain('Inara drinks 1 HP');
  });

  it('without the affix the same cast heals nothing and logs no drink', () => {
    const roller = createDiceRoller(7);
    const bare = makeWizard({
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });
    const init = createCombat({ roller, character: bare, monsters: [{ def: getMonster('goblin') }] });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1 } };

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    expect(result.character.hp.current).toBe(1);
    expect(drinkLine(result.state)).toBeUndefined();
  });

  it('drinks nothing at full HP (no dead log line)', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeWizard(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const w = init.character; // createCombat leaves the soul at full HP

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    expect(result.character.hp.current).toBe(w.hp.max);
    expect(drinkLine(result.state)).toBeUndefined();
  });
});

describe('Soulthirst — AOE cast sums every target', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('heals off the TOTAL damage across all monsters hit (100%-vamp legendary channel)', () => {
    const roller = createDiceRoller(11);
    const wiz = makeWizard({
      // The legendary-effect channel rides the same affix fold; 100% makes the
      // heal equal the summed dealt damage exactly, proving the AOE sum.
      legendaryEffects: [{ spellLifestealPct: 100 }],
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });
    const init = createCombat({
      roller,
      character: wiz,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const w = {
      ...init.character,
      hp: { ...init.character.hp, current: 1, max: 500 },
    };
    const hpBefore = monsterHpTotal(init.state);

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'burning-hands',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);

    const dealt = hpBefore - monsterHpTotal(result.state);
    expect(dealt).toBeGreaterThan(0);
    expect(result.character.hp.current).toBe(1 + dealt);
    expect(drinkLine(result.state)?.text).toContain(`drinks ${dealt} HP`);
  });

  it('caps the drink at max HP', () => {
    const roller = createDiceRoller(11);
    const wiz = makeWizard({ legendaryEffects: [{ spellLifestealPct: 100 }] });
    const init = createCombat({
      roller,
      character: wiz,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const w = {
      ...init.character,
      hp: { ...init.character.hp, current: init.character.hp.max - 1 },
    };
    const hpBefore = monsterHpTotal(init.state);

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'burning-hands',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    expect(hpBefore - monsterHpTotal(result.state)).toBeGreaterThan(1);
    expect(result.character.hp.current).toBe(w.hp.max);
    expect(drinkLine(result.state)?.text).toContain('drinks 1 HP');
  });
});

describe('Soulthirst — stacks on top of Life Drain’s inherent heal', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('vampiric touch heals its half-damage AND the affix drink on the same cast', () => {
    const drainKit = {
      resources: undefined as Character['resources'] | undefined,
    };
    const withAffix = makeWizard();
    drainKit.resources = {
      ...withAffix.resources,
      knownSpells: [...(withAffix.resources.knownSpells ?? []), 'vampiric-touch'],
      spellSlots: { ...withAffix.resources.spellSlots, 3: 1 },
    };

    const run = (character: Character) => {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(13);
      const init = createCombat({
        roller,
        character,
        monsters: [{ def: getMonster('goblin') }],
      });
      const w = { ...init.character, hp: { ...init.character.hp, current: 1, max: 500 } };
      const before = monsterHpTotal(init.state);
      const result = castSpell({
        roller,
        character: w,
        state: init.state,
        spellId: 'vampiric-touch',
        targetId: firstMonsterId(init.state),
      });
      expect(result.cast).toBe(true);
      return { gain: result.character.hp.current - 1, dealt: before - monsterHpTotal(result.state), state: result.state };
    };

    const bare = run(
      makeWizard({
        resources: drainKit.resources,
        equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
      }),
    );
    const vamped = run(makeWizard({ resources: drainKit.resources }));

    // Same seed → same dice: the only delta is the affix drink off the actual HP loss.
    expect(vamped.dealt).toBe(bare.dealt);
    expect(bare.gain).toBeGreaterThan(0); // the spell's own half-damage knit
    expect(vamped.gain).toBe(bare.gain + Math.max(1, Math.floor((vamped.dealt * 4) / 100)));
    expect(drinkLine(vamped.state)).toBeDefined();
    expect(drinkLine(bare.state)).toBeUndefined();
  });
});

describe('Soulthirst — emits an explicit heal-number event on the player', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function playerHealEvents(state: CombatState) {
    return (state.spellEffectEvents ?? []).filter(
      (e) => e.targetId === 'player' && (e.heal ?? 0) > 0,
    );
  }

  it('AoE vamp across multiple foes leaves exactly one player heal event = HP restored', () => {
    const roller = createDiceRoller(11);
    const wiz = makeWizard({
      legendaryEffects: [{ spellLifestealPct: 100 }],
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });
    const init = createCombat({
      roller,
      character: wiz,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1, max: 500 } };

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'burning-hands',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);

    const restored = result.character.hp.current - 1;
    expect(restored).toBeGreaterThan(0);
    const heals = playerHealEvents(result.state);
    expect(heals).toHaveLength(1);
    expect(heals[0]!.heal).toBe(restored);
    expect(heals[0]!.kind).toBe('sustain-heal');
  });

  it('single-target vamp emits exactly one heal event (not two) and keeps the foe damage float', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeWizard(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const target = firstMonsterId(init.state);
    const w = { ...init.character, hp: { ...init.character.hp, current: 1 } };

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: target,
    });
    expect(result.cast).toBe(true);

    const restored = result.character.hp.current - 1;
    expect(restored).toBeGreaterThan(0);
    const heals = playerHealEvents(result.state);
    expect(heals).toHaveLength(1);
    expect(heals[0]!.heal).toBe(restored);
    // The damage cast's own single event is preserved (its number floats on the foe).
    expect(result.state.spellEffectEvent?.targetId).toBe(target);
    expect(result.state.spellEffectEvent?.damage).toBeGreaterThan(0);
  });

  it('without spell-vamp the cast leaves no player heal event', () => {
    const roller = createDiceRoller(7);
    const bare = makeWizard({
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });
    const init = createCombat({ roller, character: bare, monsters: [{ def: getMonster('goblin') }] });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1 } };

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    expect(playerHealEvents(result.state)).toHaveLength(0);
  });

  it('necromancy AoE vamp also leaves one player heal event', () => {
    const roller = createDiceRoller(11);
    const necro = makeWizard({
      level: 2,
      subclassId: 'necromancy',
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });
    const init = createCombat({
      roller,
      character: necro,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1, max: 500 } };

    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'burning-hands',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    const restored = result.character.hp.current - 1;
    expect(restored).toBeGreaterThan(0);
    const heals = playerHealEvents(result.state);
    expect(heals).toHaveLength(1);
    expect(heals[0]!.heal).toBe(restored);
  });
});

describe('School of Necromancy — Grim Harvest lifesteal (no affix needed)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  const necro = (level: number, subclassId = 'necromancy') =>
    makeWizard({
      level,
      subclassId,
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    });

  it('necromancyLifestealPct: 20 at L2, 35 at L10, 0 for other schools / pre-pick', () => {
    expect(necromancyLifestealPct(necro(2))).toBe(NECROMANCY_LIFESTEAL_PCT);
    expect(necromancyLifestealPct(necro(10))).toBe(NECROMANCY_LIFESTEAL_PCT_L10);
    expect(necromancyLifestealPct(necro(2, 'evocation'))).toBe(0);
    expect(necromancyLifestealPct(necro(1))).toBe(0); // school not picked until L2
  });

  it('a Necromancer drinks a fifth of a damaging cast — no Soulthirst orb in hand', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({ roller, character: necro(2), monsters: [{ def: getMonster('goblin') }] });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1, max: 500 } };
    const before = monsterHpTotal(init.state);
    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    const dealt = before - monsterHpTotal(result.state);
    expect(dealt).toBeGreaterThan(0);
    expect(result.character.hp.current).toBe(
      1 + Math.max(1, Math.floor((dealt * NECROMANCY_LIFESTEAL_PCT) / 100)),
    );
    expect(drinkLine(result.state)).toBeDefined();
  });

  it('a non-Necromancer with no affix drinks nothing from the same cast', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({ roller, character: necro(2, 'evocation'), monsters: [{ def: getMonster('goblin') }] });
    const w = { ...init.character, hp: { ...init.character.hp, current: 1, max: 500 } };
    const result = castSpell({
      roller,
      character: w,
      state: init.state,
      spellId: 'magic-missile',
      targetId: firstMonsterId(init.state),
    });
    expect(result.cast).toBe(true);
    expect(result.character.hp.current).toBe(1);
    expect(drinkLine(result.state)).toBeUndefined();
  });
});
