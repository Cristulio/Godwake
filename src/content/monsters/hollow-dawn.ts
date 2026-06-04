import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Aurelach, the Hollow Dawn — Chapter 5 boss, the entity behind the death-and-
 * rebirth cycle the soul has been caught in. A god that died and would not let
 * itself, or anyone, stay dead. The hardest stat block of the lower delve.
 *
 * Boss-framework kit (illusion / deception, layered on the held opener + blade):
 *   - Round 1: `paralyze` — the divine command to be still (WIS DC 17).
 *   - A `summon` casts a SECOND dawn: a hollow seraph wearing its shape (reuses
 *     the chapter's `hollow-seraph`) — a decoy the player must cut down to be
 *     sure which dawn bleeds.
 *   - A `debuff` — the false mornings crowd the eye, so every strike is half-made
 *     against nothing (frightened: player attacks at disadvantage, WIS DC 15).
 *   - `multiattack`: two strokes of the dawn-blade it repeats.
 *   - At half HP a `phase`: the false dawns gutter out and it stops being patient
 *     (+2 damage / strike). This folds the old `battle-rage` into the new phase
 *     system at equal weight — on a multiattacker, +4 a round, exactly as before.
 *
 * Resists radiant + necrotic (it is the source of both); immune to psychic —
 * there is nothing left in it to reach. Numbers sit a clear band above the
 * Matron (CR 6): AC 18 / 128 HP / +10 to hit / 2d8+6 per strike.
 */
export const HOLLOW_DAWN: Monster = MonsterSchema.parse({
  id: 'hollow-dawn',
  name: 'Aurelach, the Hollow Dawn',
  cr: '8',
  size: 'large',
  creatureType: 'celestial (fallen god)',
  ac: 18,
  maxHp: 128,
  speed: 40,
  abilityScores: { str: 20, dex: 16, con: 20, int: 16, wis: 20, cha: 22 },
  passivePerception: 16,
  resistances: ['radiant', 'necrotic'],
  immunities: ['psychic'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Be Still, the Dawn Commands',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        "It does not roar. It says your name — the one you had before the first death, the one you do not remember — and adds, almost tenderly, \"Be still. You have run the whole cycle to reach me. Rest now.\" And the will to move goes out of you like a tide.",
    },
    {
      kind: 'summon',
      name: 'A Second Dawn',
      summonDefId: 'hollow-seraph',
      once: true,
      description:
        "It lifts the dawn-blade and, for a moment, there are two of it — and then the second steps off from the first and stands apart, a hollow seraph wearing the shape of the morning. You will have to be sure, now, which dawn is the one that can be made to bleed.",
    },
    {
      kind: 'debuff',
      name: 'The False Mornings',
      condition: 'frightened',
      saveDC: 15,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        "The light folds. There is a dawn to your left and a dawn to your right and a dawn at your back, and each one is reaching, and only one of them is real, and you cannot for your life say which — so every blow you make, you make half-believing it will land on nothing at all.",
    },
    {
      kind: 'multiattack',
      name: 'The Breaking of Morning',
      attacks: 2,
      description:
        'It brings the dawn-blade through the figure it has cut a thousand mornings into a thousand pilgrims — two strokes, unhurried, certain, each one finding the wound the last one left.',
    },
    {
      kind: 'attack',
      name: 'Blade of the First Morning',
      attackBonus: 10,
      damage: '2d8+6',
      damageType: 'radiant',
      reach: 10,
      description:
        "A sword of the first light there ever was, before there was anything for it to fall on. It is not hot. It is the oldest cold there is, and it cuts the way the end of everything will cut: completely, and without malice.",
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Last Morning',
      enterText:
        "The false dawns gutter out all at once, and what is left does not bother with them any more. \"No more mornings,\" it says, and there is something almost like relief in it. \"Only this one. Make it count.\" It stops being patient.",
      bonusDamage: 2,
    },
  ],
  flavorText:
    "It was a god of dawns — of the moment the dark breaks and the world is given another turn. Then it died, the way gods die, and could not bear the dark its death had let in, so it broke the gate between ending and beginning and wedged itself in the wound, and now nothing ends. Every soul that has ever died has died into it and been turned and sent back, you among them, more times than you have lived. It is luminous and vast and unspeakably tired, and it has been waiting for one of its turned souls to climb the whole cycle back up to its throne. It is waiting for you to make it stop. It will fight you with everything it has to keep you from doing the one thing it has prayed for since the morning it could not let go.",
});
