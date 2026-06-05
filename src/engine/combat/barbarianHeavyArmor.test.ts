import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import {
  equipItem,
  equipDenialReason,
  classArmorProficient,
  rageBrokenByArmor,
  wearsHeavyArmor,
  barbarianMayDonHeavy,
  armorEquipWarning,
} from '../character/equip';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { monsterAttack } from './attack/monsterAttack';
import { useRage } from './rage';
import { RAGE_ROUNDS } from '../character/actions';
import { isRaging } from '../character/derived';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { getItem } from '../../content/items';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';
import type { Armor } from '../../schemas/item';

const HEAVY = 'chain-mail';
const MEDIUM = 'half-plate';
const LIGHT = 'leather-armor';

const armor = (id: string) => getItem(id) as Armor;

function makeBarbarian(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-barbarian',
      name: 'Korrek',
      raceId: 'human',
      classId: 'barbarian',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15 — clears heavy-armour STR gates
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[1],
        cha: STANDARD_ARRAY[3],
        wis: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'intimidation'],
    }),
    inventory: [{ itemId: 'greataxe' }, { itemId: HEAVY }, { itemId: MEDIUM }],
    equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: null },
    ...extra,
  };
}

function inHeavy(extra: Partial<Character> = {}): Character {
  return makeBarbarian({
    equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: { itemId: HEAVY } },
    ...extra,
  });
}

function monsterId(state: CombatState): string {
  return (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
}

describe('Barbarian heavy armour — proficiency', () => {
  it('is proficient with light + medium, but not heavy', () => {
    expect(classArmorProficient('barbarian', armor(LIGHT))).toBe(true);
    expect(classArmorProficient('barbarian', armor(MEDIUM))).toBe(true);
    expect(classArmorProficient('barbarian', armor(HEAVY))).toBe(false);
  });

  it('may still DON heavy armour despite not being proficient (no hard block)', () => {
    const barb = makeBarbarian();
    expect(barbarianMayDonHeavy('barbarian', armor(HEAVY))).toBe(true);
    expect(barbarianMayDonHeavy('ranger', armor(HEAVY))).toBe(false);
    expect(equipDenialReason(barb, HEAVY)).toBeNull();
    const idx = barb.inventory.findIndex((r) => r.itemId === HEAVY);
    const after = equipItem(barb, idx);
    expect(after.equipped.armor?.itemId).toBe(HEAVY);
  });

  it('does not let a non-barbarian wear heavy armour it lacks proficiency for', () => {
    expect(barbarianMayDonHeavy('rogue', armor(HEAVY))).toBe(false);
  });
});

describe('Barbarian heavy armour — predicates', () => {
  it('rageBrokenByArmor is true only for a barbarian in heavy armour', () => {
    const bare = makeBarbarian();
    const heavy = inHeavy();
    const medium = makeBarbarian({
      equipped: { mainHand: { itemId: 'greataxe' }, offHand: null, armor: { itemId: MEDIUM } },
    });
    expect(rageBrokenByArmor(bare)).toBe(false);
    expect(rageBrokenByArmor(medium)).toBe(false);
    expect(rageBrokenByArmor(heavy)).toBe(true);
    expect(wearsHeavyArmor(heavy)).toBe(true);
    expect(wearsHeavyArmor(medium)).toBe(false);
  });
});

describe('Barbarian heavy armour — Rage ends / is blocked', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a raging barbarian that equips heavy armour stops raging immediately', () => {
    const barb = makeBarbarian();
    const raging: Character = {
      ...barb,
      resources: { ...barb.resources, rageRoundsRemaining: RAGE_ROUNDS },
    };
    expect(isRaging(raging)).toBe(true);
    const idx = raging.inventory.findIndex((r) => r.itemId === HEAVY);
    const after = equipItem(raging, idx);
    expect(after.equipped.armor?.itemId).toBe(HEAVY);
    expect(after.resources.rageRoundsRemaining).toBe(0);
    expect(isRaging(after)).toBe(false);
  });

  it('equipping MEDIUM armour does not break an active Rage', () => {
    const barb = makeBarbarian();
    const raging: Character = {
      ...barb,
      resources: { ...barb.resources, rageRoundsRemaining: RAGE_ROUNDS },
    };
    const idx = raging.inventory.findIndex((r) => r.itemId === MEDIUM);
    const after = equipItem(raging, idx);
    expect(after.equipped.armor?.itemId).toBe(MEDIUM);
    expect(after.resources.rageRoundsRemaining).toBe(RAGE_ROUNDS);
    expect(rageBrokenByArmor(after)).toBe(false);
  });

  it('a barbarian in heavy armour cannot enter Rage — no charge spent, no bonus action', () => {
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: inHeavy(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const chargesBefore = init.character.resources.rageChargesRemaining;
    const r = useRage({ character: init.character, state: init.state });
    expect(r.character.resources.rageRoundsRemaining ?? 0).toBe(0);
    expect(r.character.resources.rageChargesRemaining).toBe(chargesBefore);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(false);
    expect(r.state.log.some((l) => /plate|armor|smother/i.test(l.text))).toBe(true);
  });
});

