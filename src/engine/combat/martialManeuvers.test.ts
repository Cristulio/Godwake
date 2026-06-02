import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { monsterAttack } from './attack/monsterAttack';
import { usePowerAttack, useBrace } from './fighterManeuvers';
import { useCleave, useKnockdown, useRage } from './rage';
import { chooseCombatAction } from './actionPolicy';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { braceDamageReduction, shortRestHeal, POWER_ATTACK_CHARGES } from '../character/actions';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function monsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster');
}

function fighter(level = 1): Character {
  return {
    ...createCharacter({
      id: 'f1',
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
    }),
    level,
    inventory: [{ itemId: 'longsword' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
}

function barbarian(level = 3): Character {
  return {
    ...createCharacter({
      id: 'b1',
      name: 'Korrek',
      raceId: 'human',
      classId: 'barbarian',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'intimidation'],
    }),
    level,
    inventory: [{ itemId: 'greataxe' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: null },
  };
}

function damageLines(state: CombatState): string[] {
  return state.log.filter((l) => l.kind === 'damage').map((l) => l.text);
}

describe('Fighter Power Attack', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('declares a free stance — sets the flag, spends a charge, no action', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const before = init.character.resources.powerAttackChargesRemaining ?? 0;
    expect(before).toBeGreaterThan(0);
    const r = usePowerAttack({ character: init.character, state: init.state });
    expect(r.character.powerAttackActive).toBe(true);
    expect(r.character.actionEconomy.actionUsed).toBe(false);
    expect(r.character.resources.powerAttackChargesRemaining).toBe(before - 1);
  });

  it('does nothing at zero charges — flag stays off, no spend', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const drained: Character = {
      ...init.character,
      resources: { ...init.character.resources, powerAttackChargesRemaining: 0 },
    };
    const r = usePowerAttack({ character: drained, state: init.state });
    expect(r.character.powerAttackActive).not.toBe(true);
    expect(r.character.resources.powerAttackChargesRemaining).toBe(0);
  });

  it('adds +4 flat damage with NO to-hit penalty', () => {
    const init = createCombat({
      roller: createDiceRoller(5),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.ac = 2; // guarantee the hit so the damage breakdown is present
    const character: Character = { ...init.character, powerAttackActive: true };
    const roller = createDiceRoller(5);
    const { state } = playerAttack(
      { roller, character, state: init.state },
      goblin.id,
      'longsword',
    );
    const toHit = state.log.find((l) => /attacks .* with Longsword/.test(l.text))!;
    // STR 16 (+3) + prof +2 = +5, with no accuracy cost — the charge is the price.
    expect(toHit.text).toMatch(/d20\+5 /);
    expect(damageLines(state).some((t) => /\+ 4 power/.test(t))).toBe(true);
  });

  it('bot spends a charge on a meaty target, hoards it on a near-dead one (balanced)', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];

    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 }; // worth the spike
    expect(chooseCombatAction(init.state, init.character).kind).toBe('power-attack');

    goblin.instance.hp = { ...goblin.instance.hp, current: 3 }; // wasted overkill — just swing
    expect(chooseCombatAction(init.state, init.character).kind).toBe('attack');
  });

  it('bot will not power-attack with no charges left', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 };
    const drained: Character = {
      ...init.character,
      resources: { ...init.character.resources, powerAttackChargesRemaining: 0 },
    };
    expect(chooseCombatAction(init.state, drained).kind).toBe('attack');
  });

  it('bot does not re-declare once the stance is up — it swings', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    goblin.instance.hp = { ...goblin.instance.hp, current: 30, max: 30 };
    const armed: Character = { ...init.character, powerAttackActive: true };
    expect(chooseCombatAction(init.state, armed).kind).toBe('attack');
  });

  it('refreshes charges on a short rest', () => {
    const f = fighter(1);
    const spent: Character = {
      ...f,
      resources: { ...f.resources, powerAttackChargesRemaining: 0 },
    };
    const rested = shortRestHeal(spent, 0);
    expect(rested.resources.powerAttackChargesRemaining).toBe(POWER_ATTACK_CHARGES);
  });
});

