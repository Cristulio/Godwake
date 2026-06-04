import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { DiceExpression, RollAdvantage, RollResult } from '../../../types/dice';
import type { DiceRoller } from '../../dice';
import {
  REF_CASTING_MOD,
  scaleSpellDamage,
  spellAcquisitionLevel,
  spellDamageMultiplier,
} from './scaling';

/**
 * A wizard with a precise INT modifier and character level. Wood-elf grants no
 * INT, so the effective modifier is exactly abilityModifier(int) = intMod, and a
 * wizard keys spells off INT — so spellcastingMod === intMod here.
 */
function caster(level: number, intMod: number): Character {
  const base = createCharacter({
    id: 'scaling-test',
    name: 'Probe',
    raceId: 'wood-elf',
    classId: 'wizard',
    baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10 + 2 * intMod, wis: 10, cha: 10 },
    skillProficiencies: ['arcana'],
  });
  return { ...base, level };
}

// --- Invariant 1: acquisition power preserved -------------------------------

describe('spell scaling — acquisition power preserved', () => {
  it('multiplier is exactly 1 at acqLevel with the reference casting modifier', () => {
    for (const tier of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const acq = spellAcquisitionLevel(tier);
      const c = caster(acq, REF_CASTING_MOD);
      expect(spellDamageMultiplier(c, acq)).toBe(1);
      // The rolled base passes through untouched (within rounding) — a spell is
      // exactly as strong as today the moment you gain it.
      expect(scaleSpellDamage(28, c, acq)).toBe(28);
      expect(scaleSpellDamage(105, c, acq)).toBe(105);
    }
  });

  it('a caster below a spell tier still casts it at its printed base (level factor floors at 1)', () => {
    // Force-granting a 9th-level slot to an L1 caster must not amplify it.
    expect(spellDamageMultiplier(caster(1, REF_CASTING_MOD), spellAcquisitionLevel(9))).toBe(1);
  });
});

// --- Invariant 2: monotonic in level and in INT -----------------------------

describe('spell scaling — monotonic growth', () => {
  it('expected damage strictly increases with character level', () => {
    const acq = spellAcquisitionLevel(1);
    let prev = -Infinity;
    for (let level = acq; level <= 20; level++) {
      const m = spellDamageMultiplier(caster(level, REF_CASTING_MOD), acq);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });

  it('expected damage strictly increases with the casting modifier', () => {
    const acq = spellAcquisitionLevel(3);
    let prev = -Infinity;
    for (let intMod = 0; intMod <= 6; intMod++) {
      const m = spellDamageMultiplier(caster(10, intMod), acq);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });
});

// --- Invariant 3: tier ordering preserved at every level --------------------

describe('spell scaling — tier ordering preserved', () => {
  // Real bases: Fire Bolt 1d10, Burning Hands 3d6, Fireball 8d6, Unmake 18d8.
  const CHAIN = [
    { tier: 0, base: 5.5 },
    { tier: 1, base: 10.5 },
    { tier: 3, base: 28 },
    { tier: 9, base: 81 },
  ];

  it('a higher-tier spell out-damages a lower-tier one at the same level + INT', () => {
    for (const level of [17, 20]) {
      const c = caster(level, REF_CASTING_MOD);
      const dmg = CHAIN.map((s) => s.base * spellDamageMultiplier(c, spellAcquisitionLevel(s.tier)));
      for (let i = 1; i < dmg.length; i++) {
        expect(dmg[i]).toBeGreaterThan(dmg[i - 1]);
      }
    }
  });

  it('Fireball always out-damages Burning Hands, every level and casting mod', () => {
    for (let level = 5; level <= 20; level++) {
      for (const intMod of [0, 3, 5]) {
        const c = caster(level, intMod);
        const fireball = 28 * spellDamageMultiplier(c, spellAcquisitionLevel(3));
        const burningHands = 10.5 * spellDamageMultiplier(c, spellAcquisitionLevel(1));
        expect(fireball).toBeGreaterThan(burningHands);
      }
    }
  });

  it('the cantrip never overtakes the cheapest leveled spell it shares a curve with', () => {
    // Fire Bolt (1d10, acq 1) vs Burning Hands (3d6, acq 1): same anchor, so the
    // larger base always wins — the cantrip can never eclipse a real slot.
    for (let level = 1; level <= 20; level++) {
      const c = caster(level, 5);
      const fireBolt = 5.5 * spellDamageMultiplier(c, spellAcquisitionLevel(0));
      const burningHands = 10.5 * spellDamageMultiplier(c, spellAcquisitionLevel(1));
      expect(fireBolt).toBeLessThan(burningHands);
    }
  });
});

// --- Invariant 4 + worked examples (handler-level) --------------------------

/** Damage dice all show `dieFace`; every d20 is a natural 1 so saves fail and
 *  the cast lands full — isolating the level multiplier from save variance. */
function failedSaveRoller(dieFace: number): DiceRoller {
  return {
    roll(expression: string | DiceExpression): RollResult {
      const expr =
        typeof expression === 'string' ? { count: 1, die: 6 as const, modifier: 0 } : expression;
      const rolls = Array.from({ length: expr.count }, () => dieFace);
      return {
        expression: expr,
        rolls,
        modifier: expr.modifier,
        total: rolls.reduce((a, b) => a + b, 0) + expr.modifier,
        natural20: false,
        natural1: false,
        advantage: 'normal',
      };
    },
    d20(advantage: RollAdvantage = 'normal', modifier = 0): RollResult {
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

function castDamage(spellId: string, level: number, dieFace: number): number {
  const goblin = getMonster('goblin');
  // Generous slots at every tier + a high-HP target so the damage line is the
  // full pre-clamp number regardless of the foe's HP.
  let w = caster(level, REF_CASTING_MOD);
  w = {
    ...w,
    resources: { ...w.resources, spellSlots: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5 } },
  };
  const init = createCombat({ roller: failedSaveRoller(dieFace), character: w, monsters: [{ def: goblin }] });
  const targetId = init.state.combatants.find((c) => c.kind === 'monster')!.id;
  const result = castSpell({
    roller: failedSaveRoller(dieFace),
    character: init.character,
    state: init.state,
    spellId,
    targetId,
  });
  const dmgLine = result.state.log.find(
    (l) => l.kind === 'damage' && /(\d+) (fire|force|necrotic|lightning|cold)/.test(l.text),
  )!;
  return Number(dmgLine.text.match(/(\d+) (?:fire|force|necrotic|lightning|cold)/)![1]);
}

describe('spell scaling — worked examples', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Burning Hands grows across levels (same roll, larger hit)', () => {
    const l1 = castDamage('burning-hands', 1, 4); // 3d6 all 4s = 12 at acquisition
    const l10 = castDamage('burning-hands', 10, 4);
    const l20 = castDamage('burning-hands', 20, 4);
    expect(l1).toBe(12); // acquisition power preserved exactly
    expect(l10).toBeGreaterThan(l1);
    expect(l20).toBeGreaterThan(l10);
  });

  it('Fire Bolt scales past the old L8 cap with no breakpoint freeze', () => {
    const l8 = castDamage('fire-bolt', 8, 7);
    const l14 = castDamage('fire-bolt', 14, 7);
    const l20 = castDamage('fire-bolt', 20, 7);
    expect(l14).toBeGreaterThan(l8);
    expect(l20).toBeGreaterThan(l14);
  });
});
