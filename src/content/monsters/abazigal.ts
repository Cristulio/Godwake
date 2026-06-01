import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Abazigal — Chapter 13 boss, the last of the Five met in his lair. A Bhaalspawn
 * who took the shape of his draconic forebears and never gave it back: a great
 * half-blue-dragon, scaled cobalt and storm-charged, immune to the lightning
 * that is his blood. The apex kit at chapter-13 scale: a `multiattack` the picker
 * falls to (rending bite and claws at reach), a lightning-breath `attack`, a
 * `debuff` (frightened) off his thunderous roar, and `battle-rage` past half HP
 * when the god in his blood stops pretending to be a dragon.
 */
export const ABAZIGAL: Monster = MonsterSchema.parse({
  id: 'abazigal',
  name: 'Abazigal',
  cr: '17',
  size: 'huge',
  creatureType: 'dragon (Bhaalspawn)',
  ac: 22,
  maxHp: 390,
  speed: 40,
  abilityScores: { str: 24, dex: 12, con: 22, int: 16, wis: 15, cha: 19 },
  passivePerception: 17,
  immunities: ['lightning'],
  resistances: ['thunder', 'acid'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'attack',
      name: 'Rending Bite and Claws',
      attackBonus: 14,
      damage: '2d10+7',
      damageType: 'piercing',
      reach: 10,
      description:
        'He comes in over the reach of any blade you carry, jaws and foreclaws both, the bite charged blue along the teeth so it burns the wound even as the claws open it — a half-dragon fighting like the whole dragon he has decided to be.',
    },
    {
      kind: 'multiattack',
      name: 'Wrath of the Brood-Sire',
      attacks: 3,
      description:
        'He does not trade blows; he overwhelms — bite and claw and claw in a single furious beat, three strokes off one great body before you have recovered from the first, the way every thing he ever sired learned to fight by watching him.',
    },
    {
      kind: 'attack',
      name: 'Arc-Lightning Breath',
      attackBonus: 13,
      damage: '4d10+6',
      damageType: 'lightning',
      reach: 15,
      description:
        'His chest swells and lights from within, blue-white through the scales, and he looses the storm in a single line of forking lightning down the gallery — the same breath that made him, turned outward to unmake you.',
    },
    {
      kind: 'debuff',
      name: 'Thunderous Roar',
      condition: 'frightened',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'He throws back his head and roars, and it lands as thunder — a wall of charged sound that shakes the rock loose from the ceiling and tells the marrow of you, with the authority of something almost divine, that you should already be running.',
    },
  ],
  flavorText:
    "The last and the strongest of the Five you hunt, Abazigal claims dragon blood in his lineage and has spent his long life proving it — taking the half-dragon form and then refusing ever to set it down, until the man is gone and only the great cobalt wyrm remains, coiled at the bottom of caverns he has filled end to end with his own storm-blooded brood. He is immune to the lightning that is the whole of his blood, and he means to be immune to death the same way: he knows, as you do, that the divine essence in the slain of the Five flows to the survivors, and he intends to be the survivor. \"So,\" he says, and the word is thunder in the close rock, \"the runt of Bhaal's litter comes down to be a stepping-stone. Come closer, little kin. I have room in me for one more god.\"",
});
