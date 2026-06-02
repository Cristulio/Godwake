import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Driderling — a Lolth-touched spiderling, smaller than a hound but quick
 * and venomous. Pool mob; the chapter4 encounter pools spawn them in counts
 * of 2-3 to read as a swarm without a per-monster swarm mechanic.
 */
export const DRIDERLING: Monster = MonsterSchema.parse({
  id: 'driderling',
  name: 'Driderling',
  cr: '2',
  size: 'small',
  creatureType: 'monstrosity',
  ac: 15,
  maxHp: 40,
  speed: 40,
  abilityScores: { str: 11, dex: 16, con: 12, int: 4, wis: 10, cha: 5 },
  passivePerception: 12,
  actions: [
    {
      kind: 'attack',
      name: 'Venomous Bite',
      attackBonus: 6,
      damage: '2d8+3',
      damageType: 'poison',
      reach: 5,
      description:
        "It skitters under your guard on too many legs, locks its fangs through the boot-leather and drinks once before you can kick it off. The puncture goes cold and stays cold.",
    },
  ],
  resistances: ['poison'],
  flavorText:
    "A Lolth-touched spiderling that did not grow up into a drider — the priestesses cull the runt-broods rather than feed them. The ones that escape the cull take up residence in the lower corridors of Ust Natha and harry the slave-trains coming down from the surface.",
});
