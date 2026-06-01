import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Corrupted Suldanessellar War-Priest — Chapter 10 mid. A priest of Rillifane
 * Rallathil turned to the captor's rite. It mends its fellow corrupted with a
 * `sustain` heal, hollows the player with a `weakened` debuff (a hymn that
 * unmakes), and clubs with a censer-mace. The dangerous kind of fallen: a
 * support that keeps the city's dead defenders standing past when they should.
 */
export const SULDANESSELLAR_WARPRIEST: Monster = MonsterSchema.parse({
  id: 'suldanessellar-warpriest',
  name: 'Corrupted War-Priest',
  cr: '11',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 18,
  maxHp: 134,
  speed: 30,
  abilityScores: { str: 14, dex: 13, con: 16, int: 14, wis: 19, cha: 16 },
  passivePerception: 17,
  resistances: ['necrotic', 'radiant'],
  actions: [
    {
      kind: 'sustain',
      name: 'Rite of the False Grove',
      target: 'ally',
      heal: '3d8+4',
      cooldownRounds: 2,
      description:
        'It lifts a censer that smokes with the wrong incense and sings a mending over a fallen defender — the old healing-rite of Rillifane run backward, knitting the body while leaving out whatever it was the body was for, so the thing rises again emptier than before but no less able to cut you.',
    },
    {
      kind: 'debuff',
      name: 'Hymn of Unmaking',
      condition: 'weakened',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 3,
      amount: 4,
      description:
        'The hymn is the one sung over the elven dead to ease them out of the world, and turned on the living it does the same work too soon — your arms go distant, your strength leaks off toward whatever country the song is meant to send souls to, and your blows land like a thing already half-gone.',
    },
    {
      kind: 'attack',
      name: 'Censer-Mace',
      attackBonus: 11,
      damage: '2d8+6',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'The heavy censer comes round on its chain like a flail, trailing the sick smoke of the rite, and where it strikes it leaves a smear of grey ash that smells of a funeral held too early.',
    },
  ],
  flavorText:
    "Rillifane Rallathil's priests tended the Tree of Life and the souls of the elves who served it, and they were healers before they were anything else. This one heals still — that is the obscenity of it. The captor did not need to teach it cruelty, only to turn the mending it already knew toward keeping his own ranks on their feet, so the priest moves through the burning city with its censer swinging, raising the city's own dead defenders to die again, singing the funeral hymn over you as though you were merely the next to ease across.",
});
