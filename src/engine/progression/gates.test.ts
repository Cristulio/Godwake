import { describe, it, expect } from 'vitest';
import { createGodwakeDelve } from '../delve';
import { rollGearStock } from '../../components/delve/shopStock';

// ── elite-nodes: elite slots downgraded when locked ──────────────────────────

describe('elite-nodes gate (createGodwakeDelve)', () => {
  it('produces no elite rooms when elitesEnabled=false', () => {
    const delve = createGodwakeDelve({ seed: 42, elitesEnabled: false });
    const elites = delve.rooms.filter((r) => r.kind === 'elite');
    expect(elites).toHaveLength(0);
  });

  it('produces elite rooms when elitesEnabled=true (default)', () => {
    const delve = createGodwakeDelve({ seed: 42, elitesEnabled: true });
    const elites = delve.rooms.filter((r) => r.kind === 'elite');
    expect(elites.length).toBeGreaterThan(0);
  });
});

// ── affixes-rare / affixes-epic: rarity cap in shop stock ────────────────────

describe('affixes-rare gate (rollGearStock maxRarity)', () => {
  it('caps all stock at green when maxRarity=green', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'green');
    for (const item of stock) {
      expect(item.ref.rolled?.rarity).toBe('green');
    }
  });

  it('allows blue when maxRarity=blue', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'blue');
    const rarities = stock.map((s) => s.ref.rolled?.rarity);
    expect(rarities.every((r) => r === 'green' || r === 'blue')).toBe(true);
    expect(rarities.some((r) => r === 'blue')).toBe(true);
  });

  it('does not produce purple when maxRarity=blue', () => {
    const stock = rollGearStock('test-room', 3, 'fighter', 0, 'blue');
    expect(stock.some((s) => s.ref.rolled?.rarity === 'purple')).toBe(false);
  });
});