describe('Barbarian heavy armour — Rage benefits are suppressed', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('grants NO bonus melee damage while "raging" in heavy armour', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const roller = createDiceRoller(seed);
      const init = createCombat({
        roller,
        character: inHeavy(),
        monsters: [{ def: getMonster('goblin') }],
      });
      const raging: Character = {
        ...init.character,
        resources: { ...init.character.resources, rageRoundsRemaining: 5 },
      };
      const atk = playerAttack(
        { roller, character: raging, state: init.state },
        monsterId(init.state),
        'greataxe',
      );
      const rageLog = atk.state.log.find((l) => l.kind === 'damage' && l.text.includes('Rage'));
      expect(rageLog).toBeUndefined();
    }
  });

  it('does NOT halve incoming physical damage while "raging" in heavy armour', () => {
    // Same armour (so AC and to-hit are identical); the only difference is the
    // rage flag. With heavy armour the resist is gated off → identical damage.
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      const rollerCalm = createDiceRoller(seed);
      const initCalm = createCombat({
        roller: rollerCalm,
        character: inHeavy(),
        monsters: [{ def: getMonster('goblin') }],
      });
      const resCalm = monsterAttack(
        { roller: rollerCalm, character: initCalm.character, state: initCalm.state },
        monsterId(initCalm.state),
      );
      const lossCalm = initCalm.character.hp.current - resCalm.character.hp.current;

      const rollerRage = createDiceRoller(seed);
      const initRage = createCombat({
        roller: rollerRage,
        character: inHeavy(),
        monsters: [{ def: getMonster('goblin') }],
      });
      const raging: Character = {
        ...initRage.character,
        resources: { ...initRage.character.resources, rageRoundsRemaining: 5 },
      };
      const resRage = monsterAttack(
        { roller: rollerRage, character: raging, state: initRage.state },
        monsterId(initRage.state),
      );
      const lossRage = raging.hp.current - resRage.character.hp.current;

      if (lossCalm > 1) {
        expect(lossRage).toBe(lossCalm); // heavy armour: rage does NOT halve
        validated = true;
      }
    }
    expect(validated).toBe(true);
  });
});

describe('armorEquipWarning — heavy-armour rage flag', () => {
  it('warns a barbarian inspecting heavy armour', () => {
    const w = armorEquipWarning('barbarian', armor(HEAVY));
    expect(w).toBeTruthy();
    expect(w).toMatch(/rage/i);
  });

  it('does not warn a barbarian about medium or light armour', () => {
    expect(armorEquipWarning('barbarian', armor(MEDIUM))).toBeNull();
    expect(armorEquipWarning('barbarian', armor(LIGHT))).toBeNull();
  });

  it('does not show the rage warning for other classes', () => {
    expect(armorEquipWarning('fighter', armor(HEAVY))).toBeNull();
    const ranger = armorEquipWarning('ranger', armor(HEAVY));
    expect(ranger ?? '').not.toMatch(/rage/i);
  });
});
