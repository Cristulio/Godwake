import { describe, it, expect } from 'vitest';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { RaceId } from '../../schemas/ids';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { simulateLevelUp } from '../character/leveling';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { createCombat } from './createCombat';
import { chooseCombatAction, applyPlannedAction } from './actionPolicy';

function rogue(): Character {
  const c = createCharacter({
    id: 'p-rogue',
    name: 'Shiv',
    raceId: 'wood-elf' as RaceId,
    classId: 'rogue',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['stealth', 'sleight-of-hand'],
  });
  return {
    ...c,
    inventory: [{ itemId: 'rapier' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: { itemId: 'leather-armor' } },
  };
}

function fighter(): Character {
  const c = createCharacter({
    id: 'p-fighter',
    name: 'Brick',
    raceId: 'human' as RaceId,
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
  });
  return {
    ...c,
    inventory: [{ itemId: 'longsword' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: { itemId: 'shield' }, armor: { itemId: 'leather-armor' } },
  };
}

function wizard(): Character {
  const c = createCharacter({
    id: 'p-wizard',
    name: 'Quill',
    raceId: 'human' as RaceId,
    classId: 'wizard',
    baseAbilityScores: {
      int: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      str: STANDARD_ARRAY[5],
    },
    skillProficiencies: ['arcana', 'investigation'],
  });
  return {
    ...c,
    inventory: [{ itemId: 'dagger' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function druid(): Character {
  const c = createCharacter({
    id: 'p-druid',
    name: 'Bramble',
    raceId: 'wood-elf' as RaceId,
    classId: 'druid',
    baseAbilityScores: {
      wis: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      str: STANDARD_ARRAY[5],
    },
    skillProficiencies: ['nature', 'survival'],
  });
  return {
    ...c,
    inventory: [{ itemId: 'dagger' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function atLevel(builder: () => Character, level: number): Character {
  let c = builder();
  while (c.level < level) c = simulateLevelUp({ ...c, xp: 9_999_999 });
  return c;
}

/** Raise every living monster's current HP so a control threshold (e.g. the
 *  Entangle `> HOLD_PERSON_MIN_HP` gate) is met regardless of the trash statblock. */
function setLiveHp(state: CombatState, hp: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster'
        ? { ...c, instance: { ...c.instance, hp: { current: hp, max: hp, temp: 0 } } }
        : c,
    ),
  };
}

/** Spawn a realistic combat-start state (class buffs applied) for `classId`. */
function startCombat(c: Character, monsters: { defId: string; count: number }[]) {
  const roller = createDiceRoller(1);
  const defs = monsters.flatMap((m) =>
    Array.from({ length: m.count }, () => ({ def: getMonster(m.defId) })),
  );
  return createCombat({ roller, character: c, monsters: defs });
}

describe('chooseCombatAction', () => {
  it('picks AoE (Fireball) against a crowd when a 3rd-level slot is up', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 3 }]);
    expect((character.resources.knownSpells ?? [])).toContain('fireball');
    const action = chooseCombatAction(state, character);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'fireball' }));
  });

  it('does NOT burn the 3rd-level slot on one weak enemy — at-will or a cheap finish instead', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 1 }]);
    const action = chooseCombatAction(state, character);
    // The big slot is reserved for crowds/bosses. A single weak foe gets the
    // free cantrip or, when the gently-scaled cantrip can't one-shot it, a
    // single cheap Magic Missile to remove it a turn sooner — never Fireball.
    const spellId = (action as { kind: string; spellId?: string }).spellId;
    expect(['fire-bolt', 'magic-missile']).toContain(spellId);
  });

  it('finishes a low-HP target with Magic Missile (guaranteed, no roll)', () => {
    const { state, character } = startCombat(wizard(), [{ defId: 'goblin', count: 1 }]);
    const goblin = state.combatants.find((c) => c.kind === 'monster');
    if (goblin?.kind === 'monster') goblin.instance.hp.current = 4; // ≤ MM guaranteed min
    const action = chooseCombatAction(state, character);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'magic-missile' }));
  });

  it('falls back to a cantrip when all spell slots are spent', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 3 }]);
    const dry: Character = {
      ...character,
      resources: { ...character.resources, spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } },
    };
    const action = chooseCombatAction(state, dry);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'fire-bolt' }));
  });

  it('drinks a potion when critically wounded (rogue, bonus action)', () => {
    const { state, character } = startCombat(rogue(), [{ defId: 'goblin', count: 1 }]);
    const hurt: Character = {
      ...character,
      hp: { ...character.hp, current: Math.floor(character.hp.max * 0.2) },
    };
    const action = chooseCombatAction(state, hurt);
    expect(action.kind).toBe('item');
  });

  it('opens with Cunning Action: Quick Strike — the opener already lands Sneak (rogue)', () => {
    const { state, character } = startCombat(rogue(), [{ defId: 'goblin', count: 1 }]);
    expect((character.resources.cunningActionUsesRemaining ?? 0)).toBeGreaterThan(0);
    const action = chooseCombatAction(state, character);
    expect(action).toEqual({ kind: 'cunning-action', choice: 'quick-strike' });
  });

  it('sets up with Cunning Action: Hide on a later turn when Sneak needs the angle (rogue)', () => {
    const { state, character } = startCombat(rogue(), [{ defId: 'goblin', count: 1 }]);
    // Past the opener, a full-HP (un-bloodied) mark, a rapier (no dagger
    // synergy): the only way to land Sneak this turn is to Hide for advantage.
    const later = { ...state, playerHasAttacked: true };
    const action = chooseCombatAction(later, character);
    expect(action).toEqual({ kind: 'cunning-action', choice: 'hide' });
  });

  it('attacks the focus target when healthy (fighter)', () => {
    const { state, character } = startCombat(fighter(), [{ defId: 'goblin', count: 1 }]);
    const action = chooseCombatAction(state, character);
    expect(action.kind).toBe('attack');
  });

  it('spends Second Wind when a Fighter drops below half', () => {
    const { state, character } = startCombat(fighter(), [{ defId: 'goblin', count: 1 }]);
    const hurt: Character = {
      ...character,
      hp: { ...character.hp, current: Math.floor(character.hp.max * 0.4) },
    };
    const action = chooseCombatAction(state, hurt);
    expect(action.kind).toBe('second-wind');
  });

  it('Action Surges after the action is spent while outnumbered', () => {
    const { state, character } = startCombat(atLevel(fighter, 3), [{ defId: 'goblin', count: 2 }]);
    const surged: Character = {
      ...character,
      actionEconomy: { ...character.actionEconomy, actionUsed: true, bonusActionUsed: true },
      resources: { ...character.resources, actionSurgeRemaining: 1 },
    };
    const action = chooseCombatAction(state, surged);
    expect(action.kind).toBe('action-surge');
  });

  it('drains (Vampiric Touch) when hurt — damage that also heals beats plinking', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 1 }]);
    const hurt: Character = {
      ...character,
      hp: { ...character.hp, current: Math.floor(character.hp.max * 0.5) },
      resources: {
        ...character.resources,
        knownSpells: ['fire-bolt', 'vampiric-touch'],
        spellSlots: { 1: 2, 2: 0, 3: 2, 4: 0 },
      },
    };
    const action = chooseCombatAction(state, hurt);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'vampiric-touch' }));
  });

  it('uses a FOCUSED nuke (Lightning Bolt) on a lone beefy boss — never AoE on one target', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 1 }]);
    const ctrl: Character = {
      ...character,
      resources: {
        ...character.resources,
        knownSpells: ['fire-bolt', 'fireball', 'lightning-bolt'],
        spellSlots: { 1: 0, 2: 0, 3: 2, 4: 0 },
      },
    };
    const boss = state.combatants.find((c) => c.kind === 'monster');
    if (boss?.kind === 'monster') boss.instance.hp.current = 60; // beefy, below capstone bar
    const action = chooseCombatAction(state, ctrl);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'lightning-bolt' }));
    if (action.kind === 'cast') expect(action.targetId).toBe(boss?.id);
  });

  it('saves the 9th-level capstone for a TRUE boss; a mid elite gets a mid-tier nuke', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 1 }]);
    const ctrl: Character = {
      ...character,
      resources: {
        ...character.resources,
        knownSpells: ['fire-bolt', 'lightning-bolt', 'unmake'],
        spellSlots: { 1: 0, 2: 0, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 1 },
      },
    };
    const m = state.combatants.find((c) => c.kind === 'monster');
    if (m?.kind === 'monster') m.instance.hp.current = 60; // elite, below capstone bar
    expect(chooseCombatAction(state, ctrl)).toEqual(
      expect.objectContaining({ spellId: 'lightning-bolt' }),
    );
    if (m?.kind === 'monster') m.instance.hp.current = 120; // true boss
    expect(chooseCombatAction(state, ctrl)).toEqual(expect.objectContaining({ spellId: 'unmake' }));
  });

  it('hard-locks a true boss with Soul Snare when it cannot be burst', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'the-unmade', count: 1 }]);
    const ctrl: Character = {
      ...character,
      resources: {
        ...character.resources,
        knownSpells: ['fire-bolt', 'soul-snare'],
        spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1 },
      },
    };
    const action = chooseCombatAction(state, ctrl);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'soul-snare' }));
  });

  it('opens a boss fight with Mage Armor when unarmored and no nuke is ready', () => {
    const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'the-unmade', count: 1 }]);
    const ctrl: Character = {
      ...character,
      equipped: { ...character.equipped, armor: null },
      resources: {
        ...character.resources,
        knownSpells: ['fire-bolt', 'mage-armor'],
        mageArmorActive: false,
        spellSlots: { 1: 1, 2: 0, 3: 0, 4: 0 },
      },
    };
    expect(state.round).toBe(1);
    const action = chooseCombatAction(state, ctrl);
    expect(action).toEqual(expect.objectContaining({ kind: 'cast', spellId: 'mage-armor' }));
  });

  it('ends the turn when nothing productive remains', () => {
    const { state, character } = startCombat(fighter(), [{ defId: 'goblin', count: 1 }]);
    const spent: Character = {
      ...character,
      actionEconomy: { ...character.actionEconomy, actionUsed: true, bonusActionUsed: true },
      resources: { ...character.resources, secondWindAvailable: false, actionSurgeRemaining: 0 },
    };
    const action = chooseCombatAction(state, spent);
    expect(action.kind).toBe('end-turn');
  });
});

