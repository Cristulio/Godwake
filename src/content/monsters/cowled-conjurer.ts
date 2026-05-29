import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cowled Conjurer — Ch2 summoner. A Cowled Wizard who fights from behind a
 * bound servitor. Once per fight it binds an imp to the field (`summon`, once),
 * then settles into ranged arcane bolts. Kill the imp and the conjurer is
 * exposed; kill the conjurer and the imp keeps coming.
 */
export const COWLED_CONJURER: Monster = MonsterSchema.parse({
  id: 'cowled-conjurer',
  name: 'Cowled Conjurer',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 12,
  maxHp: 33,
  speed: 30,
  abilityScores: { str: 9, dex: 14, con: 12, int: 16, wis: 12, cha: 13 },
  passivePerception: 11,
  actions: [
    {
      kind: 'summon',
      name: 'Bind Servitor',
      summonDefId: 'imp',
      count: 1,
      maxActive: 1,
      once: true,
      cooldownRounds: 1,
      description:
        'A circle of cold fire opens at chest height and something with wings folds itself out of it, already grinning.',
    },
    {
      kind: 'attack',
      name: 'Arcane Bolt',
      attackBonus: 5,
      damage: '2d6+3',
      damageType: 'force',
      range: [60, 120],
      description:
        'A lance of grey-violet force, loosed underhand, almost dismissive — the gesture of a man who would rather you were already dead.',
    },
  ],
  flavorText:
    'The silver collar of the Cowled Wizards, the mask polished blank. He does not duel; he delegates. Whatever he calls up answers to him only as long as he is interesting to it, which is to say only as long as he is alive.',
});