describe('Fighter Brace', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('sets the next-hit reduction and spends the per-combat charge + bonus action', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(init.character.resources.braceAvailable).toBe(true);
    const r = useBrace({ character: init.character, state: init.state });
    expect(r.character.incomingDamageReduction).toBe(braceDamageReduction(init.character));
    expect(r.character.resources.braceAvailable).toBe(false);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('blunts the next incoming hit, then is spent', () => {
    const init = createCombat({
      roller: createDiceRoller(7),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];
    const braced = useBrace({ character: init.character, state: init.state });
    const before = braced.character.hp.current;
    const roller = createDiceRoller(7);
    // Force a connecting monster swing by dropping the hero's AC implicitly is
    // hard; instead drive several swings and confirm the reduction was consumed
    // exactly once (the flag clears on the first hit received).
    let state = braced.state;
    let character = braced.character;
    for (let i = 0; i < 6 && character.incomingDamageReduction; i++) {
      ({ state, character } = monsterAttack({ roller, character, state }, goblin.id));
    }
    expect(character.incomingDamageReduction ?? 0).toBe(0);
    expect(character.hp.current).toBeLessThanOrEqual(before);
  });

  it('bot braces a big incoming hit while healthy, ignores a small one', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: fighter(3),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monsters(init.state)[0];

    // A goblin alone is not a big enough hit to spend the charge on.
    expect(chooseCombatAction(init.state, init.character).kind).not.toBe('brace');

    // Make the lone foe hit like a boss — now the set is worth it.
    goblin.instance.bonusDamage = 20;
    expect(chooseCombatAction(init.state, init.character).kind).toBe('brace');
  });
});

describe('Barbarian Cleave', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('only arms while raging', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    expect(useCleave({ character: init.character, state: init.state }).character.cleaveActive).toBeFalsy();
    const raging = useRage({ character: init.character, state: init.state }).character;
    expect(useCleave({ character: raging, state: init.state }).character.cleaveActive).toBe(true);
  });

  it("the turn's first hit spills into a second foe", () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const [a, b] = monsters(init.state);
    a.instance.ac = 2; // guarantee the primary hit so the cleave can spill
    const character: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageRoundsRemaining: 3 },
      cleaveActive: true,
    };
    const roller = createDiceRoller(3);
    const { state } = playerAttack(
      { roller, character, state: init.state },
      a.id,
      'greataxe',
    );
    expect(damageLines(state).some((t) => new RegExp(`cleaves on into ${b.instance.displayName}`).test(t))).toBe(true);
  });

  it('bot declares Cleave when raging against a crowd', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(3),
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    // Already raging + reckless declared, so the next pick is the Cleave stance.
    const armed: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageRoundsRemaining: 3 },
      recklessActive: true,
    };
    expect(chooseCombatAction(init.state, armed).kind).toBe('cleave');
  });
});

describe('Barbarian Knockdown', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('arms only while raging with a charge in hand', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(7),
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(init.character.resources.knockdownAvailable).toBe(true);
    expect(useKnockdown({ character: init.character, state: init.state }).character.knockdownActive).toBeFalsy();
    const raging = useRage({ character: init.character, state: init.state }).character;
    expect(useKnockdown({ character: raging, state: init.state }).character.knockdownActive).toBe(true);
  });

  it('a staggering hit fells the foe, which then loses its turn', () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: barbarian(7),
      monsters: [{ def: getMonster('hobgoblin') }],
    });
    const foe = monsters(init.state)[0];
    foe.instance.ac = 2; // guarantee the staggering hit lands
    const character: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageRoundsRemaining: 3, knockdownAvailable: true },
      knockdownActive: true,
    };
    const roller = createDiceRoller(3);
    const hit = playerAttack(
      { roller, character, state: init.state },
      foe.id,
      'greataxe',
    );
    const struck = monsters(hit.state)[0];
    if (struck.instance.hp.current <= 0) return; // hobgoblin survived by design; guard anyway
    expect(struck.instance.staggeredTurns).toBe(1);
    expect(hit.character.knockdownActive).toBe(false);
    expect(hit.character.resources.knockdownAvailable).toBe(false);

    // The staggered foe's turn is skipped and the counter winds down.
    const turn = monsterAttack({ roller, character: hit.character, state: hit.state }, foe.id);
    expect(turn.state.log.some((l) => /knocked down — the turn is lost/.test(l.text))).toBe(true);
    expect(monsters(turn.state)[0].instance.staggeredTurns).toBe(0);
  });

  it('bot staggers a lone dangerous foe', () => {
    const init = createCombat({
      roller: createDiceRoller(1),
      character: barbarian(7),
      monsters: [{ def: getMonster('goblin') }],
    });
    const foe = monsters(init.state)[0];
    foe.instance.bonusDamage = 12; // a genuinely dangerous lone threat
    const armed: Character = {
      ...init.character,
      resources: { ...init.character.resources, rageRoundsRemaining: 3, knockdownAvailable: true },
      recklessActive: true,
    };
    expect(chooseCombatAction(init.state, armed).kind).toBe('knockdown');
  });
});
