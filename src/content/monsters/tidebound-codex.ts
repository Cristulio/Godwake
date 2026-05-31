import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Tidebound Codex — Ch7 ELITE summoner. The flooded guardian-construct of the
 * Archive: a hulking thing of waterlogged tomes and brass clasps, bound at the
 * threshold of the lowest stacks to keep the forbidden books from ever leaving.
 * Demonstrates `summon` at the Ch7 band — it bursts its own swollen spines and
 * spits loose Page-Wraiths off itself (maxActive 1, cooldown 4) while crushing
 * from reach with a chained folio. A war of attrition: close the gap and fell
 * the codex, or be read to pieces by the flock it never stops shedding.
 */
export const TIDEBOUND_CODEX: Monster = MonsterSchema.parse({
  id: 'tidebound-codex',
  name: 'Tidebound Codex',
  cr: '10',
  size: 'large',
  creatureType: 'construct',
  ac: 19,
  maxHp: 170,
  speed: 20,
  abilityScores: { str: 20, dex: 9, con: 19, int: 10, wis: 14, cha: 8 },
  passivePerception: 12,
  resistances: ['bludgeoning', 'cold', 'poison'],
  actions: [
    {
      kind: 'summon',
      name: 'Shed the Loose Leaves',
      summonDefId: 'page-wraith',
      count: 1,
      maxActive: 1,
      cooldownRounds: 4,
      description:
        'A seam in its great waterlogged bulk splits with a sound like a spine breaking, and a ream of pages peels off it into the flood — already drifting, already edge-on, already hungry for the warm thing it has been set to keep out.',
    },
    {
      kind: 'attack',
      name: 'Chained Folio',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'It brings round a single tome the size of a door on the length of chain that bound it to the wall, and the weight of forty fathoms of soaked vellum lands the way a sunken bell lands — not fast, but with the whole drowned dark behind it.',
    },
  ],
  flavorText:
    "Bound at the door of the forbidden stacks before the water ever came, it was built — not born — for one task: to let nothing out. The drowning did not free it; it only made it heavier. Where it has hands it has clasps; where it has a face it has a great brass lock that reads off, in a script no living eye should parse, the tally of what is still shelved and must stay shelved. It has guarded the deepest knowing of the one who drowned this place since before the lights went out, and it does not know, and would not care, that the lights are never coming back.",
});
