import type { ClassId } from '../schemas/ids';

export type CampBoonTier = 1 | 2 | 3;

export interface CampBoon {
  id: string;
  tier: CampBoonTier;
  name: string;
  description: string;
  flavor: string;
}

const ALL_BOONS: CampBoon[] = [
  // Tier 1 — Ch1 → Ch2 seam. Soft the attrition wall.
  {
    id: 'vigor-of-the-road',
    tier: 1,
    name: 'Vigor of the Road',
    description: '+5% maximum HP (rounded down, minimum +1). Current HP rises with it.',
    flavor: 'Three days on a road that does not end teaches the back where to be.',
  },
  {
    id: 'eye-of-the-hawk',
    tier: 1,
    name: 'Eye of the Hawk',
    description: '+1 to all attack rolls for the rest of the delve.',
    flavor: 'A breath. A fixed star. The world narrowed to a single straight line.',
  },
  {
    // Wizard-side parallel to Eye of the Hawk. Wizard spells either save-for-
    // half or auto-hit, so +1 weapon-attack is dead; the matched-power swap is
    // +1 to spell attack rolls, mirroring the Sharpen/Whet camp choice.
    id: 'eye-of-the-mind',
    tier: 1,
    name: 'Eye of the Mind',
    description: '+1 to all spell attack rolls for the rest of the delve.',
    flavor: 'A breath. A glyph held steady in the mind. The Weft threads tauter for it.',
  },
  {
    id: 'stillness-of-the-mind',
    tier: 1,
    name: 'Stillness of the Mind',
    description: '+1 to Wisdom saving throws for the rest of the delve.',
    flavor: 'A name you keep in the centre of yourself. The dark cannot move it.',
  },

  // Tier 2 — Ch2 → Ch3 seam.
  {
    id: 'steel-of-the-brave',
    tier: 2,
    name: 'Steel of the Brave',
    description: '+1 Armour Class for the rest of the delve.',
    flavor: 'The shield learns where to be a beat before the blow.',
  },
  {
    id: 'surge-of-the-storm',
    tier: 2,
    name: 'Surge of the Storm',
    description: '+1 to spell save DC for the rest of the delve.',
    flavor: 'The Weft bends a fraction closer to the hand that called.',
  },
  {
    id: 'might-of-the-mountain',
    tier: 2,
    name: 'Might of the Mountain',
    description: '+1 damage on every weapon hit for the rest of the delve.',
    flavor: 'The blow falls a hairsbreadth deeper. The mountain remembers.',
  },
  {
    id: 'patience-of-ilmater',
    tier: 2,
    name: 'Patience of Atlas',
    description: '+1 stabilise charge — one more time the red knot holds when you fall.',
    flavor: 'A red-knotted bandage, blessed in the basin. Carry it under the breastplate.',
  },

  // Tier 3 — Ch3 → Ch4 seam. The Deepdark and the final boss.
  {
    id: 'mantle-of-the-slain',
    tier: 3,
    name: 'Mantle of the Slain',
    description: '+1 maximum HP per character level. Current HP rises with it.',
    flavor: 'The names of the dead you carry stiffen into a quiet armour.',
  },
  {
    id: 'blade-of-the-vow',
    tier: 3,
    name: 'Blade of the Vow',
    description: 'Re-roll your lowest weapon damage die up to three times per combat. Keep the better roll each time.',
    flavor: 'A vow muttered to long-dead saints. The blade does not forget.',
  },
  {
    // Wizard-side parallel. Wizard never makes weapon-damage rolls in this
    // build, so Blade of the Vow's reroll budget never fires. Match-power
    // alternative: +1 spell damage on every spell that deals damage.
    id: 'vow-of-the-tome',
    tier: 3,
    name: 'Vow of the Tome',
    description: '+1 damage on every spell that deals damage, for the rest of the delve.',
    flavor: 'A vow muttered into the spine of an open book. The Weft reads back.',
  },
  {
    id: 'eyes-of-the-lich',
    tier: 3,
    name: 'Eyes of the Lich',
    description: '+1 to all weapon attack rolls and crits land on 19-20 for the rest of the delve.',
    flavor: 'A glance behind eyes that have long ceased to blink. You see where the living are weak.',
  },
  {
    // Wizard-side parallel to Eyes of the Lich. Weapon attack bonus / physical
    // crit range are dead for Wizard (spells either auto-hit or force saves).
    // Match-power swap: +1 spell attack bonus + widen spell-attack crit range.
    id: 'gaze-of-the-lich',
    tier: 3,
    name: 'Gaze of the Lich',
    description: '+1 to all spell attack rolls and crits on spell attacks land on 19–20 for the rest of the delve.',
    flavor: 'A borrowed blink, cold and lidless. Through those eyes the gaps in the mortal weave are obvious.',
  },
];

const BY_ID: Record<string, CampBoon> = Object.fromEntries(
  ALL_BOONS.map((b) => [b.id, b]),
);

export function getCampBoon(id: string): CampBoon {
  const b = BY_ID[id];
  if (!b) throw new Error(`Unknown camp boon: ${id}`);
  return b;
}

export function listCampBoons(): CampBoon[] {
  return ALL_BOONS.slice();
}

/**
 * The three boons offered at the given camp tier. Weapon-attack-keyed slots
 * swap to spell-keyed equivalents for Wizard. Tier 3 swaps both the middle
 * slot (blade/vow) and the last slot (eyes/gaze of the lich). Power is
 * matched 1:1 — each wizard variant grants an equivalent magnitude lever.
 */
export function boonsForCampTier(tier: CampBoonTier, classId: ClassId): CampBoon[] {
  if (tier === 1) {
    const middle = classId === 'wizard'
      ? getCampBoon('eye-of-the-mind')
      : getCampBoon('eye-of-the-hawk');
    return [
      getCampBoon('vigor-of-the-road'),
      middle,
      getCampBoon('stillness-of-the-mind'),
    ];
  }
  if (tier === 2) {
    const middle = classId === 'wizard'
      ? getCampBoon('surge-of-the-storm')
      : getCampBoon('might-of-the-mountain');
    return [
      getCampBoon('steel-of-the-brave'),
      middle,
      getCampBoon('patience-of-ilmater'),
    ];
  }
  const middle = classId === 'wizard'
    ? getCampBoon('vow-of-the-tome')
    : getCampBoon('blade-of-the-vow');
  const last = classId === 'wizard'
    ? getCampBoon('gaze-of-the-lich')
    : getCampBoon('eyes-of-the-lich');
  return [
    getCampBoon('mantle-of-the-slain'),
    middle,
    last,
  ];
}
