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
    cost: 60,
    kind: 'delveStart',
  },
  {
    id: 'mielikki-cache',
    name: "Mielikki's Cache",
    flavor:
      'A second flask, stoppered with wax and the Lady\'s sigil. It tastes of pine sap and summer rain.',
    effect: 'Start each delve with +1 Potion of Healing.',
    cost: 100,
    kind: 'delveStart',
  },
  {
    id: 'sages-pact',
    name: "Sage's Pact",
    flavor:
      'An old druid presses her thumb to your sternum and whispers a word from before the gods. The world makes a little more room for you.',
    effect: '+1 attunement slot, permanent.',
    cost: 150,
    kind: 'permanent',
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    flavor:
      'The Wellspring pulls deeper this time. You wake with breath you did not have before. Whatever the master takes, the soul keeps a little more.',
    effect: '+5 maximum HP, permanent across reincarnations.',
    cost: 220,
    kind: 'permanent',
  },
  {
    id: 'wellspring-vigil',
    name: 'Wellspring Vigil',
    flavor:
      'Mielikki\'s circle keeps a vigil while you sleep. You step into the dark with the second breath already drawn.',
    effect: 'Fighter: start each delve with +1 Second Wind charge.',
    cost: 320,
    kind: 'delveStart',
  },
  {
    id: 'heirloom-blade',
    name: 'Heirloom Blade',
    flavor:
      'A blade laid on the Wellspring stones the night of your last death. The Grove keepers do not say whose blade it was. The grip has been worn smooth by another hand.',
    effect: '+1 to all melee attack rolls, permanent.',
    cost: 200,
    kind: 'permanent',
  },
  {
    id: 'cloak-of-the-grove',
    name: 'Cloak of the Grove',
    flavor:
      'Spider-silk shot through with fern fronds and the cinder of last winter\'s fire. It moves when no wind touches it.',
    effect: '+1 AC, permanent.',
    cost: 260,
    kind: 'permanent',
  },
  {
    id: 'tymoras-wager',
    name: "Tymora's Wager",
    flavor:
      'A copper coin pressed into your palm by a laughing priestess. Heads, you live. Tails, you live again. She never lets you see the result.',
    effect: 'Start each delve with +1 missed-attack reroll budget.',
    cost: 140,
    kind: 'delveStart',
  },
  {
    id: 'whisper-of-the-wild',
    name: 'Whisper of the Wild',
    flavor:
      'A wolf stands at the edge of the firelight while the druids work the rite. You wake hearing what it heard the moment before it ran.',
    effect: '+2 initiative, permanent.',
    cost: 180,
    kind: 'permanent',
  },
  {
    id: 'mantle-of-the-wakened',
    name: 'Mantle of the Wakened',
    flavor:
      'The Wellspring keeps something back this time — a fistful of the old life, sewn into the seam of the new. The flesh remembers wounds it has not taken yet.',
    effect: '+15 maximum HP, permanent across reincarnations.',
    cost: 360,
    kind: 'permanent',
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
