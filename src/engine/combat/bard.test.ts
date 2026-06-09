import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { getClass, listClasses } from '../../content/classes';
import {
  characterHasMechanic,
  effectiveAbilityScores,
  isFullCaster,
  spellcastingAbility,
  proficiencyBonus,
} from '../character/derived';
import { abilityModifier } from '../../types/abilities';
import { isWeaponProficient, isArmorProficient } from '../character/equip';
import { canCastSpell } from './spells';
import { spellSaveDC } from './spells/helpers';
import { wizardSpellSlotsForLevel } from '../character/actions';
import { computeAC } from '../character/derived';
import {
  bardInspirationMax,
  bardInspirationDieSize,
  bardInspirationLeft,
  useBardicInspiration,
  spendsInspirationOnDamage,
} from './bard';
import { classUnlockRenown, isClassUnlocked } from '../progression/unlocks';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { monsterAttack } from './attack/monsterAttack';
import { castSpell } from './spells';
import { parseDiceExpression, type DiceRoller } from '../dice';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeBard(level = 1, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('bard'));
  const c: Character = { ...base, level, subclassId };
  return {
    ...c,
    resources: {
      ...c.resources,
      inspirationDiceRemaining: bardInspirationMax(c),
      spellSlots: wizardSpellSlotsForLevel(level),
    },
  };
}

function withMainHand(c: Character, itemId: string | null): Character {
  return { ...c, equipped: { ...c.equipped, mainHand: itemId === null ? null : { itemId } } };
}

