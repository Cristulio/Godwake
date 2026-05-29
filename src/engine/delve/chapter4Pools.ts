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
      "A driderling pair rounds the corner abreast and stops dead — they have been hunting in formation since they hatched and they have just found something larger than the usual quarry. They confer with their forelegs, briefly. Then they come.",
    monsters: [{ defId: 'driderling', count: 2, displayPrefix: 'Driderling' }],
    xpReward: 290,
    goldReward: 20,
  },
  {
    title: "The Crossbow at the Turn",
    flavorText:
      "A drow crossbowman has set the corner since the last bell, mithral catching the faerzress. He has not yet decided whether to fire — he is reading your stride for slave-house or freelance.",
    monsters: [{ defId: 'drow-crossbowman', count: 1 }],
    xpReward: 290,
    goldReward: 28,
  },
  {
    title: 'A Brood and a Bowman',
    flavorText:
      "A drow crossbowman is leaning on a niche-pillar while two driderlings work the floor at his boots. He gives them the corridor-warmth they want; they give him the kill.",
    monsters: [
      { defId: 'drow-crossbowman', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 330,
    goldReward: 32,
  },
  {
    title: 'The Web-Mouth',
    flavorText:
      "A cavern hunting-spider drops from a ceiling-slit and lands square in the corridor, big as a war-hound. A jet of grey silk hits your legs before you have finished drawing — and then both sets of fangs come at once.",
    monsters: [{ defId: 'cavern-hunting-spider', count: 1 }],
    xpReward: 340,
    goldReward: 22,
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
      "The corridor opens out into a side-cavern strung floor-to-ceiling with silk. A driderling drops from the rafters; a larger one crawls up out of a hole in the floor between you. Lolth's children hunt best in matched pairs.",
    monsters: [{ defId: 'driderling', count: 2, displayPrefix: 'Driderling' }],
    xpReward: 460,
    goldReward: 26,
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
      "A drow warrior steps into the corridor with a driderling at his heel — bred from the egg-sac he tends in the lower kennels. He whistles once and the spider-thing fans out.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 520,
    goldReward: 36,
  },
  {
    title: 'A Mind-Touched Drow',
    flavorText:
      "A drow warrior stands in the corridor with the slack-jaw of a thing that has been emptied and refilled. Behind him, half in the wall, the grey-skinned thing that did the refilling has not yet looked away from your face.",
    monsters: [
      { defId: 'mind-flayer-fragment', count: 1 },
      { defId: 'drow-warrior', count: 1 },
    ],
    xpReward: 620,
    goldReward: 48,
  },
  {
    title: 'Two Warriors at the Arch',
    flavorText:
      "Two drow warriors of the same House at the archway, scimitars drawn at parade-rest, mithral catching the faerzress. Their hand-sign agrees that you are not a guest.",
    monsters: [{ defId: 'drow-warrior', count: 2, displayPrefix: 'Warrior' }],
    xpReward: 580,
    goldReward: 40,
  },
  {
    title: 'The Web and the Brood',
    flavorText:
      "A cavern hunting-spider has strung the gallery ankle-high and a driderling waits in the silk beside it. The big spider webs; the small one feeds on whatever stops moving.",
    monsters: [
      { defId: 'cavern-hunting-spider', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 580,
    goldReward: 30,
  },
  {
    title: 'The Priestess and Her Blade',
    flavorText:
      "A drow war-priestess walks a step behind a House-warrior, the spider-sigil already in her hand. Every wound you open on the warrior closes around a skin of black webbing. Lolth is not finished with him.",
    monsters: [
      { defId: 'drow-war-priestess', count: 1 },
      { defId: 'drow-warrior', count: 1 },
    ],
    xpReward: 600,
    goldReward: 44,
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
      "A drow warrior and a driderling — the standard temple-watch composition for this stretch of corridor. They are not the ones who patrol it. They are the ones who replace the patrol when the patrol fails to return.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 600,
    goldReward: 42,
  },
  {
    title: "The Drider's Brood",
    flavorText:
      "A drider stands in the centre of the next chamber, and one of its own brood-driderlings clings to the wall at its foreleg. The drider is not pleased to be acknowledged as a mother. She is also not denying it.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 660,
    goldReward: 42,
  },
  {
    title: 'The Twin Crossbowmen',
    flavorText:
      "Two drow crossbowmen at opposite ends of a long gallery, bolts already nocked, neither facing the other. They have done this corridor before. Their volley is already plotted.",
    monsters: [{ defId: 'drow-crossbowman', count: 2, displayPrefix: 'Crossbowman' }],
    xpReward: 720,
    goldReward: 54,
  },
  {
    title: 'A Web in the Audience-Hall',
    flavorText:
      "A drider perched in the corner of a low-ceilinged audience-hall, a drow warrior at the door — the warrior to drive prey, the drider to bind and feed. The web is already strung, ankle to ankle.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'drow-warrior', count: 1 },
    ],
    xpReward: 760,
    goldReward: 56,
  },
  {
    title: 'The Priestess and Her Bow',
    flavorText:
      "A drow war-priestess holds the centre of the gallery with a crossbowman at her flank. She heals and shields him faster than the bolts you take in return; the math only resolves when she falls.",
    monsters: [
      { defId: 'drow-war-priestess', count: 1 },
      { defId: 'drow-crossbowman', count: 1 },
    ],
    xpReward: 700,
    goldReward: 50,
  },
  {
    title: 'The Stalker in the Gallery',
    flavorText:
      "A cavern hunting-spider works one end of a long gallery and a House-warrior the other. The spider webs you to the floor; the warrior walks up at his leisure to finish what the silk started.",
    monsters: [
      { defId: 'cavern-hunting-spider', count: 1 },
      { defId: 'drow-warrior', count: 1 },
    ],
    xpReward: 720,
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
      "A drow warrior at the temple gate, scimitar drawn, mithral catching the bone-light. Behind him, a single drider that the priestesses keep on a silver leash that is not, on closer look, actually attached to anything.",
    monsters: [
      { defId: 'drow-warrior', count: 1 },
      { defId: 'drider', count: 1 },
    ],
    xpReward: 920,
    goldReward: 64,
  },
  {
    title: 'The Crossfire',
    flavorText:
      "A drider in the rafters, a crossbowman with a bolt already wet and nocked at floor-level — the standard ambush composition for the corridor leading to the inner temple. They have done this before. The corridor has fresh bolt-scars on the walls from the last time.",
    monsters: [
      { defId: 'drider', count: 1 },
      { defId: 'drow-crossbowman', count: 1 },
    ],
    xpReward: 940,
    goldReward: 68,
  },
  {
    title: 'The Fragment Among the Brood',
    flavorText:
      "A mind flayer fragment stands at the head of a side-chamber, a single driderling arranged below it in the obscene attentive crouch of a thing being studied. It looks up at you. The fragment does not need to.",
    monsters: [
      { defId: 'mind-flayer-fragment', count: 1 },
      { defId: 'driderling', count: 1 },
    ],
    xpReward: 920,
    goldReward: 60,
  },
  {
    title: "The House-Watch in Full",
    flavorText:
      "A drow crossbowman and a drider at the audience-arch — the lean watch the Matron leaves on this corridor between full patrols. The crossbowman has been polishing his bolts for hours.",
    monsters: [
      { defId: 'drow-crossbowman', count: 1 },
      { defId: 'drider', count: 1 },
    ],
    xpReward: 960,
    goldReward: 72,
  },
  {
    title: 'The Brood-Warren',
    flavorText:
      "The corridor opens into a low warren and the smell hits first. A Lolth-blessed broodmother fills the far wall, her abdomen the size of a wine-tun and never still. She convulses, and a clutch of half-formed driderlings pours out already running. There will always be more until she stops.",
    monsters: [{ defId: 'spider-broodmother', count: 1 }],
    xpReward: 1000,
    goldReward: 76,
  },
  {
    title: 'The Priestess and Her Drider',
    flavorText:
      "A drow war-priestess at the temple gate with a drider coiled above the arch. The priestess mends and shields the spider-thing between strikes; the drider does not need much help. Drop the priestess, or the drider never tires.",
    monsters: [
      { defId: 'drow-war-priestess', count: 1 },
      { defId: 'drider', count: 1 },
    ],
    xpReward: 980,
    goldReward: 70,
  },
];
