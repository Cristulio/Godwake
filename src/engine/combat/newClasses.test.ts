import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { monsterAttack } from './attack/monsterAttack';
import { useRage } from './rage';
import { RAGE_ROUNDS, rageChargesMax, shortRestHeal, longRest } from '../character/actions';
import { useConsumable } from './useItem';
import { useHuntersMark } from './huntersMark';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { computeAC, effectiveAbilityScores } from '../character/derived';
import { abilityModifier } from '../../types/abilities';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function makeBarbarian(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-barbarian',
      name: 'Cali Trava Consumer',
      raceId: 'human',
      classId: 'barbarian',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15
        dex: STANDARD_ARRAY[2], // 13
        con: STANDARD_ARRAY[1], // 14
        cha: STANDARD_ARRAY[3], // 12
        wis: STANDARD_ARRAY[4], // 10
        int: STANDARD_ARRAY[5], // 8
      },
      skillProficiencies: ['athletics', 'intimidation'],
    }),
    inventory: [{ itemId: 'greataxe' }],
    equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: null },
    ...extra,
  };
}

function makeRanger(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-ranger',
      name: 'Chompolario Biologo Trolo',
      raceId: 'wood-elf',
      classId: 'ranger',
      baseAbilityScores: {
        dex: STANDARD_ARRAY[0], // 15 (→17 with wood-elf)
        con: STANDARD_ARRAY[1], // 14
        str: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        int: STANDARD_ARRAY[4], // 10
        cha: STANDARD_ARRAY[5], // 8
      },
      skillProficiencies: ['perception', 'survival'],
    }),
    inventory: [{ itemId: 'longbow' }, { itemId: 'shortsword' }],
    equipped: { mainHand: { itemId: 'longbow' }, offHand: null, armor: { itemId: 'leather-armor' } },
    ...extra,
  };
}

function monsterId(state: CombatState): string {
  return (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
}

describe('Barbarian — Unarmored Defense', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('AC is 10 + DEX + CON while unarmored', () => {
    const barb = makeBarbarian();
    const scores = effectiveAbilityScores(barb);
    const expected = 10 + abilityModifier(scores.dex) + abilityModifier(scores.con);
    expect(computeAC(barb)).toBe(expected);
    // CON is actually folded in (not just the 10 + DEX a non-barbarian gets).
    expect(computeAC(barb)).toBeGreaterThan(10 + abilityModifier(scores.dex));
  });
});

describe('Barbarian — Rage', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('useRage sets the 5-round duration, spends a charge, and burns the bonus action', () => {
    const barb = makeBarbarian();
    const roller = createDiceRoller(1);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    // A fresh L1 barbarian descends with the full pool (rageChargesMax at L1).
    expect(init.character.resources.rageChargesRemaining).toBe(3);
    const r = useRage({ character: init.character, state: init.state });
    expect(r.character.resources.rageRoundsRemaining).toBe(RAGE_ROUNDS);
    expect(RAGE_ROUNDS).toBe(5);
    expect(r.character.resources.rageChargesRemaining).toBe(2);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('adds bonus melee damage while raging', () => {
    let observed = false;
    for (let seed = 1; seed <= 80 && !observed; seed++) {
      const barb = makeBarbarian();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
      const raging: Character = {
        ...init.character,
        resources: { ...init.character.resources, rageRoundsRemaining: 5 },
      };
      const atk = playerAttack({ roller, character: raging, state: init.state }, monsterId(init.state), 'greataxe');
      const dmgLog = atk.state.log.find((l) => l.kind === 'damage' && l.text.includes('Rage'));
      if (dmgLog) {
        observed = true;
        expect(dmgLog.text).toContain('Rage');
      }
    }
    expect(observed).toBe(true);
  });

  it('drinks a healing potion while raging — heal HALVED (rounded up), potion spent', () => {
    const barb = makeBarbarian({
      inventory: [{ itemId: 'greataxe' }, { itemId: 'potion-of-healing' }],
    });
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barb,
      monsters: [{ def: getMonster('goblin') }],
    });
    const potionIdx = init.character.inventory.findIndex((r) => r.itemId === 'potion-of-healing');
    const hurt: Character = {
      ...init.character,
      hp: { current: 5, max: init.character.hp.max, temp: 0 },
    };
    const raging: Character = {
      ...hurt,
      resources: { ...hurt.resources, rageRoundsRemaining: 5 },
    };

    // Fresh roller with the SAME seed for each drink so the underlying heal ROLL
    // is identical — the only difference is Rage's halving.
    const calm = useConsumable({ roller: createDiceRoller(7), character: hurt, state: init.state }, potionIdx);
    const rageDrink = useConsumable(
      { roller: createDiceRoller(7), character: raging, state: init.state },
      potionIdx,
    );

    const calmHealed = calm.character.hp.current - 5;
    const rageHealed = rageDrink.character.hp.current - 5;
    expect(calmHealed).toBeGreaterThan(0);
    // Rage halves the draught (rounded up) — it no longer locks it out.
    expect(rageHealed).toBe(Math.ceil(calmHealed / 2));
    // The potion is SPENT while raging now (not kept in the bag).
    expect(
      rageDrink.character.inventory.filter((r) => r.itemId === 'potion-of-healing'),
    ).toHaveLength(0);
  });

  it('halves incoming physical damage while raging (same roll, half result)', () => {
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      const barb = makeBarbarian();

      const rollerC = createDiceRoller(seed);
      const initC = createCombat({ roller: rollerC, character: barb, monsters: [{ def: getMonster('goblin') }] });
      const resC = monsterAttack(
        { roller: rollerC, character: initC.character, state: initC.state },
        monsterId(initC.state),
      );
      const lossC = initC.character.hp.current - resC.character.hp.current;

      const rollerR = createDiceRoller(seed);
      const initR = createCombat({ roller: rollerR, character: barb, monsters: [{ def: getMonster('goblin') }] });
      const raging: Character = {
        ...initR.character,
        resources: { ...initR.character.resources, rageRoundsRemaining: 5 },
      };
      const resR = monsterAttack(
        { roller: rollerR, character: raging, state: initR.state },
        monsterId(initR.state),
      );
      const lossR = raging.hp.current - resR.character.hp.current;

      if (lossC > 1) {
        expect(lossR).toBe(Math.floor(lossC / 2));
        validated = true;
      }
    }
    expect(validated).toBe(true);
  });
});

