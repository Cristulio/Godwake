import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { monsterAttack } from './attack/monsterAttack';
import { refreshMonsterIntents } from './attack/monsterIntent';
import {
  useMartialOffense,
  useMartialDefense,
  useMartialDisrupt,
  martialDefenseReduction,
  martialOffenseDamage,
  martialOffenseAttackBonus,
  martialOffenseCost,
  martialDisruptCost,
  martialPoolMax,
  regenMartialPoolForRound,
  MARTIAL_POOL_MAX,
} from './martialResource';
import { chooseCombatAction } from './actionPolicy';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function monsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster');
}

function damageLines(state: CombatState): string[] {
  return state.log.filter((l) => l.kind === 'damage').map((l) => l.text);
}

function build(
  classId: 'fighter' | 'barbarian' | 'ranger',
  level: number,
  mainHand: string,
): Character {
  return {
    ...createCharacter({
      id: `${classId}-1`,
      name: 'Tester',
      raceId: 'human',
      classId,
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    level,
    inventory: [{ itemId: mainHand }],
    equipped: { mainHand: { itemId: mainHand }, offHand: null, armor: null },
  };
}

const fighter = (level = 3) => build('fighter', level, 'longsword');
const barbarian = (level = 3) => build('barbarian', level, 'greataxe');
const ranger = (level = 3) => build('ranger', level, 'longsword');

describe('Martial pool — refresh + spend rules', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('refreshes to the full pool at the start of every fight, for all three classes', () => {
    for (const c of [fighter(3), barbarian(3), ranger(3)]) {
      const init = createCombat({
        roller: createDiceRoller(1),
        character: c,
        monsters: [{ def: getMonster('goblin') }],
      });
      expect(init.character.resources.martialPointsRemaining).toBe(martialPoolMax(c));
    }
  });

  it('gives all three martial classes the same baseline pool', () => {
    expect(martialPoolMax(fighter(3))).toBe(MARTIAL_POOL_MAX);
    expect(martialPoolMax(barbarian(3))).toBe(MARTIAL_POOL_MAX);
    expect(martialPoolMax(ranger(3))).toBe(MARTIAL_POOL_MAX);
  });

  it('a spend depletes the pool and arms the stance', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const r = useMartialOffense({ character: init.character, state: init.state });
    expect(r.character.martialOffenseActive).toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(
      martialPoolMax(init.character) - martialOffenseCost(init.character),
    );
    expect(r.character.martialSpentThisTurn).toBe(true);
    // The Fighter's Power Attack spends the bonus action (Brace too), but never
    // the main action — the heavy swing still follows the same turn.
    expect(r.character.actionEconomy.actionUsed).toBe(false);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it("the Fighter's Power Attack / Brace are refused once the bonus action is spent", () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const bonusSpent: Character = {
      ...init.character,
      actionEconomy: { ...init.character.actionEconomy, bonusActionUsed: true },
    };
    const off = useMartialOffense({ character: bonusSpent, state: init.state });
    expect(off.character.martialOffenseActive).not.toBe(true);
    expect(off.character.resources.martialPointsRemaining).toBe(
      martialPoolMax(init.character),
    );
    const def = useMartialDefense({ character: bonusSpent, state: init.state });
    expect(def.character.incomingDamageReduction ?? 0).toBe(0);
  });

  it("the Barbarian's Savage Cleave / Bloodied Guard stay free of the action economy", () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const off = useMartialOffense({ character: init.character, state: init.state });
    expect(off.character.martialOffenseActive).toBe(true);
    expect(off.character.actionEconomy.bonusActionUsed).toBe(false);
    const def = useMartialDefense({ character: init.character, state: init.state });
    expect(def.character.incomingDamageReduction).toBe(martialDefenseReduction(init.character));
    expect(def.character.actionEconomy.bonusActionUsed).toBe(false);
  });

  it('caps at one spend per turn — a second spend the same turn is a no-op', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const first = useMartialOffense({ character: init.character, state: init.state });
    const second = useMartialDefense({ character: first.character, state: first.state });
    expect(second.character.incomingDamageReduction ?? 0).toBe(0);
    expect(second.character.resources.martialPointsRemaining).toBe(
      martialPoolMax(init.character) - martialOffenseCost(init.character),
    );
  });

  it('empties — offense is refused once the pool can no longer pay its cost', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const oneLeft: Character = {
      ...init.character,
      resources: { ...init.character.resources, martialPointsRemaining: 1 },
    };
    const r = useMartialOffense({ character: oneLeft, state: init.state }); // costs 2
    expect(r.character.martialOffenseActive).not.toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(1);
  });
});

