import { describe, it, expect } from 'vitest';
import { weaponVfxKind } from './vfx';
import { getItem } from '../../content/items';
import type { Weapon } from '../../schemas/item';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { createCombat } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { useFlurryOfBlows, useStunningStrike, monkKiMax, martialArtsWeaponId } from './monk';
import { useMartialDisrupt } from './martialResource';
import { getMonster } from '../../content/monsters';
import { parseDiceExpression, type DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant, SpellEffectKind } from '../../types/combat';

function weapon(id: string): Weapon {
  const item = getItem(id);
  if (item.kind !== 'weapon') throw new Error(`${id} is not a weapon`);
  return item as Weapon;
}

function makeMonk(level = 1): Character {
  const base = buildPlayerCharacter(presetCreationInput('monk'));
  const c: Character = { ...base, level };
  return { ...c, resources: { ...c.resources, kiPointsRemaining: monkKiMax(c) } };
}

function monsterOf(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** d20s scripted in order; every other die returns its average (see monk.test.ts). */
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
    roll(expression: Parameters<DiceRoller['roll']>[0], advantage = 'normal') {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      const avg = Math.ceil((expr.die + 1) / 2);
      return {
        expression: expr,
        rolls: Array.from({ length: expr.count }, () => avg),
        modifier: expr.modifier,
        total: avg * expr.count + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
        discardedRoll: undefined,
      };
    },
    serialize: () => ({ seed: 0, sequence: 0 }),
  } as unknown as DiceRoller;
}

describe('weaponVfxKind — per-weapon-TYPE identities (animations-revamp)', () => {
  const expectKind = (id: string, kind: SpellEffectKind) =>
    expect(weaponVfxKind(weapon(id)), id).toBe(kind);

  it('maps every base-id family to its bespoke look', () => {
    // Bare fists, every Martial Arts tier.
    expectKind('monk-fists', 'unarmed');
    expectKind('monk-fists-adept', 'unarmed');
    expectKind('monk-fists-master', 'unarmed');
    expectKind('monk-fists-grandmaster', 'unarmed');
    // Axes chop.
    expectKind('battleaxe', 'axe-chop');
    expectKind('greataxe', 'axe-chop');
    expectKind('monk-temple-glaive', 'axe-chop');
    expectKind('bloodrage-fang', 'axe-chop');
    // Blunt weight crushes.
    expectKind('mace', 'crush');
    expectKind('warhammer', 'crush');
    expectKind('flail', 'crush');
    // Spears lance.
    expectKind('javelin', 'spear-thrust');
    expectKind('ironclad-banner', 'spear-thrust');
    // Quick steel flicks.
    expectKind('dagger', 'dagger-flick');
    expectKind('monk-paired-kama', 'dagger-flick');
    expectKind('shadowdancer-blade', 'dagger-flick');
    // Caster implements bonk.
    expectKind('quarterstaff', 'caster-bonk');
    expectKind('monk-war-staff', 'caster-bonk');
    expectKind('archmagi-wand', 'caster-bonk');
    expectKind('war-lute', 'caster-bonk');
  });

  it('ranged ammunition weapons fire the bow-shot', () => {
    expectKind('shortbow', 'bow-shot');
    expectKind('longbow', 'bow-shot');
    expectKind('hand-crossbow', 'bow-shot');
  });

  it('unmapped weapons keep the damage-type fallbacks', () => {
    expectKind('longsword', 'slash');
    expectKind('greatsword', 'slash');
    expectKind('sickle', 'slash');
    expectKind('rapier', 'pierce');
    expectKind('shortsword', 'pierce');
  });
});

describe('monk VFX wiring (animations-revamp)', () => {
  it('Flurry and Stunning Strike wind-ups emit the ki-charge', () => {
    const init = createCombat({
      roller: scriptRoller([]),
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });
    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });
    expect(flurried.state.spellEffectEvent?.kind).toBe('ki-charge');
    const armed = useStunningStrike({ character: init.character, state: init.state });
    expect(armed.state.spellEffectEvent?.kind).toBe('ki-charge');
  });

  it('a bare-handed hit shows the unarmed burst; flurry extras show the double-jab', () => {
    const roller = scriptRoller([18, 18, 18]);
    const init = createCombat({
      roller,
      character: makeMonk(1),
      monsters: [{ def: getMonster('goblin') }],
    });
    const targetId = monsterOf(init.state).id;
    const flurried = useFlurryOfBlows({ character: init.character, state: init.state });

    // Strike 1 spends the Attack action — the straight jab.
    let r = playerAttack({ roller, character: flurried.character, state: flurried.state }, targetId, 'monk-fists');
    expect(r.state.spellEffectEvent?.kind).toBe('unarmed');
    // Strike 2 is a queued flurry extra — the rapid double-jab.
    r = playerAttack({ roller, character: r.character, state: r.state }, targetId, 'monk-fists');
    expect(r.state.spellEffectEvent?.kind).toBe('unarmed-flurry');
  });

  it('a landed Stunning Strike replaces the swing VFX with the stun-burst', () => {
    // Attack lands (nat 18), CON save fails (nat 1).
    const roller = scriptRoller([18, 1]);
    const init = createCombat({
      roller,
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });
    const armed = useStunningStrike({ character: init.character, state: init.state });
    const targetId = monsterOf(armed.state).id;
    const r = playerAttack(
      { roller, character: armed.character, state: armed.state },
      targetId,
      martialArtsWeaponId(armed.character),
    );
    const m = r.state.combatants.find((c) => c.id === targetId) as MonsterCombatant;
    expect(m.instance.staggeredTurns).toBe(1);
    expect(r.state.spellEffectEvent?.kind).toBe('stun-burst');
  });

  it('a survived Stunning Strike save keeps the plain swing VFX', () => {
    // Attack lands (nat 18), CON save succeeds (nat 20).
    const roller = scriptRoller([18, 20]);
    const init = createCombat({
      roller,
      character: makeMonk(5),
      monsters: [{ def: getMonster('goblin') }],
    });
    const armed = useStunningStrike({ character: init.character, state: init.state });
    const targetId = monsterOf(armed.state).id;
    const r = playerAttack(
      { roller, character: armed.character, state: armed.state },
      targetId,
      martialArtsWeaponId(armed.character),
    );
    const m = r.state.combatants.find((c) => c.id === targetId) as MonsterCombatant;
    expect(m.instance.staggeredTurns ?? 0).toBe(0);
    expect(r.state.spellEffectEvent?.kind).toBe('unarmed');
  });
});

describe('martial DISRUPT VFX wiring (animations-revamp)', () => {
  it('a landed staggering strike shows the knockdown-burst', () => {
    const fighter: Character = {
      ...buildPlayerCharacter(presetCreationInput('fighter')),
      level: 5,
    };
    const roller = scriptRoller([18]);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: getMonster('goblin') }] });
    const targetId = monsterOf(init.state).id;
    const armed = useMartialDisrupt({ character: init.character, state: init.state });
    expect(armed.character.martialDisruptActive).toBe(true);
    const r = playerAttack(
      { roller, character: armed.character, state: armed.state },
      targetId,
      fighter.equipped.mainHand!.itemId,
    );
    const m = r.state.combatants.find((c) => c.id === targetId) as MonsterCombatant;
    // The goblin survives an average longsword hit, so the stagger lands.
    expect(m.instance.staggeredTurns).toBe(1);
    expect(r.state.spellEffectEvent?.kind).toBe('knockdown-burst');
  });
});