describe('Barbarian — Rage charges (rationed pool)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('with no charges left, Rage is a true no-op — fury and bonus action untouched', () => {
    const roller = createDiceRoller(1);
    const barb = makeBarbarian();
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    const drained: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageChargesRemaining: 0 },
    };
    const r = useRage({ character: drained, state: init.state });
    expect(r.character).toBe(drained);
    expect(r.state).toBe(init.state);
    expect(r.character.resources.rageRoundsRemaining ?? 0).toBe(0);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(false);
  });

  it("can't re-enter Rage while already raging — no second charge is spent", () => {
    const roller = createDiceRoller(1);
    const barb = makeBarbarian();
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    const raging: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageRoundsRemaining: 3, rageChargesRemaining: 2 },
      actionEconomy: { ...init.character.actionEconomy, bonusActionUsed: false },
    };
    const r = useRage({ character: raging, state: init.state });
    expect(r.character).toBe(raging);
    expect(r.character.resources.rageChargesRemaining).toBe(2);
  });

  it('charges do NOT refill on a new combat, but a rest tops them back up', () => {
    const roller = createDiceRoller(1);
    const barb = makeBarbarian({ level: 11 }); // pool of 5 at L11
    const drained: Character = {
      ...barb,
      resources: { ...barb.resources, rageChargesRemaining: 1 },
    };
    // A fresh encounter must leave the rationed pool exactly where it was.
    const nextFight = createCombat({ roller, character: drained, monsters: [{ def: getMonster('goblin') }] });
    expect(nextFight.character.resources.rageChargesRemaining).toBe(1);
    // Only a rest (short or long) refills it — to the level's max.
    expect(shortRestHeal(drained, 0).resources.rageChargesRemaining).toBe(5);
    expect(longRest(drained).resources.rageChargesRemaining).toBe(5);
    expect(rageChargesMax(barb)).toBe(5);
  });

  it('L20 rages without limit — entering never spends a charge', () => {
    const roller = createDiceRoller(1);
    const barb = makeBarbarian({ level: 20 });
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    // Even with the stored counter at 0, the capstone still rages.
    const empty: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageChargesRemaining: 0 },
    };
    const r = useRage({ character: empty, state: init.state });
    expect(r.character.resources.rageRoundsRemaining).toBe(RAGE_ROUNDS);
    // The zero counter isn't pushed negative — unlimited skips the spend entirely.
    expect(r.character.resources.rageChargesRemaining).toBe(0);
    expect(rageChargesMax(barb)).toBe(Number.POSITIVE_INFINITY);
  });

  it('charge pool widens by level: 3 / 4 / 5 / 6 / unlimited', () => {
    const at = (level: number) => rageChargesMax(makeBarbarian({ level }));
    expect(at(1)).toBe(3);
    expect(at(4)).toBe(3);
    expect(at(5)).toBe(4);
    expect(at(10)).toBe(4);
    expect(at(11)).toBe(5);
    expect(at(16)).toBe(5);
    expect(at(17)).toBe(6);
    expect(at(19)).toBe(6);
    expect(at(20)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('Barbarian — Reckless (folded into Rage)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  // Spin endTurn until the player holds the turn again. Returns the state/char
  // at the top of that next player turn (so rage has ticked once).
  function cycleToPlayerTurn(state: CombatState, character: Character) {
    let s = state;
    let c = character;
    for (let i = 0; i < (s.turnOrder.length + 1) * 2; i++) {
      const et = endTurn(s, c);
      s = et.state;
      c = et.character;
      if (s.turnOrder[s.currentTurnIndex] === 'player') break;
    }
    return { state: s, character: c };
  }

  it('raging at L2+ fights recklessly: incoming attacks roll with advantage, and it persists across turns', () => {
    const barb = makeBarbarian({ level: 2 });
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });

    // Entering Rage flips the reckless stance on — no separate declaration.
    const raged = useRage({ character: init.character, state: init.state });
    expect(raged.character.recklessActive).toBe(true);

    // The monster's swing now rolls with advantage.
    const ma = monsterAttack(
      { roller, character: raged.character, state: raged.state },
      monsterId(raged.state),
    );
    expect(ma.state.log.find((l) => l.text.includes('advantage — reckless'))).toBeDefined();

    // Back at the player's turn the fury (and reckless) still holds.
    const next = cycleToPlayerTurn(ma.state, ma.character);
    expect((next.character.resources.rageRoundsRemaining ?? 0)).toBeGreaterThan(0);
    expect(next.character.recklessActive).toBe(true);
  });

  it('the reckless stance lifts the moment the rage fades', () => {
    const barb = makeBarbarian({ level: 2 });
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    const raged = useRage({ character: init.character, state: init.state });

    let s = raged.state;
    let c = raged.character;
    for (let r = 0; r < RAGE_ROUNDS + 1; r++) {
      const cyc = cycleToPlayerTurn(s, c);
      s = cyc.state;
      c = cyc.character;
      if ((c.resources.rageRoundsRemaining ?? 0) <= 0) break;
    }
    expect(c.resources.rageRoundsRemaining ?? 0).toBe(0);
    expect(c.recklessActive).toBe(false);
  });

  it('a raging L1 barbarian (no Reckless feature yet) does NOT get advantage', () => {
    const barb = makeBarbarian({ level: 1 });
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    const raged = useRage({ character: init.character, state: init.state });
    expect(raged.character.resources.rageRoundsRemaining ?? 0).toBeGreaterThan(0);
    expect(raged.character.recklessActive).toBeFalsy();
  });

  it('a non-raging L2 barbarian is not reckless — reckless only exists as part of Rage', () => {
    const barb = makeBarbarian({ level: 2 });
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: barb, monsters: [{ def: getMonster('goblin') }] });
    expect(init.character.recklessActive).toBeFalsy();
  });
});

