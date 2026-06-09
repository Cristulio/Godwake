import { describe, it, expect } from 'vitest';
import {
  ASCENSION_LEVELS,
  MAX_ASCENSION,
  MAX_BOSS_HP_MULT,
  clampAscension,
  getAscensionLevel,
  ascensionMonsterHp,
  ascensionDamageMult,
  applyAscensionToMonster,
  ELITE_VARIANTS_FROM,
  BOSS_EXTRA_PHASE_FROM,
  DUNGEON_TWISTS_FROM,
  ASCENDANT_LOOT_FROM,
  ascensionEliteVariants,
  ascensionBossExtraPhase,
  ascensionDungeonTwists,
  ascensionAscendantLoot,
  ASCENSION_EXCLUSIVE_LOOT_FROM,
  ascensionExclusiveLoot,
  ascensionUpgradeCostMult,
} from './ascension';
import { createCombat, _resetMonsterInstanceCounter } from '../combat/createCombat';
import { getMonster } from '../../content/monsters';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import type { Character } from '../../types/character';

function makeFighter(): Character {
  return createCharacter({
    id: 'asc-fighter',
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
  });
}

describe('ascension config integrity', () => {
  it('indices line up with their level field, 0..MAX_ASCENSION', () => {
    expect(ASCENSION_LEVELS).toHaveLength(MAX_ASCENSION + 1);
    ASCENSION_LEVELS.forEach((lvl, idx) => expect(lvl.level).toBe(idx));
  });

  it('Ascension 0 is the neutral baseline', () => {
    const base = getAscensionLevel(0);
    expect(base.enemyHpMult).toBe(1);
    expect(base.enemyDamageMult).toBe(1);
    expect(base.bossHpMult).toBe(1);
    expect(base.startingGoldMult).toBe(1);
    expect(base.goldFindMult).toBe(1);
    expect(base.renownMult).toBe(1);
    expect(base.upgradeCostMult).toBe(1);
  });

  it('escalates monotonically — renown reward and difficulty never regress', () => {
    for (let i = 1; i <= MAX_ASCENSION; i++) {
      const prev = ASCENSION_LEVELS[i - 1];
      const cur = ASCENSION_LEVELS[i];
      expect(cur.renownMult).toBeGreaterThan(prev.renownMult);
      expect(cur.enemyHpMult).toBeGreaterThanOrEqual(prev.enemyHpMult);
      expect(cur.enemyDamageMult).toBeGreaterThanOrEqual(prev.enemyDamageMult);
      expect(cur.bossHpMult).toBeGreaterThanOrEqual(prev.bossHpMult);
      expect(cur.goldFindMult).toBeLessThanOrEqual(prev.goldFindMult);
      expect(cur.upgradeCostMult).toBeGreaterThan(prev.upgradeCostMult);
    }
  });

  it('Grove upgrade prices scale up with ascension standing, neutral at 0', () => {
    expect(ascensionUpgradeCostMult(0)).toBe(1);
    expect(ascensionUpgradeCostMult(MAX_ASCENSION)).toBeGreaterThan(1);
    for (let i = 1; i <= MAX_ASCENSION; i++) {
      expect(ascensionUpgradeCostMult(i)).toBeGreaterThan(ascensionUpgradeCostMult(i - 1));
    }
  });
});

describe('ascension content-gating predicates', () => {
  it('each helper is false one level below its threshold and true at it', () => {
    const cases: Array<[number, (l: number) => boolean]> = [
      [ELITE_VARIANTS_FROM, ascensionEliteVariants],
      [BOSS_EXTRA_PHASE_FROM, ascensionBossExtraPhase],
      [DUNGEON_TWISTS_FROM, ascensionDungeonTwists],
      [ASCENDANT_LOOT_FROM, ascensionAscendantLoot],
      [ASCENSION_EXCLUSIVE_LOOT_FROM, ascensionExclusiveLoot],
    ];
    for (const [from, fn] of cases) {
      expect(fn(from - 1)).toBe(false);
      expect(fn(from)).toBe(true);
      expect(fn(MAX_ASCENSION)).toBe(true);
    }
  });

  it('clamps fractional and out-of-range inputs before comparing', () => {
    expect(ascensionEliteVariants(ELITE_VARIANTS_FROM - 0.1)).toBe(false);
    expect(ascensionEliteVariants(99)).toBe(true);
    expect(ascensionAscendantLoot(-3)).toBe(false);
  });
});

describe('clampAscension', () => {
  it('clamps below 0, above MAX, and floors fractionals; defaults NaN to 0', () => {
    expect(clampAscension(-3)).toBe(0);
    expect(clampAscension(99)).toBe(MAX_ASCENSION);
    expect(clampAscension(2.9)).toBe(2);
    expect(clampAscension(Number.NaN)).toBe(0);
  });
});

