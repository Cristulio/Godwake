import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Spider Broodmother — Ch4 ELITE summoner. The signature "broodmother that
 * summons driderlings." Demonstrates `summon` at scale: it spills two
 * driderlings at a time (maxActive 4, cooldown 2) while biting for venom
 * damage. A swarm-generator — race the brood cap or drown in spider-children.
 */
export const SPIDER_BROODMOTHER: Monster = MonsterSchema.parse({
  id: 'spider-broodmother',
  name: 'Spider Broodmother',
  cr: '5',
  size: 'large',
  creatureType: 'monstrosity',
  ac: 15,
  maxHp: 75,
  speed: 40,
  abilityScores: { str: 16, dex: 15, con: 16, int: 4, wis: 12, cha: 6 },
  passivePerception: 11,
  resistances: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Venom Bite',
      attackBonus: 7,
      damage: '2d8+4',
      damageType: 'poison',
      reach: 5,
      description:
        'Fangs the length of fingers fold down and drive deep, pumping a grey-green venom that burns going in.',
    },
    {
      kind: 'summon',
      name: 'Spill the Brood',
      summonDefId: 'driderling',
      count: 2,
      maxActive: 4,
      cooldownRounds: 2,
      description:
        'The swollen abdomen convulses and a clutch of half-formed driderlings pour out of her, already running, already hungry.',
    },
  ],
  flavorText:
    'Lolth-blessed and grotesquely fertile, she is kept in the lower temple to replenish the brood-warrens faster than the surface raids spend them. Her abdomen is the size of a wine-tun and never stops moving. The Matron calls her holy. The drow who tend her call her nothing at all, and stand well back.',
});
