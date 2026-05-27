import { BlessingSchema, type Blessing } from '../../schemas/blessing';

const POOL: Blessing[] = [
  BlessingSchema.parse({
    id: 'tymoras-coin',
    name: "Tymora's Coin",
    god: 'tymora',
    flavor: 'A copper finds its way into your hand. You did not put it there.',
    effect: 'Reroll one missed attack per encounter.',
    modifiers: { rerollMissesPerEncounter: 1 },
  }),
  BlessingSchema.parse({
    id: 'helms-aegis',
    name: "Helm's Aegis",
    god: 'helm',
    flavor: 'A weight settles on your shoulders — invisible, watchful, unwearying.',
    effect: '+1 AC.',
    modifiers: { acBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-fury',
    name: "Tempus's Fury",
    god: 'tempus',
    flavor: 'The first blow is always the truest. Tempus has a soft spot for the brave.',
    effect: '+2 damage on the first attack of each combat.',
    modifiers: { firstAttackDamage: 2 },
  }),
  BlessingSchema.parse({
    id: 'mystras-whisper',
    name: "Mystra's Whisper",
    god: 'mystra',
    flavor: 'The Weave hums faintly around your weapon. Your strikes carry an unseen edge.',
    effect: '+1 force damage on all attacks.',
    modifiers: { damageBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'lathanders-dawn',
    name: "Lathander's Dawn",
    god: 'lathander',
    flavor: 'A faint warmth in the dark. New light at the threshold of each room.',
    effect: 'Gain 3 temporary HP at the start of each combat.',
    modifiers: { extraTempHpPerRoom: 3 },
  }),
  BlessingSchema.parse({
    id: 'selunes-veil',
    name: "Selûne's Veil",
    god: 'selune',
    flavor: 'You catch them not seeing you — even when you are obviously there.',
    effect: 'Advantage on your first attack each combat.',
    modifiers: { firstAttackAdvantage: true },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-patience',
    name: "Ilmater's Patience",
    god: 'ilmater',
    flavor: 'The Crying God knows your weight. He carries it a moment longer than you can.',
    effect:
      "Once per delve, when you would fall, the Crying God spares you — stabilise at 1 HP. Stacks: +1 stabilise charge.",
    modifiers: { extraStabiliseCharges: 1 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-root',
    name: "Silvanus's Root",
    god: 'silvanus',
    flavor: 'The bark of the world clings to your skin. Heavy and slow — and harder to fell.',
    effect: '+1 AC. −1 initiative (you wait, you weigh, you root).',
    modifiers: { acBonus: 1, initiativeBonus: -1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-edge',
    name: "Tempus's Edge",
    god: 'tempus',
    flavor: 'Your crit range widens. The god of war prefers a decisive ending.',
    effect: 'Crit range extends by 1 (e.g. Champion crits on 18-20 instead of 19-20).',
    modifiers: { critRangeBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'helms-vigil',
    name: "Helm's Vigil",
    god: 'helm',
    flavor: 'You see threats half a breath before they arrive. The Watcher\'s eye on yours.',
    effect: '+2 initiative.',
    modifiers: { initiativeBonus: 2 },
  }),
  BlessingSchema.parse({
    id: 'tymoras-wink',
    name: "Tymora's Wink",
    god: 'tymora',
    flavor: 'The lady leans in close. When the floor would catch you, her coin slips between your spine and the stone.',
    effect: 'Once per delve, if you would fall, you stabilise at 1 HP instead.',
    modifiers: { extraStabiliseCharges: 1 },
  }),
  BlessingSchema.parse({
    id: 'tymoras-gambit',
    name: "Tymora's Gambit",
    god: 'tymora',
    flavor: 'A reckless prayer answered. The dice know which way to fall.',
    effect: 'Crit range extends by 1.',
    modifiers: { critRangeBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'helms-bulwark',
    name: "Helm's Bulwark",
    god: 'helm',
    flavor: 'Your strikes carry a witness. Steel rings as if struck twice — once by you, once by Him.',
    effect: '+1 radiant damage on hits.',
    modifiers: { holyDamageBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-charge',
    name: "Tempus's Charge",
    god: 'tempus',
    flavor: 'The first step into the room is the bravest. Tempus rewards that step.',
    effect: 'Advantage on your first attack each combat.',
    modifiers: { firstAttackAdvantage: true },
  }),
  BlessingSchema.parse({
    id: 'mystras-ward',
    name: "Mystra's Ward",
    god: 'mystra',
    flavor: 'The Weave parts around you, gentle as a curtain, brief as a breath. Steel finds less of you than it meant to.',
    effect: '+1 AC.',
    modifiers: { acBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'mystras-veil',
    name: "Mystra's Veil",
    god: 'mystra',
    flavor: 'A thread of the Weave guides your first strike. It does not let go until it lands.',
    effect: '+2 to-hit on the first attack of each combat.',
    modifiers: { firstAttackBonus: 2 },
  }),
  BlessingSchema.parse({
    id: 'lathanders-ember',
    name: "Lathander's Ember",
    god: 'lathander',
    flavor: 'A speck of dawn rides your blade. The dark flinches where it touches.',
    effect: '+1 radiant damage on hits.',
    modifiers: { holyDamageBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'selunes-tide',
    name: "Selûne's Tide",
    god: 'selune',
    flavor: 'You step in time to a moon you cannot see. The room waits a beat for you.',
    effect: '+1 initiative.',
    modifiers: { initiativeBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-crown',
    name: "Ilmater's Crown",
    god: 'ilmater',
    flavor: 'The Crying God presses a thumb to your brow. You will not break here. Not today.',
    effect: 'Gain 2 temporary HP at the start of each combat.',
    modifiers: { extraTempHpPerRoom: 2 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-thorn',
    name: "Silvanus's Thorn",
    god: 'silvanus',
    flavor: 'A briar has grown into the seam of your glove. It bites for you when you bite.',
    effect: '+1 damage on all attacks.',
    modifiers: { damageBonus: 1 },
  }),
];

const BY_ID: Map<string, Blessing> = new Map(POOL.map((b) => [b.id, b]));

export function getBlessing(id: string): Blessing {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Blessing not found: ${id}`);
  return b;
}

export function listBlessings(): Blessing[] {
  return POOL;
}
