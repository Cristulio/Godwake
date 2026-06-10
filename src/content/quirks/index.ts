import { QuirkSchema, type Quirk } from '../../schemas/quirk';

const RAW: Quirk[] = [
  QuirkSchema.parse({
    id: 'tymoras-eye',
    name: "Tyche's Eye",
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
      'The world tilts a half-step when it shouldn\'t. You swing harder because you only see the target right once.',
    effect: '+2 to-hit on your first attack each combat, but −1 AC.',
    modifiers: { firstTurnAttackBonus: 2, acMod: -1 },
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
    enabled: false,
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
      'A copper that always comes back. The face on it is not one of the gods you know, and it is always warm.',
    effect: 'Start each delve with +30 gold. Cannot be sold or discarded.',
    modifiers: { startBonusGold: 30 },
  }),
  QuirkSchema.parse({
    id: 'bardic-memory',
    name: 'Bardic Memory',
    sentiment: 'odd',
    flavor:
      'You can hum songs you have never heard. The words come in a language nobody at the table knows.',
    effect: 'Flavor — the soul carries an old tune.',
    modifiers: {},
    enabled: false,
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
    effect: '+1 to-hit on your first attack each combat.',
    modifiers: { firstTurnAttackBonus: 1 },
  }),
  QuirkSchema.parse({
    id: 'late-sleeper',
    name: 'Late Sleeper',
    sentiment: 'bane',
    flavor:
      'The world starts before you do. By the time you have your boots on, someone is already shouting.',
    effect: '−1 to your first attack roll each combat.',
    modifiers: { firstAttackPenalty: -1 },
  }),
  QuirkSchema.parse({
    id: 'silver-tongue',
    name: 'Silver Tongue',
    sentiment: 'odd',
    flavor:
      'Words come easy. The wrong ones especially — but those are the useful ones, mostly.',
    effect: 'Flavor — quick of speech in the inns between deaths.',
    modifiers: {},
    enabled: false,
  }),
  QuirkSchema.parse({
    id: 'plain-face',
    name: 'Plain Face',
    sentiment: 'odd',
    flavor:
      'Nobody remembers your name on the first try. Sometimes not the second. You learned to repeat it without flinching.',
    effect: 'Flavor — easily forgotten by those who watch you fall.',
    modifiers: {},
    enabled: false,
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
    // Pure upside (+1 to-hit vs wounded, no cost) → a boon, not an "odd" trade.
    // Its sibling Bloody-Minded is the same edge WITH a −1 AC cost (correctly odd).
    sentiment: 'boon',
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
    enabled: false,
  }),
  QuirkSchema.parse({
    id: 'beast-marked',
    name: 'Beast-Marked',
    sentiment: 'odd',
    flavor:
      'Dogs love you. Wolves keep their distance. Something between the two has its eye on you and you can feel it.',
    effect: 'Flavor — beasts read the soul before the body.',
    modifiers: {},
    enabled: false,
  }),
  QuirkSchema.parse({
    id: 'old-soldier',
    name: 'Old Soldier',
    sentiment: 'boon',
    flavor:
      'The fight always gets worse before it ends. You learned that on a wall whose name you no longer remember, and the soul came back knowing it too.',
    effect: '+1 to-hit on your first attack each combat. +1 to-hit vs wounded enemies.',
    modifiers: { firstTurnAttackBonus: 1, woundedAttackBonus: 1 },
  }),
  QuirkSchema.parse({
    id: 'limping',
    name: 'Limping',
    sentiment: 'bane',
    flavor:
      'An old wound the body did not inherit cleanly. The soul remembers the angle, the bones do not.',
    effect: '−1 AC. −1 to your first attack roll each combat.',
    modifiers: { acMod: -1, firstAttackPenalty: -1 },
    soulMarkWeight: 1.5,
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
  QuirkSchema.parse({
    id: 'stonehide',
    name: 'Stonehide',
    sentiment: 'boon',
    flavor:
      'The skin remembers a hardness the bones never asked for. Blades meet it and think twice.',
    effect: '+1 AC.',
    modifiers: { acMod: 1 },
  }),
  QuirkSchema.parse({
    id: 'quickdraw',
    name: 'Quickdraw',
    sentiment: 'boon',
    flavor:
      'The first blow is already on its way before the room agrees a fight has started. The soul is always early.',
    effect: '+2 to-hit on your first attack each combat.',
    modifiers: { firstTurnAttackBonus: 2 },
  }),
  QuirkSchema.parse({
    id: 'coinblessed',
    name: 'Coinblessed',
    sentiment: 'boon',
    flavor:
      'Some small god of small fortunes keeps an eye on your purse. Nothing grand. Just a little more, always.',
    effect: '+10% to gold rewards from delves.',
    modifiers: { goldMultiplier: 1.1 },
  }),
  QuirkSchema.parse({
    id: 'deep-pockets',
    name: 'Deep Pockets',
    sentiment: 'boon',
    flavor:
      'You came back with coin you do not remember earning. Every life the lining holds a little more.',
    effect: 'Start each delve with +15 gold.',
    modifiers: { startBonusGold: 15 },
  }),
  QuirkSchema.parse({
    id: 'headhunter',
    name: 'Headhunter',
    sentiment: 'boon',
    flavor:
      'A wounded thing is a finished thing to you. The soul learned the difference between hurting a man and ending one.',
    effect: '+2 to-hit vs wounded enemies (below half HP).',
    modifiers: { woundedAttackBonus: 2 },
  }),
  QuirkSchema.parse({
    id: 'brittle-boned',
    name: 'Brittle-Boned',
    sentiment: 'bane',
    flavor:
      'The frame came back wrong — too thin at the joints, too eager to give. Every fall is the last one, until it isn\'t.',
    effect: '−2 AC.',
    modifiers: { acMod: -2 },
    soulMarkWeight: 1.4,
  }),
  QuirkSchema.parse({
    id: 'slow-to-rouse',
    name: 'Slow to Rouse',
    sentiment: 'bane',
    flavor:
      'The body wakes a beat behind the danger. By the time the hand answers, the first swing is already a memory of a mistake.',
    effect: '−2 to your first attack roll each combat.',
    modifiers: { firstAttackPenalty: -2 },
    soulMarkWeight: 1.3,
  }),
  QuirkSchema.parse({
    id: 'empty-purse',
    name: 'Empty Purse',
    sentiment: 'bane',
    flavor:
      'Coin avoids you the way water avoids oil. It is there, then it is owed to someone, then it is simply gone.',
    effect: '−20% to gold rewards from delves.',
    modifiers: { goldMultiplier: 0.8 },
  }),
  QuirkSchema.parse({
    id: 'squeamish',
    name: 'Squeamish',
    sentiment: 'bane',
    flavor:
      'You can open a man easily enough. It is the closing — the gurgle, the eyes — that makes the hand slow when it should not.',
    effect: '−1 to-hit vs wounded enemies (below half HP).',
    modifiers: { woundedAttackBonus: -1 },
  }),
  QuirkSchema.parse({
    id: 'faint-hearted',
    name: 'Faint-Hearted',
    sentiment: 'bane',
    flavor:
      'Pain does not sharpen you. It hollows you out. The worse the wound, the smaller the swing that answers it.',
    effect: '−1 to damage rolls when you are at or below half HP.',
    modifiers: { hangryDamageBonus: -1 },
  }),
  QuirkSchema.parse({
    id: 'berserkers-patience',
    name: "Berserker's Patience",
    sentiment: 'odd',
    flavor:
      'You fight loose and open until the blood comes — yours, theirs, it stops mattering. Then the soul finds its teeth.',
    effect: '+2 to damage rolls when at or below half HP. −1 AC.',
    modifiers: { hangryDamageBonus: 2, acMod: -1 },
  }),
  QuirkSchema.parse({
    id: 'cowards-guard',
    name: "Coward's Guard",
    sentiment: 'odd',
    flavor:
      'You flinch first and commit late. It looks like fear. It has kept this soul breathing through more lives than courage ever did.',
    effect: '+1 AC. −1 to your first attack roll each combat.',
    modifiers: { acMod: 1, firstAttackPenalty: -1 },
  }),
  QuirkSchema.parse({
    id: 'plaguebound',
    name: 'Plaguebound',
    sentiment: 'odd',
    flavor:
      'Something rotten settled in the marrow and made a home of it. Venom is family now. The rest of you pays the rent.',
    effect: 'Immune to poison damage. −1 AC.',
    modifiers: { poisonImmune: true, acMod: -1 },
  }),
  QuirkSchema.parse({
    id: 'gamblers-soul',
    name: "Gambler's Soul",
    sentiment: 'odd',
    flavor:
      'Luck pools in the hand that holds the blade and drains from the one that holds the purse. You stopped fighting the trade lives ago.',
    effect: 'Reroll a missed attack once per delve. −15% to gold rewards.',
    modifiers: { rerollMissesPerDelve: 1, goldMultiplier: 0.85 },
  }),
  QuirkSchema.parse({
    id: 'vultures-patience',
    name: "Vulture's Patience",
    sentiment: 'odd',
    flavor:
      'You waste no strength on the strong. Let the fight wear them down — the soul knows the kill is owed and is content to wait for it.',
    effect: '−1 to your first attack each combat. +2 to-hit vs wounded enemies.',
    modifiers: { firstAttackPenalty: -1, woundedAttackBonus: 2 },
  }),
];

const POOL: Quirk[] = RAW;
const BY_ID: Map<string, Quirk> = new Map(POOL.map((q) => [q.id, q]));

export function getQuirk(id: string): Quirk {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Quirk not found: ${id}`);
  return q;
}

/**
 * Every quirk in the codebase, including ones currently filtered out of the
 * active reincarnation roll. Read this when you need to look up a stored
 * quirk id (save data may reference a now-disabled quirk).
 */
export function listAllQuirks(): Quirk[] {
  return POOL;
}

/**
 * Active reincarnation pool — quirks with engine consumers. Flavor-only
 * entries (empty modifiers, no mechanic) are kept in the codebase for save
 * compatibility and lore reference but excluded from new rolls per the
 * no-flavor-only rule.
 */
export function listQuirks(): Quirk[] {
  return POOL.filter((q) => q.enabled !== false);
}
