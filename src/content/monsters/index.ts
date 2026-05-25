import type { Monster } from '../../schemas/monster';
import { GOBLIN } from './goblin';

const ALL_MONSTERS: Monster[] = [GOBLIN];

const MONSTER_BY_ID: Map<string, Monster> = new Map(ALL_MONSTERS.map((m) => [m.id, m]));

export function getMonster(id: string): Monster {
  const monster = MONSTER_BY_ID.get(id);
  if (!monster) {
    throw new Error(`Monster not found: ${id}`);
  }
  return monster;
}

export function listMonsters(): Monster[] {
  return ALL_MONSTERS;
}

export { GOBLIN };
