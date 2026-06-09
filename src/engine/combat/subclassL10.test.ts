import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { listClasses } from '../../content/classes';
import { critRange } from '../character/derived';
import { rogueCunningActionMax } from '../character/actions';
import { martialPoolMax, regenMartialPoolForRound } from './martialResource';
import { stunningStrikeKiCost, useStunningStrike, monkKiMax, useFlurryOfBlows, martialArtsWeaponId } from './monk';
import { spellDamageBonus, empoweredEvocationBonus } from './spells/helpers';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { monsterAttack } from './attack/monsterAttack';
import { applyDamage } from './attack/damage';
import { useRage } from './rage';
import { createDiceRoller, parseDiceExpression, type DiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeChar(classId: ClassId, level: number, subclassId: string | null): Character {
  const base = buildPlayerCharacter(presetCreationInput(classId));
  return { ...base, level, subclassId };
}

function withMainHand(c: Character, itemId: string): Character {
  return { ...c, equipped: { ...c.equipped, mainHand: { itemId } } };
}

function monstersOf(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster');
}

function lastDamageLine(state: CombatState): string {
  const lines = state.log.filter((e) => e.kind === 'damage');
  return lines[lines.length - 1]?.text ?? '';
}

/** d20s scripted in order; every other die returns its (ceil) average. */
function scriptRoller(d20s: number[]): DiceRoller {
  let i = 0;
  const nextD20 = () => (i < d20s.length ? d20s[i++] : 10);
  return {
    d20(advantage = 'normal', modifier = 0) {
      const nat = nextD20();
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [nat],
        modifier,
        total: nat + modifier,
        natural20: nat === 20,
        natural1: nat === 1,
        advantage,
        discardedRoll: undefined,
      };
    },
    roll(expression, advantage = 'normal') {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      if (expr.die === 20 && expr.count === 1) {
        const nat = nextD20();
        return {
          expression: expr,
          rolls: [nat],
          modifier: expr.modifier,
          total: nat + expr.modifier,
          natural20: nat === 20,
          natural1: nat === 1,
          advantage,
          discardedRoll: undefined,
        };
      }
      const each = Math.ceil((expr.die + 1) / 2);
      const rolls = Array.from({ length: expr.count }, () => each);
      const sum = rolls.reduce((a, b) => a + b, 0);
      return {
        expression: expr,
        rolls,
        modifier: expr.modifier,
        total: sum + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
        discardedRoll: undefined,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

describe('L10/L11 features — surfaced at the right level', () => {
  // Mirror the LevelUpScreen lookup: the subclass exposes the new feature in
  // featuresByLevel at exactly the spec'd level, carrying its mechanic key.
  const expected: Array<[ClassId, string, string, string]> = [
    ['fighter', 'champion', '10', 'superior-critical'],
    ['fighter', 'battle-master', '10', 'tactical-reserve'],
    ['fighter', 'defender', '10', 'hold-the-wall'],
    ['wizard', 'evocation', '10', 'empowered-evocation'],
    ['wizard', 'abjuration', '10', 'arcane-ward'],
    ['wizard', 'illusion', '10', 'layered-veils'],
    ['barbarian', 'berserker', '10', 'intimidating-presence'],
    ['barbarian', 'totem-warrior', '10', 'aspect-of-the-bear'],
    ['rogue', 'thief', '11', 'deft-hands'],
    ['rogue', 'assassin', '11', 'mortal-strike'],
    ['rogue', 'swashbuckler', '11', 'rakish-duelist'],
    ['monk', 'way-of-the-open-hand', '10', 'ki-focus'],
    ['monk', 'way-of-shadow', '10', 'cloak-of-shadows'],
    ['ranger', 'hunter', '10', 'deeper-wound'],
    ['ranger', 'horde-breaker', '10', 'whirling-hunter'],
    ['ranger', 'giant-killer', '10', 'giantsbane'],
  ];

  it('every subclass gains its second archetype feature at the spec level', () => {
    const classes = listClasses();
    for (const [classId, subId, level, key] of expected) {
      const sub = classes.find((c) => c.id === classId)!.subclasses.find((s) => s.id === subId)!;
      const feats = sub.featuresByLevel[level] ?? [];
      expect(feats.some((f) => f.mechanicKey === key)).toBe(true);
    }
  });

  it('Druid Circle of the Moon keeps its existing L10 and gains nothing new', () => {
    const druid = listClasses().find((c) => c.id === 'druid')!;
    const moon = druid.subclasses.find((s) => s.id === 'circle-of-the-moon');
    if (moon) {
      const tens = moon.featuresByLevel['10'] ?? [];
      // Its existing L10 (Moonbound Vitality) stays; we added nothing alongside it.
      expect(tens.map((f) => f.id)).toEqual(['moonbound']);
    }
  });
});

describe('Fighter Champion — Superior Critical (18-20)', () => {
  it('widens the crit window to 18 at L10, 19 at L2', () => {
    expect(critRange(makeChar('fighter', 2, 'champion'))).toEqual([19, 20]);
    expect(critRange(makeChar('fighter', 10, 'champion'))).toEqual([18, 19, 20]);
  });
});

describe('Fighter Battle Master — Tactical Reserve', () => {
  it('deepens the Resolve pool by one', () => {
    expect(martialPoolMax(makeChar('fighter', 9, 'battle-master'))).toBe(3);
    expect(martialPoolMax(makeChar('fighter', 10, 'battle-master'))).toBe(4);
  });

  it('refreshes the deeper pool at combat start and tops up on round 2', () => {
    const bm = makeChar('fighter', 10, 'battle-master');
    const { character } = createCombat({
      roller: createDiceRoller(1),
      character: bm,
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(character.resources.martialPointsRemaining).toBe(4);
    // Spend one, then round 2 regenerates it (normal cadence starts round 3).
    const spent: Character = {
      ...character,
      resources: { ...character.resources, martialPointsRemaining: 3 },
    };
    expect(regenMartialPoolForRound(spent, 2).resources.martialPointsRemaining).toBe(4);
    // A plain Fighter has no round-2 tick.
    const plain = makeChar('fighter', 10, 'champion');
    const plainSpent: Character = {
      ...plain,
      resources: { ...plain.resources, martialPointsRemaining: 3 },
    };
    expect(regenMartialPoolForRound(plainSpent, 2).resources.martialPointsRemaining).toBe(3);
  });
});

describe('Fighter Defender — Hold the Wall', () => {
  it('grants temp HP = level the first time HP drops below half, once per fight', () => {
    const def = makeChar('fighter', 10, 'defender');
    const init = createCombat({
      roller: createDiceRoller(1),
      character: def,
      monsters: [{ def: getMonster('goblin') }],
    });
    // Reset to a clean cushionless sheet well above half.
    const fighter: Character = { ...init.character, hp: { current: 100, max: 100, temp: 0 } };
    const hit = applyDamage(init.state, 'player', 60, fighter);
    expect(hit.character.hp.current).toBe(40); // below half (50)
    expect(hit.character.hp.temp).toBe(10); // temp HP = level
    expect(hit.state.holdTheWallUsed).toBe(true);
    expect(hit.state.log.some((e) => /sets the line/i.test(e.text))).toBe(true);

    // A second below-half blow does not re-trigger.
    const again = applyDamage(hit.state, 'player', 5, hit.character);
    expect(again.character.hp.temp).toBe(5); // 10 temp soaked the 5, no fresh grant
  });
});

describe('Wizard Evocation — Empowered Evocation', () => {
  it('adds +floor(level/2) to the shared spell-damage rider', () => {
    expect(empoweredEvocationBonus(makeChar('wizard', 10, 'evocation'))).toBe(5);
    expect(empoweredEvocationBonus(makeChar('wizard', 10, 'abjuration'))).toBe(0);
    const evoc = makeChar('wizard', 10, 'evocation');
    const abj = makeChar('wizard', 10, 'abjuration');
    expect(spellDamageBonus(evoc) - spellDamageBonus(abj)).toBe(5);
  });
});

describe('Wizard Abjuration — Greater Arcane Ward', () => {
  it('deepens the per-combat ward from 2+level to 5+level at L10', () => {
    const startTemp = (c: Character) =>
      createCombat({ roller: createDiceRoller(1), character: c, monsters: [{ def: getMonster('goblin') }] })
        .character.hp.temp;
    expect(startTemp(makeChar('wizard', 9, 'abjuration'))).toBe(11); // 2 + 9
    expect(startTemp(makeChar('wizard', 10, 'abjuration'))).toBe(15); // 5 + 10
  });
});

describe('Wizard Illusion — Layered Veils', () => {
  it('opens combat with two mirror images at L10, one before', () => {
    const mirrors = (c: Character) =>
      createCombat({ roller: createDiceRoller(1), character: c, monsters: [{ def: getMonster('goblin') }] })
        .character.resources.mirrorImages ?? 0;
    expect(mirrors(makeChar('wizard', 9, 'illusion'))).toBe(1);
    expect(mirrors(makeChar('wizard', 10, 'illusion'))).toBe(2);
  });
});

describe('Barbarian Berserker — Intimidating Presence', () => {
  it('frightens the deadliest live foe for two rounds on entering Rage', () => {
    const barb: Character = {
      ...makeChar('barbarian', 10, 'berserker'),
      resources: { ...makeChar('barbarian', 10, 'berserker').resources, rageChargesRemaining: 3 },
    };
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barb,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('cinderwake-hound') }],
    });
    const raged = useRage({ character: init.character, state: init.state });
    const hound = monstersOf(raged.state).find((m) => m.instance.defId === 'cinderwake-hound')!;
    const goblin = monstersOf(raged.state).find((m) => m.instance.defId === 'goblin')!;
    // The big hound (most HP) is gripped; the goblin is not.
    const fear = hound.instance.conditions.find((c) => c.name === 'frightened');
    expect(fear?.duration).toEqual({ kind: 'rounds', value: 2 });
    expect(goblin.instance.conditions.some((c) => c.name === 'frightened')).toBe(false);
  });
});

describe('Barbarian Totem (Bear) — Aspect of the Bear', () => {
  it('girds temp HP = level when Rage takes hold (on a depleted cushion)', () => {
    const base = makeChar('barbarian', 10, 'totem-warrior');
    const init = createCombat({
      roller: createDiceRoller(1),
      character: { ...base, resources: { ...base.resources, rageChargesRemaining: 3 } },
      monsters: [{ def: getMonster('goblin') }],
    });
    // Simulate the start-of-combat ward already spent.
    const depleted: Character = { ...init.character, hp: { ...init.character.hp, temp: 0 } };
    const raged = useRage({ character: depleted, state: init.state });
    expect(raged.character.hp.temp).toBe(10);
    expect(raged.state.log.some((e) => /bear's hide/i.test(e.text))).toBe(true);
  });

  it('halves fire damage while raging', () => {
    const base = makeChar('barbarian', 10, 'totem-warrior');
    const init = createCombat({
      roller: createDiceRoller(1),
      character: { ...base, resources: { ...base.resources, rageChargesRemaining: 3 }, hp: { current: 200, max: 200, temp: 0 } },
      monsters: [{ def: getMonster('cinderwake-hound') }],
    });
    const raged = useRage({ character: init.character, state: init.state });
    const houndId = monstersOf(raged.state)[0].id;
    // Force the hound's fire swing to land (nat 20).
    const roller = scriptRoller([20]);
    const swung = monsterAttack({ roller, character: raged.character, state: raged.state }, houndId);
    expect(swung.state.log.some((e) => /resistance|reducido a la mitad|halved/i.test(e.text))).toBe(true);
  });
});

describe('Rogue Thief — Deft Hands', () => {
  it('adds one more Cunning Action use per combat at L11', () => {
    expect(
      rogueCunningActionMax(makeChar('rogue', 11, 'thief')) -
        rogueCunningActionMax(makeChar('rogue', 10, 'thief')),
    ).toBe(1);
  });
});

describe('Rogue Assassin — Mortal Strike', () => {
  it('auto-crits the opening strike against a full-HP foe', () => {
    const rogue = makeChar('rogue', 11, 'assassin');
    const init = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    const targetId = monstersOf(init.state)[0].id;
    // A low natural that would never crit on its own.
    const roller = scriptRoller([2]);
    const r = playerAttack({ roller, character: init.character, state: init.state }, targetId, 'rapier');
    expect(r.state.lastAttack?.crit).toBe(true);
    expect(r.state.lastAttack?.hit).toBe(true);
  });
});

describe('Rogue Swashbuckler — Rakish Duelist', () => {
  it('adds +2 to hit only when exactly one enemy is alive', () => {
    const rogue = makeChar('rogue', 11, 'swashbuckler');
    const oneFoe = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    const twoFoes = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const hitBonus = (init: { state: CombatState; character: Character }) => {
      const targetId = monstersOf(init.state)[0].id;
      const r = playerAttack({ roller: scriptRoller([10]), character: init.character, state: init.state }, targetId, 'rapier');
      return r.state.lastAttack?.attackBonus ?? 0;
    };
    expect(hitBonus(oneFoe) - hitBonus(twoFoes)).toBe(2);
  });
});

describe('Monk Open Hand — Ki Focus', () => {
  it('discounts Stunning Strike to 1 Ki and arms it for that much', () => {
    expect(stunningStrikeKiCost(makeChar('monk', 9, 'way-of-the-open-hand'))).toBe(2);
    expect(stunningStrikeKiCost(makeChar('monk', 10, 'way-of-the-open-hand'))).toBe(1);

    const base = makeChar('monk', 10, 'way-of-the-open-hand');
    const monk: Character = { ...base, resources: { ...base.resources, kiPointsRemaining: 1 } };
    const init = createCombat({ roller: createDiceRoller(1), character: monk, monsters: [{ def: getMonster('goblin') }] });
    const oneKi: Character = { ...init.character, resources: { ...init.character.resources, kiPointsRemaining: 1 } };
    const armed = useStunningStrike({ character: oneKi, state: init.state });
    expect(armed.character.stunningStrikeActive).toBe(true);
    expect(armed.character.resources.kiPointsRemaining).toBe(0);
  });

  it('deepens the Flurry bite to +4 while a flurry pours out', () => {
    const base = makeChar('monk', 10, 'way-of-the-open-hand');
    const monk: Character = { ...base, resources: { ...base.resources, kiPointsRemaining: monkKiMax(base) } };
    const init = createCombat({ roller: scriptRoller([18, 18]), character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    const weaponId = martialArtsWeaponId(flurried.character);
    const targetId = monstersOf(flurried.state)[0].id;
    // Strike 1 spends the action; strike 2 is the flurry extra (flurry still in play).
    let r = playerAttack({ roller: scriptRoller([18]), character: flurried.character, state: flurried.state }, targetId, weaponId);
    r = playerAttack({ roller: scriptRoller([18]), character: r.character, state: r.state }, targetId, weaponId);
    expect(lastDamageLine(r.state)).toMatch(/\+ 4 open hand/);
  });
});

describe('Monk Shadow — Cloak of Shadows', () => {
  it('deepens the shadow opener bonus to +6', () => {
    const base = makeChar('monk', 10, 'way-of-shadow');
    const monk: Character = { ...base, resources: { ...base.resources, kiPointsRemaining: monkKiMax(base) } };
    const init = createCombat({ roller: scriptRoller([18]), character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const targetId = monstersOf(init.state)[0].id;
    const r = playerAttack({ roller: scriptRoller([18]), character: init.character, state: init.state }, targetId, martialArtsWeaponId(init.character));
    expect(lastDamageLine(r.state)).toMatch(/\+ 6 shadow/);
  });
});

describe('Ranger Hunter — Deeper Wound', () => {
  it('rolls 2d8 of Colossus Slayer (10 on the scripted roller) vs a wounded foe', () => {
    const base = withMainHand(makeChar('ranger', 10, 'hunter'), 'longsword');
    const init = createCombat({ roller: createDiceRoller(1), character: base, monsters: [{ def: getMonster('cinderwake-hound') }] });
    // Wound the foe (below max) so Colossus Slayer can trigger.
    const woundedState: CombatState = {
      ...init.state,
      combatants: init.state.combatants.map((c) =>
        c.kind === 'monster' ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: c.instance.hp.max - 1 } } } : c,
      ),
    };
    const targetId = monstersOf(woundedState)[0].id;
    const r = playerAttack({ roller: scriptRoller([18]), character: init.character, state: woundedState }, targetId, 'longsword');
    expect(lastDamageLine(r.state)).toMatch(/\+ 10 colossus \(2d8\)/);
  });
});

describe('Ranger Horde Breaker — Whirling Hunter', () => {
  it('carries the shot into two further foes instead of one', () => {
    const base = withMainHand(makeChar('ranger', 10, 'horde-breaker'), 'longsword');
    const init = createCombat({
      roller: scriptRoller([18]),
      character: base,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const targetId = monstersOf(init.state)[0].id;
    const r = playerAttack({ roller: scriptRoller([18]), character: init.character, state: init.state }, targetId, 'longsword');
    const carries = r.state.log.filter((e) => /carries|continúa/i.test(e.text));
    expect(carries.length).toBe(2);
  });
});

describe('Ranger Giant Killer — Giantsbane', () => {
  it('drives 2d10 (12 scripted) into the room\'s great threat', () => {
    const base = withMainHand(makeChar('ranger', 10, 'giant-killer'), 'longsword');
    const init = createCombat({
      roller: createDiceRoller(1),
      character: base,
      monsters: [{ def: getMonster('cinderwake-hound') }],
      isElite: true,
    });
    const targetId = monstersOf(init.state)[0].id;
    const r = playerAttack({ roller: scriptRoller([18]), character: init.character, state: init.state }, targetId, 'longsword');
    expect(lastDamageLine(r.state)).toMatch(/\+ 12 giant-killer/);
  });
});
