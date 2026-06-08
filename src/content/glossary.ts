/**
 * The Glossary — a spoiler-free reference the player can open from the hub. It
 * explains the six attributes, the vital + casting stats, and the core
 * mechanics (the d20, advantage, saves, conditions, the action economy, rest).
 * Nothing here touches story, chapters, bosses, or anything the player hasn't
 * met — only how the game's numbers and rolls work.
 *
 * English is the source of truth; the Spanish overlay lives in
 * `i18n/locales/es/glossary.json`, keyed by section id and entry id, and is
 * gate-checked by the content-completeness test. Section ids are prefixed
 * `sec-` so they never collide with an entry id in the flat overlay map.
 */
export interface GlossaryEntry {
  id: string;
  term: string;
  desc: string;
}

export interface GlossarySection {
  id: string;
  title: string;
  entries: GlossaryEntry[];
}

export const GLOSSARY: GlossarySection[] = [
  {
    id: 'sec-attributes',
    title: 'The Six Attributes',
    entries: [
      {
        id: 'str',
        term: 'Strength (STR)',
        desc: 'Raw physical force. Drives your accuracy and damage with heavy melee weapons, and the Athletics you use to shove, climb, and break a hold.',
      },
      {
        id: 'dex',
        term: 'Dexterity (DEX)',
        desc: 'Speed and precision. Sharpens finesse and ranged weapons, lifts your Armour Class in lighter armour, and powers Stealth and Acrobatics.',
      },
      {
        id: 'con',
        term: 'Constitution (CON)',
        desc: 'Toughness and stamina. Sets the hit points you gain as you level, and steadies you against poison, disease, and sheer exhaustion.',
      },
      {
        id: 'int',
        term: 'Intelligence (INT)',
        desc: "Learned reason. The wizard's casting score — it sets the save DC, attack, and damage of arcane spells — and fuels Arcana and Investigation.",
      },
      {
        id: 'wis',
        term: 'Wisdom (WIS)',
        desc: "Perception and instinct. The druid's casting score, and the sense behind Perception, Insight, and Survival.",
      },
      {
        id: 'cha',
        term: 'Charisma (CHA)',
        desc: 'Force of presence. Sways people through Persuasion, Deception, and Intimidation — and tips many of the choices the road sets before you.',
      },
    ],
  },
  {
    id: 'sec-vitals',
    title: 'Vital Stats',
    entries: [
      {
        id: 'hp',
        term: 'Hit Points (HP)',
        desc: 'Your life. Damage subtracts from it; reach 0 and the soul leaves the body — and the wheel turns. Healing and rest restore it.',
      },
      {
        id: 'ac',
        term: 'Armour Class (AC)',
        desc: 'How hard you are to hit. An attacker must roll a d20, add their bonuses, and meet or beat your AC to land a blow. Armour, shields, and Dexterity all raise it.',
      },
      {
        id: 'proficiency',
        term: 'Proficiency',
        desc: "The mark of training — a flat bonus added to the attacks, saves, and skills you're schooled in. It deepens as you level.",
      },
      {
        id: 'temp-hp',
        term: 'Temporary HP',
        desc: 'A buffer some blessings and gear lay over your health. It soaks damage before your own does, and does not stack — the largest source stands.',
      },
    ],
  },
  {
    id: 'sec-casting',
    title: 'Casting',
    entries: [
      {
        id: 'spell-dc',
        term: 'Spell Save DC',
        desc: 'The number a foe must beat on its saving throw to resist your spell. The higher it climbs, the harder your magic is to shrug off.',
      },
      {
        id: 'spell-attack',
        term: 'Spell Attack',
        desc: "The bonus you add when a spell must strike a target directly — an attack roll against the target's Armour Class.",
      },
      {
        id: 'spell-damage',
        term: 'Spell Damage',
        desc: 'A flat bonus added to the damage your spells deal — once per cast, on top of the dice.',
      },
      {
        id: 'spell-slots',
        term: 'Spell Slots',
        desc: 'The fuel for your spells. Each cast spends a slot of its level; cantrips are free. Slots come back when you camp.',
      },
    ],
  },
  {
    id: 'sec-rolls',
    title: 'How Rolls Work',
    entries: [
      {
        id: 'd20',
        term: 'The d20',
        desc: "Most actions hinge on a twenty-sided die. Roll it, add your bonuses, and compare to a target number — a foe's Armour Class, or a difficulty (DC).",
      },
      {
        id: 'advantage',
        term: 'Advantage & Disadvantage',
        desc: 'Advantage rolls two d20 and keeps the higher; disadvantage keeps the lower. They never stack, and one of each cancels out.',
      },
      {
        id: 'crit',
        term: 'Critical Hit',
        desc: 'A natural 20 on an attack always lands and rolls its damage dice twice. A few gifts widen the range that counts as a crit.',
      },
      {
        id: 'save',
        term: 'Saving Throws',
        desc: 'When something dangerous reaches you — poison, fear, a spell — you roll a d20 plus an ability against its DC to resist or soften it.',
      },
      {
        id: 'skill-check',
        term: 'Skill Checks',
        desc: 'Out on the road, a choice tests a skill: roll a d20, add the skill, and meet the DC to succeed. Training and talent tilt the odds.',
      },
    ],
  },
  {
    id: 'sec-combat',
    title: 'In Combat',
    entries: [
      {
        id: 'action-economy',
        term: 'Action · Bonus Action · Reaction',
        desc: 'Each turn you take one Action (attack, cast, use an item), sometimes a Bonus Action for a quick extra move, and a Reaction you can spend on another creature\'s turn.',
      },
      {
        id: 'damage-types',
        term: 'Damage Types',
        desc: 'Blows arrive as slashing, fire, poison, and more. A foe may resist a type (half damage) or be immune to it (none) — and a few have weaknesses.',
      },
      {
        id: 'conditions',
        term: 'Conditions',
        desc: 'Effects that bend a fight: poisoned saps accuracy, paralysed costs whole turns, restrained pins you in place. Most fade with time or a save.',
      },
      {
        id: 'telegraph',
        term: 'Telegraphs',
        desc: 'A foe winding up a heavy blow shows its intent a turn before it lands. Race its health down, brace, or stun it to cancel the charge.',
      },
    ],
  },
  {
    id: 'sec-between',
    title: 'Between Fights',
    entries: [
      {
        id: 'rest',
        term: 'Rest & Camp',
        desc: 'A short rest between rooms knits some health and refreshes a few resources; a full camp at a chapter\'s edge restores everything before the deeper dark.',
      },
      {
        id: 'quirks-blessings',
        term: 'Quirks & Blessings',
        desc: 'Quirks are the scars and gifts the soul carries from death to death — they survive the wheel. Blessings are won within a single run and end when it does.',
      },
      {
        id: 'renown',
        term: 'Renown',
        desc: 'The one thing the road returns. Carry it back to spend on lasting growth, while gold and experience stay behind in the dark.',
      },
    ],
  },
];