function monsterOf(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** A roller whose d20 results are scripted in order; every other die returns its
 *  average. Lets a test force an attack to land/miss deterministically. */
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

describe('Bard — class definition + registry', () => {
  it('is registered as a Charisma full-caster and validates', () => {
    const bard = getClass('bard');
    expect(bard.id).toBe('bard');
    expect(bard.primaryAbility).toContain('cha');
    expect(bard.hitDie).toBe(8);
    expect(bard.subclassLevel).toBe(3);
    expect(listClasses().some((c) => c.id === 'bard')).toBe(true);
  });

  it('casts off Charisma through the shared full-caster engine', () => {
    expect(isFullCaster('bard')).toBe(true);
    expect(spellcastingAbility(makeBard())).toBe('cha');
  });

  it('offers exactly two colleges — Lore and Valor', () => {
    const ids = getClass('bard').subclasses.map((s) => s.id).sort();
    expect(ids).toEqual(['lore', 'valor']);
  });
});

describe('Bard — unlock gating (deepest slot, 800 renown)', () => {
  it('opens at 800 renown spent — above the Monk', () => {
    expect(classUnlockRenown('bard', 'fighter')).toBe(800);
    expect(classUnlockRenown('bard', 'wizard')).toBe(800);
    expect(classUnlockRenown('bard', 'ranger')).toBe(800);
  });

  it('is sealed below 800 and open at 800', () => {
    expect(isClassUnlocked('bard', 799, 'fighter')).toBe(false);
    expect(isClassUnlocked('bard', 800, 'fighter')).toBe(true);
  });
});

describe('Bard — Bardic Inspiration resource', () => {
  it('pool = CHA mod, deeper at the college L10 + the L20 capstone', () => {
    const l1 = makeBard(1);
    const chaMod = abilityModifier(effectiveAbilityScores(l1).cha);
    expect(bardInspirationMax(l1)).toBe(Math.max(1, chaMod));
    // College L10 beats (Lore Peerless Skill / Valor Combat Superiority) add one.
    expect(bardInspirationMax(makeBard(10, 'lore'))).toBe(Math.max(1, chaMod) + 1);
    expect(bardInspirationMax(makeBard(10, 'valor'))).toBe(Math.max(1, chaMod) + 1);
    // The L20 capstone adds two more on top.
    expect(bardInspirationMax(makeBard(20, 'lore'))).toBe(Math.max(1, chaMod) + 3);
  });

  it('the die grows with level: d6 → d8 → d10 → d12', () => {
    expect(bardInspirationDieSize(makeBard(1))).toBe(6);
    expect(bardInspirationDieSize(makeBard(5))).toBe(8);
    expect(bardInspirationDieSize(makeBard(10, 'lore'))).toBe(10);
    expect(bardInspirationDieSize(makeBard(15, 'lore'))).toBe(12);
  });

  it('refills the pool at the start of every encounter', () => {
    const spent: Character = {
      ...makeBard(5),
      resources: { ...makeBard(5).resources, inspirationDiceRemaining: 0 },
    };
    const { character } = createCombat({
      character: spent,
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(character.resources.inspirationDiceRemaining).toBe(bardInspirationMax(spent));
  });

  it('the spend banks a die (bonus action) and decrements the pool', () => {
    const bard = makeBard(1);
    const before = bardInspirationLeft(bard);
    const { state } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const { character } = useBardicInspiration({ character: bard, state });
    expect(character.inspirationActive).toBe(true);
    expect(bardInspirationLeft(character)).toBe(before - 1);
    expect(character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('a banked inspiration die rides the next attack roll (core / Lore)', () => {
    const bard = withMainHand(makeBard(1), 'war-lute');
    const goblinAc = getMonster('goblin').ac;
    const chaMod = abilityModifier(effectiveAbilityScores(bard).cha);
    const flatBonus = proficiencyBonus(1) + chaMod;
    // A natural roll that lands ONLY with the inspiration die (avg 4 on a d6).
    const nat = goblinAc - flatBonus - 1;
    const roller = scriptRoller([nat]);
    const { state } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const inspired: Character = { ...bard, inspirationActive: true };
    const r = playerAttack({ roller, character: inspired, state }, monsterOf(state).id, 'war-lute');
    // The die (+4) is folded into the logged attack bonus, and the blow lands.
    expect(r.state.lastAttack?.attackBonus).toBe(flatBonus + 4);
    expect(r.state.lastAttack?.hit).toBe(true);
    expect(r.character.inspirationActive).toBe(false);
  });
});

describe('Bard — War Lute (CHA caster-weapon)', () => {
  it('scales attack + damage off Charisma, not STR/DEX', () => {
    const bard = withMainHand(makeBard(3), 'war-lute');
    const chaMod = abilityModifier(effectiveAbilityScores(bard).cha);
    const roller = scriptRoller([10]);
    const { state } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const r = playerAttack({ roller, character: bard, state }, monsterOf(state).id, 'war-lute');
    // CHA-keyed: attack bonus is prof + CHA mod (the War Lute carries no attackMod).
    expect(r.state.lastAttack?.attackBonus).toBe(proficiencyBonus(3) + chaMod);
  });

  it('is War Lute, finesse blades, and a hand crossbow — proficient for the bard', () => {
    const bard = makeBard(1);
    for (const id of ['war-lute', 'rapier', 'dagger', 'shortsword', 'hand-crossbow']) {
      expect(isWeaponProficient(bard, getItem(id) as never)).toBe(true);
    }
    // A heavy two-handed martial arm is NOT in the base kit.
    expect(isWeaponProficient(bard, getItem('greatsword') as never)).toBe(false);
  });
});

describe('Bard — the college is a build-defining fork', () => {
  it('College of Lore = a caster: Cutting Words + Lore Savant, no Combat Inspiration', () => {
    const lore = makeBard(3, 'lore');
    expect(characterHasMechanic(lore, 'cutting-words')).toBe(true);
    expect(characterHasMechanic(lore, 'lore-savant')).toBe(true);
    expect(characterHasMechanic(lore, 'combat-inspiration')).toBe(false);
    expect(characterHasMechanic(lore, 'martial-training')).toBe(false);
    // Lore Savant hardens the save DC by one over a core bard.
    expect(spellSaveDC(lore)).toBe(spellSaveDC(makeBard(3)) + 1);
    // No Extra Attack on the caster path.
    expect(characterHasMechanic(makeBard(6, 'lore'), 'extra-attack')).toBe(false);
  });

  it('College of Valor = a martial: Martial Training + Combat Inspiration + Extra Attack', () => {
    const valor = makeBard(6, 'valor');
    expect(characterHasMechanic(valor, 'martial-training')).toBe(true);
    expect(characterHasMechanic(valor, 'combat-inspiration')).toBe(true);
    expect(characterHasMechanic(valor, 'extra-attack')).toBe(true);
    expect(characterHasMechanic(valor, 'cutting-words')).toBe(false);
    // Martial Training opens the martial weapon rack + medium armour the core lacks.
    expect(isWeaponProficient(valor, getItem('greatsword') as never)).toBe(true);
    expect(isArmorProficient(valor, getItem('half-plate') as never)).toBe(true);
    expect(isArmorProficient(makeBard(6, 'lore'), getItem('half-plate') as never)).toBe(false);
  });

  it('Valor pours the inspiration die into DAMAGE; Lore/core into the attack roll', () => {
    expect(spendsInspirationOnDamage(makeBard(6, 'valor'))).toBe(true);
    expect(spendsInspirationOnDamage(makeBard(6, 'lore'))).toBe(false);
    expect(spendsInspirationOnDamage(makeBard(1))).toBe(false);
  });

  it("Valor's Combat Inspiration die rides the weapon hit's damage", () => {
    const valor = withMainHand(makeBard(6, 'valor'), 'rapier');
    const roller = scriptRoller([19]); // a clean hit
    const { state } = createCombat({ character: valor, monsters: [{ def: getMonster('goblin') }] });
    const armed: Character = { ...valor, inspirationActive: true };
    const before = monsterOf(state).instance.hp.current;
    const r = playerAttack({ roller, character: armed, state }, monsterOf(state).id, 'rapier');
    expect(r.character.inspirationActive).toBe(false); // the die was spent on the hit
    // The blow connected and chewed real HP (rapier + DEX + Combat Inspiration die).
    expect(monsterOf(r.state).instance.hp.current).toBeLessThan(before);
  });

  it("Lore's Cutting Words spends a die to turn a hit into a miss", () => {
    const lore = withMainHand(makeBard(5, 'lore'), 'war-lute');
    const armed: Character = { ...lore, resources: { ...lore.resources, inspirationDiceRemaining: 2 } };
    const ac = createCombat({ character: armed, monsters: [{ def: getMonster('goblin') }] });
    // An enemy roll that BARELY beats AC (a hit by 0) — less than the d8 (avg 5),
    // so Cutting Words turns it into a clean miss.
    const goblinAttackBonus = (getMonster('goblin').actions.find((a) => a.kind === 'attack') as { attackBonus: number }).attackBonus;
    const nat = Math.max(2, computeAC(armed) - goblinAttackBonus);
    const roller = scriptRoller([nat]);
    const r = monsterAttack({ roller, character: armed, state: ac.state }, monsterOf(ac.state).id);
    // The die was spent and the reaction used; the player took no damage.
    expect(bardInspirationLeft(r.character)).toBe(1);
    expect(r.character.hp.current).toBe(armed.hp.current);
  });
});

describe('Bard — spellcasting (the College repertoire)', () => {
  it('knows the full prepared book from L1, gated by slot', () => {
    const known = makeBard(1).resources.knownSpells ?? [];
    for (const id of [
      'vicious-mockery',
      'dissonant-whispers',
      'healing-word',
      'thunderwave',
      'bard-hold-person',
      'shatter',
      'power-word-bind',
      'feeblemind',
      'final-crescendo',
    ]) {
      expect(known).toContain(id);
    }
    // Thunderwave (the pack-clear AoE) needs a 2nd-level slot, like Hold Person.
    expect(canCastSpell(makeBard(1), 'thunderwave').ok).toBe(false);
    expect(canCastSpell(makeBard(3), 'thunderwave').ok).toBe(true);
    // Vicious Mockery is a cantrip (always castable); Hold Person needs a 2nd slot.
    expect(canCastSpell(makeBard(1), 'vicious-mockery').ok).toBe(true);
    expect(canCastSpell(makeBard(1), 'bard-hold-person').ok).toBe(false);
    expect(canCastSpell(makeBard(3), 'bard-hold-person').ok).toBe(true);
  });

  it('Healing Word is a bonus-action self-heal — it spends the bonus, not the main action', () => {
    const hurt: Character = { ...makeBard(3), hp: { current: 5, max: 30, temp: 0 } };
    const { state } = createCombat({ character: hurt, monsters: [{ def: getMonster('goblin') }] });
    const roller = scriptRoller([10]);
    const r = castSpell({ roller, character: { ...hurt, hp: { current: 5, max: 30, temp: 0 } }, state, spellId: 'healing-word' });
    expect(r.cast).toBe(true);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
    expect(r.character.actionEconomy.actionUsed).toBe(false);
    expect(r.character.hp.current).toBeGreaterThan(5);
  });

  it('Vicious Mockery deals psychic damage and rattles a foe that fails its save', () => {
    const bard = makeBard(3);
    const { state } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const before = monsterOf(state).instance.hp.current;
    // A failed WIS save (low roll) → full damage + frightened.
    const roller = scriptRoller([1]);
    const r = castSpell({ roller, character: bard, state, spellId: 'vicious-mockery', targetId: monsterOf(state).id });
    expect(r.cast).toBe(true);
    const mob = monsterOf(r.state);
    expect(mob.instance.hp.current).toBeLessThan(before);
    expect(mob.instance.conditions.some((c) => c.name === 'frightened')).toBe(true);
  });
});
