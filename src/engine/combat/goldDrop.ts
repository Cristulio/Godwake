import type { Monster } from '../../schemas/monster';
import type { DiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';

/**
 * Gold dropped by a monster when killed, scaled to its CR. Tuned for a
 * Slay-the-Spire feel: every kill funds something, a normal Ch1 clear
 * affords ~1-2 mid-tier shop items, and a boss kill funds a real visit
 * without trivializing the shop. A CR-2 boss like Karzok drops ~24-60
 * (avg ~42), a Ch4 Matron Mother (CR 6) drops ~230.
 *
 * Returns a roll-result so combat logs can show the math.
 */
export function rollGoldDropForMonster(roller: DiceRoller, monster: Monster): number {
  const cr = parseCr(monster.cr);
  if (cr <= 0.125) return roller.roll('1d4+3').total; // CR 1/8 — ~4-7 (avg 5.5)
  if (cr <= 0.25) return roller.roll('1d6+4').total; // CR 1/4 — ~5-10 (avg 7.5)
  if (cr <= 0.5) return roller.roll('2d6+6').total; // CR 1/2 — ~8-18 (avg 13)
  if (cr <= 1) return roller.roll('3d8+8').total; // CR 1 — ~11-32 (avg 21.5)
  if (cr <= 2) return roller.roll('4d10+20').total; // CR 2 — ~24-60 (avg 42)
  if (cr <= 3) return roller.roll('4d10+40').total; // CR 3 — ~44-80 (avg 62)
  if (cr <= 4) return roller.roll('5d12+55').total; // CR 4 — ~60-115 (avg 87.5)
  if (cr <= 5) return roller.roll('6d12+90').total; // CR 5 — ~96-162 (avg 129)
  return roller.roll('10d12+165').total; // CR 6+ — ~175-285 (avg 230)
}

function parseCr(crStr: string): number {
  if (crStr === '1/8') return 0.125;
  if (crStr === '1/4') return 0.25;
  if (crStr === '1/2') return 0.5;
  const n = Number(crStr);
  return Number.isFinite(n) ? n : 1;
}

/**
 * Roll gold for every monster in a list of def-ids. Used at combat clear:
 * each enemy in the room drops, and we sum.
 */
export function rollRoomGoldDrops(roller: DiceRoller, defIds: string[]): number {
  let total = 0;
  for (const id of defIds) {
    try {
      total += rollGoldDropForMonster(roller, getMonster(id));
    } catch {
      // Unknown monster id — ignore. Shouldn't happen in practice.
    }
  }
  return total;
}
