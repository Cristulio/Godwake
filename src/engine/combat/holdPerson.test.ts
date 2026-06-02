import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack, refreshMonsterIntents } from './attack';
import { createDiceRoller, type DiceRoller } from '../dice';
import { setActiveRoller } from '../dice';
import type { RollResult } from '../../types/dice';
import { getMonster } from '../../content/monsters';
import { rollPlayerSave } from './holdPerson';
import { useCunningAction } from './cunningAction';
import { castSpell } from './spells';
import { simulateLevelUp } from '../character/leveling';
import type { Character } from '../../types/character';

/**
 * Build a DiceRoller that returns each d20 natural in `rolls` in order.
 * For advantage/disadvantage rolls the engine consumes TWO naturals — keep
 * that in mind when seeding.
 */
function stubRoller(rolls: number[]): DiceRoller {
  let i = 0;
  const next = () => {
    if (i >= rolls.length) throw new Error('stubRoller exhausted');
    return rolls[i++];
  };
  return {
    d20(advantage = 'normal', modifier = 0): RollResult {
      const first = next();
      if (advantage === 'normal') {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [first],
          modifier,
          total: first + modifier,
          natural20: first === 20,
          natural1: first === 1,
          advantage,
        };
      }
      const second = next();
      const chosen = advantage === 'advantage'
        ? Math.max(first, second)
        : Math.min(first, second);
      const discarded = advantage === 'advantage'
        ? Math.min(first, second)
        : Math.max(first, second);
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [chosen],
        modifier,
        total: chosen + modifier,
        natural20: chosen === 20,
        natural1: chosen === 1,
        advantage,
        discardedRoll: discarded,
      };
    },
    roll() {
      throw new Error('stubRoller only implements d20');
    },
    serialize() {
      return { state: 0 };
    },
  };
}

function makeHuman(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-hero',
      name: 'Tester',
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
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    ...extra,
  };
}

describe('Hold Person — Magistrate boss mechanic', () => {
  beforeEach(() => {
    _resetMonsterInstanceCounter();
    // turn.ts uses getActiveRoller() for end-of-turn saves; arm it deterministically.
    setActiveRoller('hold-person-test-seed');
  });

  it('Magistrate opens with paralyze action before attacking', () => {
    const magistrate = getMonster('athkatla-magistrate');
    expect(magistrate.actions[0].kind).toBe('paralyze');
    const hero = makeHuman();
    const roller = createDiceRoller(1);
    const state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] }).state;
    const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
    const after = monsterAttack({ roller, character: hero, state }, monsterId).state;
    // First turn must be a save line, not a damage line.
    const lastTwo = after.log.slice(-2).map((l) => l.text).join(' || ');
    expect(lastTwo).toMatch(/Hold Person/);
    expect(lastTwo).toMatch(/save/);
  });

  it('failed save applies paralyzed condition to the player', () => {
    const magistrate = getMonster('athkatla-magistrate');
    // WIS-9 hero (mod −1) needs nat 12+ to make DC 11 — fails on most d20s.
    // Sweep seeds to find any failure rather than pinning to a single
    // hard-coded one; the mechanic is the assertion, not the seed.
    let paralyzed: ReturnType<typeof getMagistrateParalyzed> | undefined;
    function getMagistrateParalyzed(hero: Character) {
      return hero.conditions.find((c) => c.name === 'paralyzed');
    }
    for (let seed = 1; seed <= 50 && !paralyzed; seed++) {
      let hero = makeHuman({ baseAbilityScores: {
        str: 14, dex: 12, con: 13, int: 10, wis: 8, cha: 10,
      } });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
      const state = init.state;
      hero = init.character;
      const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
      const ma = monsterAttack({ roller, character: hero, state }, monsterId);
      hero = ma.character;
      paralyzed = getMagistrateParalyzed(hero);
    }
    expect(paralyzed).toBeDefined();
    expect(paralyzed!.saveDC).toBe(11);
    expect(paralyzed!.saveAbility).toBe('wis');
  });

  it('attacker gains advantage when attacking a paralyzed player', () => {
    const magistrate = getMonster('athkatla-magistrate');
    const hero = makeHuman();
    // Pre-paralyze the hero so the second turn rolls Mind Spike.
    hero.conditions = [{
      name: 'paralyzed',
      duration: { kind: 'rounds', value: 3 },
      saveDC: 14,
      saveAbility: 'wis',
    }];
    const roller = createDiceRoller(5);
    let state = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] }).state;
    // Pick-then-resolve: re-plan the magistrate's intent against the held
    // player (as the start-of-turn refresh would). With the player already
    // paralyzed the round-1 opener is dropped, so Mind Spike is telegraphed.
    state = refreshMonsterIntents(state, hero);
    const monsterId = state.combatants.find((c) => c.kind === 'monster')!.id;
    const after = monsterAttack({ roller, character: hero, state }, monsterId).state;
    const attackLine = after.log.find((l) => l.text.includes('Mind Spike'));
    expect(attackLine).toBeDefined();
    expect(attackLine!.text).toContain('advantage');
  });

  it('paralyzed player turn fails save and locks action economy', () => {
    const magistrate = getMonster('athkatla-magistrate');
    let hero = makeHuman({ baseAbilityScores: {
      str: 14, dex: 12, con: 13, int: 10, wis: 8, cha: 10,
    } });
    hero = {
      ...hero,
      conditions: [{
        name: 'paralyzed',
        duration: { kind: 'rounds', value: 3 },
        saveDC: 14,
        saveAbility: 'wis',
      }],
    };
    const roller = createDiceRoller(9);
    const init = createCombat({ roller, character: hero, monsters: [{ def: magistrate }] });
    const state = init.state;
    hero = init.character;
    // Player goes first now; createCombat resolves the paralysis save up-front
    // (with a WIS-8 hero and DC 14, this seed lands on a fail), which locks
    // the action economy without needing an endTurn round-trip.
    expect(state.turnOrder[state.currentTurnIndex]).toBe('player');
    expect(hero.actionEconomy.actionUsed).toBe(true);
    expect(hero.actionEconomy.bonusActionUsed).toBe(true);
    const lockoutLog = state.log.find((l) => l.text.includes('cannot move'));
    expect(lockoutLog).toBeDefined();
  });
});

