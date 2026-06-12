import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { dropSourceForRoom, rollGearDrop, rollPotionDrop } from './drops';

describe('dropSourceForRoom', () => {
  it('maps combat room kinds and ignores the rest', () => {
    expect(dropSourceForRoom('combat')).toBe('combat');
    expect(dropSourceForRoom('elite')).toBe('elite');
    expect(dropSourceForRoom('boss')).toBe('boss');
    expect(dropSourceForRoom('rest')).toBeNull();
    expect(dropSourceForRoom('shop')).toBeNull();
    expect(dropSourceForRoom('event')).toBeNull();
  });
});

describe('rollGearDrop', () => {
  const RARITY_RANK: Record<string, number> = { white: 0, green: 1, blue: 2, purple: 3 };

  /** Mean rarity rank (white 0 … purple 3) over the items that actually dropped. */
  function meanRarity(roomKind: string, chapter: number, n = 800): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const r = rollGearDrop(createDiceRoller(`${roomKind}-${chapter}-${i}`), roomKind, chapter);
      if (r) {
        sum += RARITY_RANK[r];
        count += 1;
      }
    }
    return count ? sum / count : 0;
  }

  it('never drops from a non-combat room', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollGearDrop(createDiceRoller(`r-${i}`), 'rest', 6)).toBeNull();
    }
  });

  it('only ever yields valid rarities (white→purple) — white is droppable now', () => {
    const valid = new Set([null, 'white', 'green', 'blue', 'purple']);
    for (const chapter of [1, 6, 12]) {
      for (let i = 0; i < 100; i++) {
        const r = rollGearDrop(createDiceRoller(`d-${chapter}-${i}`), 'boss', chapter);
        expect(valid.has(r as never)).toBe(true);
      }
    }
  });

  it('drops more often from a boss than from a mob', () => {
    let mob = 0;
    let boss = 0;
    for (let i = 0; i < 400; i++) {
      if (rollGearDrop(createDiceRoller(`m-${i}`), 'combat', 6)) mob++;
      if (rollGearDrop(createDiceRoller(`b-${i}`), 'boss', 6)) boss++;
    }
    expect(boss).toBeGreaterThan(mob);
  });

  it('scales drop rarity with chapter — a deep mob drop is no longer chapter-blind (rule 4)', () => {
    // The old flat green-heavy mix dropped the same spread at Ch1 and Ch14; now a
    // Ch1 mob skews white/green (rank < 1) and a Ch12 mob skews blue/purple (> 1.5).
    expect(meanRarity('combat', 1)).toBeLessThan(1.0);
    expect(meanRarity('combat', 12)).toBeGreaterThan(1.5);
    expect(meanRarity('combat', 12)).toBeGreaterThan(meanRarity('combat', 1));
  });

  it('elites and bosses drop AT the chapter ceiling — richer than a mob, never above the band', () => {
    // The model: a regular mob rolls a weighted spread within the band; an elite or
    // boss drops at the TOP of the current chapter's allowed rarity (a modest
    // reward), so both beat the mob's mean and sit exactly at the ceiling. The
    // elite/boss difference is drop CHANCE (covered above), not rarity.
    // Ch3 ceiling = blue (rank 2).
    expect(meanRarity('elite', 3)).toBe(2);
    expect(meanRarity('boss', 3)).toBe(2);
    expect(meanRarity('elite', 3)).toBeGreaterThan(meanRarity('combat', 3));
  });

  it('never drops above the chapter ceiling — no epic from a Ch1 elite/boss (rule 3)', () => {
    // Ch1-2 ceiling is green: an elite or boss there yields green at most, never
    // blue or purple, however rich the source.
    for (const kind of ['combat', 'elite', 'boss']) {
      for (let i = 0; i < 200; i++) {
        const r = rollGearDrop(createDiceRoller(`ceil-${kind}-${i}`), kind, 1);
        if (r) expect(['white', 'green']).toContain(r);
      }
    }
  });
});

describe('rollPotionDrop', () => {
  function dropsOver(roomKind: string, chapter: number, n = 800): string[] {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = rollPotionDrop(createDiceRoller(`pot-${roomKind}-${chapter}-${i}`), roomKind, chapter);
      if (id) out.push(id);
    }
    return out;
  }

  it('never drops from a non-combat room', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollPotionDrop(createDiceRoller(`pr-${i}`), 'rest', 9)).toBeNull();
      expect(rollPotionDrop(createDiceRoller(`ps-${i}`), 'shop', 9)).toBeNull();
    }
  });

  it('only drops healing draughts the chapter already stocks — the CONSUMABLE_CHAPTER_GATE gate', () => {
    // Ch1: the basic potion only (no Greater before its gate, no buffs ever).
    expect(new Set(dropsOver('boss', 1))).toEqual(new Set(['potion-of-healing']));
    // Ch7: mid rungs reachable, deep rungs still gated.
    const ch7 = new Set(dropsOver('boss', 7));
    expect(ch7.has('potion-of-superior-healing')).toBe(false);
    expect(ch7.has('potion-of-vigor')).toBe(false);
    // Ch11+: the full heal ladder is in the pool.
    const ch11 = new Set(dropsOver('boss', 11, 2000));
    expect(ch11.has('potion-of-superior-healing')).toBe(true);
    expect(ch11.has('potion-of-vigor')).toBe(true);
  });

  it('never drops the buff consumables — Elixir of Iron / Oil of Sharpness stay a pure gold sink', () => {
    const all = dropsOver('boss', 14, 2000);
    expect(all).not.toContain('elixir-of-iron');
    expect(all).not.toContain('oil-of-sharpness');
  });

  it('drops more often from a boss than from a mob', () => {
    expect(dropsOver('boss', 6).length).toBeGreaterThan(dropsOver('combat', 6).length);
  });

  it('weights climb toward the deepest rung — a Ch11 drop is usually a deep draught', () => {
    const drops = dropsOver('boss', 11, 2000);
    const basic = drops.filter((id) => id === 'potion-of-healing').length;
    const vigor = drops.filter((id) => id === 'potion-of-vigor').length;
    expect(vigor).toBeGreaterThan(basic);
  });
});
