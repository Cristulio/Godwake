import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bandit Captain — a duelist who has worked the Trade Way long enough to
 * have a reputation and a rapier polished to keep it. Found on the Athkatla
 * roads, occasionally moonlighting for the slaver houses.
 */
export const BANDIT_CAPTAIN: Monster = MonsterSchema.parse({
  id: 'bandit-captain',
  name: 'Bandit Captain',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 16,
  maxHp: 48,
  speed: 30,
  abilityScores: { str: 12, dex: 16, con: 12, int: 11, wis: 11, cha: 14 },
  passivePerception: 12,
  actions: [
    {
      kind: 'attack',
      name: 'Duelist\'s Rapier',
      attackBonus: 6,
      damage: '2d8+4',
      damageType: 'piercing',
      reach: 5,
      description:
        'The captain moves in low, blade angled high — a guildsman\'s lunge with a flick at the end of it. The kind of strike taught for street duels, not battlefields.',
    },
  ],
  flavorText:
    'A black coat, a clean white shirt, gold rings on three fingers and a rapier whose hilt has been re-wrapped recently. The kind of bandit who keeps a tab open at the Den of Seven Vales between robberies.',
});