describe('nextSaveAdvantage — save-advantage vector', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function makeHeroWisPlusOne(extra: Partial<Character> = {}): Character {
    // Human (+1 to all) + base WIS 12 → effective WIS 13 → mod +1.
    return {
      ...createCharacter({
        id: 'wis-hero',
        name: 'Sage',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: 14,
          dex: 12,
          con: 13,
          int: 10,
          wis: 12,
          cha: 10,
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      ...extra,
    };
  }

  function makeRogueL1(): Character {
    return createCharacter({
      id: 'steel-rogue',
      name: 'Shiv',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: 8,
        dex: 15,
        con: 14,
        int: 13,
        wis: 12,
        cha: 10,
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    });
  }

  function makeWizardL3(): Character {
    let w = createCharacter({
      id: 'mist-wizard',
      name: 'Inara',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: {
        str: 8,
        dex: 12,
        con: 13,
        int: 15,
        wis: 14,
        cha: 10,
      },
      skillProficiencies: ['arcana', 'history'],
    });
    w = simulateLevelUp(w); // L2
    w = simulateLevelUp(w); // L3 — opens a 2nd-level slot
    // The sim's default L3 pick is now Scorching Ray, not Misty Step — stamp
    // Misty Step explicitly to exercise its mechanics below.
    return {
      ...w,
      resources: {
        ...w.resources,
        knownSpells: [...(w.resources.knownSpells ?? []), 'misty-step'],
      },
    };
  }

  it('Steeled save rolls with advantage and consumes the flag', () => {
    const baseline = makeHeroWisPlusOne();

    // Without the flag: stub returns 8 → 8 + 1 mod = 9 vs DC 14 → fail.
    {
      const roller = stubRoller([8]);
      const result = rollPlayerSave(roller, baseline, 'wis', 14);
      expect(result.mod).toBe(1);
      expect(result.advantage).toBe(false);
      expect(result.total).toBe(9);
      expect(result.success).toBe(false);
      expect(result.character.nextSaveAdvantage).toBeFalsy();
    }

    // With the flag: stub returns 8 then 17. Advantage takes the higher (17),
    // total = 17 + 1 = 18 vs DC 14 → pass. Flag consumed.
    {
      const steeled: Character = { ...baseline, nextSaveAdvantage: true };
      const roller = stubRoller([8, 17]);
      const result = rollPlayerSave(roller, steeled, 'wis', 14);
      expect(result.advantage).toBe(true);
      expect(result.total).toBe(18);
      expect(result.success).toBe(true);
      expect(result.character.nextSaveAdvantage).toBe(false);
    }
  });

  it('Steel Yourself arms nextSaveAdvantage and spends a Cunning Action use', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogueL1();
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    expect(rogue.nextSaveAdvantage).toBeFalsy();
    expect(rogue.actionEconomy.bonusActionUsed).toBe(false);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);

    const ca = useCunningAction({ character: rogue, state, choice: 'steel' });
    state = ca.state;
    rogue = ca.character;
    expect(rogue.nextSaveAdvantage).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(0);
    const log = state.log[state.log.length - 1];
    expect(log.text.toLowerCase()).toContain('steel');
  });

  it('Misty Step sets nextSaveAdvantage alongside mistyStepActive', () => {
    const goblin = getMonster('goblin');
    let w = makeWizardL3();
    const roller = createDiceRoller(11);
    const init = createCombat({ roller, character: w, monsters: [{ def: goblin }] });
    const state = init.state;
    w = init.character;
    expect(w.nextSaveAdvantage).toBeFalsy();
    expect(w.resources.mistyStepActive).toBeFalsy();

    const cast = castSpell({ roller, character: w, state, spellId: 'misty-step' });
    expect(cast.cast).toBe(true);
    w = cast.character;
    expect(w.resources.mistyStepActive).toBe(true);
    expect(w.nextSaveAdvantage).toBe(true);
  });

  it('createCombat clears a lingering nextSaveAdvantage from a prior fight', () => {
    const goblin = getMonster('goblin');
    const hero: Character = { ...makeHeroWisPlusOne(), nextSaveAdvantage: true };
    const roller = createDiceRoller(4);
    const init = createCombat({ roller, character: hero, monsters: [{ def: goblin }] });
    expect(init.character.nextSaveAdvantage).toBe(false);
  });
});
