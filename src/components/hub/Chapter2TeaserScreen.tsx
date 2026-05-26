import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { AthkatlaScene } from './AthkatlaScene';

/**
 * Chapter 2 teaser. Unlocked once Ch1 is cleared and 500 Renown is banked.
 * Reading-only beat — no delve starts here yet.
 */
export function Chapter2TeaserScreen() {
  const goToHub = useGameStore((s) => s.goToHub);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            ATHKATLA
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Amn · Chapter II · The City of Coin
          </p>
        </div>
        <Button variant="secondary" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <AthkatlaScene />

      <Panel className="mb-6">
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed">
          The road south leaves the trees behind. Three days on the Trade Way and the
          land flattens; on the fourth, the wind tastes of salt, and the gilded domes of
          Athkatla rise out of the heat-haze like a second sunrise. Bell-towers. Counting
          houses. A harbor wall longer than Phandalin is wide.
        </p>
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed mt-3">
          A city where every god is welcome — for a fee. Where the Cowled Wizards collect
          their tax in spells and silence. Where, somewhere behind a guildhall door, a
          name your master never said aloud is waiting to be spoken.
        </p>
      </Panel>

      <Panel className="mb-6" title="What Waits Below">
        <ul className="text-[var(--color-text-primary)] text-sm space-y-2 leading-relaxed">
          <li>
            <span className="text-[var(--color-accent-amber)]">The Bronze Lion.</span>{' '}
            A festhall hub — rumor, contracts, a back-room fence. Talk before you delve.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">The Cowled Wizards.</span>{' '}
            Cast a spell in the open and they will find you. So cast cleverly.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">Three new delves.</span>{' '}
            The Slaver Stockades, the Planar Sphere, the Graveyard District tombs.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">Level 4–6 enemies.</span>{' '}
            Cult priests, slaver captains, lesser devils, things wearing human skin.
          </li>
        </ul>
      </Panel>

      <Panel>
        <div className="text-center">
          <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.4em] text-xs mb-3">
            The Story Is Not Yet Written
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed max-w-xl mx-auto">
            Chapter II is still being built. For now the gates are open only to the eye.
            The road south will be walkable in time — the soul will remember.
          </p>
          <div className="mt-5">
            <Button variant="secondary" onClick={goToHub}>
              Return to Phandalin
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
