import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { getClass, listClasses } from '../../content/classes';
import { computeAC, characterHasMechanic } from '../character/derived';
import {
  monkKiMax,
  monkKiSaveDC,
  martialArtsWeaponId,
  flurryStrikeCount,
  useFlurryOfBlows,
  usePatientDefense,
  useStunningStrike,
  monkHasPendingTurnAction,
  monkFightsUnarmed,
  monkKitActive,
  isUnarmedStrikeId,
  isMonkWeaponId,
} from './monk';
import { equipItem, unequipSlot } from '../character/equip';
import {
  classUnlockRenown,
  STARTER_CLASSES,
  isClassUnlocked,
} from '../progression/unlocks';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { monsterAttack } from './attack/monsterAttack';
import { chooseCombatAction, applyPlannedAction, runAutoTurn } from './actionPolicy';
import { endTurn } from './turn';
import { createDiceRoller, parseDiceExpression, type DiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeMonk(level = 1, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('monk'));
  const c: Character = { ...base, level, subclassId };
  return { ...c, resources: { ...c.resources, kiPointsRemaining: monkKiMax(c) } };
}

function withMainHand(c: Character, itemId: string | null, enhancement = 0): Character {
  const mainHand =
    itemId === null
      ? null
      : enhancement > 0
        ? { itemId, rolled: { baseId: itemId, rarity: 'green' as const, affixes: [], enhancement, name: itemId } }
        : { itemId };
  return { ...c, equipped: { ...c.equipped, mainHand } };
}

