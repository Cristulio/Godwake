import { createDiceRoller, type DiceRoller } from './dice';

let activeRoller: DiceRoller | null = null;

export function setActiveRoller(seed: string | number): DiceRoller {
  activeRoller = createDiceRoller(seed);
  return activeRoller;
}

export function getActiveRoller(): DiceRoller {
  if (!activeRoller) {
    activeRoller = createDiceRoller(`godwake-fallback-${Date.now()}`);
  }
  return activeRoller;
}