describe('ascension monster scaling helpers', () => {
  it('does not change stats at level 0', () => {
    expect(ascensionMonsterHp(100, 0, false)).toBe(100);
    expect(ascensionMonsterHp(100, 0, true)).toBe(100);
    expect(ascensionDamageMult(0)).toBe(1);
  });

  it('applies the boss multiplier on top of the enemy HP multiplier, capped at the apex', () => {
    // Ascension 6 raw product is enemyHpMult 1.30 × bossHpMult 1.5 = 1.95×, but
    // the boss HP is capped at MAX_BOSS_HP_MULT to keep the apex finite (anti-stall).
    const regular = ascensionMonsterHp(100, 6, false);
    const boss = ascensionMonsterHp(100, 6, true);
    expect(regular).toBe(Math.round(100 * 1.3));
    expect(boss).toBe(Math.round(100 * MAX_BOSS_HP_MULT));
    expect(boss).toBeLessThan(Math.round(100 * 1.3 * 1.5)); // the cap actually engages
    expect(boss).toBeGreaterThan(regular);
    // …and still strictly above the Asc5 boss (1.25 × 1.25 = 1.5625×) — monotone.
    expect(boss).toBeGreaterThan(ascensionMonsterHp(100, 5, true));
  });

  it('applyAscensionToMonster scales only HP and returns the original def at level 0', () => {
    const def = getMonster('duergar-ilyich');
    expect(applyAscensionToMonster(def, 0, true)).toBe(def);
    const scaled = applyAscensionToMonster(def, 6, true);
    expect(scaled.maxHp).toBe(ascensionMonsterHp(def.maxHp, 6, true));
    expect(scaled.actions).toBe(def.actions);
  });
});

describe('createCombat — ascension scaling reaches the spawned encounter', () => {
  it('boss HP is higher under ascension and the damage multiplier is stamped on the instance', () => {
    _resetMonsterInstanceCounter();
    const def = getMonster('duergar-ilyich');
    const baseline = createCombat({
      character: makeFighter(),
      monsters: [{ def }],
      ascension: 0,
      isBoss: true,
    });
    const scaled = createCombat({
      character: makeFighter(),
      monsters: [{ def }],
      ascension: 6,
      isBoss: true,
    });
    const baseInstance = baseline.state.combatants.find((c) => c.kind === 'monster');
    const scaledInstance = scaled.state.combatants.find((c) => c.kind === 'monster');
    if (baseInstance?.kind !== 'monster' || scaledInstance?.kind !== 'monster') {
      throw new Error('expected a monster combatant');
    }
    expect(scaledInstance.instance.hp.max).toBe(ascensionMonsterHp(def.maxHp, 6, true));
    expect(scaledInstance.instance.hp.max).toBeGreaterThan(baseInstance.instance.hp.max);
    expect(scaledInstance.instance.damageMult).toBe(ascensionDamageMult(6));
    expect(baseInstance.instance.damageMult).toBeUndefined();
    // Ascension difficulty is multiplicative now, not a flat bonusDamage stamp.
    expect(scaledInstance.instance.bonusDamage).toBeUndefined();
  });

  it('a per-monster statMult scales HP and folds into the damage multiplier', () => {
    _resetMonsterInstanceCounter();
    const def = getMonster('ascendant-slayer');
    const scaled = createCombat({
      character: makeFighter(),
      monsters: [{ def, statMult: 0.5 }],
      ascension: 0,
    });
    const inst = scaled.state.combatants.find((c) => c.kind === 'monster');
    if (inst?.kind !== 'monster') throw new Error('expected a monster combatant');
    expect(inst.instance.hp.max).toBe(Math.round(def.maxHp * 0.5));
    expect(inst.instance.damageMult).toBe(0.5);
  });

  it('a statMult above the anchor multiplies with the ascension damage mult', () => {
    _resetMonsterInstanceCounter();
    const def = getMonster('ascendant-slayer');
    const scaled = createCombat({
      character: makeFighter(),
      monsters: [{ def, statMult: 1.5 }],
      ascension: 6,
    });
    const inst = scaled.state.combatants.find((c) => c.kind === 'monster');
    if (inst?.kind !== 'monster') throw new Error('expected a monster combatant');
    expect(inst.instance.hp.max).toBe(Math.round(ascensionMonsterHp(def.maxHp, 6, false) * 1.5));
    expect(inst.instance.damageMult).toBeCloseTo(ascensionDamageMult(6) * 1.5, 5);
  });

  it('non-boss enemies skip the boss multiplier', () => {
    const def = getMonster('duergar-ilyich');
    const asBoss = createCombat({ character: makeFighter(), monsters: [{ def }], ascension: 6, isBoss: true });
    const asMob = createCombat({ character: makeFighter(), monsters: [{ def }], ascension: 6, isBoss: false });
    const boss = asBoss.state.combatants.find((c) => c.kind === 'monster');
    const mob = asMob.state.combatants.find((c) => c.kind === 'monster');
    if (boss?.kind !== 'monster' || mob?.kind !== 'monster') throw new Error('expected monsters');
    expect(boss.instance.hp.max).toBeGreaterThan(mob.instance.hp.max);
  });
});
