/**
 * Druid Grove upgrades. The Wellspring of Mielikki blesses the soul, not the
 * flesh — purchases persist across reincarnations.
 *
 * Each upgrade is bought once with Renown. Wiring:
 *  - `delveStart` upgrades: applied in gameStore.startDelve
 *  - `permanent` upgrades: applied at character creation / when read in derived stats
 */
export type UpgradeKind = 'delveStart' | 'permanent';

export interface Upgrade {
  id: string;
  name: string;
  flavor: string;
  effect: string;
  cost: number;
  kind: UpgradeKind;
}

const RAW: Upgrade[] = [
  {
    id: 'coin-in-pocket',
    name: 'Coin in the Pocket',
    flavor:
      'The Grove keepers tuck a few coppers into the hem of your coat each time the Wellspring releases you. They never speak of where the coin came from.',
    effect: 'Start each delve with +25 gold.',
    cost: 40,
    kind: 'delveStart',
  },
  {
    id: 'mielikki-cache',
    name: "Mielikki's Cache",
    flavor:
      'A second flask, stoppered with wax and the Lady\'s sigil. It tastes of pine sap and summer rain.',
    effect: 'Start each delve with +1 Potion of Healing.',
    cost: 60,
    kind: 'delveStart',
  },
  {
    id: 'sages-pact',
    name: "Sage's Pact",
    flavor:
      'An old druid presses her thumb to your sternum and whispers a word from before the gods. The world makes a little more room for you.',
    effect: '+1 attunement slot, permanent.',
    cost: 90,
    kind: 'permanent',
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    flavor:
      'The Wellspring pulls deeper this time. You wake with breath you did not have before. Whatever the master takes, the soul keeps a little more.',
    effect: '+5 maximum HP, permanent across reincarnations.',
    cost: 120,
    kind: 'permanent',
  },
  {
    id: 'wellspring-vigil',
    name: 'Wellspring Vigil',
    flavor:
      'Mielikki\'s circle keeps a vigil while you sleep. You step into the dark with the second breath already drawn.',
    effect: 'Fighter: start each delve with +1 Second Wind charge.',
    cost: 180,
    kind: 'delveStart',
  },
];

const BY_ID = new Map(RAW.map((u) => [u.id, u]));

export function getUpgrade(id: string): Upgrade {
  const u = BY_ID.get(id);
  if (!u) throw new Error(`Upgrade not found: ${id}`);
  return u;
}

export function listUpgrades(): Upgrade[] {
  return RAW;
}
