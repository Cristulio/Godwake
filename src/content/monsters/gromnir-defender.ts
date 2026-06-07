import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Gromnir's Defender — Chapter 12 mid. The Bhaalspawn-blooded guard of Gromnir
 * Il-Khan, the mad warlord who seized dying Saradush and holds it from the
 * inside while the giants burn it from without. These are kin to the player in
 * the worst way — also children of the dead god, also fighting to live one more
 * day — and the divine ichor in them makes a fast, vicious `multiattack`
 * warrior who fights like the siege has already taken everything but the rage.
 */
export const GROMNIR_DEFENDER: Monster = MonsterSchema.parse({
  id: 'gromnir-defender',
  name: "Gromnir's Defender",
  cr: '12',
  size: 'medium',
  creatureType: 'humanoid (bhaalspawn)',
  ac: 20,
  maxHp: 230,
  speed: 30,
  abilityScores: { str: 18, dex: 16, con: 18, int: 11, wis: 12, cha: 13 },
  passivePerception: 12,
  resistances: ['necrotic'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Cornered Fury',
      attacks: 2,
      description:
        'It fights with the economy gone and the fear burned off — two fast strokes of a notched longsword from a thing that has spent the whole siege deciding it would rather die swinging than starve in the dark.',
    },
    {
      kind: 'attack',
      name: 'Bhaal-Blooded Longsword',
      attackBonus: 13,
      damage: '2d8+8',
      damageType: 'slashing',
      reach: 5,
      description:
        'The blade is nothing special; the arm behind it is. The dead god\'s ichor runs in this one as it runs in you, and where the sword bites there is a half-instant of awful kinship before the blood comes.',
    },
  ],
  flavorText:
    "Inside the burning walls, the mad warlord Gromnir Il-Khan holds Saradush in a fist, and these are the fist's fingers — Bhaalspawn-blooded soldiers who threw in with him because he promised the one thing Melissan's protection had not: a way to fight. They are your kin. The same dead god's blood beats in them, the same crisis pulls at them, and they have been told that you are one more rival come to take the murder in their veins. They are not wrong about what you are. They are only wrong about why you came.",
});