describe('Martial pool — mid-fight regen', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Fighter regenerates every OTHER round (3,5,7…), capped at its deeper max', () => {
    const spent: Character = {
      ...fighter(3),
      resources: { ...fighter(3).resources, martialPointsRemaining: 1 },
    };
    // Round 1 is the fresh-fight refresh; even rounds do not tick.
    expect(regenMartialPoolForRound(spent, 1).resources.martialPointsRemaining).toBe(1);
    expect(regenMartialPoolForRound(spent, 2).resources.martialPointsRemaining).toBe(1);
    const r3 = regenMartialPoolForRound(spent, 3);
    expect(r3.resources.martialPointsRemaining).toBe(2);
    // Round 4 does not tick either — +1 every OTHER round, not every round.
    expect(regenMartialPoolForRound(r3, 4).resources.martialPointsRemaining).toBe(2);
    const r5 = regenMartialPoolForRound(r3, 5);
    expect(r5.resources.martialPointsRemaining).toBe(3);
    const r7 = regenMartialPoolForRound(r5, 7);
    expect(r7.resources.martialPointsRemaining).toBe(MARTIAL_POOL_MAX);
  });

  it('Barbarian/Ranger regenerate every OTHER round', () => {
    for (const c of [barbarian(3), ranger(3)]) {
      const spent: Character = {
        ...c,
        resources: { ...c.resources, martialPointsRemaining: 0 },
      };
      // Even rounds do not tick; rounds 3 and 5 each return a point.
      expect(regenMartialPoolForRound(spent, 2).resources.martialPointsRemaining).toBe(0);
      expect(regenMartialPoolForRound(spent, 3).resources.martialPointsRemaining).toBe(1);
      expect(regenMartialPoolForRound(spent, 5).resources.martialPointsRemaining).toBe(1);
    }
  });

  it('never regenerates past the cap (returns the same reference)', () => {
    const full: Character = {
      ...fighter(3),
      resources: { ...fighter(3).resources, martialPointsRemaining: MARTIAL_POOL_MAX },
    };
    expect(regenMartialPoolForRound(full, 2)).toBe(full);
  });

  it('regens the pool live across a multi-round fight (endTurn-driven)', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    // Drain the pool to empty, then walk the turn order back to the player a few
    // times — the pool must climb back up rather than stay at zero.
    let state = init.state;
    let character: Character = {
      ...init.character,
      resources: { ...init.character.resources, martialPointsRemaining: 0 },
    };
    let lastSeen = 0;
    for (let i = 0; i < 6; i++) {
      const r = endTurn(state, character);
      state = r.state;
      character = r.character;
      if (state.turnOrder[state.currentTurnIndex] === 'player') {
        lastSeen = character.resources.martialPointsRemaining ?? 0;
      }
    }
    expect(lastSeen).toBeGreaterThan(0);
  });
});

describe('Martial OFFENSE — heavy/aimed strike', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("Fighter's Power Attack lands surer (+2 to hit) AND bites for +2 damage", () => {
    const init = createCombat({
      roller: createDiceRoller(5),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.ac = 2; // guarantee the hit so the breakdown is present
    const character: Character = { ...init.character, martialOffenseActive: true };

    expect(martialOffenseAttackBonus(character)).toBe(2);
    expect(martialOffenseDamage(character)).toBe(2);

    const { state } = playerAttack(
      { roller: createDiceRoller(5), character, state: init.state },
      goblin.id,
      'longsword',
    );
    const toHit = state.log.find((l) => /attacks .* with Longsword/.test(l.text))!;
    // STR 16 (+3) + prof +2 = +5 base, plus the +2 Power Attack to-hit = +7.
    expect(toHit.text).toMatch(/d20\+7 /);
    expect(damageLines(state).some((t) => /\+ 2 heavy/.test(t))).toBe(true);
  });

  it("the Barbarian's offense cleaves into a second foe", () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const [a, b] = monsters(init.state);
    a.instance.ac = 2; // guarantee the primary hit so the cleave can spill
    const character: Character = { ...init.character, martialOffenseActive: true };
    const { state } = playerAttack(
      { roller: createDiceRoller(3), character, state: init.state },
      a.id,
      'greataxe',
    );
    expect(
      damageLines(state).some((t) =>
        new RegExp(`cleaves on into ${b.instance.displayName}`).test(t),
      ),
    ).toBe(true);
  });
});

