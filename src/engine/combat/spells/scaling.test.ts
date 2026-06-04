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

/** A deterministic roller: every damage die shows `dieFace`, every d20 shows
 *  `d20Roll`. The caller picks the d20 outcome — 1 fails a save / misses, 20
 *  forces a crit, 19 is a clean non-crit hit — while the damage dice stay fixed
 *  so the level multiplier is isolated from roll variance. */
function fixedRoller(dieFace: number, d20Roll: number): DiceRoller {
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
        rolls: [d20Roll],
        modifier,
        total: d20Roll + modifier,
        natural20: d20Roll === 20,
        natural1: d20Roll === 1,
        advantage,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

/** Every d20 a natural 1 so saves fail and the cast lands full. */
const failedSaveRoller = (dieFace: number): DiceRoller => fixedRoller(dieFace, 1);
/** A nat-20 spell attack roll — forces the crit branch (doubled dice). */
const critRoller = (dieFace: number): DiceRoller => fixedRoller(dieFace, 20);
/** A clean non-crit hit (d20 19 clears a goblin's AC) — no dice doubling. */
const normalHitRoller = (dieFace: number): DiceRoller => fixedRoller(dieFace, 19);

/** Equip a +N main-hand — the flat enhancement axis playerAttack reads for a
 *  weapon swing, now also read by the shared spell scaler. */
function equipWeapon(c: Character, enhancement: number): Character {
  return {
    ...c,
    equipped: {
      ...c.equipped,
      mainHand: {
        itemId: 'quarterstaff',
        rolled: {
          baseId: 'quarterstaff',
          rarity: 'white',
          affixes: [],
          enhancement,
          name: `+${enhancement} Quarterstaff`,
        },
      },
    },
  };
}

function castDamage(
  spellId: string,
  level: number,
  dieFace: number,
  opts: { weaponEnh?: number; roller?: DiceRoller } = {},
): number {
  const goblin = getMonster('goblin');
  const roller = opts.roller ?? failedSaveRoller(dieFace);
  // Generous slots at every tier + the cast spell forced known, so any tier is
  // castable; the damage LINE reports the full pre-clamp number regardless of HP.
  let w = caster(level, REF_CASTING_MOD);
  w = {
    ...w,
    resources: {
      ...w.resources,
      knownSpells: [...(w.resources.knownSpells ?? []), spellId],
      spellSlots: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5 },
    },
  };
  if (opts.weaponEnh !== undefined) w = equipWeapon(w, opts.weaponEnh);
  const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
  const targetId = init.state.combatants.find((c) => c.kind === 'monster')!.id;
  const result = castSpell({
    roller,
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

// --- Invariant 5: equipped weapon enhancement (+N) adds flat spell damage ----

describe('spell scaling — weapon enhancement adds flat spell damage', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a +N main-hand adds exactly N, floored at 0 with no weapon or a +0', () => {
    const acq = spellAcquisitionLevel(3);
    const bare = caster(spellAcquisitionLevel(3), REF_CASTING_MOD); // multiplier == 1
    expect(scaleSpellDamage(28, bare, acq)).toBe(28); // no weapon -> +0
    expect(scaleSpellDamage(28, equipWeapon(bare, 0), acq)).toBe(28); // +0 weapon -> +0
    expect(scaleSpellDamage(28, equipWeapon(bare, 1), acq)).toBe(29);
    expect(scaleSpellDamage(28, equipWeapon(bare, 3), acq)).toBe(31);
  });

  it('the +N is flat — it never scales with character level or casting modifier', () => {
    const acq = spellAcquisitionLevel(1);
    for (const level of [1, 10, 20]) {
      for (const intMod of [0, 3, 6]) {
        const bare = caster(level, intMod);
        const armed = equipWeapon(bare, 3);
        // Whatever the level/INT multiplier does to the dice, the +3 lands on top.
        expect(scaleSpellDamage(40, armed, acq) - scaleSpellDamage(40, bare, acq)).toBe(3);
      }
    }
  });

  it('a miss (zero dice) carries no enhancement', () => {
    const armed = equipWeapon(caster(10, REF_CASTING_MOD), 3);
    expect(scaleSpellDamage(0, armed, spellAcquisitionLevel(2))).toBe(0);
  });

  it('rides a crit once — the +N is never doubled with the dice', () => {
    // Crit doubles the dice UPSTREAM (a nat 20 sends 10d6 -> 20d6); the scaler
    // only sees the already-doubled total, so the flat +N must land once on each.
    const acq = spellAcquisitionLevel(5);
    const armed = equipWeapon(caster(spellAcquisitionLevel(5), REF_CASTING_MOD), 3); // mult 1
    expect(scaleSpellDamage(30, armed, acq)).toBe(33); // 10d6 of 3s, +3 once
    expect(scaleSpellDamage(60, armed, acq)).toBe(63); // doubled dice, +3 once (not +6)
  });

  it('a +3 staff lands +3 on a real Fire Bolt; +0 / no weapon changes nothing', () => {
    const plain = castDamage('fire-bolt', 10, 7);
    expect(castDamage('fire-bolt', 10, 7, { weaponEnh: 3 })).toBe(plain + 3);
    expect(castDamage('fire-bolt', 10, 7, { weaponEnh: 0 })).toBe(plain);
  });

  it('a +3 staff adds +3 to a Void Ray crit, and the crit still doubles the dice', () => {
    const critPlain = castDamage('void-ray', 9, 3, { roller: critRoller(3) });
    const critArmed = castDamage('void-ray', 9, 3, { roller: critRoller(3), weaponEnh: 3 });
    const normalHit = castDamage('void-ray', 9, 3, { roller: normalHitRoller(3) });
    expect(critArmed).toBe(critPlain + 3); // enhancement added once, even on a crit
    expect(critPlain - normalHit).toBe(30); // crit added a second 10d6 of 3s = +30
  });
});
