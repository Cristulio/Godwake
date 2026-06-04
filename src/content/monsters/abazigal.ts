import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Abazigal — Chapter 13 boss, the last of the Five met in his lair. A Bhaalspawn
 * who took the shape of his draconic forebears and never gave it back: a great
 * half-blue-dragon, scaled cobalt and storm-charged, immune to the lightning
 * that is his blood.
 *
 * Boss-framework kit (multi-action, Ch9+):
 *  - `actionsPerTurn: 2` — he does not trade blows, he overwhelms; two beats a
 *    turn off one great body.
 *  - A telegraphed `attack` (Arc-Lightning Breath): his chest swells and lights
 *    from within a full turn before the storm comes down the gallery — your
 *    window to close, brace, or hard-control him so the breath collapses uncast.
 *  - A `debuff` (Thunderous Roar): frighten that lands as thunder, between
 *    breaths.
 *  - A half-HP `phase` (The Dragon Unleashed) over the legacy `battle-rage`:
 *    bloodied, the god in his blood stops pretending to be a dragon — he hits
 *    harder (battle-rage) and throws his guard away (the phase) to do it.
 * The Rending Bite and Claws remain his reach profile and flavor.
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
  actionsPerTurn: 2,
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Dragon Unleashed',
      enterText:
        'Cut deep enough and the dragon-shape stops being a costume. The thing inside the cobalt remembers it was very nearly a god, throws the careful coiled fighting away, and surges at you all storm and appetite — quicker, heavier, and past all caring what you do back.',
      acDelta: -2,
      transform: true,
    },
  ],
  actions: [
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
    {
      kind: 'attack',
      name: 'Arc-Lightning Breath',
      attackBonus: 13,
      damage: '4d10+6',
      damageType: 'lightning',
      reach: 15,
      telegraph: {
        chargeText:
          'His chest swells and lights from within, blue-white climbing the seams between the scales, the whole gallery taking on the smell of a coming strike — he is drawing the storm up to loose it in a single line down the rock, and you have one breath to be somewhere it is not.',
      },
      description:
        'His chest swells and lights from within, blue-white through the scales, and he looses the storm in a single line of forking lightning down the gallery — the same breath that made him, turned outward to unmake you.',
    },
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
  ],
  flavorText:
    "The last and the strongest of the Five you hunt, Abazigal claims dragon blood in his lineage and has spent his long life proving it — taking the half-dragon form and then refusing ever to set it down, until the man is gone and only the great cobalt wyrm remains, coiled at the bottom of caverns he has filled end to end with his own storm-blooded brood. He is immune to the lightning that is the whole of his blood, and he means to be immune to death the same way: he knows, as you do, that the divine essence in the slain of the Five flows to the survivors, and he intends to be the survivor. \"So,\" he says, and the word is thunder in the close rock, \"the runt of Bhaal's litter comes down to be a stepping-stone. Come closer, little kin. I have room in me for one more god.\"",
});
