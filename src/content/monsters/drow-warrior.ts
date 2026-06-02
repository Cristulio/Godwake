import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drow Warrior — Ust Natha house-guard, lethal first strike. The high DEX
 * and the brief's "advantage on first attack each combat" intent are baked
 * into flavor only; the engine has no per-monster opening-strike modifier
 * shape, so the warrior reads as a hard-hitting, high-AC duelist in play
 * (per [[feedback-gameplay-over-5e]] — no new mechanics this PR).
 */
export const DROW_WARRIOR: Monster = MonsterSchema.parse({
  id: 'drow-warrior',
  name: 'Drow Warrior',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 17,
  maxHp: 62,
  speed: 30,
  abilityScores: { str: 12, dex: 18, con: 12, int: 11, wis: 11, cha: 12 },
  passivePerception: 12,
  actions: [
    {
      kind: 'attack',
      name: 'Mithral Scimitar',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'slashing',
      reach: 5,
      description:
        "The warrior steps in once and the scimitar is already past your guard — Ust Natha's house-guards drill the opening cut for ten years before they wear the cloak. The blade tastes you and is gone again.",
    },
  ],
  resistances: ['poison'],
  flavorText:
    "Spider-silk cloak, mithral-link half-plate, a slender scimitar at the hip and a hand-crossbow holstered cross-draw. House Eilservs's guards wear the same kit. So do House Despana's. So do six other Matron Mothers' guards. The cloaks differ only in the colour of the trim — and the trim is decided each month by politics you do not have time to learn.",
});
