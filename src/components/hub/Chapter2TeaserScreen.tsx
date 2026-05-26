import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { createAthkatlaDelve } from '../../engine/delve/createDelve';
import { AthkatlaScene } from './AthkatlaScene';

/**
 * Chapter 2 gateway. Unlocked once Ch1 is cleared and 500 Renown is banked.
 * Reading panel for the city, then the descent into the Athkatla delve.
 */
export function Chapter2TeaserScreen() {
  const goToHub = useGameStore((s) => s.goToHub);
  const startDelve = useGameStore((s) => s.startDelve);

  function descendIntoAthkatla() {
    startDelve(createAthkatlaDelve());
  }

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

      <Panel className="mb-6" title="What Waits Within">
        <ul className="text-[var(--color-text-primary)] text-sm space-y-2 leading-relaxed">
          <li>
            <span className="text-[var(--color-accent-amber)]">A path through the city.</span>{' '}
            Eight rooms — alley, counting house, cowled patrol, Magistrate's hall.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">The Cowled Wizards.</span>{' '}
            Silver-masked enforcers who tax unlicensed magic with bolts of pale violet light.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">The Slaver Houses.</span>{' '}
            Lacquered cuirassiers in red and black. The chain at their belt is for you.
          </li>
          <li>
            <span className="text-[var(--color-accent-amber)]">The Magistrate.</span>{' '}
            A senior Cowled Wizard who holds court. Brittle. Patient. Does not raise his voice.
          </li>
        </ul>
      </Panel>

      <Panel>
        <div className="text-center">
          <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.4em] text-xs mb-3">
            The Road South
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed max-w-xl mx-auto">
            The caravan stops at the West Gate. From here it is your own feet, your own
            blade, your own name to keep — or to lose.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3">
            <Button variant="primary" onClick={descendIntoAthkatla}>
              Enter Athkatla →
            </Button>
            <Button variant="secondary" onClick={goToHub}>
              Return to Phandalin
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
