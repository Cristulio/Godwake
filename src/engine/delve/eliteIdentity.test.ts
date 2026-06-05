import { describe, it, expect } from 'vitest';
import { getMonster } from '../../content/monsters';
import type { Monster } from '../../schemas/monster';
import type { EncounterEntry } from './chapter1Pools';

import { ELITE_POOL as CH1 } from './chapter1Pools';
import { ELITE_POOL as CH2 } from './chapter2Pools';
import { ELITE_POOL as CH3 } from './chapter3Pools';
import { ELITE_POOL as CH4 } from './chapter4Pools';
import { ELITE_POOL as CH5 } from './chapter5Pools';
import { ELITE_POOL as CH6 } from './chapter6Pools';
import { ELITE_POOL as CH7 } from './chapter7Pools';
import { ELITE_POOL as CH8 } from './chapter8Pools';
import { ELITE_POOL as CH9 } from './chapter9Pools';
import { ELITE_POOL as CH10 } from './chapter10Pools';
import { ELITE_POOL as CH11 } from './chapter11Pools';
import { ELITE_POOL as CH12 } from './chapter12Pools';
import { ELITE_POOL as CH13 } from './chapter13Pools';
import { ELITE_POOL as CH14 } from './chapter14Pools';

/**
 * Elite-identity invariant. Every chapter's ELITE_POOL is a pre-boss spike, and
 * the lane goal is that EVERY elite encounter reads as a step up from the road
 * around it — a leader carrying a real mechanic (a summon, a telegraphed heavy,
 * a debuff/ward/paralyze, or a half-HP phase / battle-rage), modelled on the
 * duergar-taskmaster. This guard fails the moment an elite entry is just plain
 * generics with no special, so the gap that prompted the pass can't reopen.
 */
const ELITE_POOLS: Array<[number, EncounterEntry[]]> = [
  [1, CH1], [2, CH2], [3, CH3], [4, CH4], [5, CH5], [6, CH6], [7, CH7],
  [8, CH8], [9, CH9], [10, CH10], [11, CH11], [12, CH12], [13, CH13], [14, CH14],
];

/** Does this monster carry an "elite identity" — a mechanic beyond plain attacks? */
function hasEliteMechanic(m: Monster): boolean {
  const actionMech = m.actions.some(
    (a) =>
      a.kind === 'summon' ||
      a.kind === 'debuff' ||
      a.kind === 'paralyze' ||
      a.kind === 'sustain' ||
      a.kind === 'multiattack' ||
      (a.kind === 'attack' && a.telegraph !== undefined),
  );
  return (
    actionMech ||
    m.bossMechanic !== undefined ||
    (m.phases?.length ?? 0) > 0 ||
    m.gate !== undefined
  );
}

describe('elite identity — every elite encounter has a mechanic-bearing leader', () => {
  for (const [chapter, pool] of ELITE_POOLS) {
    it(`Ch${chapter}: every ELITE_POOL entry fields a leader with a real mechanic`, () => {
      expect(pool.length).toBeGreaterThan(0);
      for (const entry of pool) {
        const leaders = entry.monsters.map((rm) => getMonster(rm.defId));
        const ok = leaders.some(hasEliteMechanic);
        expect(
          ok,
          `Ch${chapter} "${entry.title}" is a flat fight: ${entry.monsters
            .map((m) => m.defId)
            .join(' + ')} — no leader carries a summon/telegraph/debuff/phase`,
        ).toBe(true);
      }
    });
  }

  it('keeps the boss-only escalation out of elites (no actionsPerTurn > 1)', () => {
    const offenders: string[] = [];
    for (const [chapter, pool] of ELITE_POOLS) {
      for (const entry of pool) {
        for (const rm of entry.monsters) {
          const m = getMonster(rm.defId);
          if ((m.actionsPerTurn ?? 1) > 1) {
            offenders.push(`Ch${chapter} "${entry.title}": ${m.id} acts ${m.actionsPerTurn}×/turn`);
          }
        }
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([]);
  });
});