describe('Martial DEFENSE — brace/guard', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('sets the next-hit reduction and spends one point', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const r = useMartialDefense({ character: init.character, state: init.state });
    expect(r.character.incomingDamageReduction).toBe(martialDefenseReduction(init.character));
    expect(r.character.resources.martialPointsRemaining).toBe(martialPoolMax(init.character) - 1);
  });

  it('blunts the next incoming hit, then is consumed', () => {
    const init = createCombat({
      roller: createDiceRoller(7),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    const braced = useMartialDefense({ character: init.character, state: init.state });
    const before = braced.character.hp.current;
    const roller = createDiceRoller(7);
    let state = braced.state;
    let character = braced.character;
    for (let i = 0; i < 6 && character.incomingDamageReduction; i++) {
      ({ state, character } = monsterAttack({ roller, character, state }, goblin.id));
    }
    expect(character.incomingDamageReduction ?? 0).toBe(0);
    expect(character.hp.current).toBeLessThanOrEqual(before);
  });
});

describe('Martial DISRUPT — staggering strike', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('arms the stance and spends two points (uniform DISRUPT cost — no stunlock)', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(martialDisruptCost(barbarian(3))).toBe(2);
    const r = useMartialDisrupt({ character: init.character, state: init.state });
    expect(r.character.martialDisruptActive).toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(MARTIAL_POOL_MAX - 2);
  });

  it("the Fighter's Shield Bash costs 2 Resolve — spent from its Resolve pool", () => {
    expect(martialDisruptCost(fighter(3))).toBe(2);
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const r = useMartialDisrupt({ character: init.character, state: init.state });
    expect(r.character.martialDisruptActive).toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(MARTIAL_POOL_MAX - 2);
  });

  it('a connecting hit fells the foe, which then loses its turn', () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: barbarian(3),
      monsters: [{ def: getMonster('hobgoblin') }],
    });
    const foe = monsters(init.state)[0];
    foe.instance.ac = 2; // guarantee the staggering hit lands
    const character: Character = { ...init.character, martialDisruptActive: true };
    const roller = createDiceRoller(3);
    const hit = playerAttack({ roller, character, state: init.state }, foe.id, 'greataxe');
    const struck = monsters(hit.state)[0];
    if (struck.instance.hp.current <= 0) return; // survived by design; guard anyway
    expect(struck.instance.staggeredTurns).toBe(1);
    expect(hit.character.martialDisruptActive).toBe(false);

    const turn = monsterAttack({ roller, character: hit.character, state: hit.state }, foe.id);
    expect(turn.state.log.some((l) => /knocked down — the turn is lost/.test(l.text))).toBe(true);
    expect(monsters(turn.state)[0].instance.staggeredTurns).toBe(0);
  });

  it('a clean miss burns the armed stance — no stagger lands and the charge is lost', () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: barbarian(3),
      monsters: [{ def: getMonster('hobgoblin') }],
    });
    const foe = monsters(init.state)[0];
    foe.instance.ac = 99; // unhittable barring a nat-20 — force the whiff
    const character: Character = { ...init.character, martialDisruptActive: true };
    const roller = createDiceRoller(3);
    const miss = playerAttack({ roller, character, state: init.state }, foe.id, 'greataxe');
    expect(miss.state.lastAttack?.hit).toBe(false); // guard: the strike really missed
    expect(miss.character.martialDisruptActive).toBe(false); // the spent point is gone
    expect(monsters(miss.state)[0].instance.staggeredTurns ?? 0).toBe(0); // no stagger applied
    expect(miss.state.log.some((l) => /staggering strike goes wide/.test(l.text))).toBe(true);
  });
});

