import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Wraith of Fear — Chapter 11 early-mid controller, the guardian-manifestation of
 * the Trial of Fear. At the first altar the pit asks whether you will face the
 * thing you most dread or flee it, and the dread itself rises to enforce the
 * question: a tall, hooded absence that wears, when you make yourself look, the
 * shape of the death you have spent every life running from. A `debuff` that
 * roots you (frightened, DC 19) re-levied whenever it lapses, then a chill that
 * reaches past armour into the part of you that wants to be anywhere else.
 */
export const WRAITH_OF_FEAR: Monster = MonsterSchema.parse({
  id: 'wraith-of-fear',
  name: 'Wraith of Fear',
  cr: '11',
  size: 'medium',
  creatureType: 'fiend (sin-manifestation)',
  ac: 19,
  maxHp: 182,
  speed: 30,
  abilityScores: { str: 13, dex: 18, con: 16, int: 14, wis: 18, cha: 19 },
  passivePerception: 14,
  resistances: ['necrotic', 'cold', 'psychic'],
  actions: [
    {
      kind: 'debuff',
      name: 'The Death You Run From',
      condition: 'frightened',
      saveDC: 20,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'The hood turns toward you and the dark inside it arranges itself, without hurry, into the one end you have never been able to look at squarely — and your body believes it before your mind can argue, every muscle wanting the door, the dark, the not-here.',
    },
    {
      kind: 'attack',
      name: 'Cold of the Flight',
      attackBonus: 13,
      damage: '2d8+8',
      damageType: 'cold',
      reach: 10,
      description:
        'It does not close the distance so much as the distance fails — and a cold that is the exact temperature of the moment before you run reaches into you and takes a fistful of the warmth you were saving for the bolt to the door.',
    },
  ],
  flavorText:
    "The first of the five trials is Fear, and the pit puts the question plainly: there is a thing you dread above all others, and you may face it or you may run, and your father's blood will be measured by which. The wraith is the question made a guardian — fear given just enough shape to hunt you with. It has no death of its own to threaten you with, so it borrows the one you carry, the private end you have fled through every life you can and cannot remember. Slay it and you have looked the dread in its hollow and not bolted. Flee it, and it follows you down the rest of the road, a little taller each time.",
});
