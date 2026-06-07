import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Mirror of Pride — Chapter 11 mid controller, the guardian-manifestation of the
 * Trial of Pride. The pit asks whether you will keep a worthless trinket because it
 * flatters you, or give it up — and your vanity rises as a standing sheet of black
 * glass that shows you only ever at your best, and arms that reflection against you.
 * A `summon` core: it calls Slayer-Shades out of its own surface (count 1, maxActive
 * 2, cooldown 3) — your own murderous nature, dressed as the better-than-them self
 * pride insists you are — and presses from reach with a shard of the mirror while
 * the copies keep you turning. Break the glass, or fight your own reflection forever.
 */
export const MIRROR_OF_PRIDE: Monster = MonsterSchema.parse({
  id: 'mirror-of-pride',
  name: 'Mirror of Pride',
  cr: '12',
  size: 'large',
  creatureType: 'fiend (sin-manifestation)',
  ac: 20,
  maxHp: 212,
  speed: 20,
  abilityScores: { str: 16, dex: 17, con: 18, int: 16, wis: 15, cha: 20 },
  passivePerception: 14,
  resistances: ['psychic', 'force', 'necrotic'],
  actions: [
    {
      kind: 'summon',
      name: 'Better Than They Are',
      summonDefId: 'slayer-shade',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'The black glass ripples and hands itself out a version of you — taller, surer, already winning — and the figure steps off the surface and turns on the original with the contempt of a thing that has never once doubted it is the better self.',
    },
    {
      kind: 'attack',
      name: 'Shard of the Flattering Glass',
      attackBonus: 14,
      damage: '2d10+8',
      damageType: 'force',
      reach: 10,
      description:
        'A long blade of the mirror peels away and crosses the room without anyone holding it, carrying on its edge the version of you that never makes mistakes, and where it cuts you it shows you, for one cold instant, how much smaller the truth of you is than the picture.',
    },
  ],
  flavorText:
    "The second of the five trials is Pride, and its question wears a small face: there is a trinket here worth nothing, except that holding it tells you that you are owed, that you are exceptional, that the rules other souls climb under do not finally apply to you. Keep it and the pit has its hook. The mirror is the vanity made guardian — a standing sheet of glass that has never once shown you a flaw, and reaches into you for the thing that wants to believe it. It does not fight you so much as introduce you to the self you would rather be, and set that self on you, again and again, until you understand that the figure in the glass was only ever your murder wearing a flattering light. Shatter it, and you have set the trinket down.",
});
