import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slayer-Echo — Chapter 14 mid bruiser, and the most personal foe in the hall.
 * This close to the Throne the Slain God taint in your own blood answers the pools and
 * stands up out of you: the Slayer, the avatar of the God of Murder you have
 * always carried and never wholly been, walked out a step and turned around. A
 * `debuff` (frightened — the horror of meeting your own worst shape) into a
 * `multiattack` frenzy; it fights with your reach and your habits and none of your
 * restraint.
 */
export const SLAYER_ECHO: Monster = MonsterSchema.parse({
  id: 'slayer-echo',
  name: 'Slayer-Echo',
  cr: '14',
  size: 'large',
  creatureType: 'fiend (bhaal-avatar)',
  ac: 21,
  maxHp: 258,
  speed: 40,
  abilityScores: { str: 21, dex: 18, con: 20, int: 10, wis: 12, cha: 10 },
  passivePerception: 13,
  resistances: ['necrotic', 'poison', 'psychic'],
  actions: [
    {
      kind: 'debuff',
      name: 'The Slayer Rises',
      condition: 'frightened',
      saveDC: 20,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It pulls itself up out of your own shadow and turns the face on you, and the face is the one you have spent every life refusing to wear — clawed, grinning, certain, the thing your blood would make of you if you ever once stopped holding it back. Looking at it is looking at the floor of yourself, and something in you flinches from the drop.',
    },
    {
      kind: 'multiattack',
      name: 'Murderous Frenzy',
      attacks: 2,
      description:
        'It fights the way you would if you let go of all of it at once — no economy, no guard kept in reserve, both clawed hands working in a blur that does not tire because exhaustion is a thing the living body fears and this is only the part of you that never did.',
    },
    {
      kind: 'attack',
      name: "Slayer's Claws",
      attackBonus: 15,
      damage: '2d10+9',
      damageType: 'slashing',
      reach: 5,
      description:
        'The claws are your reach and your timing exactly, because they are yours — every opening it takes is one you would have taken, every feint one you have thrown, so that fighting it is fighting a mirror that has stopped pretending to be polite about the thing you both are underneath.',
    },
  ],
  flavorText:
    "You are a Child of the Slain God, and the inheritance has never been a metaphor. Somewhere under every life you have lived there is the Slayer — the god's own murder-shape, waiting in the blood for the one moment you are tired enough or frightened enough or wronged enough to let it have the wheel. You have spent a hundred deaths keeping that door shut. Here, at the foot of his Throne, with his rendered essence steaming in pools to every side, the door does not need you to open it. The taint simply answers the pools the way water answers water, and stands up out of your own shadow, and turns around, and you are looking at exactly what you would be if you ever lost. It does not speak. It has never needed to. It has only ever wanted the one thing, and it has always, patiently, been willing to be you to get it.",
});
