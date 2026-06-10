import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drow Crossbowman — Zhal Vasha skirmisher. Ranged hand-crossbow with the
 * sleep-venom the drow notoriously cure on their bolt-tips. Per the brief
 * (and [[feedback-gameplay-over-5e]]) the poison ships as flat extra
 * 'poison' damage on the attack, not as a CON save — the existing engine
 * has no on-hit save hook, and a save-or-sleep on a CR-3 mob would feel
 * cheap in play.
 */
export const DROW_CROSSBOWMAN: Monster = MonsterSchema.parse({
  id: 'drow-crossbowman',
  name: 'Drow Crossbowman',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 16,
  maxHp: 64,
  speed: 30,
  abilityScores: { str: 10, dex: 17, con: 12, int: 11, wis: 12, cha: 11 },
  passivePerception: 13,
  actions: [
    {
      kind: 'attack',
      name: 'Venomed Bolt',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'poison',
      range: [80, 320],
      description:
        "The bolt is already in the air before the click of the trigger reaches you. The tip is wet with the grey-green resin the drow cure for a season under the Deepdark stones. Where it lands, the skin around the wound goes cold first.",
    },
  ],
  resistances: ['poison'],
  flavorText:
    "Light leathers, a hand-crossbow held low, a quiver of bolts whose tips have been dipped and dried and re-dipped. Drow scouts do not aim to kill on the first shot — they aim to slow you, so the warriors behind them can choose at leisure.",
});
