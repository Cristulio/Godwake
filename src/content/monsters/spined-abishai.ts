import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Spined Abishai — Chapter 11 fodder. The lowest devil of the captor's pocket of
 * the Abyss: a barbed, leather-winged baatezu that infests the burning pit the way
 * rats infest a granary, drawn to the stink of a soul not yet claimed. A plain
 * `attack` striker (a spine-thrust of poisoned bone) with a `debuff` that works the
 * venom into you (poisoned, DC 18) so you fight the rest of the trial sick and
 * swinging short. It is not a guardian of anything. It is only Hell, being Hell.
 */
export const SPINED_ABISHAI: Monster = MonsterSchema.parse({
  id: 'spined-abishai',
  name: 'Spined Abishai',
  cr: '10',
  size: 'medium',
  creatureType: 'fiend (devil)',
  ac: 19,
  maxHp: 160,
  speed: 30,
  abilityScores: { str: 17, dex: 16, con: 18, int: 11, wis: 13, cha: 14 },
  passivePerception: 12,
  resistances: ['fire', 'poison'],
  immunities: ['fire'],
  actions: [
    {
      kind: 'attack',
      name: 'Barbed Spine',
      attackBonus: 12,
      damage: '2d8+8',
      damageType: 'piercing',
      reach: 5,
      description:
        'It snaps a spine off its own forearm with a wet crack and drives the barb up under your guard, the bone already weeping the black ichor that passes for blood in this place.',
    },
    {
      kind: 'debuff',
      name: 'Pit-Venom',
      condition: 'poisoned',
      saveDC: 19,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'The ichor on the spine is older than the pit and meaner than its keeper — it goes into the wound cold and turns hot, and the burning crawls up the limb until the whole side of you answers a half-beat slow and a hand-span wide.',
    },
  ],
  flavorText:
    "Hell is not all trial and judgement. Most of it is vermin — the small, spiteful devils that gather wherever a soul is being worked on, to be near the pain and to chance a bite of what is left. The abishai are the meanest of these: barbed, winged things bred from the cruelty of better fiends, with no part in the captor's design except to make the road to him hurt the whole way down. This one bars the burning gallery ahead because something is coming through, and in Hell anything coming through is either prey or a rival, and it has never in its existence troubled to tell the difference.",
});
