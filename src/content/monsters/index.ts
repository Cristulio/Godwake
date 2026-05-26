import type { Monster } from '../../schemas/monster';
import { GOBLIN } from './goblin';
import { GOBLIN_WARDEN } from './goblin-warden';
import { SKELETON } from './skeleton';
import { KOBOLD } from './kobold';
import { ILYICH } from './duergar-ilyich';
import { DUST_MEPHIT } from './dust-mephit';
import { ANIMATED_ARMOR } from './animated-armor';
import { BUGBEAR } from './bugbear';
import { IMP } from './imp';
import { STIRGE } from './stirge';
import { GHOUL } from './ghoul';
import { HOBGOBLIN } from './hobgoblin';
import { CULT_FANATIC } from './cult-fanatic';
import { SHADOW } from './shadow';
import { COWLED_ENFORCER } from './cowled-enforcer';
import { SLAVER_CUIRASSIER } from './slaver-cuirassier';
import { ATHKATLA_MAGISTRATE } from './athkatla-magistrate';

const ALL_MONSTERS: Monster[] = [
  GOBLIN,
  GOBLIN_WARDEN,
  SKELETON,
  KOBOLD,
  ILYICH,
  DUST_MEPHIT,
  ANIMATED_ARMOR,
  BUGBEAR,
  IMP,
  STIRGE,
  GHOUL,
  HOBGOBLIN,
  CULT_FANATIC,
  SHADOW,
  COWLED_ENFORCER,
  SLAVER_CUIRASSIER,
  ATHKATLA_MAGISTRATE,
];

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

export {
  GOBLIN,
  GOBLIN_WARDEN,
  SKELETON,
  KOBOLD,
  ILYICH,
  DUST_MEPHIT,
  ANIMATED_ARMOR,
  BUGBEAR,
  IMP,
  STIRGE,
  GHOUL,
  HOBGOBLIN,
  CULT_FANATIC,
  SHADOW,
  COWLED_ENFORCER,
  SLAVER_CUIRASSIER,
  ATHKATLA_MAGISTRATE,
};
