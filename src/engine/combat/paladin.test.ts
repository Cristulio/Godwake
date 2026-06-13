import { describe, it, expect } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { getClass } from '../../content/classes';
import {
  characterHasMechanic,
  effectiveAbilityScores,
  isFullCaster,
  isHalfCaster,
  spellcastingAbility,
} from '../character/derived';
import { abilityModifier } from '../../types/abilities';
import { isWeaponProficient, isArmorProficient } from '../character/equip';
import { paladinSpellSlots } from '../character/actions';
import { classUnlockRenown, isClassUnlocked } from '../progression/unlocks';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { applyDamage } from './attack/damage';
import { rollPlayerSave } from './holdPerson';
import {
  isPaladin,
  layOnHandsMax,
  layOnHandsLeft,
  useLayOnHands,
  useDivineSmite,
  paladinSmiteOnHit,
  divineSmiteDice,
  paladinHasSmiteSlot,
  paladinAuraSaveBonus,
  paladinAuraTempHp,
  paladinAuraDamageReduction,
  hasVowOfEnmity,
  vowBonusDamage,
  VOW_BONUS_DAMAGE,
  VOW_BONUS_DAMAGE_L10,
  reconcileVow,
} from './paladin';
import { parseDiceExpression, type DiceRoller } from '../dice';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makePaladin(level = 1, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('paladin'));
  const c: Character = { ...base, level, subclassId };
  return {
    ...c,
    resources: {
      ...c.resources,
      layOnHandsRemaining: layOnHandsMax({ ...c, level } as Character),
      spellSlots: paladinSpellSlots({ ...c, level } as Character),
    },
  };
}

