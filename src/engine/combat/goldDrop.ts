import type { Monster } from '../../schemas/monster';
import type { DiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';

/**
 * Gold dropped by a monster when killed, scaled to its CR. Bands tuned so a
 * full delve clear yields meaningful (but not save-breaking) coin: a Ch1
 * room of three CR-1/4 mobs drops ~10-20 gp, a CR-2 boss like Ilyich drops
 * ~20-30, a Ch4 Matron Mother (CR 6) drops ~120.
 *
 * Returns a roll-result so combat logs can show the math.
 */
export function rollGoldDropForMonster(roller: DiceRoller, monster: Monster): number {
  // CR string → midpoint of a small range. We roll a tiny variance dice so
  // the same monster doesn't always drop the same amount.
  const cr = parseCr(monster.cr);
  if (cr <= 0.125) return roller.roll('1d4+1').total; // CR 1/8
  if (cr <= 0.25) return roller.roll('1d4+2').total; // CR 1/4
  if (cr <= 0.5) return roller.roll('1d6+3').total; // CR 1/2
  if (cr <= 1) return roller.roll('2d6+4').total; // CR 1
  if (cr <= 2) return roller.roll('2d8+8').total; // CR 2 — ~10-24 (avg 17)
  if (cr <= 3) return roller.roll('3d8+12').total; // CR 3 — ~15-36 (avg 25)
  if (cr <= 4) return roller.roll('3d10+18').total; // CR 4 — ~21-48 (avg 35)
  if (cr <= 5) return roller.roll('4d10+30').total; // CR 5 — ~34-70 (avg 52)
  return roller.roll('5d12+60').total; // CR 6+ — ~65-120 (avg 92)
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
