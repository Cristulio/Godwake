import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack, attackWeaponId, maxAttacksPerAction } from './attack/playerAttack';
import {
  beastWeaponId,
  PRIMAL_STRIKE_HIT_BONUS,
  PRIMAL_STRIKE_DAMAGE_BONUS,
} from './wildShape';
import {
  DRAGON_CLAW_HIT_BONUS,
  DRAGON_CLAW_DAMAGE_BONUS,
  DRAGON_CLAW_WEAPON_ID,
  SHAPE_CHANGE_ROUNDS,
} from './shapeChange';
import { WILD_SHAPE_ROUNDS } from './wildShape';
import {
  BEAR_CLAW_ATTACKS,
  BEAR_CLAW_DAMAGE_BONUS,
  BEAR_CLAW_HIT_BONUS,
  BEAR_CLAW_WEAPON_ID,
  BEAR_FORM_AC_BONUS,
  BEAR_FORM_ROUNDS,
} from './bearForm';
import { spellcastingMod, proficiencyBonus, computeAC } from '../character/derived';
import { parseDiceExpression } from '../dice';
import type { DiceRoller } from '../dice';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';
import type { RollAdvantage, RollResult } from '../../types/dice';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

/**
 * A fully scripted roller: every d20 returns the queued naturals in order
 * (repeating the last), every damage die lands on `dieFace` (clamped to the
 * die size). Deterministic to-hit AND damage — the form math is assertable
 * as an exact equation.
 */
function scriptedRoller(naturals: number[], dieFace = 5): DiceRoller {
  let i = 0;
  const result = (
    rolls: number[],
    modifier: number,
    advantage: RollAdvantage,
    die: number,
    count: number,
  ): RollResult => ({
    expression: { count, die: die as RollResult['expression']['die'], modifier },
    rolls,
    modifier,
    total: rolls.reduce((a, b) => a + b, 0) + modifier,
    natural20: die === 20 && rolls[0] === 20,
    natural1: die === 20 && rolls[0] === 1,
    advantage,
  });
  return {
    roll(expression, advantage = 'normal') {
      const expr =
        typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      if (expr.die === 20 && expr.count === 1) {
        return this.d20(advantage, expr.modifier);
      }
      const rolls = Array.from({ length: expr.count }, () => Math.min(dieFace, expr.die));
      return result(rolls, expr.modifier, 'normal', expr.die, expr.count);
    },
    d20(advantage = 'normal', modifier = 0) {
      const natural = naturals[Math.min(i, naturals.length - 1)];
      i += 1;
      return result([natural], modifier, advantage, 20, 1);
    },
    serialize: () => ({ state: 0 }),
  };
}

