import type { Race } from '../../schemas/race';
import type { RaceId } from '../../schemas/ids';
import { HUMAN } from './human';
import { WOOD_ELF } from './wood-elf';
import { HILL_DWARF } from './hill-dwarf';
import { HALF_ELF } from './half-elf';
import { TIEFLING } from './tiefling';

const ALL_RACES: Race[] = [HUMAN, WOOD_ELF, HILL_DWARF, HALF_ELF, TIEFLING];

const RACE_BY_ID: Record<RaceId, Race | undefined> = ALL_RACES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RaceId, Race | undefined>,
);

export function getRace(id: RaceId): Race {
  const race = RACE_BY_ID[id];
  if (!race) {
    throw new Error(`Race not found: ${id}`);
  }
  return race;
}

export function listRaces(): Race[] {
  return ALL_RACES;
}