describe('chooseCombatAction — Druid Entangling Roots (bonus action)', () => {
  it('casts Entangle as the BONUS action against a meaty crowd, before the main action', () => {
    const { state, character } = startCombat(atLevel(druid, 5), [{ defId: 'goblin', count: 2 }]);
    expect(character.actionEconomy.bonusActionUsed).toBe(false);
    expect((character.resources.spellSlots?.[2] ?? 0)).toBeGreaterThan(0);
    // Goblins are too small to clear HOLD_PERSON_MIN_HP — beef them up so the
    // control gate is met (Entangle isn't wasted on near-dead trash).
    const beefy = setLiveHp(state, 30);
    const action = chooseCombatAction(beefy, character);
    expect(action).toEqual(
      expect.objectContaining({ kind: 'cast', spellId: 'entangling-roots' }),
    );
  });

  it('still spends the MAIN action the same turn after rooting (a cast, not end-turn)', () => {
    const { state, character } = startCombat(atLevel(druid, 5), [{ defId: 'goblin', count: 2 }]);
    const beefy = setLiveHp(state, 30);

    // Apply the bonus-action Entangle the policy picks…
    const first = chooseCombatAction(beefy, character);
    expect(first).toEqual(expect.objectContaining({ spellId: 'entangling-roots' }));
    const applied = applyPlannedAction(
      { roller: createDiceRoller(3), state: beefy, character },
      first,
    );
    expect(applied.character.actionEconomy.bonusActionUsed).toBe(true);
    expect(applied.character.actionEconomy.actionUsed).toBe(false);

    // …then the next pick is a real main-action play, NOT end-turn and NOT a
    // second (impossible) Entangle.
    const second = chooseCombatAction(applied.state, applied.character);
    expect(second.kind).not.toBe('end-turn');
    expect((second as { spellId?: string }).spellId).not.toBe('entangling-roots');
  });

  it('does NOT cast Entangle without a 2nd-level slot', () => {
    const { state, character } = startCombat(atLevel(druid, 5), [{ defId: 'goblin', count: 2 }]);
    const beefy = setLiveHp(state, 30);
    const noSlot: Character = {
      ...character,
      resources: {
        ...character.resources,
        spellSlots: { ...(character.resources.spellSlots ?? {}), 2: 0 },
      },
    };
    const action = chooseCombatAction(beefy, noSlot);
    expect((action as { spellId?: string }).spellId).not.toBe('entangling-roots');
  });

  it('does NOT cast Entangle on a lone foe (no crowd to root)', () => {
    const { state, character } = startCombat(atLevel(druid, 5), [{ defId: 'goblin', count: 1 }]);
    const beefy = setLiveHp(state, 30);
    const action = chooseCombatAction(beefy, character);
    expect((action as { spellId?: string }).spellId).not.toBe('entangling-roots');
  });
});