function monsterOf(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

function monsterHp(state: CombatState, id: string): number {
  const m = state.combatants.find((c) => c.id === id) as MonsterCombatant;
  return m.instance.hp.current;
}

/**
 * A roller whose d20 results are scripted in order (one value consumed per d20,
 * advantage/disadvantage notwithstanding); every other die returns its average.
 * Lets a test force an attack to land and a save to fail deterministically.
 */
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

describe('Monk — class definition + registry', () => {
  it('is registered as a Dexterity martial and validates', () => {
    const monk = getClass('monk');
    expect(monk.id).toBe('monk');
    expect(monk.primaryAbility).toContain('dex');
    expect(monk.hitDie).toBe(8);
    expect(listClasses().some((c) => c.id === 'monk')).toBe(true);
  });

  it('wears no armour — Unarmored Defense is the guard', () => {
    expect(getClass('monk').armorProficiency?.categories).toEqual([]);
  });

  it('grows its signature kit on the L1→20 ladder', () => {
    expect(characterHasMechanic(makeMonk(1), 'martial-arts')).toBe(true);
    expect(characterHasMechanic(makeMonk(1), 'unarmored-defense-wis')).toBe(true);
    expect(characterHasMechanic(makeMonk(1), 'ki')).toBe(true);
    expect(characterHasMechanic(makeMonk(1), 'flurry-of-blows')).toBe(true);
    expect(characterHasMechanic(makeMonk(1), 'patient-defense')).toBe(false);
    expect(characterHasMechanic(makeMonk(2), 'patient-defense')).toBe(true);
    expect(characterHasMechanic(makeMonk(4), 'extra-attack')).toBe(false);
    expect(characterHasMechanic(makeMonk(5), 'extra-attack')).toBe(true);
    expect(characterHasMechanic(makeMonk(5), 'stunning-strike')).toBe(true);
    expect(characterHasMechanic(makeMonk(6), 'ki-empowered')).toBe(true);
    expect(characterHasMechanic(makeMonk(9), 'flurry-three')).toBe(true);
    expect(characterHasMechanic(makeMonk(20), 'perfect-self')).toBe(true);
  });
});

describe('Monk — empty-handed by default (no phantom Fists item)', () => {
  it('spawns with a bare main-hand and owns no weapon at all', () => {
    const monk = buildPlayerCharacter(presetCreationInput('monk'));
    expect(monk.equipped.mainHand).toBeNull();
    expect(monk.inventory.some((ref) => ref.itemId.startsWith('monk-fists'))).toBe(false);
    expect(monk.inventory.some((ref) => ref.itemId === 'shortsword')).toBe(false);
    expect(monkFightsUnarmed(monk)).toBe(true);
    expect(monkKitActive(monk)).toBe(true);
  });

  it('equipping a weapon and unequipping it returns the slot to clean unarmed', () => {
    const base = makeMonk(5);
    const armed = equipItem(
      { ...base, inventory: [...base.inventory, { itemId: 'shortsword' }] },
      base.inventory.length,
    );
    expect(armed.equipped.mainHand?.itemId).toBe('shortsword');
    expect(monkFightsUnarmed(armed)).toBe(false);
    expect(monkKitActive(armed)).toBe(false);

    const bare = unequipSlot(armed, 'mainHand');
    expect(bare.equipped.mainHand).toBeNull();
    expect(monkFightsUnarmed(bare)).toBe(true);
    expect(monkKitActive(bare)).toBe(true);
  });
});

describe('Monk — renown-600 unlock (not a starter)', () => {
  it('is sealed until 600 renown has been spent (last non-starter, origin-invariant)', () => {
    // Always the deepest rung — 600 renown spent — whichever starter the soul forged.
    expect(classUnlockRenown('monk', 'fighter')).toBe(600);
    expect(classUnlockRenown('monk', 'wizard')).toBe(600);
    expect(STARTER_CLASSES).not.toContain('monk');
    expect(isClassUnlocked('monk', 599, 'fighter')).toBe(false);
    expect(isClassUnlocked('monk', 600, 'fighter')).toBe(true);
  });
});

describe('Monk — Martial Arts + Ki scaling', () => {
  it('scales the unarmed die with the school', () => {
    expect(martialArtsWeaponId(makeMonk(1))).toBe('monk-fists');
    expect(martialArtsWeaponId(makeMonk(5))).toBe('monk-fists-adept');
    expect(martialArtsWeaponId(makeMonk(11))).toBe('monk-fists-master');
    expect(martialArtsWeaponId(makeMonk(17))).toBe('monk-fists-grandmaster');
  });

  it('Ki pool is the monk’s level, +2 at the L20 capstone', () => {
    expect(monkKiMax(makeMonk(1))).toBe(1);
    expect(monkKiMax(makeMonk(10))).toBe(10);
    expect(monkKiMax(makeMonk(20))).toBe(22);
  });

  it('Flurry throws 2 strikes, 3 at L9, 4 at the capstone', () => {
    expect(flurryStrikeCount(makeMonk(1))).toBe(2);
    expect(flurryStrikeCount(makeMonk(9))).toBe(3);
    expect(flurryStrikeCount(makeMonk(20))).toBe(4);
  });

  it('keys its Ki save DC off Wisdom and proficiency', () => {
    // Wood Elf preset: WIS 15 (+2), L5 prof +3 → 8 + 3 + 2 = 13.
    expect(monkKiSaveDC(makeMonk(5))).toBe(13);
  });
});

describe('Monk — Unarmored Defense (DEX + WIS)', () => {
  it('computes AC as 10 + DEX + WIS while unarmored', () => {
    // Wood Elf preset: DEX 17 (+3), WIS 15 (+2) → 10 + 3 + 2 = 15.
    expect(computeAC(makeMonk(1))).toBe(15);
  });
});

describe('Monk — combat wiring', () => {
  it('refills the Ki well and clears stale stances each encounter', () => {
    const monk: Character = {
      ...makeMonk(5),
      resources: { kiPointsRemaining: 0 },
      flurryStrikesRemaining: 3,
      patientDefenseActive: true,
      stunningStrikeActive: true,
    };
    const roller = createDiceRoller(1);
    const { character } = createCombat({
      roller,
      character: monk,
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(character.resources.kiPointsRemaining).toBe(monkKiMax(monk));
    expect(character.flurryStrikesRemaining ?? 0).toBe(0);
    expect(character.patientDefenseActive ?? false).toBe(false);
    expect(character.stunningStrikeActive ?? false).toBe(false);
  });

  it('Flurry of Blows spends Ki and lets the monk keep striking after the action', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeMonk(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const kiBefore = init.character.resources.kiPointsRemaining ?? 0;
    const targetId = monsterOf(init.state).id;

    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    expect(flurried.character.resources.kiPointsRemaining).toBe(kiBefore - 1);
    expect(flurried.character.flurryStrikesRemaining).toBe(2);
    expect(flurried.character.actionEconomy.bonusActionUsed).toBe(true);

    // Strike 1 spends the Attack action (L1 = one swing per action).
    let r = playerAttack({ roller, character: flurried.character, state: flurried.state }, targetId, 'monk-fists');
    expect(r.character.actionEconomy.actionUsed).toBe(true);
    expect(r.character.flurryStrikesRemaining).toBe(2);
    // Strikes 2 and 3 burn the queued flurry strikes without re-spending the action.
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, 'monk-fists');
    expect(r.character.flurryStrikesRemaining).toBe(1);
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, 'monk-fists');
    expect(r.character.flurryStrikesRemaining).toBe(0);
  });

  it('drops an unspent flurry at end of turn (burst, not banked)', () => {
    const init = createCombat({
      roller: createDiceRoller(7),
      character: makeMonk(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    expect(flurried.character.flurryStrikesRemaining).toBe(2);
    const ended = endTurn(flurried.state, flurried.character);
    expect(ended.character.flurryStrikesRemaining ?? 0).toBe(0);
  });

  it('Patient Defense makes incoming attacks roll at disadvantage', () => {
    const roller = createDiceRoller(11);
    const init = createCombat({
      roller,
      character: makeMonk(2),
      monsters: [{ def: getMonster('goblin') }],
    });
    const guarded = usePatientDefense({ character: init.character, state: init.state });
    expect(guarded.character.patientDefenseActive).toBe(true);
    expect(guarded.character.resources.kiPointsRemaining).toBe(
      (init.character.resources.kiPointsRemaining ?? 0) - 1,
    );

    const monsterId = monsterOf(guarded.state).id;
    const swung = monsterAttack({ roller, character: guarded.character, state: guarded.state }, monsterId);
    expect(swung.state.log.some((e) => /patient defense/i.test(e.text))).toBe(true);

    // The guard lifts at the start of the monk's next turn.
    const back = endTurn(swung.state, swung.character);
    // walk the order back around to the player
    let s = back.state;
    let ch = back.character;
    while (s.turnOrder[s.currentTurnIndex] !== 'player') {
      const r = endTurn(s, ch);
      s = r.state;
      ch = r.character;
    }
    expect(ch.patientDefenseActive ?? false).toBe(false);
  });

  it('Stunning Strike staggers a foe whose save fails', () => {
    // Force the attack to land (nat 18) then the foe's CON save to fail (nat 1).
    const roller = scriptRoller([18, 1]);
    const init = createCombat({
      roller,
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });
    const armed = useStunningStrike({ character: init.character, state: init.state });
    expect(armed.character.stunningStrikeActive).toBe(true);
    const kiAfterArm = armed.character.resources.kiPointsRemaining ?? 0;

    const targetId = monsterOf(armed.state).id;
    const r = playerAttack({ roller, character: armed.character, state: armed.state }, targetId, martialArtsWeaponId(armed.character));
    // The blow connected (goblin survives a single non-crit unarmed hit), the
    // save failed, so the foe is staggered and the stance has cleared.
    expect(monsterHp(r.state, targetId)).toBeGreaterThan(0);
    const m = r.state.combatants.find((c) => c.id === targetId) as MonsterCombatant;
    expect(m.instance.staggeredTurns).toBe(1);
    expect(r.character.stunningStrikeActive ?? false).toBe(false);
    expect(kiAfterArm).toBe((init.character.resources.kiPointsRemaining ?? 0) - 3);
  });

  it('Stunning Strike costs 3 Ki — armed at 3, refused at 2', () => {
    const init = createCombat({
      roller: createDiceRoller(7),
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });

    // 2 Ki is no longer enough: the stance refuses to arm and spends nothing.
    const twoKi: Character = {
      ...init.character,
      resources: { ...init.character.resources, kiPointsRemaining: 2 },
    };
    const refused = useStunningStrike({ character: twoKi, state: init.state });
    expect(refused.character.stunningStrikeActive ?? false).toBe(false);
    expect(refused.character.resources.kiPointsRemaining).toBe(2);

    // 3 Ki arms it and drains the trio.
    const threeKi: Character = {
      ...init.character,
      resources: { ...init.character.resources, kiPointsRemaining: 3 },
    };
    const armed = useStunningStrike({ character: threeKi, state: init.state });
    expect(armed.character.stunningStrikeActive).toBe(true);
    expect(armed.character.resources.kiPointsRemaining).toBe(0);
  });
});

describe('Monk — turn auto-end guard (monkHasPendingTurnAction)', () => {
  it('holds the turn while a Flurry still has queued strikes — even after the bonus is spent', () => {
    const base = makeMonk(5);
    const midFlurry: Character = {
      ...base,
      flurryStrikesRemaining: 2,
      actionEconomy: { ...base.actionEconomy, bonusActionUsed: true },
    };
    expect(monkHasPendingTurnAction(midFlurry)).toBe(true);
  });

  it('holds the turn for an unspent Ki bonus', () => {
    // Fresh L5 monk: Ki in the well, bonus action unspent.
    expect(monkHasPendingTurnAction(makeMonk(5))).toBe(true);
  });

  it('releases the turn once the bonus is spent and no strikes remain', () => {
    const base = makeMonk(5);
    const spent: Character = {
      ...base,
      flurryStrikesRemaining: 0,
      actionEconomy: { ...base.actionEconomy, bonusActionUsed: true },
    };
    expect(monkHasPendingTurnAction(spent)).toBe(false);
  });

  it('releases the turn when the Ki well is dry and nothing is queued', () => {
    const base = makeMonk(5);
    const dry: Character = {
      ...base,
      flurryStrikesRemaining: 0,
      resources: { ...base.resources, kiPointsRemaining: 0 },
    };
    expect(monkHasPendingTurnAction(dry)).toBe(false);
  });

  it('never holds a non-monk', () => {
    expect(monkHasPendingTurnAction({ ...makeMonk(5), classId: 'fighter' })).toBe(false);
  });

  it('releases a monk whose held ordinary weapon stills the kit; holds a monk-weapon wielder', () => {
    expect(monkHasPendingTurnAction(withMainHand(makeMonk(5), 'shortsword'))).toBe(false);
    expect(monkHasPendingTurnAction(withMainHand(makeMonk(5), 'monk-war-staff'))).toBe(true);
  });
});

describe('Monk — Wholeness of Body temp HP', () => {
  function startTempHp(character: Character): number {
    const out = createCombat({
      roller: createDiceRoller(1),
      character,
      monsters: [{ def: getMonster('goblin') }],
    });
    return out.character.hp.temp;
  }

  it('cushions with temp HP equal to the monk’s level (not twice)', () => {
    expect(startTempHp(makeMonk(6, 'way-of-the-open-hand'))).toBe(6);
    expect(startTempHp(makeMonk(10, 'way-of-the-open-hand'))).toBe(10);
  });

  it('leaves other classes’ start-of-combat temp HP untouched', () => {
    // Totem Warrior (Bear) still girds with 2 + level.
    const bear: Character = {
      ...buildPlayerCharacter(presetCreationInput('barbarian')),
      level: 5,
      subclassId: 'totem-warrior',
    };
    expect(startTempHp(bear)).toBe(7);
    // A monk without the Open Hand tradition gets no Wholeness cushion.
    expect(startTempHp(makeMonk(6))).toBe(0);
  });
});

describe('Monk — unarmed/kit gating (die + edge vs Ki kit)', () => {
  it('counts only bare fists as unarmed — monk weapons and ordinary weapons are not', () => {
    expect(isUnarmedStrikeId('monk-fists')).toBe(true);
    expect(isUnarmedStrikeId('monk-fists-master')).toBe(true);
    expect(isUnarmedStrikeId('monk-war-staff')).toBe(false);
    expect(isUnarmedStrikeId('shortsword')).toBe(false);

    expect(monkFightsUnarmed(withMainHand(makeMonk(5), null))).toBe(true);
    expect(monkFightsUnarmed(withMainHand(makeMonk(5), 'monk-fists-adept'))).toBe(true);
    expect(monkFightsUnarmed(withMainHand(makeMonk(5), 'monk-war-staff'))).toBe(false);
    expect(monkFightsUnarmed(withMainHand(makeMonk(5), 'shortsword'))).toBe(false);
  });

  it('flags the three temple arms as monk weapons — fists and ordinary arms are not', () => {
    expect(isMonkWeaponId('monk-war-staff')).toBe(true);
    expect(isMonkWeaponId('monk-paired-kama')).toBe(true);
    expect(isMonkWeaponId('monk-temple-glaive')).toBe(true);
    expect(isMonkWeaponId('monk-fists')).toBe(false);
    expect(isMonkWeaponId('monk-fists-grandmaster')).toBe(false);
    expect(isMonkWeaponId('shortsword')).toBe(false);
  });

  it('keeps the Ki kit bare-handed and with a monk weapon; an ordinary weapon stills it', () => {
    expect(monkKitActive(withMainHand(makeMonk(5), null))).toBe(true);
    expect(monkKitActive(withMainHand(makeMonk(5), 'monk-war-staff'))).toBe(true);
    expect(monkKitActive(withMainHand(makeMonk(5), 'monk-paired-kama'))).toBe(true);
    expect(monkKitActive(withMainHand(makeMonk(5), 'shortsword'))).toBe(false);
    // Non-monks never carry the kit, bare hands or not.
    expect(monkKitActive(withMainHand({ ...makeMonk(5), classId: 'fighter' }, null))).toBe(false);
  });

  it('lands the unarmed damage edge bare-handed', () => {
    const roller = scriptRoller([18]);
    const monk = withMainHand(makeMonk(5), null);
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('goblin') }] });
    const targetId = monsterOf(init.state).id;
    const r = playerAttack(
      { roller, character: init.character, state: init.state },
      targetId,
      martialArtsWeaponId(init.character),
    );
    expect(r.state.log.some((e) => /martial arts/i.test(e.text))).toBe(true);
  });

  it('turns the whole kit dark with an ordinary weapon — no Flurry, no stances, no edge', () => {
    for (const weaponId of ['shortsword', 'dagger'] as const) {
      const roller = scriptRoller([18]);
      const monk = withMainHand(makeMonk(5), weaponId);
      const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('goblin') }] });

      // Flurry of Blows refuses to arm and spends no Ki; the stances refuse too.
      const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
      expect(flurried.character.flurryStrikesRemaining ?? 0).toBe(0);
      expect(flurried.character.resources.kiPointsRemaining).toBe(
        init.character.resources.kiPointsRemaining,
      );
      const guarded = usePatientDefense({ character: init.character, state: init.state });
      expect(guarded.character.patientDefenseActive ?? false).toBe(false);
      const armed = useStunningStrike({ character: init.character, state: init.state });
      expect(armed.character.stunningStrikeActive ?? false).toBe(false);

      // The plain weapon swing carries no martial-arts / ki edge.
      const targetId = monsterOf(init.state).id;
      const r = playerAttack({ roller, character: init.character, state: init.state }, targetId, weaponId);
      expect(r.state.log.some((e) => /martial arts/i.test(e.text))).toBe(false);
    }
  });

  it('keeps the Ki kit with a themed monk weapon — Flurry arms and pours weapon strikes', () => {
    const roller = scriptRoller([18, 18, 18]);
    const monk = withMainHand(makeMonk(1), 'monk-war-staff');
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const kiBefore = init.character.resources.kiPointsRemaining ?? 0;
    const targetId = monsterOf(init.state).id;

    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    expect(flurried.character.flurryStrikesRemaining).toBe(2);
    expect(flurried.character.resources.kiPointsRemaining).toBe(kiBefore - 1);

    // The strikes swing the WEAPON (its own die — no martial-arts edge), and the
    // queued flurry extras still burn down without re-spending the action.
    let r = playerAttack({ roller, character: flurried.character, state: flurried.state }, targetId, 'monk-war-staff');
    expect(r.character.actionEconomy.actionUsed).toBe(true);
    expect(r.state.log.some((e) => /martial arts/i.test(e.text))).toBe(false);
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, 'monk-war-staff');
    expect(r.character.flurryStrikesRemaining).toBe(1);
  });

  it('Stunning Strike arms and resolves on a connecting monk-weapon hit', () => {
    // Force the staff hit to land (nat 18) then the foe's CON save to fail (nat 1).
    const roller = scriptRoller([18, 1]);
    const monk = withMainHand(makeMonk(5), 'monk-war-staff');
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('goblin') }] });
    const armed = useStunningStrike({ character: init.character, state: init.state });
    expect(armed.character.stunningStrikeActive).toBe(true);

    const targetId = monsterOf(armed.state).id;
    const r = playerAttack({ roller, character: armed.character, state: armed.state }, targetId, 'monk-war-staff');
    const m = r.state.combatants.find((c) => c.id === targetId) as MonsterCombatant;
    expect(m.instance.staggeredTurns).toBe(1);
    expect(r.character.stunningStrikeActive ?? false).toBe(false);
  });

  it('a monk weapon swings its own die + enhancement; the unarmed die + edge stay home', () => {
    // The tradeoff: a +2 war staff lands its enhancement on the swing and keeps
    // Ki flowing, but the martial-arts edge (and the scaling die) belong to the
    // empty hand alone.
    const roller = scriptRoller([18]);
    const monk = withMainHand(makeMonk(5), 'monk-war-staff', 2);
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const targetId = monsterOf(init.state).id;
    const r = playerAttack({ roller, character: init.character, state: init.state }, targetId, 'monk-war-staff');
    const damageLines = r.state.log.filter((e) => e.kind === 'damage');
    const line = damageLines[damageLines.length - 1].text;
    expect(line).toMatch(/enhancement/);
    expect(line).not.toMatch(/martial arts/);
  });

  it('halves a monk weapon\'s enhancement on Flurry extras — gear must not compound per strike', () => {
    const roller = scriptRoller([18, 18, 18]);
    const monk = withMainHand(makeMonk(1), 'monk-war-staff', 2);
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const targetId = monsterOf(init.state).id;

    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });

    // Strike 1 — the Attack action: the full +2 enhancement.
    let r = playerAttack({ roller, character: flurried.character, state: flurried.state }, targetId, 'monk-war-staff');
    const afterFirst = r.state.log.filter((e) => e.kind === 'damage');
    expect(afterFirst[afterFirst.length - 1].text).toMatch(/\+ 2 enhancement/);

    // Strike 2 — a bonus Flurry strike: half the gear edge (2 → 1).
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, 'monk-war-staff');
    const afterSecond = r.state.log.filter((e) => e.kind === 'damage');
    expect(afterSecond[afterSecond.length - 1].text).toMatch(/\+ 1 enhancement/);
  });

  it('halves the per-hit Grove edge on Flurry extras so it no longer compounds', () => {
    // Whetstone +6 (Grove). The PRIMARY strike takes the full edge; the bonus
    // Flurry strikes take only half — Flurry × per-hit-edge must not multiply (the
    // Monk's lone ascension-ladder runaway). The intrinsic martial-arts edge still
    // rides every strike (the kit fires).
    const roller = scriptRoller([18, 18, 18]);
    const base = withMainHand(makeMonk(1), null); // bare hands — no enhancement noise
    const monk: Character = { ...base, permanentBonuses: { ...base.permanentBonuses, damage: 6 } };
    const init = createCombat({ roller, character: monk, monsters: [{ def: getMonster('blue-wyrmling') }] });
    const targetId = monsterOf(init.state).id;

    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    const weaponId = martialArtsWeaponId(flurried.character);

    // Strike 1 — the Attack action: full Grove edge.
    let r = playerAttack({ roller, character: flurried.character, state: flurried.state }, targetId, weaponId);
    const afterFirst = r.state.log.filter((e) => e.kind === 'damage');
    expect(afterFirst[afterFirst.length - 1].text).toMatch(/\+ 6 Whetstone/);
    expect(afterFirst[afterFirst.length - 1].text).toMatch(/martial arts/);

    // Strike 2 — a bonus Flurry strike: half the Grove edge (6 → 3).
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, weaponId);
    expect(r.character.flurryStrikesRemaining).toBe(1);
    const afterSecond = r.state.log.filter((e) => e.kind === 'damage');
    expect(afterSecond[afterSecond.length - 1].text).toMatch(/\+ 3 Whetstone/);
    expect(afterSecond[afterSecond.length - 1].text).toMatch(/martial arts/);
  });
});

