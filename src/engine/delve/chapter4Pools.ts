import type { RoomMonster } from '../../types/delve';

/**
 * Ust Natha / Chapter 4 encounter pools. Mirrors chapter3Pools — pooled
 * compositions for each combat slot in the Ust Natha side-delve. Rewards
 * scale roughly +50% over Ch3 to match the tougher CR band (warmups CR 2-3,
 * elites CR 4-5, boss CR 6).
 *
 * Slot ordering (8-room side-delve):
 *   warmup (R1) → shrine (R2) → early-mid (R3) → rest (R4) → mid (R5) →
 *   shrine (R6) → elite (R7) → Matron Mother (R8, fixed).
 */

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  xpReward: number;
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'The Tunnel-Watcher',
    flavorText:
      "A drow scout has been waiting at the mouth of the side-tunnel since the faerzress shifted three bells ago. He sees you the moment you crest the rise. He does not lift the crossbow yet — he is checking your house-trim first, to see whose problem you are.",
    monsters: [{ defId: 'drow-crossbowman', count: 1 }],
    xpReward: 300,
    goldReward: 30,
  },
  {
    title: 'The Lone House-Guard',
    flavorText:
      "A drow warrior in the mithral of one of the lesser houses steps out from a wall-niche, scimitar already cleared and held low. He greets you in formal Drow Sign. The greeting is also a kill order.",
    monsters: [{ defId: 'drow-warrior', count: 1 }],
    xpReward: 310,
    goldReward: 34,
  },
  {
    title: 'A Brood Underfoot',
    flavorText:
      "The corridor floor is webbed at ankle height and the web is moving. Two driderlings come out of the wall-cracks, fangs already in front of them, eyes catching the faerzress like dropped beads.",
    monsters: [{ defId: 'driderling', count: 2, displayPrefix: 'Driderling' }],
    xpReward: 320,
    goldReward: 22,
  },
  {
    title: 'The Cull-Brood',
    flavorText:
      "Three driderlings round the corner abreast and stop dead — they have been hunting in formation since they hatched and they have just found something larger than the usual quarry. They confer with their forelegs, briefly. Then they come.",
    monsters: [{ defId: 'driderling', count: 3, displayPrefix: 'Driderling' }],
    xpReward: 340,
    goldReward: 24,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'A Patrol of Two Houses',
    flavorText:
      "A drow warrior and a crossbowman from the same lesser house turn the corner together, the warrior a half-step ahead. The bowman already has a bolt on the string. The warrior has not yet drawn — that is the warning. He thinks he will not need to.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'drow-crossbowman', count: 1 },
    ],
    xpReward: 560,
    goldReward: 44,
  },
  {
    title: 'The Web-Mouth',
    flavorText:
      "The corridor opens out into a side-cavern strung floor-to-ceiling with silk. A driderling pair drops from the rafters in unison; a third crawls up out of a hole in the floor between you. Lolth's children are most dangerous in threes.",
    monsters: [{ defId: 'driderling', count: 3, displayPrefix: 'Driderling' }],
    xpReward: 540,
    goldReward: 30,
  },
  {
    title: 'The Crossbow Pair',
    flavorText:
      "Two crossbowmen of the same kit — same house-trim, same quiver-cut — at opposite sides of the corridor. The bolt-tips are wet. They have already nocked. They are choosing which of you fires first by hand-sign.",
    monsters: [{ defId: 'drow-crossbowman', count: 2, displayPrefix: 'Crossbowman' }],
    xpReward: 580,
    goldReward: 46,
  },
  {
    title: 'The Brood and Their Handler',
    flavorText:
      "A drow warrior steps into the corridor with two driderlings at his heels — they have been bred from the same egg-sac he tends in the lower kennels. He whistles once and they fan out.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'driderling', count: 2, displayPrefix: 'Driderling' },
    ],
    xpReward: 600,
    goldReward: 42,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Lone Drider in the Rafters',
    flavorText:
      "A drider drops from a ceiling-web slit and lands on the corridor floor in the obscene crouch-stance Lolth-touched things adopt. The drow face above the spider's body is still wearing a priestess's tabard, though the tabard has not been clean in some years.",
    monsters: [{ defId: 'drider', count: 1 }],
    xpReward: 680,
    goldReward: 52,
  },
  {
    title: 'A Fragment from the Higher Tunnels',
    flavorText:
      "Something the colour of wet grey clay unfolds out of an alcove. The face is a mouth surrounded by tentacles, and behind the mouth there is a brightness you do not have a name for. It does not bother with hand-sign.",
    monsters: [{ defId: 'mind-flayer-fragment', count: 1 }],
    xpReward: 720,
    goldReward: 60,
  },
  {
    title: 'The Spider-Watch',
    flavorText:
      "A drow warrior, a drow crossbowman, and a brace of driderlings — the standard temple-watch composition for this stretch of corridor. They are not the ones who patrol it. They are the ones who replace the patrol when the patrol fails to return.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'driderling', count: 2, displayPrefix: 'Driderling' },
    ],
    xpReward: 700,
    goldReward: 50,
  },
  {
    title: "The Drider's Brood",
    flavorText:
      "A drider stands in the centre of the next chamber, and two of its own brood-driderlings flank it on the floor at its forelegs. The drider is not pleased to be acknowledged as their mother. She is also not denying it.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'driderling', count: 2, displayPrefix: 'Driderling' },
    ],
    xpReward: 740,
    goldReward: 48,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Drider and the Bowman',
    flavorText:
      "A drider has woven a perch in the corner of the temple antechamber and a drow crossbowman has set up below it with the easy stance of someone who has been told he will not be needed for long. He is also wrong.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'drow-crossbowman', count: 1 },
    ],
    xpReward: 960,
    goldReward: 70,
  },
  {
    title: 'The Fragment and Its Kept Drow',
    flavorText:
      "A mind flayer fragment has a drow warrior at heel, glassy-eyed, the scimitar in his hand held loose like a leash he has forgotten he is wearing. The fragment is not breathing. The drow is breathing too quickly.",
    monsters: [
      { defId: 'mind-flayer-fragment', count: 1 },
      { defId: 'drow-warrior', count: 1 },
    ],
    xpReward: 1000,
    goldReward: 74,
  },
  {
    title: 'The Temple-Watch Pair',
    flavorText:
      "Two drow warriors of the same House at the temple gate, scimitars drawn, mithral catching the bone-light. Between them, a single drider that the priestesses keep on a silver leash that is not, on closer look, actually attached to anything.",
    monsters: [
      { defId: 'drow-warrior', count: 2, displayPrefix: 'Warrior' },
      { defId: 'drider', count: 1 },
    ],
    xpReward: 1040,
    goldReward: 76,
  },
  {
    title: 'The Crossfire',
    flavorText:
      "A drider in the rafters, two crossbowmen with bolts already wet and nocked at floor-level — the standard ambush composition for the corridor leading to the inner temple. They have done this before. The corridor has fresh bolt-scars on the walls from the last time.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'drow-crossbowman', count: 2, displayPrefix: 'Crossbowman' },
    ],
    xpReward: 1080,
    goldReward: 80,
  },
];