describe('Ranger Focus — rebalanced spend costs', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Aimed Shot is a 1-point spend (down from 2)', () => {
    expect(martialOffenseCost(ranger())).toBe(1);
    const init = createCombat({
      roller: createDiceRoller(1),
      character: ranger(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const r = useMartialOffense({ character: init.character, state: init.state });
    expect(r.character.martialOffenseActive).toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(MARTIAL_POOL_MAX - 1);
  });

  it('Aimed Shot deals about half the Barbarian spike at each level', () => {
    for (const lvl of [1, 3, 8, 20]) {
      const fullSpike = 6 + Math.floor(lvl / 2); // the Barbarian's 2-point spike
      expect(martialOffenseDamage(barbarian(lvl))).toBe(fullSpike);
      expect(martialOffenseDamage(ranger(lvl))).toBe(Math.floor(fullSpike / 2));
    }
  });

  it('Crippling Shot costs 2 Focus (up from 1) — the strong stagger', () => {
    expect(martialDisruptCost(ranger())).toBe(2);
    const init = createCombat({
      roller: createDiceRoller(1),
      character: ranger(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const r = useMartialDisrupt({ character: init.character, state: init.state });
    expect(r.character.martialDisruptActive).toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(MARTIAL_POOL_MAX - 2);
  });

  it('Crippling Shot is refused with only 1 Focus left (needs 2)', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: ranger(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const oneLeft: Character = {
      ...init.character,
      resources: { ...init.character.resources, martialPointsRemaining: 1 },
    };
    const r = useMartialDisrupt({ character: oneLeft, state: init.state });
    expect(r.character.martialDisruptActive).not.toBe(true);
    expect(r.character.resources.martialPointsRemaining).toBe(1);
  });

  it('leaves the Fighter/Barbarian OFFENSE (2) untouched — Barbarian DISRUPT now also costs 2', () => {
    for (const c of [fighter(3), barbarian(3)]) {
      expect(martialOffenseCost(c)).toBe(2);
    }
    expect(martialDisruptCost(barbarian(3))).toBe(2);
  });
});

describe('Strategic bot — reads the telegraph and spends well', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  /** Re-seed every monster's intent after mutating its stat block so the bot
   *  reads the telegraph it would actually see. */
  function withIntents(state: CombatState, character: Character): CombatState {
    return refreshMonsterIntents(state, character);
  }

  it('HOLDS a DEFENSE for a telegraphed heavy hit (foe too small to disrupt)', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    // A small foe (would die to a swing) winding up a haymaker — brace it, don't
    // waste a stagger on something we'd kill anyway.
    goblin.instance.bonusDamage = 20;
    const state = withIntents(init.state, init.character);
    expect(chooseCombatAction(state, init.character).kind).toBe('martial-defense');
  });

  it('DISRUPTS a meaty foe that is telegraphing a heavy hit', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 }; // survives the blow
    goblin.instance.bonusDamage = 20; // dangerous wind-up
    const state = withIntents(init.state, init.character);
    expect(chooseCombatAction(state, init.character).kind).toBe('martial-disrupt');
  });

  it('spends OFFENSE on a meaty target when nothing needs defending', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 }; // worth the spike
    const state = withIntents(init.state, init.character);
    expect(chooseCombatAction(state, init.character).kind).toBe('martial-offense');
  });

  it('CONSERVES on a near-dead trash mob — just swings', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 3 }; // overkill — don't spike
    const state = withIntents(init.state, init.character);
    expect(chooseCombatAction(state, init.character).kind).toBe('attack');
  });

  it('does not hoard a full pool — commits OFFENSE on a worthwhile (legendary) foe', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
      isElite: true, // primary foe gets a legendary-resistance pool — worth the spike
    });
    const goblin = monsters(init.state)[0];
    // Small HP (below the meaty threshold) but a long elite fight: the legendary
    // pool makes it worth committing the heavy spike rather than banking points.
    goblin.instance.hp = { ...goblin.instance.hp, current: 14, max: 14 };
    const state = withIntents(init.state, init.character);
    expect(chooseCombatAction(state, init.character).kind).toBe('martial-offense');
  });

  it('does not spend twice — once a point is spent this turn, it swings', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 };
    const spent: Character = { ...init.character, martialSpentThisTurn: true };
    expect(chooseCombatAction(withIntents(init.state, spent), spent).kind).toBe('attack');
  });
});
