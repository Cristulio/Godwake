import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore, RENOWN_FOR_CHAPTER_2 } from '../../stores/gameStore';
import { createIronCellsDelve } from '../../engine/delve';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { PhandalinScene } from './PhandalinScene';
import { QuirkRow } from '../ui/QuirkBadge';
import { QuirkCard } from '../ui/QuirkCard';

interface Building {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cta?: string;
  lockedCta?: string;
}

function buildingsFor(hasReincarnated: boolean): Building[] {
  return [
    {
      id: 'druid-grove',
      name: 'The Druid Grove',
      description: hasReincarnated
        ? 'The circle of Mielikki tends the Wellspring. They will return you to life when you fall — and shape what comes back.'
        : 'A clearing past the treeline. Smoke drifts from somewhere within, but no path opens for you. The Wellspring stirs only after the first fall.',
      enabled: hasReincarnated,
      cta: 'Tend the Soul',
      lockedCta: 'Sealed to you',
    },
    {
      id: 'iron-cells',
      name: 'The Iron Cells',
      description:
        'A staircase down through Tresendar Manor\'s ruined cellar. The first dungeon under Phandalin.',
      enabled: true,
      cta: 'Delve',
    },
    {
      id: 'lionshield-coster',
      name: 'Lionshield Coster',
      description: 'A modest trading post. Potions, scrolls, and gear for the road ahead.',
      enabled: false,
    },
  ];
}

export function HubScreen() {
  const character = useGameStore((s) => s.character);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startDelve = useGameStore((s) => s.startDelve);
  const goToDruidGrove = useGameStore((s) => s.goToDruidGrove);
  const goToChapter2Teaser = useGameStore((s) => s.goToChapter2Teaser);
  const chapter1Cleared = useGameStore((s) => s.chapter1Cleared);
  const hasReincarnated = useGameStore((s) => s.hasReincarnated);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. Return to title.
        <Button onClick={goToTitle}>Title</Button>
      </div>
    );
  }

  const race = getRace(character.raceId);
  const cls = getClass(character.classId);

  function handleEnterDungeon() {
    const delve = createIronCellsDelve();
    startDelve(delve);
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            PHANDALIN
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Sword Coast · Chapter I · The Mage's Cells
          </p>
        </div>
        <Button variant="secondary" onClick={goToTitle}>
          ← Title
        </Button>
      </header>

      <PhandalinScene />

      <Panel className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-center justify-center text-3xl">
            <span aria-hidden>🛡️</span>
          </div>
          <div className="flex-1">
            <div className="text-[var(--color-accent-amber)] font-bold uppercase tracking-wider">
              {character.name}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
              {race.name} {cls.name} · Level {character.level}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs mt-1">
              HP {character.hp.current}/{character.hp.max}
            </div>
            <div className="mt-2">
              <QuirkRow quirkIds={character.quirks} emptyText="The soul wears no marks this life" />
            </div>
          </div>
        </div>
      </Panel>

      {character.quirks.length > 0 && (
        <Panel className="mb-6" title="Quirks of this Incarnation">
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            The soul carries scars and gifts from death to death. These shape the life you wear now —
            until you fall again, and the wheel turns.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {character.quirks.map((id) => (
              <QuirkCard key={id} quirkId={id} />
            ))}
          </div>
        </Panel>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {buildingsFor(hasReincarnated).map((b) => (
          <Panel key={b.id} title={b.name}>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4 min-h-[5rem]">
              {b.description}
            </p>
            <Button
              variant={b.enabled ? 'primary' : 'secondary'}
              disabled={!b.enabled}
              onClick={
                b.id === 'iron-cells'
                  ? handleEnterDungeon
                  : b.id === 'druid-grove'
                    ? goToDruidGrove
                    : undefined
              }
            >
              {b.enabled ? (b.cta ?? 'Enter') : (b.lockedCta ?? 'Coming soon')}
            </Button>
          </Panel>
        ))}
      </div>

      <ChapterTwoBanner
        chapter1Cleared={chapter1Cleared}
        renown={character.renown}
        onTravel={goToChapter2Teaser}
      />

      <div className="mt-8 grid md:grid-cols-4 gap-4 text-center">
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Gold</div>
          <div className="text-2xl text-[var(--color-accent-gold)]">{character.goldInBank + character.goldInPocket}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Renown</div>
          <div className="text-2xl text-[var(--color-accent-amber)]">{character.renown}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">XP</div>
          <div className="text-2xl text-[var(--color-text-primary)]">{character.xp}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Bestiary</div>
          <button
            type="button"
            onClick={useGameStore.getState().goToCodex}
            className="text-2xl text-[var(--color-text-primary)] hover:text-[var(--color-accent-amber)] uppercase tracking-wider"
          >
            Open →
          </button>
        </Panel>
      </div>
    </div>
  );
}

interface ChapterTwoBannerProps {
  chapter1Cleared: boolean;
  renown: number;
  onTravel: () => void;
}

function ChapterTwoBanner({ chapter1Cleared, renown, onTravel }: ChapterTwoBannerProps) {
  const renownMet = renown >= RENOWN_FOR_CHAPTER_2;
  const unlocked = chapter1Cleared && renownMet;

  return (
    <div
      className={`mt-6 border-2 ${
        unlocked
          ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
          : 'border-[var(--color-border-dim)] bg-[var(--color-bg-panel)] opacity-90'
      } p-5`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1">
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-[0.4em] mb-1">
            The Road South
          </div>
          <h2
            className={`text-xl md:text-2xl uppercase tracking-wider mb-2 ${
              unlocked ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Athkatla — City of Coin
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed mb-3 max-w-2xl">
            {unlocked
              ? 'A merchant caravan rolls south at dawn. The gilded city waits at the end of the Trade Way.'
              : 'A rumor of gilded domes and counting houses. The road south is not yet yours to walk.'}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs uppercase tracking-widest">
            <Requirement
              met={chapter1Cleared}
              label="Survive the Iron Cells"
              detail={chapter1Cleared ? 'cleared' : 'not yet'}
            />
            <Requirement
              met={renownMet}
              label="Renown"
              detail={`${renown} / ${RENOWN_FOR_CHAPTER_2}`}
            />
          </div>
        </div>
        <div className="md:w-56 flex md:justify-end">
          <Button
            variant={unlocked ? 'primary' : 'secondary'}
            disabled={!unlocked}
            onClick={unlocked ? onTravel : undefined}
          >
            {unlocked ? 'Travel south' : 'Sealed to you'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Requirement({
  met,
  label,
  detail,
}: {
  met: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          met ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-dim)]'
        }
      >
        {met ? '✓' : '✗'}
      </span>
      <span className="text-[var(--color-text-dim)]">{label}</span>
      <span
        className={
          met ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-text-secondary)]'
        }
      >
        {detail}
      </span>
    </div>
  );
}
