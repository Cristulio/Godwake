/**
 * Gear-rebalance verification — the numbers behind the loot/affix rebalance.
 *
 * Prints to stdout (writes NO docs). Two comparisons the PR reports:
 *   (a) RULE 3 — a +3 white weapon/armour vs a +0 blue. Enhancement must be a
 *       real power axis: a +3 white (3 enhancement, 0 affixes) has to out-power a
 *       +0 blue (0 enhancement, 2 affixes).
 *   (b) RULE 4 — a chapter-N mob drop vs a chapter-N shop item. A drop you GET
 *       must be chapter-appropriate (≈ the rack), not far below it.
 *
 * Effective power rides the SAME channels the live engine reads: a weapon's +N
 * adds to attack AND damage (playerAttack), an armour's +N to AC (computeAC);
 * affixes go through aggregateAffixMods. DPR / damage-taken are computed on a
 * fixed representative profile so the comparison is apples-to-apples.
 *
 * Run: npx tsx scripts/sim-gear-rebalance.ts
 */

import { createDiceRoller, parseDiceExpression } from '../src/engine/dice';
import { getItem } from '../src/content/items';
import { rollItem } from '../src/engine/items/rollItem';
import { rollGearDrop } from '../src/engine/items/drops';
import { aggregateAffixMods, enhancementOf } from '../src/engine/items/affixMods';
import { rollGearStock } from '../src/components/delve/shopStock';
import type { ItemRef, GearRarity } from '../src/schemas/item';
import type { ClassId } from '../src/schemas/ids';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const num = (n: number, d = 2) => n.toFixed(d);

function avgDice(expr: string): number {
  const { count, die, modifier } = parseDiceExpression(expr);
  return (count * (die + 1)) / 2 + modifier;
}

// ─── Representative profiles (mid-game martial) ──────────────────────────────
// A +6 to-hit against AC 15 is a typical mid-chapter swing; the defend profile is
// a typical enemy (+6 to-hit, ~8 dmg/swing) over a fight's worth of incoming
// attacks. Only the RELATIVE numbers matter — both items use the same profile.
const ATK = { attackMod: 6, targetAC: 15 };
const DEF = { enemyAtk: 6, enemyDmg: 8 };

/** d20 hit chance for an attack of `atk` vs `ac` (nat-1 misses, nat-20 hits). */
function hitChance(atk: number, ac: number): number {
  return clamp((21 - (ac - atk)) / 20, 0.05, 0.95);
}

/** Effective DPR of a weapon ref, summed over `attacks` swings. The class
 * follow-up bonus (Relentless) fires only on swings AFTER the first — matching
 * playerAttack (see affixCombat.test "adds damage only on a follow-up swing"). */
function weaponDpr(ref: ItemRef, attacks: number): number {
  const item = getItem(ref.itemId);
  if (item.kind !== 'weapon') return 0;
  const base = avgDice(item.damage);
  const m = aggregateAffixMods(ref.rolled?.affixes ?? []);
  const enh = enhancementOf(ref);
  const atk = ATK.attackMod + m.attackBonus + enh + (item.attackMod ?? 0);
  const flat = m.damageBonus + enh + (item.damageMod ?? 0);
  const pHit = hitChance(atk, ATK.targetAC);
  const pCrit = (21 - (20 - m.critRangeBonus)) / 20; // 0.05, or 0.10 with +1 crit range
  let dpr = 0;
  for (let i = 0; i < attacks; i++) {
    const followBonus = i >= 1 ? m.followupDamageBonus : 0; // first swing is not a follow-up
    dpr += pHit * (base + flat + followBonus) + pCrit * base; // crit doubles the dice only
  }
  return dpr;
}

/** Damage TAKEN through a body-armour ref over `incoming` enemy swings (lower =
 * stronger). Temp HP is a one-time buffer; AC is permanent mitigation. */
