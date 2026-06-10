import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Marilith of the Throne — Chapter 14 ELITE, the last and greatest of the
 * fiendish wardens posted on the dead god's seat. Six arms, six blades, and the
 * tactician's mind the lesser abishai lack. A `paralyze` opener (it pins you in
 * its coils) into a three-strike `multiattack` storm, with an abyssal blade at
 * reach. The deadliest thing in the hall short of Maevra herself.
 */
export const MARILITH_WARDEN: Monster = MonsterSchema.parse({
  id: 'marilith-warden',
  name: 'Marilith of the Throne',
  cr: '16',
  size: 'large',
  creatureType: 'fiend (demon)',
  ac: 22,
  maxHp: 330,
  speed: 40,
  abilityScores: { str: 20, dex: 19, con: 20, int: 18, wis: 16, cha: 20 },
  passivePerception: 17,
  resistances: ['fire', 'cold', 'lightning', 'poison'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Coils of the Pit',
      saveDC: 21,
      saveAbility: 'str',
      durationRounds: 2,
      description:
        'The lower length of it is a single great serpent-coil, and it has you wrapped before you have finished reading the upper half for blades — the coil drawing tight in slow, enormous patience, your arms pinned, your feet off the floor, the six swords held back almost lazily while it decides where to begin.',
    },
    {
      kind: 'multiattack',
      name: 'Six-Bladed Storm',
      attacks: 3,
      description:
        'All six arms come at once, and there is no reading it — the blades arrive from six lines of attack a single body should not be able to hold at the same time, each cut covering the retreat from the last, a whole fencing-school fielded by one demon that has had ten thousand years to drill it.',
    },
    {
      kind: 'attack',
      name: 'Abyssal Blade',
      attackBonus: 16,
      damage: '2d12+10',
      damageType: 'slashing',
      reach: 10,
      description:
        'Any one of the six is a long demon-forged blade that has cut its way up from the bottom of the Abyss and across every plane that tried to stop it. Where it lands it does not only part the flesh; it parts your confidence that the next five will be any easier to read.',
    },
  ],
  flavorText:
    "When the lower planes posted a guard on the empty Throne, they did not trust it only to clerks. They sent a captain. The marilith has held the inner approach since before the God of Murder was a corpse, and the long watch has not dulled it the way it dulled the abishai — a marilith does not get bored, it gets ready. It has fought every kind of claimant the centuries sent up the hall and folded all of them into the floor, and it regards you the way a duelist of impossible seniority regards one more challenger: with a flicker of something almost like courtesy, six blades already lifting, the serpent-coil already unhurriedly closing the distance you thought you had. Maevra does not need to defend the Throne while this thing still stands on its steps.",
});
