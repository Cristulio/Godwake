import { describe, it, expect } from 'vitest';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DelveState } from '../../types/delve';
import { buildPostmortem } from './postmortem';

function bareCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'p1',
    name: 'Caelis',
    raceId: 'human',
    classId: 'fighter',
    subclassId: null,
    baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    xp: 0,
    skillProficiencies: [],
    expertSkills: [],
    hp: { current: 0, max: 12, temp: 0 },
    hitDice: { current: 1, max: 1, die: 10 },
    conditions: [],
    inventory: [],
    equipped: { mainHand: null, offHand: null, armor: null },
    resources: {},
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
    },
    quirks: [],
    blessings: [],
    goldInPocket: 0,
    renown: 0,
    ...overrides,
  } as Character;
}

function bareState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    combatants: [],
    turnOrder: [],
    currentTurnIndex: 0,
    round: 1,
    log: [],
    status: 'player-defeat',
    attackEventCounter: 0,
    playerHasAttacked: true,
    rerollMissesEncounterRemaining: 0,
    playerAttacksThisTurn: 0,
    ...overrides,
  };
}

function bareDelve(overrides: Partial<DelveState> = {}): DelveState {
  return {
    dungeonName: 'Iron Cells',
    chapterId: 'godwake',
    rooms: [],
    currentRoomIdx: 8,
    phase: 'failed',
    roomsCleared: 8,
    goldEarned: 0,
    xpEarned: 0,
    ...overrides,
  };
}

describe('buildPostmortem', () => {
  it('quotes the killing blow when lastAttack is set', () => {
    const ch = bareCharacter();
    const state = bareState({
      lastAttack: {
        id: 1,
        attackerName: 'Ilyich',
        attackerId: 'm1',
        attackerDefId: 'duergar-ilyich',
        targetName: 'Caelis',
        attackerKind: 'monster',
        weaponName: 'Eldritch Burst',
        attackBonus: 5,
        natural: 14,
        total: 19,
        targetAC: 12,
        hit: true,
        crit: false,
        damageDealt: 18,
        damageType: 'psychic',
      },
    });
    const p = buildPostmortem(state, ch, bareDelve());
    expect(p.killerName).toBe('Ilyich');
    expect(p.killerDefId).toBe('duergar-ilyich');
    expect(p.attackName).toBe('Eldritch Burst');
    expect(p.damageDealt).toBe(18);
    expect(p.damageType).toBe('psychic');
    expect(p.roomNumber).toBe(9);
    expect(p.dungeonName).toBe('Iron Cells');
  });

  it('attributes the failed save when the player still bears the condition', () => {
    const ch = bareCharacter({
      conditions: [
        {
          name: 'paralyzed',
          duration: { kind: 'rounds', value: 2 },
          saveDC: 13,
          saveAbility: 'wis',
        },
      ],
    });
    const state = bareState({
      lastSave: {
        id: 1,
        sourceName: 'Hold Person',
        casterName: 'Magistrate',
        ability: 'wis',
        dc: 13,
        mod: -1,
        natural: 7,
        total: 6,
        success: false,
        advantage: false,
      },
    });
    const p = buildPostmortem(state, ch, null);
    expect(p.failedSave).toBeDefined();
    expect(p.failedSave?.sourceName).toBe('Hold Person');
    expect(p.failedSave?.rolled).toBe(7);
    expect(p.failedSave?.dc).toBe(13);
    expect(p.activeConditions).toContain('paralyzed');
  });

  it('skips the failed-save attribution when the condition is no longer active', () => {
    const ch = bareCharacter({ conditions: [] });
    const state = bareState({
      lastSave: {
        id: 1,
        sourceName: 'Hold Person',
        ability: 'wis',
        dc: 13,
        mod: 0,
        natural: 8,
        total: 8,
        success: false,
        advantage: false,
      },
    });
    const p = buildPostmortem(state, ch, null);
    expect(p.failedSave).toBeUndefined();
  });

  it('lists unspent resources that could have saved the player', () => {
    const ch = bareCharacter({
      classId: 'fighter',
      resources: {
        secondWindAvailable: true,
        actionSurgeRemaining: 1,
      },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: true,
      },
    });
    const p = buildPostmortem(bareState(), ch, null);
    expect(p.unspentResources).toContain('Action');
    expect(p.unspentResources).toContain('Bonus Action');
    expect(p.unspentResources).toContain('Second Wind');
    expect(p.unspentResources.some((s) => s.startsWith('Action Surge'))).toBe(true);
    expect(p.unspentResources).not.toContain('Reaction');
  });

  it('omits Bonus Action / Reaction when the soul never had one', () => {
    // A wizard with no bonus-action option and no prepared reaction spell:
    // even with both flags unspent, neither should be surfaced.
    const ch = bareCharacter({
      classId: 'wizard',
      resources: { spellSlots: {}, knownSpells: ['fire-bolt'] },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        },
    });
    const p = buildPostmortem(bareState(), ch, null);
    expect(p.unspentResources).toContain('Action');
    expect(p.unspentResources).not.toContain('Bonus Action');
    expect(p.unspentResources).not.toContain('Reaction');
  });

  it('lists Reaction for a Rogue with Uncanny Dodge and Bonus Action for Cunning Action', () => {
    const ch = bareCharacter({
      classId: 'rogue',
      level: 5,
      resources: { cunningActionUsesRemaining: 1 },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        },
    });
    const p = buildPostmortem(bareState(), ch, null);
    expect(p.unspentResources).toContain('Bonus Action');
    expect(p.unspentResources).toContain('Reaction');
  });

  it('lists Reaction for a wizard holding a prepared Shield with a slot', () => {
    const ch = bareCharacter({
      classId: 'wizard',
      resources: { knownSpells: ['shield'], spellSlots: { 1: 2 } },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        },
    });
    const p = buildPostmortem(bareState(), ch, null);
    expect(p.unspentResources).toContain('Reaction');
    // Shield is a reaction, not a bonus action — don't surface a phantom one.
    expect(p.unspentResources).not.toContain('Bonus Action');
  });

  it('produces a safe shape when nothing is known', () => {
    const p = buildPostmortem(bareState(), bareCharacter(), null);
    expect(p.killerName).toBe('Unknown');
    expect(p.attackName).toBe('an unseen blow');
    expect(p.damageDealt).toBeUndefined();
    expect(p.failedSave).toBeUndefined();
  });
});
