import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slaver Cuirassier — a uniformed enforcer of one of the Athkatla slaver
 * houses. Mid-CR bruiser in lacquered breastplate with a heavy mace and a
 * length of weighted chain at the belt. Front-line brawler, not a finesse fighter.
 */
export const SLAVER_CUIRASSIER: Monster = MonsterSchema.parse({
  id: 'slaver-cuirassier',
  name: 'Slaver Cuirassier',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 17,
  maxHp: 52,
  speed: 25,
  abilityScores: { str: 15, dex: 11, con: 14, int: 10, wis: 11, cha: 9 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Heavy Mace',
      attackBonus: 6,
      damage: '2d8+5',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        "The mace comes down in a short, professional arc — the slaver doesn't swing for the kill, he swings for the joints. He gets paid more if you walk back to the stockades.",
    },
  ],
  flavorText:
    "Lacquered black breastplate over a red surcoat, the Twisted Coin sigil on the shoulder. Athkatla's slaver houses outfit them well; the chain at their belt is for you, not for him.",
});
