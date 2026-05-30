import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Hollow Gaze — Chapter 3 (the Sphere / Asylum) ELITE. The blind eye-tyrant
 * the asylum was built over: a floating aberrant orb whose great central eye was
 * long ago scarred shut, ringed by a crown of lesser stalks that see in its
 * stead. It does not look at you. It does not have to.
 *
 * Built as the control-elite of the chapter — a notch above the normal Sphere
 * monsters, below the Asylum Director boss in raw stats (74 HP / AC 16 vs the
 * Director's 78 / 15) but far broader in its toolkit. It leans on the full
 * eye-ray fantasy:
 *   - opens (round 1) with a paralyze "Stilling Ray" (the picker reserves
 *     `paralyze` for the opener, mirroring the Director),
 *   - sheds its lesser Witness-Motes mid-fight (`summon`, ordered before the
 *     debuffs so the picker actually fires it on cooldown rather than spinning
 *     forever on whichever ray the player isn't currently suffering),
 *   - then cycles three distinct debuff rays — Fear / Withering / Dazzling —
 *     each taxing a different save (wis / con / dex) so no single high stat
 *     shrugs the whole kit,
 *   - falling back to its Baleful Eye gaze-bolt when everything else is on cap
 *     or cooldown.
 * Numbers are in-band but un-sim-tuned (the full re-sim lane owns balance).
 */
export const HOLLOW_GAZE: Monster = MonsterSchema.parse({
  id: 'hollow-gaze',
  name: 'The Hollow Gaze',
  cr: '5',
  size: 'large',
  creatureType: 'aberration',
  ac: 16,
  maxHp: 74,
  speed: 0,
  abilityScores: { str: 10, dex: 14, con: 16, int: 17, wis: 18, cha: 16 },
  passivePerception: 18,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Stilling Ray',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'A spoke of grey light leaves the sealed socket — not toward you, never toward you, but you feel it pass across the back of your skull all the same. Your joints set like cooling wax.',
    },
    {
      kind: 'summon',
      name: 'Shed a Witness',
      summonDefId: 'witness-mote',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'A bead of itself detaches from the crown of stalks and drifts loose — a single small eye, blinking open as it goes, taking up the work of watching you so the Gaze need not.',
    },
    {
      kind: 'debuff',
      name: 'Fear Ray',
      condition: 'frightened',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'One of the lesser stalks fixes on you and the corridor goes very large and very far away, and some animal part of you understands it has been seen entire, down to the thing it most wants to run from.',
    },
    {
      kind: 'debuff',
      name: 'Withering Ray',
      condition: 'weakened',
      saveDC: 13,
      saveAbility: 'con',
      amount: 3,
      durationRounds: 2,
      description:
        'A dull amber spoke crosses your sword-arm and the strength runs out of it like water out of a cracked jar — the muscle still there, the will to drive it suddenly thin.',
    },
    {
      kind: 'debuff',
      name: 'Dazzling Ray',
      condition: 'blinded',
      saveDC: 13,
      saveAbility: 'dex',
      durationRounds: 2,
      description:
        'The sealed socket flushes a sudden bone-white and the whole world whites out with it — not light so much as the memory of having ever seen anything, leaving you swinging at afterimages.',
    },
    {
      kind: 'attack',
      name: 'Baleful Eye',
      attackBonus: 6,
      damage: '2d8+4',
      damageType: 'psychic',
      range: [60, 120],
      description:
        'When the rays will not come, the crown of stalks turns as one and simply looks, and the looking lands like a thrown stone behind your eyes.',
    },
  ],
  flavorText:
    "The cult of the Witnessing put out their own eyes so that it might see through the holes. They were not wrong to. It hangs in the dark of the lower Sphere, a blind orb the size of a millstone, the great eye sewn and scarred shut down its middle — and yet nothing crosses the threshold of its halls unwatched. Its faithful starved at its feet rather than be the first to look away.",
});
