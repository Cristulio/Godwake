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

  it('defaults to selectable elites with no flag — the production contract (elites always available)', () => {
    // Both live descent paths (gameStore.selectCharacterAndDescend, HubScreen) now
    // hardcode elitesEnabled=true, mirroring this factory default. A fresh soul never
    // gets a locked elite.
    const delve = createGodwakeDelve({ seed: 42 });
    const elites = delve.rooms.filter((r) => r.kind === 'elite');
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.every((r) => r.locked)).toBe(false);
  });
});

// ── rolled gear rarity: gated by the CURRENT chapter, not a meta unlock ───────
// The shop rack rarity ceiling is intrinsic to the chapter (deep layers and any
// number of prior runs never push it above the chapter band) — green Ch1-2, blue
// Ch3-6, purple Ch7+. See engine/items/drops.maxRolledRarityForChapter.

describe('shop rarity ceiling (rollGearStock, chapter-gated)', () => {
  const rarities = (chapter: number, layer: number) =>
    rollGearStock(`rarity-${chapter}-${layer}`, chapter, 'fighter', layer).map(
      (s) => s.ref.rolled?.rarity ?? 'white',
    );

  it('caps an early rack (Ch1-2) at green, however deep the layer or seed', () => {
    for (const chapter of [1, 2]) {
      for (const layer of [0, 4, 20]) {
        for (const r of rarities(chapter, layer)) expect(['white', 'green']).toContain(r);
      }
    }
  });

  it('caps a mid rack (Ch3-6) at blue and never shows purple', () => {
    for (const chapter of [3, 4, 5, 6]) {
      for (const layer of [0, 4, 20]) {
        const rs = rarities(chapter, layer);
        expect(rs.every((r) => r === 'white' || r === 'green' || r === 'blue')).toBe(true);
        expect(rs).not.toContain('purple');
      }
    }
  });

  it('opens purple only from Ch7 on (the deep-run reward)', () => {
    for (const chapter of [7, 10, 14]) {
      const everShowsPurple = [0, 2, 8].some((layer) => rarities(chapter, layer).includes('purple'));
      expect(everShowsPurple).toBe(true);
    }
  });
});
