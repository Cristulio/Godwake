import type { Class } from '../../schemas/class';
import type { ClassId } from '../../schemas/ids';
import { FIGHTER } from './fighter';
import { ROGUE } from './rogue';
import { WIZARD } from './wizard';
import { BARBARIAN } from './barbarian';
import { RANGER } from './ranger';
import { DRUID } from './druid';
import { MONK } from './monk';
import { BARD } from './bard';

const ALL_CLASSES: Class[] = [FIGHTER, ROGUE, WIZARD, BARBARIAN, RANGER, DRUID, MONK, BARD];

const CLASS_BY_ID: Record<ClassId, Class | undefined> = ALL_CLASSES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<ClassId, Class | undefined>,
);

export function getClass(id: ClassId): Class {
  const cls = CLASS_BY_ID[id];
  if (!cls) {
    throw new Error(`Class not found: ${id}`);
  }
  return cls;
}

export function listClasses(): Class[] {
  return ALL_CLASSES;
}
