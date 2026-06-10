import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Blood-Fiend — Chapter 14 early-mid striker, a god-essence horror grown past
 * the mote stage. Where a mote is a clot, this is a clot that has fed long enough
 * to keep a shape between kills — a tall, wet, four-armed thing that walks. A
 * heavier `lifeDrain` attacker than the mote, and a faster one: every wound it
 * opens runs the wrong way and feeds the murder it is made of.
 */
export const BLOOD_FIEND: Monster = MonsterSchema.parse({
  id: 'blood-fiend',
  name: 'Blood-Fiend',
  cr: '13',
  size: 'large',
  creatureType: 'fiend (bhaalspawn-essence)',
  ac: 20,
  maxHp: 218,
  speed: 30,
  abilityScores: { str: 19, dex: 16, con: 19, int: 9, wis: 12, cha: 14 },
  passivePerception: 12,
  resistances: ['necrotic', 'poison', 'fire'],
  actions: [
    {
      kind: 'attack',
      name: 'Sanguine Rend',
      attackBonus: 14,
      damage: '2d12+9',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'Four arms of half-set blood come round you at once, not to crush but to open — and the openings weep the wrong direction, your red running up its limbs and into the trunk of it, where it darkens, and sets, and makes the thing more solid and more sure of its own shape the emptier you go.',
    },
  ],
  flavorText:
    "Feed a clot of murder long enough and it learns to keep itself between meals. The blood-fiend is what a mote becomes when the Throne's pools have nursed it past the threshold of forgetting how to die — a standing thing now, tall and asymmetrical and faintly steaming, with too many arms because the murder it is made of was always reaching. It does not roar or threaten. It came up out of the floor of the dead god's hall the way damp comes up a wall, and it crosses the ground toward you with the patience of a tide, certain in the marrow it does not have that there is room in it for one more soul, and that the room is exactly your size.",
});