describe('bot targeting — kill the summoner, not its spawn (owner report 2026-06-12)', () => {
  it('focuses the Mask-Chamberlain over fresher low-HP Mirror-Doubles', async () => {
    const { chooseCombatAction } = await import('./actionPolicy');
    const { createCombat } = await import('./createCombat');
    const { getMonster } = await import('../../content/monsters');
    const { createDiceRoller } = await import('../dice');
    const { buildPlayerCharacter, presetCreationInput } = await import(
      '../character/defaultCharacter'
    );

    const roller = createDiceRoller('kill-the-source');
    let fighter = buildPlayerCharacter(presetCreationInput('fighter'));
    fighter = { ...fighter, level: 12 };
    const made = createCombat({
      roller,
      character: fighter,
      monsters: [
        { def: getMonster('mask-chamberlain') },
        { def: getMonster('mirror-double') },
        { def: getMonster('mirror-double') },
      ],
    });
    // Wound the doubles so naive lowest-HP focus would eat them first.
    const state = {
      ...made.state,
      combatants: made.state.combatants.map((c) =>
        c.kind === 'monster' && c.instance.defId === 'mirror-double'
          ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 5 } } }
          : c,
      ),
    };
    // A martial class opens with target-less stance spends — walk the policy
    // through them; the first TARGETED action is the focus-fire read under test.
    const { applyPlannedAction } = await import('./actionPolicy');
    let st = state;
    let ch = made.character;
    let targeted: string | undefined;
    for (let i = 0; i < 5; i++) {
      const action = chooseCombatAction(st, ch, 'balanced');
      if ('targetId' in action && typeof action.targetId === 'string') {
        targeted = action.targetId;
        break;
      }
      if (action.kind === 'end-turn') break;
      const r = applyPlannedAction({ roller, state: st, character: ch }, action);
      if (r.state === st && r.character === ch) break;
      st = r.state;
      ch = r.character;
    }
    const target = st.combatants.find((c) => c.id === targeted);
    expect(target?.kind === 'monster' && target.instance.defId).toBe('mask-chamberlain');
  });
});
