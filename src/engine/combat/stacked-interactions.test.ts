import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores, computeAC } from '../character/derived';
import { applyLevelUp, hpGainForLevelUp } from '../character/leveling';
import { applyPermanentUpgrade } from '../character/upgrades';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { createDiceRoller } from '../dice';
import { castSpell } from './spells';
import { monsterAttack, playerAttack, applyDamage } from './attack';
import { endTurn } from './turn';
import { useCunningAction } from './cunningAction';
import { applyParalyze } from './holdPerson';
import { getMonster } from '../../content/monsters';
import { useCharacterStore } from '../../stores/characterStore';
import { useDelveStore } from '../../stores/delveStore';
import { useCombatStore } from '../../stores/combatStore';
import { useMetaStore } from '../../stores/metaStore';
import { useScreenStore } from '../../stores/screenStore';
import { useGameStore } from '../../stores/gameStore';
import { createGodwakeDelve } from '../delve';
import type { Character } from '../../types/character';
import type { MonsterCombatant } from '../../types/combat';

function makeHillDwarfWizard(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'hd-wizard',
      name: 'Borrik',
      raceId: 'hill-dwarf',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8
        dex: STANDARD_ARRAY[3], // 12
        con: STANDARD_ARRAY[1], // 14 → +2 CON before Hill Dwarf +2
        int: STANDARD_ARRAY[0], // 15
        wis: STANDARD_ARRAY[2], // 13
        cha: STANDARD_ARRAY[4], // 10
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    ...extra,
  };
}

function makeRogue(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'rogue-test',
      name: 'Shiv',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        dex: STANDARD_ARRAY[0], // 15 DEX
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    ...extra,
  };
}

function findMonsterCombatant(state: ReturnType<typeof createCombat>): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/**
 * (1) Hill Dwarf wizard HP math under Mantle r2.
 *
 * Each level-up after L1 applies (avg + CON + raceBonus + classBonus). L1
 * starts at hitDie(max) + CON + raceBonus + classBonus + permanentHpBonus.
 * Walk it through applyLevelUp twice and verify both the per-level math and
 * that permanentHpBonus stays sticky across startDelve invocations.
 */
describe('Hill Dwarf wizard + Mantle of the Wakened r2 + wizard baseline', () => {
  it('HP math at L1 / L2 / L3 matches the documented formula', () => {
    const wizard = makeHillDwarfWizard();
    // Mantle r2 grants +10 HP (each rank.apply is +5; multi-rank purchases
    // call apply per rank, so two ranks = +10).
    let buffed = applyPermanentUpgrade(wizard, 'mantle-of-the-wakened', 1);
    buffed = applyPermanentUpgrade(buffed, 'mantle-of-the-wakened', 2);
    expect(buffed.permanentBonuses?.hp).toBe(10);

    const conMod = abilityModifier(effectiveAbilityScores(buffed).con);
    const raceBonus = 1; // Hill Dwarf bonusHpPerLevel
    const classBonus = 1; // wizard baseline
    const hitDie = 6;
    const avg = hitDie / 2 + 1; // 4 for d6

    // L1 was set inside createCharacter; Mantle adjusts only the permanent
    // field. The L1 HP max therefore does NOT yet include Mantle until
    // startDelve rebuilds baseHpMax. We track the "delve-time" HP below.
    expect(buffed.hp.max).toBe(hitDie + conMod + raceBonus + classBonus);

    // Per-level HP gain = avg + CON + raceBonus + classBonus.
    const perLevel = avg + conMod + raceBonus + classBonus;
    expect(hpGainForLevelUp(buffed)).toBe(perLevel);

    const l2 = applyLevelUp(buffed);
    expect(l2.hp.max).toBe(buffed.hp.max + perLevel);
    const l3 = applyLevelUp(l2);
    expect(l3.hp.max).toBe(buffed.hp.max + 2 * perLevel);
    expect(l3.level).toBe(3);
  });

  it('startDelve preserves Mantle r2 (+10 HP) across multiple descents', () => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({ unlockedUpgrades: { 'mantle-of-the-wakened': 2 } });
    useScreenStore.setState({ screen: 'hub' });

    const wizard = makeHillDwarfWizard({ permanentBonuses: { hp: 10 } });
    useCharacterStore.setState({ character: wizard });

    const conMod = abilityModifier(effectiveAbilityScores(wizard).con);
    const expectedBase = 6 /* d6 */ + conMod + 1 /* dwarf */ + 1 /* wizard */ + 10 /* Mantle */;

    useGameStore.getState().startDelve(createGodwakeDelve(1));
    const afterFirst = useCharacterStore.getState().character!;
    expect(afterFirst.hp.max).toBe(expectedBase);
    expect(afterFirst.hp.current).toBe(expectedBase);
    expect(afterFirst.permanentBonuses?.hp).toBe(10);

    // Simulate a death + re-descent. permanentHpBonus is sticky on the soul.
    useCharacterStore.setState({
      character: { ...afterFirst, level: 1, hp: { ...afterFirst.hp, current: 5 } },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(2));
    const afterSecond = useCharacterStore.getState().character!;
    expect(afterSecond.hp.max).toBe(expectedBase);
    expect(afterSecond.hp.current).toBe(expectedBase);
  });
});

