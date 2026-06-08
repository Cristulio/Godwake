import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { legendaryBankPool } from '../content/legendaries';
import { rollLegendaryOffer } from '../components/delve/shopStock';
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