describe('Ranger — Hunter\'s Mark', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('brands a target and adds bonus damage on hits against it', () => {
    let observed = false;
    for (let seed = 1; seed <= 80 && !observed; seed++) {
      const ranger = makeRanger();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
      const gid = monsterId(init.state);
      const mark = useHuntersMark({ character: init.character, state: init.state, targetId: gid });
      expect(mark.state.huntersMarkTargetId).toBe(gid);
      expect(mark.character.actionEconomy.bonusActionUsed).toBe(true);
      const atk = playerAttack({ roller, character: mark.character, state: mark.state }, gid, 'longbow');
      const markLog = atk.state.log.find((l) => l.kind === 'damage' && l.text.includes('mark ('));
      if (markLog) {
        observed = true;
        expect(markLog.text).toContain('mark (1d6)');
      }
    }
    expect(observed).toBe(true);
  });

  it('adds no mark damage when striking an unmarked target', () => {
    // Two goblins; mark A, attack B → B's hits carry no mark bonus.
    let validated = false;
    for (let seed = 1; seed <= 80 && !validated; seed++) {
      const ranger = makeRanger();
      const roller = createDiceRoller(seed);
      const init = createCombat({
        roller,
        character: ranger,
        monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
      });
      const monsters = init.state.combatants.filter((c) => c.kind === 'monster') as MonsterCombatant[];
      const [a, b] = monsters;
      const mark = useHuntersMark({ character: init.character, state: init.state, targetId: a.id });
      const atk = playerAttack({ roller, character: mark.character, state: mark.state }, b.id, 'longbow');
      // A player hit produces a 'damage'-kind log line. Only assert on seeds
      // where B was actually struck.
      const hitLine = atk.state.log.find((l) => l.kind === 'damage');
      if (hitLine) {
        expect(hitLine.text).not.toContain('mark (');
        validated = true;
      }
    }
    expect(validated).toBe(true);
  });
});

