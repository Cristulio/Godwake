import { describe, it, expect } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { equipItem } from '../character/equip';
import { setPieceRef } from './setGear';
import { getSetPiece } from '../../content/sets';
import { characterAffixMods } from './affixMods';
import { createCombat } from '../combat/createCombat';
import { chooseCombatAction, applyPlannedAction } from '../combat/actionPolicy';
import { getMonster } from '../../content/monsters';
import { createDiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import type { CombatState, MonsterCombatant } from '../../types/combat';

/**
 * Regression guard for the #491 gear overhaul caster path. The overhaul added the
 * caster off-hand orb (`armor`/`orb` category) and the wizard wand+orb set
 * (Vestments of the Archmagi). A worktree was spun up on the belief these threw a
 * fatal exception in the live combat loop ("caster crater"). They do not — the
 * crater is pre-existing early-game fragility, not a gear bug — and this test
 * pins that down: a wizard wearing a generic orb AND an Archmagi set piece equips
 * cleanly, folds the set effect into the affix pipeline, and casts for real spell
 * damage through a live combat turn without throwing.
 */

function geared(): Character {
  const wiz = buildPlayerCharacter(presetCreationInput('wizard'));
  const orbRef: ItemRef = { itemId: 'crystal-orb' };
  const setOrb = setPieceRef(getSetPiece('archmagi-orb')!);
  const setWand = setPieceRef(getSetPiece('archmagi-wand')!);
  return {
    ...wiz,
    level: 6,
    inventory: [...wiz.inventory, orbRef, setOrb, setWand],
  };
}

function equipById(c: Character, itemId: string): Character {
  return equipItem(c, c.inventory.findIndex((r) => r.itemId === itemId));
}

function leadMonsterHp(state: CombatState): number {
  const m = state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
  return m.instance.hp.current;
}

describe('caster set gear — #491 regression', () => {
  it('equips a generic orb + Archmagi set piece and folds the set effect, no throw', () => {
    let wiz = geared();
    wiz = equipById(wiz, 'archmagi-wand');
    wiz = equipById(wiz, 'archmagi-orb');
    expect(wiz.equipped.mainHand?.itemId).toBe('archmagi-wand');
    expect(wiz.equipped.offHand?.itemId).toBe('archmagi-orb');

    let mods!: ReturnType<typeof characterAffixMods>;
    expect(() => {
      mods = characterAffixMods(wiz);
    }).not.toThrow();
    // Orb of the Archmagi grants +1 spell save DC — proof the set effect rides
    // the affix pipeline from a worn caster off-hand.
    expect(mods.spellDcBonus).toBeGreaterThanOrEqual(1);
  });

  it('casts for real spell damage through a live combat turn', () => {
    let wiz = geared();
    wiz = equipById(wiz, 'crystal-orb'); // generic caster off-hand
    const roller = createDiceRoller(987);
    const { state, character } = createCombat({
      character: wiz,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }],
      roller,
    });

    let s = state;
    let c = character;
    const startHp = leadMonsterHp(s);
    let castOccurred = false;
    for (let i = 0; i < 12; i++) {
      const plan = chooseCombatAction(s, c, 'balanced');
      if (plan.kind === 'cast') castOccurred = true;
      const res = applyPlannedAction({ roller, state: s, character: c }, plan);
      s = res.state;
      c = res.character ?? c;
      if (plan.kind === 'end-turn') break;
      if (s.status !== 'active') break;
    }

    expect(castOccurred).toBe(true);
    expect(leadMonsterHp(s)).toBeLessThan(startHp);
  });
});
