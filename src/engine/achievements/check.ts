/**
 * The store-aware achievement check. Gathers the account-level progress snapshot
 * from metaStore, runs the pure {@link evaluateAchievements} predicate set, and
 * for anything newly satisfied: persists the unlock (metaStore) and enqueues a
 * toast (screenStore) with a single positive chime. Idempotent — already-unlocked
 * achievements are never re-toasted.
 *
 * Call it at the moments progress changes: a chapter clear, a run end, a death's
 * return to the hub, a relic/set acquisition, and the hub mount (a catch-all).
 * Cheap enough to call liberally; the predicates are simple snapshot reads.
 */
import { useMetaStore } from '../../stores/metaStore';
import { useScreenStore } from '../../stores/screenStore';
import { playSfx } from '../audio';
import {
  evaluateAchievements,
  type AchievementContext,
} from '../../content/achievements';

function snapshot(): AchievementContext {
  const m = useMetaStore.getState();
  return {
    chaptersCleared: m.chaptersCleared,
    deathCount: m.deathCount,
    delveCount: m.delveCount,
    hasReincarnated: m.hasReincarnated,
    ascensionUnlocked: m.ascensionUnlocked,
    throneCompleted: m.throneCompleted,
    ownedLegendaries: m.ownedLegendaries,
    unlockedSets: m.unlockedSets,
    discoveredMonsters: m.discoveredMonsters,
    seenDialogueBeats: m.seenDialogueBeats,
    monsterKilledBy: m.monsterKilledBy,
    classDeepestChapter: m.classDeepestChapter,
    classesPlayed: m.classesPlayed,
    highestClearAscension: m.highestClearAscension,
    highestThroneAscension: m.highestThroneAscension,
    lowHpWins: m.lowHpWins,
    eliteFightWins: m.eliteFightWins,
    eliteGoldTaken: m.eliteGoldTaken,
    darkGambleWins: m.darkGambleWins,
  };
}

export function runAchievementCheck(): void {
  const meta = useMetaStore.getState();
  const newly = evaluateAchievements(snapshot(), meta.unlockedAchievements);
  if (newly.length === 0) return;
  for (const id of newly) meta.unlockAchievement(id);
  useScreenStore.getState().enqueueAchievementToasts(newly);
  playSfx('shrine_chime');
}