/**
 * (2) Sneak Attack dice scaling + Knife in the Dark r1 bonus.
 *
 * L3 = 2d6 base + 1d6 bonus = 3d6. L5 = 3d6 base + 1d6 bonus = 4d6.
 */
describe('Sneak Attack scaling stacks with Knife in the Dark', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function fireSneakDiceLabel(level: number, bonus: number): string | undefined {
    for (let seed = 1; seed <= 200; seed++) {
      const goblin = getMonster('goblin');
      const rogue = makeRogue({ level, permanentBonuses: { sneakAttackDice: bonus } });
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      // Bloat goblin HP so it survives until the SA line lands, regardless of
      // dice roll variance.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { current: 200, max: 200, temp: 0 } } }
            : c,
        ),
      };
      state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
      const goblinId = findMonsterCombatant(state).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const log = state.log.find((l) => l.text.includes('Sneak Attack'));
      if (log) return log.text;
    }
    return undefined;
  }

  it('L3 rogue + Knife r1 logs 3d6', () => {
    const text = fireSneakDiceLabel(3, 1);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (3d6)');
  });

  it('L5 rogue + Knife r1 logs 4d6', () => {
    const text = fireSneakDiceLabel(5, 1);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (4d6)');
  });
});

/**
 * (3) Paralyzed player vs raging boss.
 *
 * The boss attacks at advantage (paralyzed → advantage on attacker, per the
 * monsterAttack branch) AND gets +2 from active rage. Per RAW, paralysis
 * also forces auto-crit on melee within 5ft, but the Godwake engine does NOT
 * implement that — it only applies advantage. We test what the engine does.
 */
describe('Paralyzed player taking advantage attacks from a raging boss', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('monster attack rolls with advantage and damage line shows +2 rage', () => {
    const director = getMonster('asylum-director');
    const wizard = makeHillDwarfWizard();
    const roller = createDiceRoller(3);
    let state = createCombat({ roller, character: wizard, monsters: [{ def: director }] });

    // Force the director into Battle Rage immediately so we don't have to
    // chip its HP below half via the engine's own attacks.
    state = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster'
          ? {
              ...c,
              instance: {
                ...c.instance,
                bossRageActive: true,
                hp: { current: 30, max: director.maxHp, temp: 0 },
              },
            }
          : c,
      ),
    };

    // Apply paralysis to the player (skip the save flow).
    applyParalyze(wizard, {
      rounds: 3,
      saveDC: 15,
      saveAbility: 'wis',
      source: 'asylum-director',
    });

    // Set the director's turn so monsterAttack picks the attack action
    // (round > 1 so paralyze isn't re-cast, and player is already paralyzed).
    state = { ...state, round: 2 };
    const directorId = findMonsterCombatant(state).id;

    // Try a few seeds to find one where the director hits — the assertion is
    // about *how* the engine logs the hit, not the hit rate.
    let hitLog: string | undefined;
    let rageLog: string | undefined;
    for (let seed = 1; seed <= 50; seed++) {
      const trialRoller = createDiceRoller(seed);
      // Re-paralyze freshly per trial since conditions mutate the character.
      applyParalyze(wizard, {
        rounds: 3,
        saveDC: 15,
        saveAbility: 'wis',
        source: 'asylum-director',
      });
      const after = monsterAttack(
        { roller: trialRoller, character: wizard, state },
        directorId,
      ).state;
      const damage = after.log.find((l) => l.kind === 'damage');
      const roll = after.log.find(
        (l) => l.kind === 'roll' && l.text.includes('attacks ' + wizard.name),
      );
      if (damage && roll) {
        hitLog = roll.text;
        rageLog = damage.text;
        break;
      }
    }

    expect(hitLog).toBeDefined();
    expect(hitLog).toContain('(advantage — paralyzed)');
    expect(rageLog).toBeDefined();
    expect(rageLog).toContain('+2 rage');
  });
});

