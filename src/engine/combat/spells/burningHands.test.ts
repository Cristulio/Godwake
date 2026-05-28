import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './';
import { spellSaveDC } from './helpers';
import { createDiceRoller, type DiceRoller } from '../../dice';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';
import type { DiceExpression, RollAdvantage, RollResult } from '../../../types/dice';

function makeTieflingWizard(): Character {
  return {
    ...createCharacter({
      id: 'tief-wiz',
      name: 'Ember',
      raceId: 'tiefling',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8
        dex: STANDARD_ARRAY[3], // 12
        con: STANDARD_ARRAY[2], // 13
        int: STANDARD_ARRAY[0], // 15
        wis: STANDARD_ARRAY[1], // 14
        cha: STANDARD_ARRAY[4], // 10
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/**
 * Deterministic roller: every damage die comes up `dieFace`, and the AoE DEX
 * saves consume `d20Naturals` in order. Lets us pin the save success/fail path
 * without depending on a lucky seed.
 */
function scriptedRoller(dieFace: number, d20Naturals: number[]): DiceRoller {
  let i = 0;
  return {
    roll(expression: string | DiceExpression): RollResult {
      const expr =
        typeof expression === 'string'
          ? { count: 1, die: 6 as const, modifier: 0 }
          : expression;
      const rolls = Array.from({ length: expr.count }, () => dieFace);
      const total = rolls.reduce((a, b) => a + b, 0) + expr.modifier;
      return {
        expression: expr,
        rolls,
        modifier: expr.modifier,
        total,
        natural20: false,
        natural1: false,
        advantage: 'normal',
      };
    },
    d20(advantage: RollAdvantage = 'normal', modifier = 0): RollResult {
      const nat = d20Naturals[i++] ?? 1;
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [nat],
        modifier,
        total: nat + modifier,
        natural20: nat === 20,
        natural1: nat === 1,
        advantage,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

/**
 * (11) Tiefling caster Burning Hands — fire-resistance must not apply to the
 * caster's own spell. Burning Hands iterates monster combatants only; the
 * player is never a damage target. This is a "the silo holds" sanity check
 * so a future refactor that drifts the loop catches it.
 */
describe('Burning Hands — caster Tiefling fire resistance does NOT self-apply', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Tiefling wizard casting Burning Hands takes 0 self damage and keeps full HP', () => {
    const goblin = getMonster('goblin');
    const wizard = makeTieflingWizard();
    const startingHp = wizard.hp.current;

    const roller = createDiceRoller(7);
    const state = createCombat({ roller, character: wizard, monsters: [{ def: goblin }] }).state;

    const cast = castSpell({
      roller,
      character: wizard,
      state,
      spellId: 'burning-hands',
    });
    expect(cast.cast).toBe(true);

    // Caster HP is untouched — the cone iterates monsters only.
    expect(wizard.hp.current).toBe(startingHp);
    expect(wizard.hp.temp).toBe(0);

    // No damage log line ever names the player as the target.
    const playerDamageLines = cast.state.log.filter(
      (l) =>
        l.kind === 'damage' &&
        (l.text.includes(wizard.name) || l.text.includes('Ember')),
    );
    expect(playerDamageLines).toHaveLength(0);

    // And there's no "fire resistance" / "halved" line for the caster — that
    // log shape only appears on monster targets with the trait, never on the
    // wizard themselves.
    const halvedSelf = cast.state.log.filter(
      (l) =>
        l.text.includes('halved') &&
        l.text.includes(wizard.name),
    );
    expect(halvedSelf).toHaveLength(0);
  });

  it('damages the monster target — caster fire-resistance does not shrink the outgoing hit', () => {
    const goblin = getMonster('goblin');
    const wizard = makeTieflingWizard();
    const roller = createDiceRoller(7);
    let state = createCombat({ roller, character: wizard, monsters: [{ def: goblin }] }).state;

    const goblinBefore = findMonster(state).instance.hp.current;
    const cast = castSpell({
      roller,
      character: wizard,
      state,
      spellId: 'burning-hands',
    });
    state = cast.state;
    const goblinAfter = findMonster(state).instance.hp.current;
    expect(goblinAfter).toBeLessThan(goblinBefore);
  });
});

/**
 * P1 fix — Burning Hands now rolls a DEX save for half (was guaranteed full
 * AoE damage, which made a L1 slot out-value a L3 one per target and dodged the
 * wizard Focused Casting +1 DC lever entirely).
 */
describe('Burning Hands — DEX save for half', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('rolls a DEX save against the caster spell DC and halves damage on success', () => {
    const goblin = getMonster('goblin'); // DEX 14 → +2
    const wizard = makeTieflingWizard();
    const dc = spellSaveDC(wizard);
    const state = createCombat({
      roller: createDiceRoller(7),
      character: wizard,
      monsters: [{ def: goblin }],
    }).state;

    // 3d6 all show 4 → full 12 fire. Nat 20 (+2 DEX) easily clears the DC.
    const cast = castSpell({
      roller: scriptedRoller(4, [20]),
      character: wizard,
      state,
      spellId: 'burning-hands',
    });
    expect(cast.cast).toBe(true);

    const saveLine = cast.state.log.find((l) => l.text.includes('DEX save:'));
    expect(saveLine).toBeDefined();
    expect(saveLine!.text).toContain(`vs DC ${dc}`);
    expect(saveLine!.text).toContain('success (half)');

    const dmgLine = cast.state.log.find(
      (l) => l.kind === 'damage' && l.text.includes('fire'),
    );
    expect(dmgLine!.text).toContain('takes 6 fire'); // floor(12 / 2)
  });

  it('deals full damage when the save fails', () => {
    const goblin = getMonster('goblin');
    const wizard = makeTieflingWizard();
    const state = createCombat({
      roller: createDiceRoller(7),
      character: wizard,
      monsters: [{ def: goblin }],
    }).state;

    // Nat 1 (+2 DEX = 3) cannot clear the DC → full damage.
    const cast = castSpell({
      roller: scriptedRoller(4, [1]),
      character: wizard,
      state,
      spellId: 'burning-hands',
    });

    const saveLine = cast.state.log.find((l) => l.text.includes('DEX save:'));
    expect(saveLine!.text).toContain('fail (full)');

    const dmgLine = cast.state.log.find(
      (l) => l.kind === 'damage' && l.text.includes('fire'),
    );
    expect(dmgLine!.text).toContain('takes 12 fire');
  });
});

/**
 * P1 fix — AoE saves used a flat d20+0 for every monster, so nimble and slow
 * enemies dodged equally. Saves now read each monster's real DEX, so a high-DEX
 * enemy saves more often than a sluggish one across a sweep of seeds.
 */
describe('AoE save scales with monster DEX', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a high-DEX monster saves more often than a low-DEX one', () => {
    const wizard = makeTieflingWizard();

    const countSaves = (defId: string): number => {
      let saves = 0;
      for (let seed = 1; seed <= 120; seed++) {
        _resetMonsterInstanceCounter();
        const def = getMonster(defId);
        const roller = createDiceRoller(seed);
        const state = createCombat({
          roller,
          character: wizard,
          monsters: [{ def }],
        }).state;
        const cast = castSpell({
          roller,
          character: wizard,
          state,
          spellId: 'burning-hands',
        });
        const saveLine = cast.state.log.find((l) => l.text.includes('DEX save:'));
        if (saveLine?.text.includes('success (half)')) saves++;
      }
      return saves;
    };

    const nimbleSaves = countSaves('drow-warrior'); // DEX 18 → +4
    const sluggishSaves = countSaves('bone-stalker'); // DEX 10 → +0
    expect(nimbleSaves).toBeGreaterThan(sluggishSaves);
  });
});
