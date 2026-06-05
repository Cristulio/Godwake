import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { getClass, listClasses } from '../../content/classes';
import { spellSaveDC } from './spells';
import { isWildShaped, characterHasMechanic, spellcastingMod } from '../character/derived';
import { wildShapeUsesMax, beastWeaponId, wildShapeTempHp, WILD_SHAPE_ROUNDS } from './wildShape';
import { spellDamageMultiplier } from './spells/scaling';
import { magicMissileDartCount } from './spells/magicMissile';
import { getItem } from '../../content/items';
import {
  classUnlockRenown,
  STARTER_CLASSES,
  isClassUnlocked,
} from '../progression/unlocks';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { chooseCombatAction, applyPlannedAction } from './actionPolicy';
import { monsterAttack } from './attack/monsterAttack';
import { endTurn, isPlayerTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeDruid(level = 2, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('druid'));
  return { ...base, level, subclassId };
}

function monsterId(state: CombatState): string {
  return (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
}

function monsterHp(state: CombatState, id: string): number {
  const m = state.combatants.find((c) => c.id === id) as MonsterCombatant;
  return m.instance.hp.current;
}

describe('Druid — class definition + registry', () => {
  it('is registered and validates as a Wisdom caster', () => {
    const druid = getClass('druid');
    expect(druid.id).toBe('druid');
    expect(druid.primaryAbility).toContain('wis');
    expect(listClasses().some((c) => c.id === 'druid')).toBe(true);
  });

  it('keys its spell save DC off Wisdom with the full-caster bonus', () => {
    // Wood Elf preset: WIS 16 (+3), L1 prof +2, +1 Focused Casting → DC 14.
    const druid = makeDruid(1);
    expect(spellSaveDC(druid)).toBe(14);
  });

  it('gains Wild Shape at L2 and the Moon circle deepens it', () => {
    expect(characterHasMechanic(makeDruid(1), 'wild-shape')).toBe(false);
    expect(characterHasMechanic(makeDruid(2), 'wild-shape')).toBe(true);
    expect(wildShapeUsesMax(makeDruid(2))).toBe(1);
    expect(wildShapeUsesMax(makeDruid(2, 'circle-of-the-moon'))).toBe(2);
    expect(beastWeaponId(makeDruid(2))).toBe('beast-claws');
    expect(beastWeaponId(makeDruid(2, 'circle-of-the-moon'))).toBe('dire-claws');
  });
});

describe('Druid — renown-450 unlock (not a starter)', () => {
  it('opens only once 450 renown has been spent (third non-starter, origin-invariant)', () => {
    // The non-starters open at 200/300/450/600 renown spent regardless of which
    // starter is the origin, so the Druid is always the 450 soul.
    expect(classUnlockRenown('druid', 'fighter')).toBe(450);
    expect(classUnlockRenown('druid', 'ranger')).toBe(450);
    expect(isClassUnlocked('druid', 449, 'fighter')).toBe(false);
    expect(isClassUnlocked('druid', 450, 'fighter')).toBe(true);
  });

  it('is never a fresh-soul starter', () => {
    expect(STARTER_CLASSES).not.toContain('druid');
  });
});

describe('Druid — Wild Shape mechanic', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('grants beast vitality (temp HP) + claws on the change, then reverts', () => {
    const roller = createDiceRoller(7);
    // High level so a lone weak goblin can never close the fight — the form has
    // room to spend down and revert under observation.
    const druid = makeDruid(20);
    const init = createCombat({ roller, character: druid, monsters: [{ def: getMonster('goblin') }] });

    // Wild Shape uses refresh at combat start.
    expect(init.character.resources.wildShapeUsesRemaining).toBe(wildShapeUsesMax(druid));

    const shaped = applyPlannedAction(
      { roller, state: init.state, character: init.character },
      { kind: 'wild-shape' },
    );
    expect(isWildShaped(shaped.character)).toBe(true);
    expect(shaped.character.hp.temp).toBeGreaterThan(0);
    expect(shaped.character.resources.wildShapeUsesRemaining).toBe(
      (init.character.resources.wildShapeUsesRemaining ?? 0) - 1,
    );

    // The beast attack swings with the natural-weapon profile, not the sickle.
    const mid = monsterId(shaped.state);
    const before = monsterHp(shaped.state, mid);
    const clawed = applyPlannedAction(
      { roller, state: shaped.state, character: shaped.character },
      { kind: 'attack', targetId: mid },
    );
    const clawLog = clawed.state.log.some((l) => /Beast Claws/i.test(l.text));
    // Either it connected (HP dropped) or at least the claw profile was used.
    expect(clawLog || monsterHp(clawed.state, mid) < before).toBe(true);

    // Force a near-expiry and advance to the next player turn — the form falls
    // away once its rounds run out. (Drive turns without acting so the goblin
    // never dies and the fight stays live across the reversion.)
    let state = clawed.state;
    let character: Character = {
      ...clawed.character,
      resources: { ...clawed.character.resources, wildShapeRoundsRemaining: 1 },
    };
    expect(WILD_SHAPE_ROUNDS).toBeGreaterThan(0);
    for (let guard = 0; guard < 12 && state.status === 'active'; guard++) {
      if (isPlayerTurn(state)) {
        if (!isWildShaped(character)) break;
        const et = endTurn(state, character);
        state = et.state;
        character = et.character;
      } else {
        const ma = monsterAttack({ roller, character, state }, monsterId(state));
        state = ma.state;
        character = ma.character;
        if (state.status !== 'active') break;
        const et = endTurn(state, character);
        state = et.state;
        character = et.character;
      }
    }
    expect(isWildShaped(character)).toBe(false);
  });

  it('the bot reaches for Wild Shape when the spell book is spent', () => {
    const roller = createDiceRoller(3);
    const druid = makeDruid(2);
    const init = createCombat({ roller, character: druid, monsters: [{ def: getMonster('goblin') }] });
    // Empty the slot pool so only the cantrip remains — the policy should then
    // commit to the beast form for its claws + vitality.
    const drySlots: Character = {
      ...init.character,
      resources: { ...init.character.resources, spellSlots: {} },
    };
    const action = chooseCombatAction(init.state, drySlots);
    expect(action.kind).toBe('wild-shape');
  });
});