function damageTaken(ref: ItemRef, incoming: number): number {
  const item = getItem(ref.itemId);
  if (item.kind !== 'armor') return 0;
  const m = aggregateAffixMods(ref.rolled?.affixes ?? []);
  const enh = enhancementOf(ref);
  const ac = (item.category === 'robe' ? 10 : item.baseAC) + enh + m.acBonus;
  const raw = hitChance(DEF.enemyAtk, ac) * DEF.enemyDmg * incoming;
  return Math.max(0, raw - m.tempHpPerCombat);
}

/** A single unified power scalar (mirrors the sim's loadoutScore weights) for the
 * drop-vs-store means. Conditional channels are discounted, base power included. */
function itemPower(ref: ItemRef): number {
  const item = getItem(ref.itemId);
  const m = aggregateAffixMods(ref.rolled?.affixes ?? []);
  const enh = enhancementOf(ref);
  let p = 0;
  if (item.kind === 'weapon') {
    p += avgDice(item.damage) * 1.6 + enh * 4.1; // +N rides attack 2.5 + damage 1.6
  } else if (item.kind === 'armor') {
    p += (item.category === 'robe' ? 0 : item.baseAC * 2.5) + enh * 2.5; // +N rides AC
  }
  p += m.acBonus * 2.5 + m.acBonusWhileFull * 1.2 + m.acBonusWhileBloodied * 1.2;
  p += m.attackBonus * 2.5 + m.damageBonus * 1.6 + m.critRangeBonus * 1.8;
  p += m.bleedDamage * 1.3 + m.lifestealPct * 0.06 + m.tempHpPerCombat * 0.35 + m.regenPerTurn * 0.5;
  p += (m.rageDamageBonus + m.markDamageBonus + m.sneakDamageBonus + m.followupDamageBonus) * 0.6;
  p += m.resists.length * 1.0;
  p += m.spellDcBonus * 2.6 + m.spellDamageBonus * 1.6 + m.spellAttackBonus * 2.6 + m.bonusSpellSlotsL1 * 3;
  return p;
}

// ─── Fixed refs for the rule-3 comparison ────────────────────────────────────
function mkWeapon(rarity: GearRarity, affixes: string[], enhancement: number): ItemRef {
  return { itemId: 'longsword', rolled: { baseId: 'longsword', rarity, affixes, enhancement, name: 'x' } };
}
function mkArmor(rarity: GearRarity, affixes: string[], enhancement: number): ItemRef {
  return { itemId: 'plate-armor', rolled: { baseId: 'plate-armor', rarity, affixes, enhancement, name: 'x' } };
}

function ruleThree(): void {
  console.log('=== RULE 3 — a +3 white must out-power a +0 blue ===');
  console.log(`profile: attacker +${ATK.attackMod} to hit vs AC ${ATK.targetAC}; defender enemy +${DEF.enemyAtk} to hit, ${DEF.enemyDmg} dmg/swing\n`);

  const white3 = mkWeapon('white', [], 3);
  const blueGeneric = mkWeapon('blue', ['cruel', 'honed'], 0); // strongest generic 2-affix blue
  const blueFighter = mkWeapon('blue', ['relentless', 'cruel'], 0); // strongest class 2-affix blue

  console.log('WEAPON (longsword), effective DPR:');
  for (const attacks of [1, 2]) {
    const label = attacks === 1 ? 'single attack ' : 'extra attack  ';
    const w = weaponDpr(white3, attacks);
    const bg = weaponDpr(blueGeneric, attacks);
    const bf = weaponDpr(blueFighter, attacks);
    console.log(
      `  ${label}: +3 white ${num(w)}  vs  +0 blue [Cruel+Honed] ${num(bg)} (white +${num(((w - bg) / bg) * 100, 0)}%)  vs  +0 blue [Relentless+Cruel] ${num(bf)} (white +${num(((w - bf) / bf) * 100, 0)}%)`,
    );
  }

  console.log('\nARMOUR (plate), damage TAKEN over a fight (lower = stronger):');
  const white3a = mkArmor('white', [], 3);
  const blueA = mkArmor('blue', ['warded', 'stoneblood'], 0); // +1 AC, +6 temp HP
  const plate = getItem('plate-armor');
  const plateAC = plate.kind === 'armor' ? plate.baseAC : 0;
  console.log(`  +3 white = AC ${plateAC + 3} (0 temp HP);  +0 blue = AC ${plateAC + 1} + 6 temp HP`);
  for (const incoming of [6, 12, 20]) {
    const w = damageTaken(white3a, incoming);
    const b = damageTaken(blueA, incoming);
    const winner = w < b ? 'white' : 'blue';
    console.log(`  ${String(incoming).padStart(2)} incoming swings: +3 white takes ${num(w)}  vs  +0 blue takes ${num(b)}  → ${winner} wins`);
  }
  console.log('  (AC is permanent mitigation; +6 temp HP is one-time — white pulls ahead as the fight runs long.)\n');
}