describe('Monk — bot policy', () => {
  it('opens with a Flurry of Blows and pours strikes into the fight', () => {
    const roller = createDiceRoller(3);
    const init = createCombat({
      roller,
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });
    const first = chooseCombatAction(init.state, init.character);
    expect(first.kind).toBe('flurry-of-blows');

    // Driving the full auto-turn spends Ki and does not stall.
    const targetId = monsterOf(init.state).id;
    const hpBefore = monsterHp(init.state, targetId);
    const turn = runAutoTurn(roller, init.state, init.character);
    expect(turn.character.resources.kiPointsRemaining).toBeLessThan(
      init.character.resources.kiPointsRemaining ?? 0,
    );
    expect(monsterHp(turn.state, targetId)).toBeLessThan(hpBefore);
  });

  it('applyPlannedAction swings unarmed with the level-scaled die, not a held weapon', () => {
    const roller = createDiceRoller(5);
    const init = createCombat({
      roller,
      character: makeMonk(11),
      monsters: [{ def: getMonster('goblin') }],
    });
    const targetId = monsterOf(init.state).id;
    const hpBefore = monsterHp(init.state, targetId);
    const r = applyPlannedAction(
      { roller, state: init.state, character: init.character },
      { kind: 'attack', targetId },
    );
    // A connecting strike reads as the master fists in the damage log.
    expect(monsterHp(r.state, targetId)).toBeLessThanOrEqual(hpBefore);
  });
});
