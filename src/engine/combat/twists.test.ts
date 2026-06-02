import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { applyCursedGroundChip } from './turn';
import { playerAttack } from './attack';
import { createDiceRoller, type DiceRoller } from '../dice';
import { getMonster as getDef } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeFighter(over: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'f1',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    ...over,
  };
}

function primary(state: CombatState): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster')!;
}

/** Wrap a roller, recording the advantage mode passed to each d20 call. */
function recordingRoller(base: DiceRoller): {
  roller: DiceRoller;
  d20Advantages: Array<Parameters<DiceRoller['d20']>[0]>;
} {
  const d20Advantages: Array<Parameters<DiceRoller['d20']>[0]> = [];
  const roller: DiceRoller = {
    roll: (expr, adv) => base.roll(expr, adv),
    d20: (adv = 'normal', mod = 0) => {
      d20Advantages.push(adv);
      return base.d20(adv, mod);
    },
    serialize: () => base.serialize(),
  };
  return { roller, d20Advantages };
}

describe('dungeon twist combat effects', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Cursed Ground opens with a front-loaded chip on turn 0, then decays', () => {
    const before = makeFighter();
    // The opening bite scales to the build: 10% of max HP, floored at 1.
    const opening = Math.max(1, Math.round(before.hp.max * 0.1));
    const decay = Math.max(1, Math.round(opening / 4));
    const init = createCombat({
      character: before,
      monsters: [{ def: getDef('goblin') }],
      twistId: 'cursed-ground',
    });
    expect(init.state.cursedGroundChipDecay).toBe(decay);
    // Turn 0 never travels through endTurn — createCombat bites the opening chip
    // once and steps it down for the next turn, so the returned state already
    // carries the decayed chip.
    expect(init.character.hp.current).toBe(before.hp.max - opening);
    expect(init.state.cursedGroundChip).toBe(Math.max(0, opening - decay));

    // The start-of-player-turn helper (called from endTurn) bites the now-smaller
    // chip — the second bite is lighter than the opening, never heavier.
    const second = init.state.cursedGroundChip ?? 0;
    const ticked = applyCursedGroundChip(init.state, init.character);
    expect(second).toBeLessThan(opening);
    expect(ticked.character.hp.current).toBe(before.hp.max - opening - second);
    expect(ticked.state.cursedGroundChip).toBe(Math.max(0, second - decay));
  });

  it('Cursed Ground total drain is bounded and stops — it does not compound with fight length', () => {
    const maxHp = 100;
    const init = createCombat({
      character: makeFighter({ hp: { current: maxHp, max: maxHp, temp: 0 } }),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'cursed-ground',
    });
    // createCombat already bit once (turn 0); keep ticking until the curse spends
    // itself and confirm the bites stop well short of grinding the hero down.
    let state = init.state;
    let character = init.character;
    for (let i = 0; i < 30; i++) {
      const t = applyCursedGroundChip(state, character);
      state = t.state;
      character = t.character;
    }
    expect(state.cursedGroundChip).toBe(0); // the curse has spent itself
    // A 30-turn fight on the old flat 5%/turn chip would have drained ~150% of
    // max HP (floored at 1). Bounded, it stays a front-loaded spike: ~a quarter.
    const totalDrained = maxHp - character.hp.current;
    expect(totalDrained).toBeLessThanOrEqual(Math.round(maxHp * 0.3));
    expect(totalDrained).toBeGreaterThan(Math.round(maxHp * 0.1)); // still a real opening bite
  });

  it('Cursed Ground scales the opening chip with the hero max HP', () => {
    // The opening bite (turn 0) is what the hero's HP drop measures — the state's
    // chip has already decayed once by the time createCombat returns.
    const tanky = createCombat({
      character: makeFighter({ hp: { current: 200, max: 200, temp: 0 } }),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'cursed-ground',
    });
    expect(200 - tanky.character.hp.current).toBe(20); // 10% of 200

    const frail = createCombat({
      character: makeFighter({ hp: { current: 10, max: 10, temp: 0 } }),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'cursed-ground',
    });
    expect(10 - frail.character.hp.current).toBe(1); // 10% of 10 = 1
  });

  it('Cursed Ground drains temp HP before real HP', () => {
    const c = makeFighter({ hp: { current: 30, max: 30, temp: 3 } });
    const ticked = applyCursedGroundChip(
      { cursedGroundChip: 4, status: 'active', log: [], combatants: [] } as unknown as CombatState,
      c,
    );
    expect(ticked.character.hp.temp).toBe(0);
    expect(ticked.character.hp.current).toBe(29); // 4 chip - 3 temp = 1 to current
  });

  it('Cursed Ground is non-lethal — it floors the hero at 1 HP, never kills', () => {
    const c = makeFighter({ hp: { current: 3, max: 40, temp: 0 } });
    const ticked = applyCursedGroundChip(
      {
        cursedGroundChip: 10,
        status: 'active',
        log: [],
        combatants: [],
      } as unknown as CombatState,
      c,
    );
    expect(ticked.character.hp.current).toBe(1);
    expect(ticked.state.status).toBe('active'); // the curse alone never ends the fight
  });

  it('Gloom rolls the first attack at disadvantage, then a normal roll', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'gloom',
    });
    expect(init.state.gloomActive).toBe(true);
    const target = primary(init.state).id;

    const rec = recordingRoller(createDiceRoller(7));
    const first = playerAttack(
      { roller: rec.roller, character: init.character, state: init.state },
      target,
      'longsword',
    );
    expect(rec.d20Advantages[0]).toBe('disadvantage');

    // Second swing of the fight is a straight roll — gloom is one-shot.
    const rec2 = recordingRoller(createDiceRoller(7));
    playerAttack(
      { roller: rec2.roller, character: first.character, state: first.state },
      target,
      'longsword',
    );
    expect(rec2.d20Advantages[0]).toBe('normal');
  });

  it('Gloom also stamps a slight +1 enemy damage edge (blows unseen in the dark)', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'gloom',
    });
    expect(primary(init.state).instance.bonusDamage).toBe(1);
  });

  it('Gloom does NOT impose disadvantage without the twist', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
    });
    expect(init.state.gloomActive).toBeUndefined();
    const target = primary(init.state).id;
    const rec = recordingRoller(createDiceRoller(7));
    playerAttack(
      { roller: rec.roller, character: init.character, state: init.state },
      target,
      'longsword',
    );
    expect(rec.d20Advantages[0]).toBe('normal');
  });

  it('Bloodscent stamps +2 bonus damage on the enemy instance', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      twistId: 'bloodscent',
    });
    expect(primary(init.state).instance.bonusDamage).toBe(2);
  });

  it('Bloodscent stacks on top of the ascension damage bonus', () => {
    // Asc 5 carries a +2 enemy damage bonus; Bloodscent adds another +2.
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      ascension: 5,
      twistId: 'bloodscent',
    });
    expect(primary(init.state).instance.bonusDamage).toBe(4);
  });

  it('Sealed Wards suppresses the start-of-combat blessing gird', () => {
    const blessed = makeFighter({ blessings: ['lathanders-dawn'] });
    const normal = createCombat({
      character: blessed,
      monsters: [{ def: getDef('goblin') }],
    });
    expect(normal.character.hp.temp).toBe(3);

    const sealed = createCombat({
      character: blessed,
      monsters: [{ def: getDef('goblin') }],
      twistId: 'sealed-wards',
    });
    expect(sealed.state.blessingsSealed).toBe(true);
    expect(sealed.character.hp.temp).toBe(0);
  });

  it('Quickening puts the enemies first in the turn order', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }, { def: getDef('goblin') }],
      twistId: 'quickening',
    });
    // Monsters lead, the hero acts last; the auto-driver fires off index 0.
    expect(init.state.turnOrder[init.state.turnOrder.length - 1]).toBe('player');
    expect(init.state.turnOrder[0]).not.toBe('player');
  });

  it('an untwisted fight carries no twist combat state', () => {
    const init = createCombat({
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
    });
    expect(init.state.cursedGroundChip).toBeUndefined();
    expect(init.state.gloomActive).toBeUndefined();
    expect(init.state.blessingsSealed).toBeUndefined();
    expect(init.state.turnOrder[0]).toBe('player');
    expect(primary(init.state).instance.bonusDamage).toBeUndefined();
  });
});