/** A level-17 wizard (the Shape Change band). */
function makeArchwizard(level = 17): Character {
  const base = createCharacter({
    id: 'dragon-wizard',
    name: 'Veyra Ash',
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
  return { ...base, level };
}

/** Enter the dragon form. Apply AFTER createCombat — combat setup refreshes
 *  per-combat resources, which clears a pre-set transform. */
function dragonForm(character: Character): Character {
  return {
    ...character,
    resources: { ...character.resources, dragonFormRoundsRemaining: SHAPE_CHANGE_ROUNDS },
  };
}

function makeDruid(level: number, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('druid'));
  return { ...base, level, subclassId };
}

/** Enter the beast form. Apply AFTER createCombat — combat setup refreshes
 *  per-combat resources, which clears a pre-set transform. */
function shapeshift(druid: Character): Character {
  return {
    ...druid,
    resources: { ...druid.resources, wildShapeRoundsRemaining: WILD_SHAPE_ROUNDS },
  };
}

/** Enter the Great Bear (Avatar of the Wilds) form. Apply AFTER createCombat. */
function bearForm(druid: Character): Character {
  return {
    ...druid,
    resources: { ...druid.resources, bearFormRoundsRemaining: BEAR_FORM_ROUNDS },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

beforeEach(() => _resetMonsterInstanceCounter());

describe('beast claw ladder — the form scales with its level band', () => {
  it('base circle climbs Beast → Elder (L9) → Primal (L17)', () => {
    expect(beastWeaponId(makeDruid(2))).toBe('beast-claws');
    expect(beastWeaponId(makeDruid(8))).toBe('beast-claws');
    expect(beastWeaponId(makeDruid(9))).toBe('beast-claws-elder');
    expect(beastWeaponId(makeDruid(16))).toBe('beast-claws-elder');
    expect(beastWeaponId(makeDruid(17))).toBe('beast-claws-primal');
    expect(beastWeaponId(makeDruid(20))).toBe('beast-claws-primal');
  });

  it('the Moon circle walks the heavier Dire → Savage (L9) → Apex (L17) ladder', () => {
    expect(beastWeaponId(makeDruid(3, 'circle-of-the-moon'))).toBe('dire-claws');
    expect(beastWeaponId(makeDruid(9, 'circle-of-the-moon'))).toBe('dire-claws-savage');
    expect(beastWeaponId(makeDruid(17, 'circle-of-the-moon'))).toBe('dire-claws-apex');
  });

  it('every claw tier out-bites the tier below it (dice + flat mod)', () => {
    const avg = (id: string): number => {
      const w = getItem(id);
      if (w.kind !== 'weapon') throw new Error(`${id} is not a weapon`);
      const expr = parseDiceExpression(w.damage);
      return (expr.count * (expr.die + 1)) / 2 + (w.damageMod ?? 0);
    };
    expect(avg('beast-claws-elder')).toBeGreaterThan(avg('beast-claws'));
    expect(avg('beast-claws-primal')).toBeGreaterThan(avg('beast-claws-elder'));
    expect(avg('dire-claws-savage')).toBeGreaterThan(avg('dire-claws'));
    expect(avg('dire-claws-apex')).toBeGreaterThan(avg('dire-claws-savage'));
    // The moon ladder stays ahead of the base ladder at every band.
    expect(avg('dire-claws')).toBeGreaterThan(avg('beast-claws'));
    expect(avg('dire-claws-savage')).toBeGreaterThan(avg('beast-claws-elder'));
    expect(avg('dire-claws-apex')).toBeGreaterThan(avg('beast-claws-primal'));
  });
});

describe('claw weapons carry the martial-beast contract', () => {
  const CLAW_IDS = [
    'beast-claws',
    'beast-claws-elder',
    'beast-claws-primal',
    'dire-claws',
    'dire-claws-savage',
    'dire-claws-apex',
    'dragon-claws',
    'worldbear-claws',
  ];

  it('every claw is a casterWeapon — the form attacks off the spellcasting stat', () => {
    for (const id of CLAW_IDS) {
      const w = getItem(id);
      expect(w.kind).toBe('weapon');
      if (w.kind === 'weapon') expect(w.casterWeapon, id).toBe(true);
    }
  });

  it('the dragon claw rolls heavy martial dice (3d8)', () => {
    const w = getItem('dragon-claws');
    if (w.kind === 'weapon') expect(w.damage).toBe('3d8');
  });
});

describe('attackWeaponId — the one shared weapon pick for player taps and the bot', () => {
  it('a wild-shaped druid swings its claws even with the sickle still equipped', () => {
    // REGRESSION: the CombatScreen pick used to skip the wild-shape arm, so a
    // human-driven druid in beast form swung its equipped sickle off STR 8 —
    // the live "Wild Shape misses too much" bug. The shared pick must resolve
    // to the claw profile whenever the form is up.
    const druid = makeDruid(9, 'circle-of-the-moon');
    expect(druid.equipped.mainHand?.itemId).toBe('sickle');
    expect(attackWeaponId(druid)).toBe('sickle');
    expect(attackWeaponId(shapeshift(druid))).toBe('dire-claws-savage');
  });

  it('dragon form outranks everything else', () => {
    const dragon = dragonForm(makeArchwizard());
    expect(attackWeaponId(dragon)).toBe(DRAGON_CLAW_WEAPON_ID);
  });

  it('the Great Bear form outranks the ordinary wild-shape claws', () => {
    // A druid that is BOTH wild-shaped and in the Avatar bear swings the bear,
    // not the beast-tier claw — the capstone form wins.
    const both = bearForm(shapeshift(makeDruid(17, 'circle-of-the-moon')));
    expect(attackWeaponId(both)).toBe(BEAR_CLAW_WEAPON_ID);
  });

  it('an unshaped character swings the equipped main-hand', () => {
    const druid = makeDruid(5);
    expect(attackWeaponId(druid)).toBe('sickle');
  });
});

describe('dragon form — to-hit and damage off Intelligence, not the dumped STR', () => {
  it('the claw attack bonus is INT mod + proficiency + the enchanted-claw bonus', () => {
    const init = createCombat({
      character: makeArchwizard(),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const dragon = dragonForm(init.character);
    const r = playerAttack(
      { roller: scriptedRoller([10]), character: dragon, state: init.state },
      findMonster(init.state).id,
      DRAGON_CLAW_WEAPON_ID,
    );
    const expected =
      spellcastingMod(dragon) + proficiencyBonus(dragon.level) + DRAGON_CLAW_HIT_BONUS;
    expect(r.state.lastAttack?.attackBonus).toBe(expected);
  });

  it('STR is irrelevant to the claw — a STR 30 dragon swings no truer than a STR 8 one', () => {
    const init = createCombat({
      character: makeArchwizard(),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const target = findMonster(init.state).id;
    const weak = dragonForm(init.character);
    const strong: Character = {
      ...weak,
      baseAbilityScores: { ...weak.baseAbilityScores, str: 30 },
    };
    const rWeak = playerAttack(
      { roller: scriptedRoller([10]), character: weak, state: init.state },
      target,
      DRAGON_CLAW_WEAPON_ID,
    );
    const rStrong = playerAttack(
      { roller: scriptedRoller([10]), character: strong, state: init.state },
      target,
      DRAGON_CLAW_WEAPON_ID,
    );
    expect(rStrong.state.lastAttack?.attackBonus).toBe(rWeak.state.lastAttack?.attackBonus);
  });

  it('a mid natural (10) connects against the fire giant (AC 20) — the pre-fix STR math missed', () => {
    // Pre-fix: STR 8 → −1 + prof 6 + 3 = +8, so a natural 10 totalled 18 < 20.
    // INT-driven the same swing clears: INT mod + 6 + 3 puts a mid roll over.
    const init = createCombat({
      character: makeArchwizard(),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const r = playerAttack(
      { roller: scriptedRoller([10]), character: dragonForm(init.character), state: init.state },
      findMonster(init.state).id,
      DRAGON_CLAW_WEAPON_ID,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
  });

  it('a connecting claw lands 3 dice + INT mod + claw bonus + affinity', () => {
    const init = createCombat({
      character: makeArchwizard(),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const dragon = dragonForm(init.character);
    const face = 5;
    const r = playerAttack(
      { roller: scriptedRoller([15], face), character: dragon, state: init.state },
      findMonster(init.state).id,
      DRAGON_CLAW_WEAPON_ID,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.state.lastAttack?.crit).toBe(false);
    // 3d8 at a scripted face, + INT (the casterWeapon damage stat), + the flat
    // dragon bonus, + the wizard-affinity edge baked on the claw def.
    const expected = 3 * face + spellcastingMod(dragon) + DRAGON_CLAW_DAMAGE_BONUS + 1;
    expect(r.state.lastAttack?.damageDealt).toBe(expected);
  });
});

describe('beast form — to-hit and damage off Wisdom, not the dumped STR/DEX', () => {
  it('the claw attack bonus is WIS mod + proficiency + the claw accuracy edge', () => {
    const init = createCombat({
      character: makeDruid(9, 'circle-of-the-moon'),
      monsters: [{ def: getMonster('goblin') }],
    });
    const druid = shapeshift(init.character);
    const clawId = beastWeaponId(druid);
    const claw = getItem(clawId);
    const r = playerAttack(
      { roller: scriptedRoller([10]), character: druid, state: init.state },
      findMonster(init.state).id,
      clawId,
    );
    const expected =
      spellcastingMod(druid) +
      proficiencyBonus(druid.level) +
      (claw.kind === 'weapon' ? (claw.attackMod ?? 0) : 0) +
      // L9 Moon carries Primal Strike (L6): a flat to-hit edge on every form swing.
      PRIMAL_STRIKE_HIT_BONUS;
    expect(r.state.lastAttack?.attackBonus).toBe(expected);
  });

  it('the same mid natural (10) hits the mid AC shaped, and misses with the dropped sickle', () => {
    // The owner-felt bug in one frame: at L9 vs AC 15, a natural 10 with the
    // sickle (STR 8 → −1 + prof 4) totals 13 — a miss. The beast claw (WIS-
    // driven + its accuracy edge) turns the identical roll into a hit.
    const druid = makeDruid(9, 'circle-of-the-moon');
    const init = createCombat({ character: druid, monsters: [{ def: getMonster('goblin') }] });
    const target = findMonster(init.state).id;

    const sickle = playerAttack(
      { roller: scriptedRoller([10]), character: init.character, state: init.state },
      target,
      'sickle',
    );
    expect(sickle.state.lastAttack?.hit).toBe(false);

    const shaped = shapeshift(init.character);
    const claw = playerAttack(
      { roller: scriptedRoller([10]), character: shaped, state: init.state },
      target,
      beastWeaponId(shaped),
    );
    expect(claw.state.lastAttack?.hit).toBe(true);
  });

  it('a connecting claw lands its dice + WIS mod + claw mod + affinity', () => {
    const init = createCombat({
      character: makeDruid(9, 'circle-of-the-moon'),
      monsters: [{ def: getMonster('goblin') }],
    });
    const druid = shapeshift(init.character);
    const clawId = beastWeaponId(druid);
    const claw = getItem(clawId);
    if (claw.kind !== 'weapon') throw new Error('claw is not a weapon');
    const face = 4;
    const r = playerAttack(
      { roller: scriptedRoller([15], face), character: druid, state: init.state },
      findMonster(init.state).id,
      clawId,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.state.lastAttack?.crit).toBe(false);
    const dice = parseDiceExpression(claw.damage);
    // L9 Moon carries Primal Strike (L6): each form hit bites a flat +2 deeper
    // (non-crit here, so the flat edge isn't doubled).
    const expected =
      dice.count * face +
      spellcastingMod(druid) +
      (claw.damageMod ?? 0) +
      1 +
      PRIMAL_STRIKE_DAMAGE_BONUS;
    expect(r.state.lastAttack?.damageDealt).toBe(expected);
  });
});

describe('Great Bear form (Avatar of the Wilds) — the druid capstone', () => {
  it('mauls with two claw strikes per Attack — an upgraded wild-shape', () => {
    expect(maxAttacksPerAction(bearForm(makeDruid(17)))).toBe(BEAR_CLAW_ATTACKS);
    // A plain wild-shaped druid makes a single strike — the bear is the upgrade.
    expect(maxAttacksPerAction(shapeshift(makeDruid(17)))).toBe(1);
  });

  it('wears thick hide — +AC while the form holds', () => {
    const druid = makeDruid(17);
    expect(computeAC(bearForm(druid))).toBe(computeAC(druid) + BEAR_FORM_AC_BONUS);
  });

  it('the claw attack bonus is WIS mod + proficiency + the bear-claw edge', () => {
    const init = createCombat({
      character: makeDruid(17),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const bear = bearForm(init.character);
    const r = playerAttack(
      { roller: scriptedRoller([10]), character: bear, state: init.state },
      findMonster(init.state).id,
      BEAR_CLAW_WEAPON_ID,
    );
    const expected =
      spellcastingMod(bear) + proficiencyBonus(bear.level) + BEAR_CLAW_HIT_BONUS;
    expect(r.state.lastAttack?.attackBonus).toBe(expected);
  });

  it('STR is irrelevant to the bear — the paw swings off Wisdom', () => {
    const init = createCombat({
      character: makeDruid(17),
      monsters: [{ def: getMonster('fire-giant') }],
    });
    const target = findMonster(init.state).id;
    const weak = bearForm(init.character);
    const strong: Character = {
      ...weak,
      baseAbilityScores: { ...weak.baseAbilityScores, str: 30 },
    };
    const rWeak = playerAttack(
      { roller: scriptedRoller([10]), character: weak, state: init.state },
      target,
      BEAR_CLAW_WEAPON_ID,
    );
    const rStrong = playerAttack(
      { roller: scriptedRoller([10]), character: strong, state: init.state },
      target,
      BEAR_CLAW_WEAPON_ID,
    );
    expect(rStrong.state.lastAttack?.attackBonus).toBe(rWeak.state.lastAttack?.attackBonus);
  });

  it('a connecting paw lands 2d12 + WIS mod + bear bonus + affinity', () => {
    const init = createCombat({
      character: makeDruid(17),
      monsters: [{ def: getMonster('goblin') }],
    });
    const bear = bearForm(init.character);
    const face = 5;
    const r = playerAttack(
      { roller: scriptedRoller([15], face), character: bear, state: init.state },
      findMonster(init.state).id,
      BEAR_CLAW_WEAPON_ID,
    );
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.state.lastAttack?.crit).toBe(false);
    // 2d12 at a scripted face, + WIS (the casterWeapon damage stat), + the flat
    // bear bonus, + the druid-affinity edge baked on the claw def.
    const expected = 2 * face + spellcastingMod(bear) + BEAR_CLAW_DAMAGE_BONUS + 1;
    expect(r.state.lastAttack?.damageDealt).toBe(expected);
  });
});