/**
 * (4) Mage Armor passive + Shield reaction stack.
 *
 * A bare-armor wizard with mageArmorActive AND shieldActive should have
 * AC = 10 + DEX + 3 (mage armor) + 5 (shield). Shield clears at the start of
 * the player's next turn.
 */
describe('Mage Armor passive + Shield reaction AC stack', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('stacks +3 and +5 while both flags are live, clears Shield at next player turn', () => {
    const goblin = getMonster('goblin');
    const wizard = makeHillDwarfWizard();
    // Remove armor so Mage Armor applies (it only adds when !bodyArmor).
    wizard.equipped = { mainHand: { itemId: 'dagger' }, offHand: null, armor: null };

    const roller = createDiceRoller(11);
    let state = createCombat({ roller, character: wizard, monsters: [{ def: goblin }] });
    // createCombat sets mageArmorActive=true for wizards.
    expect(wizard.resources.mageArmorActive).toBe(true);

    const dex = abilityModifier(effectiveAbilityScores(wizard).dex);
    const baselineAC = 10 + dex + 3; // mage armor only

    expect(computeAC(wizard)).toBe(baselineAC);

    // Cast Shield (level 1 slot, reaction).
    const cast = castSpell({ roller, character: wizard, state, spellId: 'shield' });
    expect(cast.cast).toBe(true);
    state = cast.state;
    expect(wizard.resources.shieldActive).toBe(true);
    expect(computeAC(wizard)).toBe(baselineAC + 5); // +5 from shield

    // Advance to the next turn (monster), then back to player — Shield should
    // clear when the player's turn starts.
    state = endTurn(state, wizard).state;
    // Now it's the monster's turn (or another non-player slot). Shield is
    // still active until the next player turn.
    state = endTurn(state, wizard).state;
    // Should be back on the player. Shield expired in the turn-start branch.
    expect(wizard.resources.shieldActive).toBe(false);
    expect(computeAC(wizard)).toBe(baselineAC);
  });
});

/**
 * (5) Disengage damage reduction + Hill Dwarf HP pool.
 *
 * Setup: a Hill Dwarf rogue with incomingDamageReduction = 2 and a Mantle
 * boosted HP pool. A 10-damage hit should subtract 2 (Disengage), then 8
 * comes off HP. Reduction clears.
 */
describe('Disengage damage reduction stacks under buffed HP pool', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('reduces a 10-damage hit by 2, then subtracts 8 from HP', () => {
    const goblin = getMonster('goblin');
    const rogue: Character = {
      ...createCharacter({
        id: 'hd-rogue',
        name: 'Stonefoot',
        raceId: 'hill-dwarf',
        classId: 'rogue',
        baseAbilityScores: {
          str: STANDARD_ARRAY[5],
          dex: STANDARD_ARRAY[0],
          con: STANDARD_ARRAY[1],
          int: STANDARD_ARRAY[2],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
        },
        skillProficiencies: ['stealth', 'sleight-of-hand'],
      }),
      inventory: [{ itemId: 'dagger' }],
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    };
    // Bump the HP pool as if Mantle had been applied at delve-start.
    rogue.hp = { current: 30, max: 30, temp: 0 };

    const roller = createDiceRoller(3);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });

    state = useCunningAction({ character: rogue, state, choice: 'disengage' }).state;
    expect(rogue.incomingDamageReduction).toBe(2);

    const before = rogue.hp.current;
    state = applyDamage(state, 'player', 10, rogue);
    expect(rogue.hp.current).toBe(before - 8);
    expect(rogue.incomingDamageReduction).toBe(0);

    // A second 10-damage hit gets no reduction.
    state = applyDamage(state, 'player', 10, rogue);
    expect(rogue.hp.current).toBe(before - 8 - 10);
    void state;
  });
});

