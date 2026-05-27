import { QuirkSchema, type Quirk } from '../../schemas/quirk';

const RAW: Quirk[] = [
  QuirkSchema.parse({
    id: 'tymoras-eye',
    name: "Tymora's Eye",
    sentiment: 'boon',
    flavor:
      'The lady of luck has lent you a single coin of her favour. You feel it pressing against your ribs.',
    effect: 'Reroll a missed attack once per delve.',
    modifiers: { rerollMissesPerDelve: 1 },
  }),
  QuirkSchema.parse({
    id: 'iron-stomach',
    name: 'Iron Stomach',
    sentiment: 'odd',
    flavor:
      'You ate something in the cells that disagreed with you and somehow won the argument. Nothing tastes quite right anymore.',
    effect: 'Immune to poison damage. Smell-based Perception checks are clumsy.',
    modifiers: { poisonImmune: true },
  }),
  QuirkSchema.parse({
    id: 'bargain-hunter',
    name: 'Bargain Hunter',
    sentiment: 'boon',
    flavor:
      'You learned where the merchants keep the second purse — the one they\'d swear they never had.',
    effect: '+25% to gold rewards from delves.',
    modifiers: { goldMultiplier: 1.25 },
  }),
  QuirkSchema.parse({
    id: 'vertigo',
    name: 'Vertigo',
    sentiment: 'bane',
    flavor:
      'The world tilts a half-step when it shouldn\'t. You move first because you know it will only get worse.',
    effect: 'Initiative −2, but +2 to-hit on your first attack of each combat.',
    modifiers: { initiativeMod: -2, firstTurnAttackBonus: 2 },
  }),
  QuirkSchema.parse({
    id: 'hangry',
    name: 'Hangry',
    sentiment: 'boon',
    flavor:
      'Pain sharpens. The hungrier the wolf, the meaner the bite. You learned that one quickly.',
    effect: '+2 to damage rolls when you are at or below half HP.',
    modifiers: { hangryDamageBonus: 2 },
  }),
  QuirkSchema.parse({
    id: 'sun-touched',
    name: 'Sun-Touched',
    sentiment: 'odd',
    flavor:
      'Something from the surface follows you in the dark. Your skin remembers warmth your bones never knew.',
    effect: 'Flavor — the soul recalls sunlight.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'bloody-minded',
    name: 'Bloody-Minded',
    sentiment: 'odd',
    flavor:
      'You finish what you start. The wounded don\'t deserve mercy and the dying are easier to kill.',
    effect: '+1 to-hit vs wounded enemies (below half HP). −1 AC.',
    modifiers: { woundedAttackBonus: 1, acMod: -1 },
  }),
  QuirkSchema.parse({
    id: 'cursed-coin',
    name: 'Cursed Coin',
    sentiment: 'odd',
    flavor:
      'A copper that always comes back. The face on it is not one of the gods you know.',
    effect: 'Start each delve with +10 gold. Cannot be sold or discarded.',
    modifiers: { startBonusGold: 10 },
  }),
  QuirkSchema.parse({
    id: 'bardic-memory',
    name: 'Bardic Memory',
    sentiment: 'odd',
    flavor:
      'You can hum songs you have never heard. The words come in a language nobody at the table knows.',
    effect: 'Flavor — the soul carries an old tune.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'touched-beyond',
    name: 'Touched by the Beyond',
    sentiment: 'bane',
    flavor:
      'When you blink, you see the room as it was. The dead are still there. They are very busy.',
    effect: '−1 to your first attack roll each combat.',
    modifiers: { firstAttackPenalty: -1 },
  }),
  QuirkSchema.parse({
    id: 'featherlight',
    name: 'Featherlight',
    sentiment: 'boon',
    flavor:
      'You move before you mean to. Doors open into rooms you have not yet decided to enter.',
    effect: '+1 to initiative.',
    modifiers: { initiativeMod: 1 },
  }),
  QuirkSchema.parse({
    id: 'late-sleeper',
    name: 'Late Sleeper',
    sentiment: 'bane',
    flavor:
      'The world starts before you do. By the time you have your boots on, someone is already shouting.',
    effect: '−2 to initiative.',
    modifiers: { initiativeMod: -2 },
  }),
  QuirkSchema.parse({
    id: 'silver-tongue',
    name: 'Silver Tongue',
    sentiment: 'odd',
    flavor:
      'Words come easy. The wrong ones especially — but those are the useful ones, mostly.',
    effect: 'Flavor — quick of speech in the inns between deaths.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'plain-face',
    name: 'Plain Face',
    sentiment: 'odd',
    flavor:
      'Nobody remembers your name on the first try. Sometimes not the second. You learned to repeat it without flinching.',
    effect: 'Flavor — easily forgotten by those who watch you fall.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'glassbone',
    name: 'Glassbone',
    sentiment: 'bane',
    flavor:
      'An old fall the bones still remember. The new soul inherited the ache and the warning both.',
    effect: '−1 AC.',
    modifiers: { acMod: -1 },
  }),
  QuirkSchema.parse({
    id: 'carrion-eye',
    name: 'Carrion Eye',
    sentiment: 'odd',
    flavor:
      'You read the weak the way a vulture reads a horizon. Patient. Certain. Already eating.',
    effect: '+1 to-hit vs wounded enemies (below half HP).',
    modifiers: { woundedAttackBonus: 1 },
  }),
  QuirkSchema.parse({
    id: 'heavy-pockets',
    name: 'Heavy Pockets',
    sentiment: 'boon',
    flavor:
      'A coin always rolls into your boot. You stopped wondering whose it was a long time ago.',
    effect: 'Start each delve with +5 gold.',
    modifiers: { startBonusGold: 5 },
  }),
  QuirkSchema.parse({
    id: 'pinchpurse',
    name: 'Pinchpurse',
    sentiment: 'bane',
    flavor:
      'Coin slips through your fingers like the room knows it owes you nothing. You count, you recount — it keeps going.',
    effect: '−15% to gold rewards from delves.',
    modifiers: { goldMultiplier: 0.85 },
  }),
  QuirkSchema.parse({
    id: 'cold-touched',
    name: 'Cold-Touched',
    sentiment: 'odd',
    flavor:
      'Something from the deep dark followed you up. You don\'t feel the cold the way you should. Or fire, anymore.',
    effect: 'Flavor — the soul remembers the dark below.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'beast-marked',
    name: 'Beast-Marked',
    sentiment: 'odd',
    flavor:
      'Dogs love you. Wolves keep their distance. Something between the two has its eye on you and you can feel it.',
    effect: 'Flavor — beasts read the soul before the body.',
    modifiers: {},
  }),
  QuirkSchema.parse({
    id: 'old-soldier',
    name: 'Old Soldier',
    sentiment: 'boon',
    flavor:
      'The fight always gets worse before it ends. You learned that on a wall whose name you no longer remember, and the soul came back knowing it too.',
    effect: '+1 to initiative. +1 to-hit vs wounded enemies (below half HP).',
    modifiers: { initiativeMod: 1, woundedAttackBonus: 1 },
  }),
  QuirkSchema.parse({
    id: 'limping',
    name: 'Limping',
    sentiment: 'bane',
    flavor:
      'An old wound the body did not inherit cleanly. The soul remembers the angle, the bones do not.',
    effect: '−1 to initiative. −1 AC.',
    modifiers: { initiativeMod: -1, acMod: -1 },
  }),
  QuirkSchema.parse({
    id: 'crows-favor',
    name: "Crow's Favor",
    sentiment: 'odd',
    flavor:
      'You hesitate when the fight opens — then strike sure once you can see blood. The crows on the rafters have already picked their seat.',
    effect: '−1 to-hit on your first attack each combat. +1 to-hit vs wounded enemies.',
    modifiers: { firstAttackPenalty: -1, woundedAttackBonus: 1 },
  }),
  QuirkSchema.parse({
    id: 'magpies-eye',
    name: "Magpie's Eye",
    sentiment: 'boon',
    flavor:
      'You see coin where others see floor. The Iron Cells were full of it, if you knew where to look. You knew.',
    effect: 'Start each delve with +5 gold.',
    modifiers: { startBonusGold: 5 },
  }),
  QuirkSchema.parse({
    id: 'hollow-coin',
    name: 'Hollow Coin',
    sentiment: 'bane',
    flavor:
      'The purse always feels lighter than the count. You\'ve checked. The count is right. The purse is the liar.',
    effect: '−10% to gold rewards from delves.',
    modifiers: { goldMultiplier: 0.9 },
  }),
];

const POOL: Quirk[] = RAW;
const BY_ID: Map<string, Quirk> = new Map(POOL.map((q) => [q.id, q]));

export function getQuirk(id: string): Quirk {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Quirk not found: ${id}`);
  return q;
}

export function listQuirks(): Quirk[] {
  return POOL;
}
