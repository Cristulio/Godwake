import {
  resolveEventIllustration,
  type IllustrationCategory,
} from '../../schemas/event';
import { backdropFor } from '../../assets/backdrops/registry';
import ironCellsUrl from '../../assets/illustrations/iron-cells.svg';
import athkatlaUrl from '../../assets/illustrations/athkatla.svg';
import spellholdUrl from '../../assets/illustrations/spellhold.svg';
import underdarkUrl from '../../assets/illustrations/underdark.svg';
import godwakeUrl from '../../assets/illustrations/the-godwake.svg';
import drownedArchiveUrl from '../../assets/illustrations/drowned-archive.svg';
import ashfallMarchUrl from '../../assets/illustrations/ashfall-march.svg';
import courtOfMasksUrl from '../../assets/illustrations/court-of-masks.svg';
import suldanessellarUrl from '../../assets/illustrations/suldanessellar.svg';
import hellTrialsUrl from '../../assets/illustrations/hell-trials.svg';
import saradushUrl from '../../assets/illustrations/saradush.svg';
import throneOfBhaalUrl from '../../assets/illustrations/throne-of-bhaal.svg';
import omenUrl from '../../assets/illustrations/omen.svg';

/**
 * Region-keyed illustration banner — the visual anchor above each event and
 * boss-intel room (the screens were walls of text). Scenes ship as standalone
 * pixel-art SVGs in src/assets/illustrations/ (same idiom as the monster
 * sprites, externalized from the JS bundle), keyed to the BG2 region the player
 * is in. The category is resolved from the room's chapter via
 * `resolveEventIllustration`; absent chapters fall back to `omen`.
 */
interface IllustrationEntry {
  url: string;
  /** Diegetic alt text — the place this scene depicts. */
  label: string;
}

const ILLUSTRATIONS: Record<IllustrationCategory, IllustrationEntry> = {
  'iron-cells': { url: ironCellsUrl, label: 'The Iron Cells' },
  athkatla: { url: athkatlaUrl, label: 'Stormhaven, the City of Coin' },
  spellhold: { url: spellholdUrl, label: 'Glassreach, the Asylum' },
  underdark: { url: underdarkUrl, label: 'The Deepdark' },
  'the-godwake': { url: godwakeUrl, label: 'The Godwake' },
  'drowned-archive': { url: drownedArchiveUrl, label: 'The Drowned Archive' },
  'ashfall-march': { url: ashfallMarchUrl, label: 'The Ashfall March' },
  'court-of-masks': { url: courtOfMasksUrl, label: 'The Court of Masks' },
  suldanessellar: { url: suldanessellarUrl, label: 'Tor Maladin, the Tree of Life' },
  'hell-trials': { url: hellTrialsUrl, label: 'The Trials of the Pit' },
  saradush: { url: saradushUrl, label: 'The Siege of Karthen' },
  'throne-of-bhaal': { url: throneOfBhaalUrl, label: 'The Throne of the Slain God' },
  omen: { url: omenUrl, label: 'An omen on the road' },
};

/** Whether a category has an authored illustration asset (always true by type). */
export function hasIllustration(category: IllustrationCategory): boolean {
  return category in ILLUSTRATIONS;
}

interface EventIllustrationProps {
  /** Explicit per-event override (from the template); usually undefined. */
  explicit?: IllustrationCategory;
  /** The room's chapter, used to derive the region scene. */
  chapter?: number;
  className?: string;
}

export function EventIllustration({ explicit, chapter, className = '' }: EventIllustrationProps) {
  const entry = ILLUSTRATIONS[resolveEventIllustration(explicit, chapter)];
  // The chapter's authored backdrop scene (the calmer event/rest corner of the
  // biome) supersedes the region banner once its art lands; the region
  // illustration stays as the fallback and keeps providing the diegetic label.
  const sceneUrl = explicit ? undefined : backdropFor(chapter, 'event');
  return (
    <div
      className={`relative h-28 w-full overflow-hidden border-2 border-[var(--color-border-warm)] ${className}`}
      aria-hidden
    >
      <img
        src={sceneUrl ?? entry.url}
        alt={entry.label}
        className="h-full w-full"
        style={{ objectFit: 'cover', objectPosition: 'center', imageRendering: 'pixelated' }}
      />
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_at_50%_120%,transparent_40%,rgba(10,8,5,0.55))]" />
      <div className="pointer-events-none absolute bottom-0 right-0 bg-[rgba(10,8,5,0.7)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
        {entry.label}
      </div>
    </div>
  );
}