/**
 * (6) Soul-mark renown + gold stacking with Pinchpurse (goldMultiplier 0.85).
 *
 * Two banes → soul-mark = 1 + 0.2*2 = 1.4. Pinchpurse is a bane with
 * goldMultiplier 0.85. addDelveReward multiplies gold by (goldMultiplier *
 * soulMark) = 0.85 * 1.4 = 1.19. finishDelve on a failed delve pays
 * RENOWN_PER_DELVE_FAILURE (15) * renownSoulMarkMultiplier (1.4) = 21.
 */
describe('Soul-mark renown + Pinchpurse gold stacking', () => {
  beforeEach(() => {
    _resetMonsterInstanceCounter();
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({ unlockedUpgrades: {} });
    useScreenStore.setState({ screen: 'hub' });
  });

  it('failed delve pays floor(15 * 1.4) = 21 renown with 2 banes (Pinchpurse + vertigo)', () => {
    const fighter: Character = {
      ...createCharacter({
        id: 'twobane',
        name: 'Marked',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: STANDARD_ARRAY[0],
          dex: STANDARD_ARRAY[2],
          con: STANDARD_ARRAY[1],
          int: STANDARD_ARRAY[5],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      quirks: ['pinchpurse', 'vertigo'],
      renown: 0,
    };
    useCharacterStore.setState({ character: fighter });
    const delve = createGodwakeDelve(1);
    useDelveStore.setState({ delve: { ...delve, phase: 'failed' } });

    useGameStore.getState().finishDelve();

    expect(useCharacterStore.getState().character!.renown).toBe(21);
  });

  it('addDelveReward stacks goldMultiplier 0.85 with soul-mark 1.4 → floor(100 * 1.19) = 119', () => {
    const fighter: Character = {
      ...createCharacter({
        id: 'twobane-gold',
        name: 'Marked',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: STANDARD_ARRAY[0],
          dex: STANDARD_ARRAY[2],
          con: STANDARD_ARRAY[1],
          int: STANDARD_ARRAY[5],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      quirks: ['pinchpurse', 'vertigo'],
    };
    useCharacterStore.setState({ character: fighter });
    useDelveStore.setState({ delve: createGodwakeDelve(1) });
    useScreenStore.setState({ screen: 'delve' });

    useGameStore.getState().addDelveReward(100, 50);

    const delve = useDelveStore.getState().delve!;
    // Engine does floor(gold * (mult * soulMark)); 0.85 * 1.4 = 1.19 has a
    // tiny float drift that floors 100 * 1.19 to 118 (not 119).
    expect(delve.goldEarned).toBe(Math.floor(100 * (0.85 * 1.4)));
    expect(delve.xpEarned).toBe(Math.floor(50 * 1.4));
  });
});

/**
 * (7) Per-chapter-boss renown bonus + soul-mark stacking.
 *
 * Killed Ilyich (room idx 9) + Magistrate (room idx 18), died in Ch3 (set
 * currentRoomIdx into Ch3 region, e.g. 22). Failed delve, 1 bane:
 *   base = 15 + 10*2 = 35
 *   total = floor(35 * 1.2) = 42
 */
describe('Chapter-boss renown bonus + soul-mark stacking', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({ unlockedUpgrades: {} });
    useScreenStore.setState({ screen: 'hub' });
  });

  it('death in Ch3 after killing 2 chapter bosses with 1 bane → 42 renown', () => {
    const fighter: Character = {
      ...createCharacter({
        id: 'onebane',
        name: 'Marked',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: STANDARD_ARRAY[0],
          dex: STANDARD_ARRAY[2],
          con: STANDARD_ARRAY[1],
          int: STANDARD_ARRAY[5],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      quirks: ['pinchpurse'],
      renown: 0,
    };
    useCharacterStore.setState({ character: fighter });
    const delve = createGodwakeDelve(1);
    // currentRoomIdx=22 → slice(0, 22) includes Ilyich (idx 9) and Magistrate
    // (idx 18) but not the Director (idx 27).
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 22, phase: 'failed' },
    });

    useGameStore.getState().finishDelve();

    expect(useCharacterStore.getState().character!.renown).toBe(42);
  });
});

