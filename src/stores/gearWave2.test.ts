import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { legendaryBankPool } from '../content/legendaries';
import { rollLegendaryOffer, LEGENDARY_PRICE } from '../components/delve/shopStock';
import { setActiveRoller } from '../engine/dice';
import type { DelveState } from '../types/delve';

function completedDelve(): DelveState {
  return {
    dungeonName: 'Test',
    chapterId: 'godwake',
    rooms: [
      { id: 'r1', kind: 'combat', title: 'Cell', flavorText: '' },
      { id: 'r2', kind: 'boss', title: 'Warden', flavorText: '' },
    ],
    currentRoomIdx: 1,
    roomsCleared: 1,
    goldEarned: 0,
    xpEarned: 0,
    phase: 'completed',
  };
}

beforeEach(() => {
  setActiveRoller('wave2-seed');
  useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('fighter')) });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    ownedLegendaries: [],
    equippedRelics: {},
    ascensionUnlocked: 0,
    renownSpent: 0,
  });
});

describe('legendary drop banks, does not equip mid-run', () => {
  it('banks to the collection without touching inventory, equipped, or active', () => {
    const beforeInv = useCharacterStore.getState().character!.inventory.length;
    const id = useMetaStore.getState().grantLegendaryDrop(false);
    expect(id).not.toBeNull();
    expect(useMetaStore.getState().ownedLegendaries).toContain(id!);
    // Banked only — the run's gear and the equipped loadout are untouched.
    expect(useCharacterStore.getState().character!.inventory.length).toBe(beforeInv);
    expect(useMetaStore.getState().equippedRelics).toEqual({});
  });

  it('elite drops can bank ANY class relic — off-class is stashed', () => {
    useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('wizard')) });
    useMetaStore.setState({ ownedLegendaries: [] });
    const banked: string[] = [];
    for (let i = 0; i < 60; i++) {
      const id = useMetaStore.getState().grantLegendaryDrop(false);
      if (!id) break;
      banked.push(id);
    }
    // The whole base pool is reachable regardless of class (legendaries are
    // boon-only now — no class gate). The apex ascendant tier is excluded here
    // (Asc 0): allowAscendant === false.
    expect(banked).toContain('heartwood-talisman');
    expect(banked).toHaveLength(legendaryBankPool(false).length);
  });

  it('a banked drop survives a clear (the wheel)', () => {
    const id = useMetaStore.getState().grantLegendaryDrop(false);
    useDelveStore.setState({ delve: completedDelve() });
    useDelveStore.getState().finishDelve();
    expect(useMetaStore.getState().ownedLegendaries).toContain(id!);
  });
});

describe('legendary loadout seats one relic per typed slot', () => {
  it('seats owned class-eligible relics into their distinct slots', () => {
    const owned = ['heartwood-talisman', 'bulwark-sigil', 'gauntlets-of-the-titan'];
    // Rend (gauntlets) opens at 100 renown spent; Vampire/Aegis are starting slots.
    useMetaStore.setState({ ascensionUnlocked: 0, ownedLegendaries: owned, renownSpent: 100 });
    const meta = useMetaStore.getState();
    owned.forEach((id) => meta.equipRelic(id));
    const eq = useMetaStore.getState().equippedRelics;
    expect(eq.vampire).toBe('heartwood-talisman');
    expect(eq.aegis).toBe('bulwark-sigil');
    expect(eq.rend).toBe('gauntlets-of-the-titan');
    expect(Object.keys(eq)).toHaveLength(3);
  });
});