function monsterOf(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** A roller whose d20 results are scripted in order; every other die returns its
 *  average (rounded up). Lets a test force an attack to land deterministically. */
function scriptRoller(d20s: number[]): DiceRoller {
  let i = 0;
  const nextD20 = () => (i < d20s.length ? d20s[i++] : 10);
  const d20 = (advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal', modifier = 0) => {
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
  };
  return {
    d20,
    roll(expression, advantage = 'normal') {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      if (expr.die === 20 && expr.count === 1) return d20(advantage, expr.modifier);
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
  } as DiceRoller;
}

describe('Paladin — class shape', () => {
  it('is a STR+CHA heavy-armour hybrid, the second heavy wearer after the Fighter', () => {
    const cls = getClass('paladin');
    expect(cls.hitDie).toBe(10);
    expect(cls.primaryAbility).toEqual(['str', 'cha']);
    expect(cls.armorProficiency?.categories).toContain('heavy');
    expect(cls.armorProficiency?.categories).toContain('shield');
    // Both simple and martial weapons.
    expect(isWeaponProficient(makePaladin(), getItem('longsword') as never)).toBe(true);
    // Heavy plate is wearable (STR 15 → 16 with Human clears chain mail's gate).
    expect(isArmorProficient(makePaladin(), getItem('chain-mail') as never)).toBe(true);
  });

  it('is a CHA half-caster (not a full caster)', () => {
    const pal = makePaladin(5);
    expect(isPaladin(pal)).toBe(true);
    expect(isHalfCaster('paladin')).toBe(true);
    expect(isFullCaster('paladin')).toBe(false);
    expect(spellcastingAbility(pal)).toBe('cha');
  });

  it('prepares the whole divine book from L1 and opens slots on the half-caster ladder', () => {
    const pal = makePaladin(1);
    expect(pal.resources.knownSpells).toEqual(['castigate', 'cure-wounds', 'compel', 'searing-light']);
    // L1 paladin holds no slots — pure martial until the oath wakes at L2.
    expect(paladinSpellSlots({ ...pal, level: 1 })).toEqual({});
    expect(paladinSpellSlots({ ...pal, level: 2 })).toEqual({ 1: 2 });
    // Caps at 5th-level slots (reached only at L17) — shallower than a full caster.
    expect(paladinSpellSlots({ ...pal, level: 17 })[5]).toBe(1);
    expect(paladinSpellSlots({ ...pal, level: 20 })[6]).toBeUndefined();
  });

  it('is the deepest renown unlock — 1000, above the Bard', () => {
    expect(classUnlockRenown('paladin', 'fighter')).toBe(1000);
    expect(isClassUnlocked('paladin', 999, 'fighter')).toBe(false);
    expect(isClassUnlocked('paladin', 1000, 'fighter')).toBe(true);
  });

  it('offers three oaths: Radiant (caster), Bulwark (tank) and Vengeance (striker)', () => {
    const cls = getClass('paladin');
    expect(cls.subclasses.map((s) => s.id).sort()).toEqual(['bulwark', 'radiant', 'vengeance']);
  });
});

describe('Paladin — Lay on Hands', () => {
  it('refills the pool to its max at the start of every encounter', () => {
    const pal = { ...makePaladin(5), resources: { ...makePaladin(5).resources, layOnHandsRemaining: 0 } };
    const { character } = createCombat({ character: pal, monsters: [{ def: getMonster('goblin') }] });
    expect(character.resources.layOnHandsRemaining).toBe(layOnHandsMax(pal));
    expect(character.resources.layOnHandsRemaining).toBeGreaterThan(0);
  });

  it('the pool deepens with level and Charisma', () => {
    expect(layOnHandsMax(makePaladin(10))).toBeGreaterThan(layOnHandsMax(makePaladin(2)));
  });

  it('heals self for a chunk, spending the pool and the bonus action; never overheals', () => {
    const pal0 = makePaladin(5);
    // Walk in wounded.
    const pal: Character = { ...pal0, hp: { ...pal0.hp, current: 5 } };
    const { state } = createCombat({ character: pal, monsters: [{ def: getMonster('goblin') }] });
    const result = useLayOnHands({ character: { ...pal, resources: { ...pal.resources, layOnHandsRemaining: layOnHandsMax(pal) } }, state });
    expect(result.character.hp.current).toBeGreaterThan(5);
    expect(result.character.hp.current).toBeLessThanOrEqual(result.character.hp.max);
    expect(layOnHandsLeft(result.character)).toBeLessThan(layOnHandsMax(pal));
    expect(result.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('does nothing at full HP or with an empty pool', () => {
    const pal = makePaladin(5);
    const { state } = createCombat({ character: pal, monsters: [{ def: getMonster('goblin') }] });
    // Full HP → no-op.
    const full = useLayOnHands({ character: pal, state });
    expect(full.character.hp.current).toBe(pal.hp.max);
    // Empty pool → no-op even when hurt.
    const empty = useLayOnHands({
      character: { ...pal, hp: { ...pal.hp, current: 1 }, resources: { ...pal.resources, layOnHandsRemaining: 0 } },
      state,
    });
    expect(empty.character.hp.current).toBe(1);
  });
});

describe('Paladin — Divine Smite', () => {
  it('arms only with a slot in hand, and a hit then spends the cheapest slot for radiant damage', () => {
    const pal = makePaladin(5, 'bulwark'); // L5 paladin: slots {1:4, 2:2}
    _resetMonsterInstanceCounter();
    const roller = scriptRoller([20]); // force a crit-free… actually nat 20 = crit
    const init = createCombat({ roller, character: pal, monsters: [{ def: getMonster('goblin') }] });
    // Arm the smite.
    const armed = useDivineSmite({ character: init.character, state: init.state });
    expect(armed.character.smiteArmed).toBe(true);

    const target = monsterOf(armed.state);
    const before = target.instance.hp.current;
    const weaponId = pal.equipped.mainHand!.itemId;
    const hit = playerAttack(
      { roller: scriptRoller([18]), character: armed.character, state: armed.state },
      target.id,
      weaponId,
    );
    // Smite spent the cheapest (1st-level) slot and cleared the armed flag.
    expect(hit.character.smiteArmed).toBe(false);
    expect(hit.character.resources.spellSlots?.[1]).toBe(3); // 4 → 3
    // The radiant smite makes the hit bite harder than the same swing unarmed.
    const baseline = playerAttack(
      { roller: scriptRoller([18]), character: { ...armed.character, smiteArmed: false }, state: armed.state },
      target.id,
      weaponId,
    );
    const smiteDealt = before - monsterOf(hit.state).instance.hp.current;
    const baseDealt = before - monsterOf(baseline.state).instance.hp.current;
    expect(smiteDealt).toBeGreaterThan(baseDealt);
  });

  it('cannot arm without a spell slot', () => {
    const pal = { ...makePaladin(2, 'radiant'), resources: { ...makePaladin(2).resources, spellSlots: {} } };
    expect(paladinHasSmiteSlot(pal)).toBe(false);
    const { state } = createCombat({ character: pal, monsters: [{ def: getMonster('goblin') }] });
    const armed = useDivineSmite({ character: { ...pal, resources: { ...pal.resources, spellSlots: {} } }, state });
    expect(armed.character.smiteArmed).toBeFalsy();
  });

  it('the Radiant oath smites for more dice than the base smite at the same slot', () => {
    const base = makePaladin(5);
    const radiant = makePaladin(5, 'radiant');
    expect(characterHasMechanic(radiant, 'radiant-smite')).toBe(true);
    expect(divineSmiteDice(radiant, 1)).toBeGreaterThan(divineSmiteDice(base, 1));
  });

  it("the Bulwark oath's crit-smite fires free on a crit even when nothing was armed", () => {
    const pal = makePaladin(5, 'bulwark');
    expect(characterHasMechanic(pal, 'crit-smite')).toBe(true);
    const withSlots: Character = { ...pal, smiteArmed: false, resources: { ...pal.resources, spellSlots: { 1: 1 } } };
    const out = paladinSmiteOnHit(withSlots, true, scriptRoller([]));
    expect(out).not.toBeNull();
    expect(out!.total).toBeGreaterThan(0);
    expect(out!.character.resources.spellSlots?.[1]).toBe(0);
  });

  it('a Radiant paladin does NOT smite for free on a crit (no crit-smite mechanic)', () => {
    const pal = makePaladin(5, 'radiant');
    const withSlots: Character = { ...pal, smiteArmed: false, resources: { ...pal.resources, spellSlots: { 1: 1 } } };
    expect(paladinSmiteOnHit(withSlots, true, scriptRoller([]))).toBeNull();
  });
});

describe('Paladin — self-buff auras', () => {
  it('Aura of Protection adds the CHA modifier to every saving throw', () => {
    const pal = makePaladin(5);
    const chaMod = abilityModifier(effectiveAbilityScores(pal).cha);
    expect(paladinAuraSaveBonus(pal)).toBe(chaMod);
    // The bonus is folded into rollPlayerSave's modifier.
    const roller = scriptRoller([10]);
    const save = rollPlayerSave(roller, pal, 'wis', 99);
    const wisMod = abilityModifier(effectiveAbilityScores(pal).wis);
    expect(save.mod).toBe(wisMod + chaMod);
  });

  it('the Bulwark oath girds with per-combat temp HP; the core paladin does not', () => {
    expect(paladinAuraTempHp(makePaladin(5))).toBe(0);
    const bulwark = makePaladin(5, 'bulwark');
    expect(paladinAuraTempHp(bulwark)).toBeGreaterThan(0);
    const { character } = createCombat({ character: bulwark, monsters: [{ def: getMonster('goblin') }] });
    expect(character.hp.temp).toBe(paladinAuraTempHp(bulwark));
  });

  it("the Bulwark L10 Unbreakable Aura adds a flat damage cushion; lower levels do not", () => {
    expect(paladinAuraDamageReduction(makePaladin(5, 'bulwark'))).toBe(0);
    expect(paladinAuraDamageReduction(makePaladin(10, 'bulwark'))).toBeGreaterThan(0);
  });
});

describe('Paladin — Oath of Vengeance (Vow of Enmity)', () => {
  // A small/large pair: the vow always swears the highest-max-HP foe.
  const SMALL = 'goblin'; // 14 max HP
  const BIG = 'cinderwake-hound'; // 80 max HP
  const MID = 'blue-wyrmling'; // 186 max HP — distinct third tier for the re-mark

  function monstersOf(state: CombatState): MonsterCombatant[] {
    return state.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster');
  }
  function withMainHand(c: Character, itemId: string): Character {
    return { ...c, equipped: { ...c.equipped, mainHand: { itemId } } };
  }

  it('only the Vengeance oath swears the vow; Radiant/Bulwark/un-sworn do not', () => {
    expect(hasVowOfEnmity(makePaladin(3, 'vengeance'))).toBe(true);
    expect(hasVowOfEnmity(makePaladin(3, 'radiant'))).toBe(false);
    expect(hasVowOfEnmity(makePaladin(3, 'bulwark'))).toBe(false);
    expect(hasVowOfEnmity(makePaladin(3, null))).toBe(false);
    // The vow is gated at L3 — an L2 Vengeance soul (pre-pick) has no vow yet.
    expect(hasVowOfEnmity({ ...makePaladin(2, 'vengeance') })).toBe(false);
  });

  it('marks the deadliest (highest-max-HP) foe at combat start, regardless of spawn order', () => {
    const pal = makePaladin(3, 'vengeance');
    _resetMonsterInstanceCounter();
    const a = createCombat({ character: pal, monsters: [{ def: getMonster(SMALL) }, { def: getMonster(BIG) }] });
    const bigA = monstersOf(a.state).find((m) => m.instance.defId === BIG)!;
    expect(a.state.vowedTargetId).toBe(bigA.id);

    // Order flipped — still the big foe, proving it picks by HP not by index.
    _resetMonsterInstanceCounter();
    const b = createCombat({ character: pal, monsters: [{ def: getMonster(BIG) }, { def: getMonster(SMALL) }] });
    const bigB = monstersOf(b.state).find((m) => m.instance.defId === BIG)!;
    expect(b.state.vowedTargetId).toBe(bigB.id);
  });

  it('a non-Vengeance paladin sets no vow', () => {
    _resetMonsterInstanceCounter();
    const { state } = createCombat({
      character: makePaladin(3, 'bulwark'),
      monsters: [{ def: getMonster(SMALL) }, { def: getMonster(BIG) }],
    });
    expect(state.vowedTargetId).toBeUndefined();
  });

  // A roller that records the `advantage` mode every d20 was called with, so a
  // test can prove the engine requested advantage on the attack roll (the
  // scriptRoller can't show this — it ignores the mode). All d20s land at 18.
  function captureRoller(): DiceRoller & { modes: string[] } {
    const modes: string[] = [];
    const base = scriptRoller([18]);
    const wrapped = {
      ...base,
      modes,
      d20(advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal', modifier = 0) {
        modes.push(advantage);
        return base.d20(advantage, modifier);
      },
    } as DiceRoller & { modes: string[] };
    return wrapped;
  }

  it('strikes the sworn quarry with advantage and bonus damage — and NOT a non-vowed foe', () => {
    const pal = withMainHand(makePaladin(3, 'vengeance'), 'longsword');
    _resetMonsterInstanceCounter();
    const init = createCombat({ character: pal, monsters: [{ def: getMonster(SMALL) }, { def: getMonster(BIG) }] });
    const big = monstersOf(init.state).find((m) => m.instance.defId === BIG)!;
    const small = monstersOf(init.state).find((m) => m.instance.defId === SMALL)!;
    expect(init.state.vowedTargetId).toBe(big.id);

    // The attack roll against the quarry is made with advantage. Disarm smite so
    // only the vow colours the damage.
    const vowRoller = captureRoller();
    const vowed = playerAttack(
      { roller: vowRoller, character: { ...init.character, smiteArmed: false }, state: init.state },
      big.id,
      'longsword',
    );
    expect(vowRoller.modes[0]).toBe('advantage');
    expect(vowed.state.lastAttack?.hit).toBe(true);
    // The vow's flat bite shows in the damage breakdown against the quarry.
    const vowedLine = vowed.state.log.filter((e) => e.kind === 'damage').pop()?.text ?? '';
    expect(vowedLine).toMatch(new RegExp(`\\+ ${VOW_BONUS_DAMAGE} vow`));

    // The same swing against the NON-vowed small foe rolls a straight (normal) d20
    // and carries no vow line in its damage breakdown.
    const otherRoller = captureRoller();
    const other = playerAttack(
      { roller: otherRoller, character: { ...init.character, smiteArmed: false }, state: init.state },
      small.id,
      'longsword',
    );
    expect(otherRoller.modes[0]).toBe('normal');
    const otherDamageLines = other.state.log.filter((e) => e.kind === 'damage');
    expect(otherDamageLines.some((e) => /vow/.test(e.text))).toBe(false);
  });

  it('the vow bonus deepens at L10 (Relentless Avenger)', () => {
    expect(vowBonusDamage(makePaladin(3, 'vengeance'))).toBe(VOW_BONUS_DAMAGE);
    expect(vowBonusDamage(makePaladin(10, 'vengeance'))).toBe(VOW_BONUS_DAMAGE_L10);
    expect(VOW_BONUS_DAMAGE_L10).toBeGreaterThan(VOW_BONUS_DAMAGE);
  });

  it('L10 Relentless Avenger leaps the vow to the next-deadliest foe when the quarry falls', () => {
    const pal = makePaladin(10, 'vengeance');
    _resetMonsterInstanceCounter();
    const init = createCombat({
      character: pal,
      monsters: [{ def: getMonster(SMALL) }, { def: getMonster(BIG) }, { def: getMonster(MID) }],
    });
    const mid = monstersOf(init.state).find((m) => m.instance.defId === MID)!; // 186 HP — the first quarry
    const big = monstersOf(init.state).find((m) => m.instance.defId === BIG)!; // 80 HP — the next
    expect(init.state.vowedTargetId).toBe(mid.id);

    // Fell the sworn quarry outright; the vow leaps to the next-deadliest LIVING foe.
    const killed = applyDamage(init.state, mid.id, 10_000, init.character);
    expect(monstersOf(killed.state).find((m) => m.id === mid.id)!.instance.hp.current).toBe(0);
    expect(killed.state.vowedTargetId).toBe(big.id);
    expect(killed.state.log.some((e) => /vow leaps|salta/i.test(e.text))).toBe(true);
  });

  it('the L3 vow does NOT leap on a kill (no Relentless Avenger before L10)', () => {
    const pal = makePaladin(3, 'vengeance');
    _resetMonsterInstanceCounter();
    const init = createCombat({
      character: pal,
      monsters: [{ def: getMonster(SMALL) }, { def: getMonster(BIG) }],
    });
    const big = monstersOf(init.state).find((m) => m.instance.defId === BIG)!;
    expect(init.state.vowedTargetId).toBe(big.id);
    const killed = applyDamage(init.state, big.id, 10_000, init.character);
    // No leap: the vow stays on the (now-dead) quarry id until the next fight.
    expect(killed.state.vowedTargetId).toBe(big.id);
  });

  it('when the last foe falls under Relentless Avenger, the vow clears', () => {
    const pal = makePaladin(10, 'vengeance');
    _resetMonsterInstanceCounter();
    const init = createCombat({ character: pal, monsters: [{ def: getMonster(BIG) }] });
    const big = monstersOf(init.state)[0];
    expect(init.state.vowedTargetId).toBe(big.id);
    const killed = applyDamage(init.state, big.id, 10_000, init.character);
    expect(killed.state.vowedTargetId).toBeUndefined();
  });

  // reconcileVow is the shared re-mark the DOT path (turn.ts) and the attack path
  // (applyDamage) both call when the quarry dies — covered directly so a quarry
  // that bleeds out leaps the vow exactly like an attack kill.
  describe('reconcileVow (the shared DOT/attack re-mark)', () => {
    function combatWith(level: number, sub: string, defs: string[]) {
      _resetMonsterInstanceCounter();
      return createCombat({ character: makePaladin(level, sub), monsters: defs.map((d) => ({ def: getMonster(d) })) });
    }
    function kill(state: CombatState, id: string): CombatState {
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster' && c.id === id
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 0 } } }
            : c,
        ),
      };
    }

    it('leaps to the next-deadliest foe when the L10 quarry is dead', () => {
      const { state, character } = combatWith(10, 'vengeance', [SMALL, BIG, MID]);
      const mid = monstersOf(state).find((m) => m.instance.defId === MID)!;
      const big = monstersOf(state).find((m) => m.instance.defId === BIG)!;
      expect(state.vowedTargetId).toBe(mid.id);
      const after = reconcileVow(kill(state, mid.id), character);
      expect(after.vowedTargetId).toBe(big.id);
    });

    it('is a no-op while the quarry still lives', () => {
      const { state, character } = combatWith(10, 'vengeance', [SMALL, BIG]);
      expect(reconcileVow(state, character).vowedTargetId).toBe(state.vowedTargetId);
    });

    it('does not leap without Relentless Avenger (pre-L10)', () => {
      const { state, character } = combatWith(3, 'vengeance', [SMALL, BIG]);
      const big = monstersOf(state).find((m) => m.instance.defId === BIG)!;
      const after = reconcileVow(kill(state, big.id), character);
      expect(after.vowedTargetId).toBe(big.id); // unchanged — dead id stays
    });
  });
});
