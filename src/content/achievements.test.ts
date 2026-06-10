import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  getAchievement,
  PLATINUM_ID,
  type AchievementContext,
} from './achievements';
import { listMonsters } from './monsters';
import { LEGENDARY_ORDER } from './legendaries';
import { SET_PIECE_ORDER } from './sets';
import { LORE_BEATS } from './loreBeats';
import { listClasses } from './classes';

function zeroCtx(): AchievementContext {
  return {
    chaptersCleared: 0,
    deathCount: 0,
    delveCount: 0,
    hasReincarnated: false,
    ascensionUnlocked: 0,
    throneCompleted: false,
    ownedLegendaries: [],
    ownedSetPieces: [],
    discoveredMonsters: [],
    seenDialogueBeats: [],
    monsterKilledBy: {},
    classDeepestChapter: {},
    classesPlayed: [],
    highestClearAscension: -1,
    highestThroneAscension: -1,
    lowHpWins: 0,
    eliteFightWins: 0,
    eliteGoldTaken: 0,
    darkGambleWins: 0,
  };
}

/** A snapshot that satisfies every non-platinum criterion (the 100% ledger). */
function maxedCtx(): AchievementContext {
  const allClasses = listClasses().map((c) => c.id);
  return {
    chaptersCleared: 14,
    deathCount: 25,
    delveCount: 50,
    hasReincarnated: true,
    ascensionUnlocked: 6,
    throneCompleted: true,
    ownedLegendaries: [...LEGENDARY_ORDER],
    ownedSetPieces: [...SET_PIECE_ORDER],
    discoveredMonsters: listMonsters().map((m) => m.id),
    seenDialogueBeats: LORE_BEATS.map((b) => b.id),
    monsterKilledBy: { goblin: 1 },
    classDeepestChapter: Object.fromEntries(allClasses.map((id) => [id, 14])),
    classesPlayed: allClasses,
    highestClearAscension: 6,
    highestThroneAscension: 6,
    lowHpWins: 3,
    eliteFightWins: 10,
    eliteGoldTaken: 10,
    darkGambleWins: 5,
  };
}

describe('achievements — definitions', () => {
  it('has at least 40 achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
  });

  it('has unique, non-empty ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it('every achievement has a name, description, category, and a function criteria', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(0);
      expect(a.description.length, a.id).toBeGreaterThan(0);
      expect(['progression', 'challenge', 'quirky', 'completionist']).toContain(a.category);
      expect(typeof a.criteria, a.id).toBe('function');
    }
  });

  it('covers all four categories', () => {
    const cats = new Set(ACHIEVEMENTS.map((a) => a.category));
    expect(cats).toEqual(new Set(['progression', 'challenge', 'quirky', 'completionist']));
  });

  it('hidden flag rides exactly the quirky bucket', () => {
    for (const a of ACHIEVEMENTS) {
      if (a.category === 'quirky') expect(a.hidden, a.id).toBe(true);
      else expect(a.hidden ?? false, a.id).toBe(false);
    }
  });

  it('has a resolvable platinum capstone in the completionist bucket', () => {
    const platinum = getAchievement(PLATINUM_ID);
    expect(platinum).toBeDefined();
    expect(platinum?.category).toBe('completionist');
  });
});

describe('evaluateAchievements', () => {
  it('unlocks nothing on a fresh, empty snapshot', () => {
    expect(evaluateAchievements(zeroCtx(), [])).toEqual([]);
  });

  it('unlocks the first-door milestone once a chapter falls', () => {
    const ctx = { ...zeroCtx(), chaptersCleared: 1 };
    expect(evaluateAchievements(ctx, [])).toContain('first-door');
  });

  it('never re-returns an already-unlocked id', () => {
    const ctx = { ...zeroCtx(), chaptersCleared: 1 };
    const first = evaluateAchievements(ctx, []);
    expect(first).toContain('first-door');
    expect(evaluateAchievements(ctx, first)).not.toContain('first-door');
  });

  it('keys the low-HP achievements off the win counter', () => {
    expect(evaluateAchievements({ ...zeroCtx(), lowHpWins: 1 }, [])).toContain('a-single-heartbeat');
    expect(evaluateAchievements({ ...zeroCtx(), lowHpWins: 1 }, [])).not.toContain('edge-walker');
    expect(evaluateAchievements({ ...zeroCtx(), lowHpWins: 3 }, [])).toContain('edge-walker');
  });

  it('requires both a caster and a martial clear for sword-and-spell', () => {
    const casterOnly = { ...zeroCtx(), classDeepestChapter: { wizard: 1 } };
    expect(evaluateAchievements(casterOnly, [])).not.toContain('sword-and-spell');
    const both = { ...zeroCtx(), classDeepestChapter: { wizard: 1, fighter: 1 } };
    expect(evaluateAchievements(both, [])).toContain('sword-and-spell');
  });

  it('a full ledger unlocks every achievement including the platinum', () => {
    const newly = evaluateAchievements(maxedCtx(), []);
    expect(newly.length).toBe(ACHIEVEMENTS.length);
    expect(newly).toContain(PLATINUM_ID);
  });

  it('withholds the platinum while any other achievement is unattainable', () => {
    // A ledger complete in every way except one milestone (Maevra never felled),
    // so 'godwake' can never satisfy from this snapshot and the platinum stays shut.
    const ctx = { ...maxedCtx(), throneCompleted: false };
    const newly = evaluateAchievements(ctx, []);
    expect(newly).not.toContain('godwake');
    expect(newly).not.toContain(PLATINUM_ID);
  });

  it('grants the platinum the instant the last non-platinum is unlocked', () => {
    const allButPlatinum = ACHIEVEMENTS.map((a) => a.id).filter((id) => id !== PLATINUM_ID);
    expect(evaluateAchievements(maxedCtx(), allButPlatinum)).toEqual([PLATINUM_ID]);
  });
});
