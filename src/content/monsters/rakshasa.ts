import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Rakshasa — Chapter 10 elite, the captor's lieutenant. A tiger-headed fiend in
 * a high elf's stolen finery, hands set on backward, spell-warded against the
 * lesser magics. It works in `multiattack` cursed claws (a touch of life-drain,
 * the wound that will not close) and a `frightened` debuff spun out of illusion.
 * Velnaris did not storm Tor Maladin alone; these came with him, and they
 * hold the temple stair to the Tree.
 */
export const RAKSHASA: Monster = MonsterSchema.parse({
  id: 'rakshasa',
  name: 'Rakshasa',
  cr: '13',
  size: 'medium',
  creatureType: 'fiend',
  ac: 20,
  maxHp: 212,
  speed: 40,
  abilityScores: { str: 16, dex: 19, con: 18, int: 18, wis: 17, cha: 21 },
  passivePerception: 15,
  resistances: ['psychic', 'force', 'fire'],
  vulnerabilities: ['radiant'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Reversed Claws',
      attacks: 2,
      description:
        'The hands are set on backward at the wrist, and they come at you from angles a hand should not, twice and twice again, the tiger-mouth above them smiling through it all as at a courtesy long owed and finally being paid.',
    },
    {
      kind: 'attack',
      name: 'Curse-Tipped Rake',
      attackBonus: 14,
      damage: '2d10+8',
      damageType: 'slashing',
      reach: 5,
      lifeDrain: 0.34,
      description:
        'Where the backward claws open you the wound does not behave — it pulls, slow and cold, the way a drain pulls water, and what it pulls runs up the reversed hand into the fiend, which seems to stand a little straighter for the having of it.',
    },
    {
      kind: 'debuff',
      name: 'Glamour of the Burning City',
      condition: 'frightened',
      saveDC: 19,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It lifts a backward hand and the air remembers a thing that has not happened yet — the Tree gone to ash, the city a cinder, every face you have climbed to save already cold — and the lie is told so well, by a thing that has watched it happen on a hundred worlds, that your body believes it and recoils.',
    },
  ],
  flavorText:
    "Velnaris did not take Tor Maladin with his own hands; he brought lieutenants worthy of the work, and chief among them the rakshasa — tiger-headed fiends in the robes of murdered nobles, hands turned backward at the wrist, warded against the small spells of mortal mages and contemptuous of the rest. This one holds the temple stair that climbs to the Tree, and it has held a thousand such stairs on a thousand fallen worlds, and it greets you with the bottomless good humour of a thing that has never once, in all that time, lost.",
});
