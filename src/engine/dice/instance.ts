import {
  createDiceRoller,
  createDiceRollerFromState,
  type DiceRoller,
  type RollerSnapshot,
} from './dice';

let activeRoller: DiceRoller | null = null;

export function setActiveRoller(seed: string | number): DiceRoller {
  activeRoller = createDiceRoller(seed);
  return activeRoller;
}

/** Install the active roller resumed from a serialized PRNG cursor (save/resume). */
export function setActiveRollerFromState(snapshot: RollerSnapshot): DiceRoller {
  activeRoller = createDiceRollerFromState(snapshot);
  return activeRoller;
}

export function getActiveRoller(): DiceRoller {
  if (!activeRoller) {
    activeRoller = createDiceRoller(`godwake-fallback-${Date.now()}`);
  }
  return activeRoller;
}
