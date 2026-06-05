import { describe, it, expect } from 'vitest';
import {
  listClassUpgrades,
  getUpgrade,
} from '../content/upgrades';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
} from '../engine/character/upgrades';
import { wizardSpellSlots } from '../engine/character/actions';
import { monkKiMax } from '../engine/combat/monk';
import { wildShapeUsesMax } from '../engine/combat/wildShape';
import { firstBoonQuirk } from '../engine/character/quirks';
import {
  buildPlayerCharacter,
  presetCreationInput,
} from '../engine/character/defaultCharacter';
import type { ClassId } from '../schemas/ids';
import type { Character } from '../types/character';
import { useGameStore } from './gameStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';

function build(classId: ClassId, level = 1): Character {
  const base = buildPlayerCharacter(presetCreationInput(classId));
  return { ...base, level };
}

// ── Issue 1: Grove class tab reflects the CURRENTLY-WORN class after a swap ──
describe('Grove class tab follows the worn class after a soul swap', () => {
  it('selectCharacter updates the facade classId so listClassUpgrades resolves the new class', () => {
    useCharacterStore.setState({ character: { ...build('barbarian'), renown: 1000 } });
    useMetaStore.setState({ originClass: 'barbarian' });
    expect(useGameStore.getState().character?.classId).toBe('barbarian');

    useGameStore.getState().selectCharacter('rogue');

    // The Grove screen reads `character.classId` for its class tab + upgrade list.
    const worn = useGameStore.getState().character;
    expect(worn?.classId).toBe('rogue');
    const tabUpgrades = listClassUpgrades(worn!.classId).map((u) => u.id);
    expect(tabUpgrades).toEqual(expect.arrayContaining(['shadowstep', 'knife-in-the-dark']));
    expect(tabUpgrades).not.toContain('brutal-scars'); // no stale barbarian node
  });
});

// ── Issue 2: Druid + Monk have class-specific Grove upgrades ──
describe('Druid and Monk each have class Grove upgrades', () => {
  it('druid has nature/wild-shape/spell nodes', () => {
    const ids = listClassUpgrades('druid').map((u) => u.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids).toEqual(
      expect.arrayContaining(['primal-reservoir', 'verdant-wrath', 'deep-roots']),
    );
  });

  it('monk has ki/unarmed nodes', () => {
    const ids = listClassUpgrades('monk').map((u) => u.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids).toEqual(expect.arrayContaining(['brimming-well', 'pressure-points']));
  });

  it("Primal Reservoir widens the druid's Wild Shape uses per combat", () => {
    const druid = build('druid', 5); // wild-shape comes online at L2
    expect(wildShapeUsesMax(druid)).toBe(1);
    const withRes = applyDelveStartUpgrades(druid, { 'primal-reservoir': 2 });
    expect(withRes.permanentBonuses?.wildShapeUses).toBe(2);
    expect(wildShapeUsesMax(withRes)).toBe(3);
  });

  it('Brimming Well widens the monk Ki ceiling', () => {
    const monk = build('monk', 5);
    const base = monkKiMax(monk);
    expect(base).toBeGreaterThan(0); // ki is online from L1
    const withKi = applyDelveStartUpgrades(monk, { 'brimming-well': 2 });
    expect(withKi.permanentBonuses?.kiPoints).toBe(2);
    expect(monkKiMax(withKi)).toBe(base + 2);
  });
});

// ── Issue 3: Caster slot upgrade grants a usable extra 1st-level spell slot ──
describe('Caster slot upgrade adds a usable spell slot (Wizard + Druid)', () => {
  it('Wellspring of Mysteries gives the wizard an extra L1 slot at descent and on refill', () => {
    let w = build('wizard');
    const baseSlot = w.resources.spellSlots?.[1] ?? 0;
    w = applyPermanentUpgrade(w, 'wellspring-of-mysteries', 1);
    expect(w.permanentBonuses?.bonusSpellSlotsL1).toBe(1);

    const descended = applyDelveStartUpgrades(w, {});
    expect(descended.resources.spellSlots?.[1]).toBe(baseSlot + 1);
    // Refill (rest / level-up) keeps the extra slot too.
    expect(wizardSpellSlots(descended)[1]).toBe(baseSlot + 1);
  });

  it('Deep Roots gives the druid an extra L1 slot', () => {
    let d = build('druid');
    const baseSlot = d.resources.spellSlots?.[1] ?? 0;
    d = applyPermanentUpgrade(d, 'deep-roots', 1);
    const descended = applyDelveStartUpgrades(d, {});
    expect(descended.resources.spellSlots?.[1]).toBe(baseSlot + 1);
    expect(wizardSpellSlots(descended)[1]).toBe(baseSlot + 1);
  });

  it('a non-caster never gains the seeded slot', () => {
    const fighter = applyDelveStartUpgrades(
      { ...build('fighter'), permanentBonuses: { bonusSpellSlotsL1: 2 } },
      {},
    );
    expect(fighter.resources.spellSlots).toBeUndefined();
  });
});

// ── Issue 4: Wheelturner carries the first BOON, never a bane ──
describe('firstBoonQuirk — Wheelturner only keeps a good thread', () => {
  it('skips a leading bane and returns the first boon', () => {
    expect(firstBoonQuirk(['glassbone', 'stonehide'])).toBe('stonehide');
  });

  it('returns the first boon when it leads', () => {
    expect(firstBoonQuirk(['stonehide', 'glassbone'])).toBe('stonehide');
  });

  it('returns undefined when the soul holds only banes', () => {
    expect(firstBoonQuirk(['glassbone', 'limping'])).toBeUndefined();
  });

  it('treats an odd-sentiment mark as not-a-boon', () => {
    expect(firstBoonQuirk(['iron-stomach'])).toBeUndefined();
  });

  it('skips unknown ids without throwing', () => {
    expect(firstBoonQuirk(['not-a-real-quirk', 'stonehide'])).toBe('stonehide');
    expect(firstBoonQuirk([])).toBeUndefined();
  });
});

// Guard: every class upgrade tab now non-empty for the playable cast.
describe('every playable class has a Grove class tab', () => {
  it('fighter/rogue/wizard/barbarian/ranger/druid/monk all have ≥1 class node', () => {
    const cast: ClassId[] = [
      'fighter',
      'rogue',
      'wizard',
      'barbarian',
      'ranger',
      'druid',
      'monk',
    ];
    for (const id of cast) {
      expect(listClassUpgrades(id).length, `${id} class upgrades`).toBeGreaterThan(0);
    }
  });

  it('Wheelturner effect text advertises a boon', () => {
    expect(getUpgrade('wheelturner').effectAtRank(1).toLowerCase()).toContain('boon');
  });
});
