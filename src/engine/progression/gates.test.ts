import { describe, it, expect } from 'vitest';
import { createGodwakeDelve } from '../delve';
import { rollGearStock } from '../../components/delve/shopStock';

// ── elite-nodes: elite slots greyed (locked), not hidden, when locked ─────────

describe('elite-nodes gate (createGodwakeDelve)', () => {
  it('keeps elite nodes present but locked when elitesEnabled=false', () => {
    const delve = createGodwakeDelve({ seed: 42, elitesEnabled: false });
    const elites = delve.rooms.filter((r) => r.kind === 'elite');
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.every((r) => r.locked === true)).toBe(true);
  });

  it('produces selectable (unlocked) elite rooms when elitesEnabled=true (default)', () => {
    const delve = createGodwakeDelve({ seed: 42, elitesEnabled: true });
    const elites = delve.rooms.filter((r) => r.kind === 'elite');
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.some((r) => r.locked)).toBe(false);
  });

  it('lays out the identical map either way — only the locked flag differs', () => {
    const open = createGodwakeDelve({ seed: 42, elitesEnabled: true });
    const gated = createGodwakeDelve({ seed: 42, elitesEnabled: false });
    expect(gated.rooms.map((r) => r.id)).toEqual(open.rooms.map((r) => r.id));
    expect(gated.rooms.map((r) => r.kind)).toEqual(open.rooms.map((r) => r.kind));
    expect(gated.rooms.map((r) => r.next)).toEqual(open.rooms.map((r) => r.next));
  });
});

// ── affixes-rare / affixes-epic: rarity cap in shop stock ────────────────────

describe('affixes-rare gate (rollGearStock maxRarity)', () => {
  it('caps all stock at or below green when maxRarity=green (white floor allowed)', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'green');
    for (const item of stock) {
      expect(['white', 'green']).toContain(item.ref.rolled?.rarity);
    }
  });

  it('allows blue when maxRarity=blue', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'blue');
    const rarities = stock.map((s) => s.ref.rolled?.rarity);
    expect(rarities.every((r) => r === 'white' || r === 'green' || r === 'blue')).toBe(true);
    expect(rarities.some((r) => r === 'blue')).toBe(true);
  });

  it('does not produce purple when maxRarity=blue', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'blue');
    expect(stock.some((s) => s.ref.rolled?.rarity === 'purple')).toBe(false);
  });
});
