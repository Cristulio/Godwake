import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Melissan — Amelyssan the Blackhearted, the true final villain of the game and
 * the apex of the bestiary. Once Bhaal's highest priestess, she engineered the
 * whole Bhaalspawn crisis to harvest the Children's divine essence and seize the
 * empty Throne of Bhaal, to rise as the new God of Murder. At the Throne she
 * draws on the pools of rendered essence and ascends as she is worn down.
 *
 * Apex kit, scaled clearly above every prior boss (CR 18, ~440 HP, AC 23 — the
 * biggest statblock in the game): a round-1 `paralyze` opener (the murder that
 * stops the heart mid-beat), a `summon` that calls Blood-Fiends out of the pools
 * to refill the hall, a three-strike `multiattack`, and a god-scaled scepter at
 * reach. `battle-rage` at half HP reads as the ascension itself — worn past the
 * mortal half of her, she stops fighting like a priestess and starts fighting
 * like the thing she is becoming.
 */
export const MELISSAN: Monster = MonsterSchema.parse({
  id: 'melissan',
  name: 'Melissan',
  cr: '18',
  size: 'medium',
  creatureType: 'fiend (ascending demigod)',
  ac: 23,
  maxHp: 440,
  speed: 30,
  abilityScores: { str: 20, dex: 20, con: 22, int: 20, wis: 22, cha: 24 },
  passivePerception: 19,
  resistances: ['necrotic', 'psychic', 'fire', 'cold', 'radiant'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'The Murder That Stops the Heart',
      saveDC: 21,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'She lifts one open hand toward you, almost gently, the way she must once have lifted it over a thousand offerings on a thousand altars, and speaks the oldest of the dead god\'s portfolio into the muscle of you — not a wound, a verdict — and your heart simply holds, mid-beat, while she watches it with a priestess\'s mild, professional interest to see whether it will be permitted to start again.',
    },
    {
      kind: 'summon',
      name: 'Draw on the Pools',
      summonDefId: 'blood-fiend',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'She trails her fingers in the nearest pool of essence without looking down, the way a queen reaches for a thing she has never once had to find, and the murder comes up the wrong way to her summons — a blood-fiend hauling itself out of the surface at her shoulder, already four-armed, already reaching, hers for as long as she keeps her hand in the god she is draining.',
    },
    {
      kind: 'multiattack',
      name: 'The Ascending Hand',
      attacks: 3,
      description:
        'She fights with more of herself than a body should hold, because she is no longer staying inside the one she was born to — the scepter falling in three places at once, each blow heavier than the body swinging it could account for, the divinity she is stealing already leaking out of her in the form of a reach and a speed that were never hers to have.',
    },
    {
      kind: 'attack',
      name: 'Scepter of the Unspoken God',
      attackBonus: 15,
      damage: '3d10+10',
      damageType: 'necrotic',
      reach: 10,
      description:
        'The scepter is the harvest made into a tool — every drop of essence she has gathered fused into a single length of black regalia, and where it touches you it presses the dead god\'s whole portfolio through the contact at once: that everything dies, that she will be the one who decides it, and that your death in particular is a foregone administrative matter she is merely seeing to in person.',
    },
  ],
  flavorText:
    "She was the kindest face of the whole long nightmare. Through every chapter of the crisis there was a woman called Melissan at the edge of the worst of it — counselling, sheltering, gathering the orphaned Children of Bhaal under her wing and weeping with them over what the inheritance had done — and you trusted her, because she was the one person in all of it who seemed to want nothing from you but your safety. That was the masterwork. Amelyssan the Blackhearted was Bhaal's highest priestess before he died, and she did not mourn her god so much as inventory him: a divinity rendered down into a hundred-odd mortal vessels and scattered across the world to be reaped at leisure. The whole crisis was her harvest. Every death you died was a measure taken. And now, at the foot of the empty Throne, with the last of the essence steaming in pools around her and the kind mask finally set aside, she turns to you with no anger at all — only the serene, terrible patience of a priestess at the final rite. \"You were always the largest of the offerings,\" she says, and the Throne behind her begins, faintly, to fill. \"Thank you for carrying yourself all this way to the altar. Be still now. There is a god to make of all of you, and I have waited so very long to be Him.\"",
});
