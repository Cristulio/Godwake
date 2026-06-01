import type { EncounterEntry } from './chapter1Pools';

/**
 * Ascension-only ELITE encounters (Ascension ≥ 2, gated by
 * {@link ascensionEliteVariants}). These are NOT chapter-specific: at Ascension 2+
 * they are MIXED INTO every chapter's elite pool (see buildChapterNodes in
 * createDelve.ts), so the elite-room detour no longer only scales in numbers — it
 * changes WHAT you fight. The three ascendant horrors are things the climbing soul
 * drags up the wheel with it, endgame-band (CR 13–15) on purpose: ruinous early,
 * a genuine threat to the last chapter.
 *
 * Single-monster compositions by design — each ascendant elite is meant to stand
 * the room on its own. Rewards sit a clear step above the chapters' own elites to
 * read as the bigger risk on the map. Authored as a flat pool (not per-chapter
 * variants) to keep the content bounded.
 */
export const ASCENDANT_ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Shape That Climbed With You',
    flavorText:
      'The elite-ground is already taken. Something rose out of your own shadow and did not lie back down when the wheel turned you out at the bottom of the chain — the Ascendant Slayer, the god\'s murder-shape grown bold on repetition, wearing your reach and your timing because they were yours. It does not wait for the Throne now. It walks the chain beside you, and it has only ever wanted to be the one who finishes the climb.',
    monsters: [{ defId: 'ascendant-slayer', count: 1 }],
    xpReward: 4200,
    goldReward: 300,
  },
  {
    title: 'A Warden Out of the Silence',
    flavorText:
      'The light in the room thins, and a thing folds out of the gap behind it — a Void-Warden, pulled loose of its post in the silence the wheel turns through and dragged up the chain in the wake of a soul that climbs on purpose. To it your rising again and again is a leak in the proper order of endings. It does not hate you for it. It only begins, patiently, to fold the light out from around you.',
    monsters: [{ defId: 'void-warden', count: 1 }],
    xpReward: 3700,
    goldReward: 280,
  },
  {
    title: 'The Climber That Would Not Stop',
    flavorText:
      'It is standing in the elite-ground when you arrive, leaning on a notched cleaver, and it looks at you the way a man looks at his reflection in bad light. The Deathless Ascendant climbed the wheel so many times the wanting wore out and the stopping never came; now it walks the chain out of pure habit. It puts you down without anger, certain the only mercy left in any of it is to spare you the climb it has made.',
    monsters: [{ defId: 'deathless-ascendant', count: 1 }],
    xpReward: 3900,
    goldReward: 290,
  },
];
