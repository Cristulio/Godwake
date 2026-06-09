import type { EncounterEntry } from './chapter1Pools';

/**
 * Ascension-only ELITE encounters (Ascension ≥ 2, gated by
 * {@link ascensionEliteVariants}). These are NOT chapter-specific: at Ascension 2+
 * they are MIXED INTO every chapter's elite pool (see buildChapterNodes in
 * createDelve.ts), so the elite-room detour no longer only scales in numbers — it
 * changes WHAT you fight. The three ascendant horrors are things the climbing soul
 * drags up the wheel with it — a fixed endgame stat block (CR 13–15).
 *
 * Because they're chapter-agnostic, that fixed block alone would be ruinous in Ch1
 * and underwhelming at the Throne, so each carries `scaleToChapter` and the elite-
 * room builder NORMALIZES its HP, damage, and reward to the chapter it lands in
 * (see {@link ascendantChapterScale}) — a clear step above that chapter's own
 * elites everywhere, never a flat CR-15 wall in the first room.
 *
 * Single-monster compositions by design — each ascendant elite is meant to stand
 * the room on its own. Authored as a flat pool (not per-chapter variants) to keep
 * the content bounded.
 */

const ANCHOR_CHAPTER = 10;
const GROWTH_PER_CHAPTER = 1.16;

/**
 * Chapter-normalization multiplier for an ascendant elite's stats + reward.
 * Anchored at chapter {@link ANCHOR_CHAPTER} (≈100%, where the ~200-HP / CR-15
 * block reads as a clear step above that chapter's own elites) and scaled
 * geometrically: about −14%/chapter below the anchor, +16%/chapter above —
 * roughly the rate the game's own elite HP climbs across Ch1→14. Clamped to a
 * sane band so a stray chapter index can't produce a degenerate fight.
 */
export function ascendantChapterScale(chapter: number): number {
  const raw = GROWTH_PER_CHAPTER ** (chapter - ANCHOR_CHAPTER);
  return Math.min(2, Math.max(0.2, raw));
}
export const ASCENDANT_ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Shape That Climbed With You',
    flavorText:
      'The elite-ground is already taken. Something rose out of your own shadow and did not lie back down when the wheel turned you out at the bottom of the chain — the Ascendant Slayer, the god\'s murder-shape grown bold on repetition, wearing your reach and your timing because they were yours. It does not wait for the Throne now. It walks the chain beside you, and it has only ever wanted to be the one who finishes the climb.',
    monsters: [{ defId: 'ascendant-slayer', count: 1 }],
    xpReward: 4200,
    goldReward: 300,
    scaleToChapter: true,
  },
  {
    title: 'A Warden Out of the Silence',
    flavorText:
      'The light in the room thins, and a thing folds out of the gap behind it — a Void-Warden, pulled loose of its post in the silence the wheel turns through and dragged up the chain in the wake of a soul that climbs on purpose. To it your rising again and again is a leak in the proper order of endings. It does not hate you for it. It only begins, patiently, to fold the light out from around you.',
    monsters: [{ defId: 'void-warden', count: 1 }],
    xpReward: 3700,
    goldReward: 280,
    scaleToChapter: true,
  },
  {
    title: 'The Climber That Would Not Stop',
    flavorText:
      'It is standing in the elite-ground when you arrive, leaning on a notched cleaver, and it looks at you the way a man looks at his reflection in bad light. The Deathless Ascendant climbed the wheel so many times the wanting wore out and the stopping never came; now it walks the chain out of pure habit. It puts you down without anger, certain the only mercy left in any of it is to spare you the climb it has made.',
    monsters: [{ defId: 'deathless-ascendant', count: 1 }],
    xpReward: 3900,
    goldReward: 290,
    scaleToChapter: true,
  },
];
