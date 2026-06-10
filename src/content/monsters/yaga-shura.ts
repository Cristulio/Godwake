import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hargan-Vor — Chapter 12 boss, the fire-giant lord of the Five and the hand
 * behind the siege of Karthen. Faithful to the Throne of the Slain God: his heart was
 * cut out in a ritual and hidden away, and while it beats elsewhere he cannot
 * truly be killed — wounds that would fell a giant only stoke him hotter.
 *
 * Boss-framework kit (multi-action, Ch9+):
 *  - `gate` (HEART-RITE): while a beating ember of his cut-out heart survives on
 *    the field he takes almost nothing — wounds glance off the man who cannot
 *    feel them. The `summon` surfaces that ember (the `heart-ember` weak-point, a
 *    deliberate 1-2 turn objective — tanky, not a damage threat) on round one;
 *    destroy it and he becomes mortal for the rest of the fight.
 *  - `actionsPerTurn: 2` — he fights with the weight of the whole siege, twice a
 *    turn.
 *  - A telegraphed `attack` (the Hurled Pyre-Stone): he tears a wagon of burning
 *    wall off the rubble and winds up to throw it, giving you one turn to race,
 *    brace, or hard-control him to drop the stone uncast.
 *  - A half-HP `phase` (The Heart Stoked) over the legacy `battle-rage`: past the
 *    bloodied mark the missing heart means the pain has nowhere to land — he
 *    hits harder (battle-rage) for caring less (the phase drops his guard and
 *    turns him incandescent).
 * The Greatsword of the Burning March remains his melee profile and flavor.
 */
export const YAGA_SHURA: Monster = MonsterSchema.parse({
  id: 'yaga-shura',
  name: 'Hargan-Vor',
  cr: '16',
  size: 'huge',
  creatureType: 'giant (bhaalspawn)',
  ac: 22,
  maxHp: 390,
  speed: 40,
  abilityScores: { str: 27, dex: 13, con: 23, int: 14, wis: 17, cha: 18 },
  passivePerception: 17,
  resistances: ['fire', 'bludgeoning', 'slashing'],
  immunities: ['fire'],
  bossMechanic: 'battle-rage',
  actionsPerTurn: 2,
  gate: {
    whileAddAlive: 'heart-ember',
    damageTakenPct: 0.1,
    wardLabel: 'destroy the beating heart',
  },
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Heart Stoked',
      enterText:
        'You open him to the bone and he laughs — there is no heart in the wound to mind it. The fire under his skin roars up white, his guard goes to nothing, and he comes on faster, hotter, gladder: a thing being hurt and feeling only the heat of it.',
      acDelta: -2,
      transform: true,
    },
  ],
  actions: [
    {
      kind: 'summon',
      name: 'The Heart Laid Bare',
      summonDefId: 'heart-ember',
      count: 1,
      maxActive: 1,
      once: true,
      minRound: 1,
      description:
        "Far off, behind a hundred leagues of stone, his cut-out heart goes on beating — and in the heat of the fight the rite that hides it slips, so that a single ember of it surfaces here, hovering and red at the edge of him: the wound that is not in his chest made briefly, mortally visible. While it burns, the blows you land on the giant find nothing to land in. Put the ember out and the man becomes killable for the first time.",
    },
    {
      kind: 'attack',
      name: 'Hurled Pyre-Stone',
      attackBonus: 15,
      damage: '3d12+10',
      damageType: 'bludgeoning',
      range: [60, 240],
      telegraph: {
        chargeText:
          "He turns half from you and sets both hands under a wagon-sized block of Karthen's own wall, and it lights orange-white in his grip — he is winding back to throw the city at you. You have this one breath to close, to brace, or to put him down before it leaves his hands.",
      },
      description:
        "He pulls a wagon-sized block of Karthen's own wall off the rubble, sets it alight in his bare hands, and throws it the length of the burning street — the city he came to unmake coming down on you in a single falling sun.",
    },
    {
      kind: 'attack',
      name: 'Greatsword of the Burning March',
      attackBonus: 15,
      damage: '2d12+10',
      damageType: 'fire',
      reach: 15,
      description:
        'The blade is taller than a man and lit the orange-white of a forge at the pour. Where it lands it does not cut so much as render — flesh, plate and the stone behind you all going at once in a wash of heat that smells of the whole burning city.',
    },
  ],
  flavorText:
    "After Velnaris, after the long climb back into the light, the dead god's blood pulls you on — and it pulls you here, to a city on fire. Karthen is ringed in red iron and packed with refugee Slainkin, and the hand around its throat belongs to Hargan-Vor, one of the Five, the fire-giant lord who took the dead god's purpose for his own. Maevra sent you in past the line, through the burning, to break the siege — and the breaking ends here, with the giant himself, at the heart of the fire he made. But there is a trick in him you will learn the hard way: his heart was cut from his chest in a ritual and carried away, and while it beats somewhere far from here he does not feel the wounds that should kill him. Hurt him, and he only burns hotter. \"You came up out of the dark for THIS?\" the giant says, almost delighted, the greatsword already rising. \"Then burn with the rest of them, little godling. I cannot even feel you.\"",
});