describe('Druid — spellcasting', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('casts a nature spell that lands damage', () => {
    const roller = createDiceRoller(5);
    const druid = makeDruid(3);
    const init = createCombat({ roller, character: druid, monsters: [{ def: getMonster('goblin') }] });
    const mid = monsterId(init.state);
    const before = monsterHp(init.state, mid);
    const cast = applyPlannedAction(
      { roller, state: init.state, character: init.character },
      { kind: 'cast', spellId: 'produce-flame', targetId: mid },
    );
    expect(monsterHp(cast.state, mid)).toBeLessThan(before);
  });
});

describe('Druid — Wild Shape is a worthwhile spike (buffed temp HP + claws)', () => {
  it('grants a deeper temp-HP cushion than before, scaling with level', () => {
    // Old formula: (moon ? 6 : 3) + level * (moon ? 2 : 1) → L2 base = 5, moon = 10.
    expect(wildShapeTempHp(makeDruid(2))).toBeGreaterThan(5);
    expect(wildShapeTempHp(makeDruid(2, 'circle-of-the-moon'))).toBeGreaterThan(10);
    // Still climbs with the soul, and the Moon circle still wears the sturdier form.
    expect(wildShapeTempHp(makeDruid(20))).toBeGreaterThan(wildShapeTempHp(makeDruid(2)));
    expect(wildShapeTempHp(makeDruid(20, 'circle-of-the-moon'))).toBeGreaterThan(
      wildShapeTempHp(makeDruid(20)),
    );
  });

  it('rends with a heavier beast strike than the simple sickle it drops', () => {
    const claws = getItem('beast-claws');
    const dire = getItem('dire-claws');
    expect(claws.kind).toBe('weapon');
    expect(dire.kind).toBe('weapon');
    if (claws.kind === 'weapon') {
      expect(claws.damage).toBe('1d8'); // was 1d6 — now out-bites the 1d6 sickle
      expect(claws.damageMod).toBe(1);
    }
    if (dire.kind === 'weapon') {
      expect(dire.damage).toBe('1d10'); // was 1d8
      expect(dire.damageMod).toBe(3); // was 2
    }
  });
});

describe('Druid — at-will Produce Flame sits clearly below the L1 Thornlash', () => {
  // A FREE cantrip must read as weaker than a slot-costing L1, at every level, so
  // the slot is worth spending. Compare the cantrip's FULL damage (an upper bound
  // — Produce Flame is further halved on a DEX save) against Thornlash's auto-hit
  // expected: even the upper bound stays below.
  const THORN_DART_AVG = 4.5; // 1d6+1 per thorn (the druid's heavier barb)

  function produceFlameFull(level: number): number {
    const d = makeDruid(level);
    return 5.5 * spellDamageMultiplier(d, 0) + spellcastingMod(d);
  }
  function thornlashExpected(level: number): number {
    return magicMissileDartCount(level) * THORN_DART_AVG;
  }

  it('Thornlash out-damages Produce Flame at L1 / L5 / L11 / L20', () => {
    for (const level of [1, 5, 11, 20]) {
      expect(produceFlameFull(level)).toBeLessThan(thornlashExpected(level));
    }
  });
});

describe('Druid — at-will spells wear a nature look, not the wizard arcane VFX', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function castKind(spellId: string, level: number, slots1 = 0): string | undefined {
    const roller = createDiceRoller(9);
    const druid = makeDruid(level);
    const init = createCombat({ roller, character: druid, monsters: [{ def: getMonster('goblin') }] });
    const character: Character = slots1
      ? {
          ...init.character,
          resources: {
            ...init.character.resources,
            spellSlots: { ...init.character.resources.spellSlots, 1: slots1 },
          },
        }
      : init.character;
    const cast = applyPlannedAction(
      { roller, state: init.state, character },
      { kind: 'cast', spellId, targetId: monsterId(init.state) },
    );
    return cast.state.spellEffectEvent?.kind;
  }

  it('Produce Flame renders as nature-flame (not the wizard spell-bolt)', () => {
    expect(castKind('produce-flame', 3)).toBe('nature-flame');
  });

  it('Thornlash renders as thorn-lash (not the wizard magic-missile)', () => {
    expect(castKind('thornlash', 3, 2)).toBe('thorn-lash');
  });

  it('the wizard at-wills keep their arcane look', () => {
    const roller = createDiceRoller(9);
    const wizard = buildPlayerCharacter(presetCreationInput('wizard'));
    const init = createCombat({ roller, character: wizard, monsters: [{ def: getMonster('goblin') }] });
    const mid = monsterId(init.state);
    const fb = applyPlannedAction(
      { roller, state: init.state, character: init.character },
      { kind: 'cast', spellId: 'fire-bolt', targetId: mid },
    );
    expect(fb.state.spellEffectEvent?.kind).toBe('spell-bolt');
    const mm = applyPlannedAction(
      { roller, state: init.state, character: init.character },
      { kind: 'cast', spellId: 'magic-missile', targetId: mid },
    );
    expect(mm.state.spellEffectEvent?.kind).toBe('magic-missile');
  });
});