describe('shop reliquary: bought legendary banks and leaves stock', () => {
  it('purchaseLegendary banks the relic and deducts gold', () => {
    const ch = useCharacterStore.getState().character!;
    useCharacterStore.setState({ character: { ...ch, goldInPocket: 9999 } });
    const r = useDelveStore.getState().purchaseLegendary('bulwark-sigil', 350);
    expect(r.ok).toBe(true);
    expect(useMetaStore.getState().ownedLegendaries).toContain('bulwark-sigil');
    expect(useCharacterStore.getState().character!.goldInPocket).toBe(9999 - 350);
  });

  it('refuses to double-bank an owned relic and does not charge', () => {
    const ch = useCharacterStore.getState().character!;
    useCharacterStore.setState({ character: { ...ch, goldInPocket: 9999 } });
    useMetaStore.setState({ ownedLegendaries: ['bulwark-sigil'] });
    const r = useDelveStore.getState().purchaseLegendary('bulwark-sigil', 350);
    expect(r.ok).toBe(false);
    expect(useCharacterStore.getState().character!.goldInPocket).toBe(9999);
  });

  it('never offers an already-owned relic (so a bought relic leaves stock)', () => {
    const owned = ['bulwark-sigil', 'cloak-of-the-nightwind', 'heartwood-talisman'];
    for (let i = 0; i < 80; i++) {
      const offer = rollLegendaryOffer(`seed-${i}`, 3, 'fighter', owned);
      if (offer) expect(owned).not.toContain(offer.legendaryId);
    }
  });
});

describe('reliquary pricing: substantial cost that escalates with the reliquary', () => {
  // Find a seed+chapter that deterministically yields an offer, so the cost is
  // stable across re-rolls (the offer roll ignores ownedCount — it's pool-blind).
  function findOffer(chapter: number) {
    for (let i = 0; i < 400; i++) {
      const seed = `price-seed-${i}`;
      if (rollLegendaryOffer(seed, chapter, 'fighter', [], 0, 0)) return seed;
    }
    throw new Error('no offer found');
  }

  it('the first relic costs far more than the old flat 500gp', () => {
    const seed = findOffer(3);
    const offer = rollLegendaryOffer(seed, 3, 'fighter', [], 0, 0)!;
    // Chapter 3 is the anchor (no depth premium), 0 banked → the bare floor.
    expect(offer.cost).toBe(LEGENDARY_PRICE.base);
    expect(offer.cost).toBeGreaterThan(500);
  });

  it('each banked relic makes the next one dearer', () => {
    const seed = findOffer(3);
    const at = (owned: number) => rollLegendaryOffer(seed, 3, 'fighter', [], 0, owned)!.cost;
    expect(at(1) - at(0)).toBe(LEGENDARY_PRICE.perOwned);
    expect(at(5) - at(0)).toBe(5 * LEGENDARY_PRICE.perOwned);
    // Monotonic climb across a full reliquary.
    for (let n = 1; n <= 10; n++) expect(at(n)).toBeGreaterThan(at(n - 1));
  });

  it('deeper chapters add a premium on top of the escalation', () => {
    const seed = findOffer(14);
    const deep = rollLegendaryOffer(seed, 14, 'fighter', [], 0, 0)!;
    expect(deep.cost).toBe(LEGENDARY_PRICE.base + (14 - 3) * LEGENDARY_PRICE.perChapter);
  });

  it('the purchase is gated on affordability at the escalated price', () => {
    const seed = findOffer(3);
    const offer = rollLegendaryOffer(seed, 3, 'fighter', [], 0, 4)!;
    const ch = useCharacterStore.getState().character!;
    // One gold short of the escalated price → refused, no charge, not banked.
    useCharacterStore.setState({ character: { ...ch, goldInPocket: offer.cost - 1 } });
    const denied = useDelveStore.getState().purchaseLegendary(offer.legendaryId, offer.cost);
    expect(denied.ok).toBe(false);
    expect(useCharacterStore.getState().character!.goldInPocket).toBe(offer.cost - 1);
    expect(useMetaStore.getState().ownedLegendaries).not.toContain(offer.legendaryId);
    // Exactly the price → allowed.
    useCharacterStore.setState({ character: { ...ch, goldInPocket: offer.cost } });
    const ok = useDelveStore.getState().purchaseLegendary(offer.legendaryId, offer.cost);
    expect(ok.ok).toBe(true);
    expect(useCharacterStore.getState().character!.goldInPocket).toBe(0);
  });
});