// ─── Rule 4 — chapter-N drop vs chapter-N shop item ──────────────────────────
const CLASS: ClassId = 'fighter';

function meanDropPower(chapter: number, kind: 'weapon' | 'armor', n: number): { power: number; rarities: Record<string, number> } {
  const roller = createDiceRoller(`drop-${kind}-${chapter}`);
  let sum = 0;
  let count = 0;
  const rarities: Record<string, number> = {};
  let i = 0;
  while (count < n && i < n * 40) {
    i += 1;
    const rarity = rollGearDrop(roller, 'combat', chapter);
    if (!rarity) continue;
    const ref = rollItem(roller, { rarity, classId: CLASS, kind, depth: chapter });
    sum += itemPower(ref);
    rarities[rarity] = (rarities[rarity] ?? 0) + 1;
    count += 1;
  }
  return { power: count ? sum / count : 0, rarities };
}

function meanStorePower(chapter: number, kind: 'weapon' | 'armor', seeds: number): { power: number; rarities: Record<string, number> } {
  let sum = 0;
  let count = 0;
  const rarities: Record<string, number> = {};
  for (let s = 0; s < seeds; s++) {
    const stock = rollGearStock(`store-${chapter}-${s}`, chapter, CLASS);
    for (const { ref } of stock) {
      if (getItem(ref.itemId).kind !== kind) continue;
      sum += itemPower(ref);
      const rar = ref.rolled?.rarity ?? 'white';
      rarities[rar] = (rarities[rar] ?? 0) + 1;
      count += 1;
    }
  }
  return { power: count ? sum / count : 0, rarities };
}

function fmtRarities(r: Record<string, number>): string {
  const order: GearRarity[] = ['white', 'green', 'blue', 'purple'];
  const total = Object.values(r).reduce((a, b) => a + b, 0) || 1;
  return order
    .filter((k) => r[k])
    .map((k) => `${k[0].toUpperCase()}${num((r[k] / total) * 100, 0)}%`)
    .join('/');
}

function ruleFour(): void {
  console.log('=== RULE 4 — a chapter-N mob drop ≈ a chapter-N shop item ===');
  console.log('mean effective item power (same depth + kind on both sides; the only delta is the rarity mix)\n');
  for (const kind of ['weapon', 'armor'] as const) {
    console.log(`${kind.toUpperCase()}:`);
    console.log('  ch | drop power | store power | ratio | drop rarities        | store rarities');
    console.log('  ---|-----------|------------|-------|----------------------|---------------');
    for (const chapter of [1, 3, 6, 10, 14]) {
      const drop = meanDropPower(chapter, kind, 3000);
      const store = meanStorePower(chapter, kind, 4000);
      const ratio = store.power > 0 ? drop.power / store.power : 0;
      console.log(
        `  ${String(chapter).padStart(2)} | ${num(drop.power).padStart(9)} | ${num(store.power).padStart(10)} | ${num(ratio).padStart(5)} | ${fmtRarities(drop.rarities).padEnd(20)} | ${fmtRarities(store.rarities)}`,
      );
    }
    console.log('');
  }
}

ruleThree();
ruleFour();