describe('Ranger — Archery fighting style', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function longbowToHit(level: number): number {
    const ranger = makeRanger({ level });
    const roller = createDiceRoller(5);
    const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
    const atk = playerAttack({ roller, character: init.character, state: init.state }, monsterId(init.state), 'longbow');
    const rollLog = atk.state.log.find((l) => l.kind === 'roll' && l.text.includes('Longbow'));
    const match = rollLog?.text.match(/d20\+(\d+)/);
    return match ? Number.parseInt(match[1], 10) : NaN;
  }

  it('grants +2 to ranged attack rolls at L2 (vs the un-styled L1)', () => {
    const l1 = longbowToHit(1);
    const l2 = longbowToHit(2);
    expect(l2 - l1).toBe(2);
  });
});

describe('Ranger (Hunter) — Colossus Slayer', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function woundGoblin(state: CombatState, id: string, current: number): CombatState {
    return {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster' && c.id === id
          ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current } } }
          : c,
      ),
    };
  }

  it('adds 1d8 on a hit against a wounded foe, once per turn', () => {
    let validated = false;
    for (let seed = 1; seed <= 120 && !validated; seed++) {
      const ranger = makeRanger({ level: 5, subclassId: 'hunter' });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
      const gid = monsterId(init.state);
      // Pre-wound to a chunky HP so it survives the hit (so we can read the log).
      let state = woundGoblin(
        { ...init.state, combatants: init.state.combatants.map((c) =>
            c.kind === 'monster' && c.id === gid
              ? { ...c, instance: { ...c.instance, hp: { current: 60, max: 80, temp: 0 } } }
              : c) },
        gid,
        60,
      );
      const atk = playerAttack({ roller, character: init.character, state }, gid, 'longbow');
      state = atk.state;
      const colossusLines = state.log.filter((l) => l.text.includes('colossus (1d8)'));
      if (colossusLines.length >= 1 && state.status === 'active') {
        expect(state.colossusSlayerUsedThisTurn).toBe(true);
        // A second swing this turn must NOT add a second colossus die.
        const atk2 = playerAttack(
          { roller, character: { ...atk.character, actionEconomy: { ...atk.character.actionEconomy, actionUsed: false } }, state },
          gid,
          'longbow',
        );
        const totalColossus = atk2.state.log.filter((l) => l.text.includes('colossus (1d8)')).length;
        expect(totalColossus).toBe(1);
        validated = true;
      }
    }
    expect(validated).toBe(true);
  });

  it('does NOT fire on a full-HP target', () => {
    let checked = false;
    for (let seed = 1; seed <= 60 && !checked; seed++) {
      const ranger = makeRanger({ level: 5, subclassId: 'hunter' });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: ranger, monsters: [{ def: getMonster('goblin') }] });
      const gid = monsterId(init.state);
      // The ranged opening volley may have grazed (or downed) the goblin —
      // restore it to full HP and reopen combat so we isolate the "full-HP
      // target → no Colossus" rule from the volley's damage.
      const state: CombatState = {
        ...init.state,
        status: 'active',
        combatants: init.state.combatants.map((c) =>
          c.kind === 'monster' && c.id === gid
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: c.instance.hp.max } } }
            : c,
        ),
      };
      const before = state.log.length;
      const atk = playerAttack({ roller, character: init.character, state }, gid, 'longbow');
      const newLines = atk.state.log.slice(before);
      const hit = newLines.some((l) => l.kind === 'damage');
      if (hit) {
        expect(newLines.some((l) => l.text.includes('colossus ('))).toBe(false);
        checked = true;
      }
    }
    expect(checked).toBe(true);
  });
});
