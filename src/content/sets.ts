import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';
import type { EquipSlot } from '../engine/character/equip';

/**
 * SET GEAR (Diablo II style). A set piece is a real EQUIPPABLE SLOT item — a
 * weapon, armour, or accessory (base stats live in content/items/setBases.ts).
 * Finding any piece of a set permanently UNLOCKS that set
 * (metaStore.unlockedSets); from then on its pieces appear FOR SALE in shops.
 * The pieces themselves are RUN-scoped — a found or bought piece lives in the run
 * inventory and is wiped on death/descent like rolled loot — so the unlock
 * persists forever but the kit is rebuilt (re-bought) each life. Each piece
 * carries a guaranteed effect payload PLUS a flat `+N` enhancement
 * (weapons/armour). Equipping multiple pieces of one set grants PARTIAL, SCALING
 * set bonuses (2-piece, 3-piece…) layered ON TOP of the pieces' own slot stats.
 *
 * This is the slot-gear layer. Legendaries (content/legendaries.ts) are the
 * separate effect-only boon layer. A class-bound set only DROPS for (and themes
 * to) its class, and only equips while playing it; universal sets are
 * accessories any class can wear.
 */

export interface SetPiece {
  /** Piece id — identical to its base item id (content/items/setBases.ts). */
  id: string;
  /** The set this piece belongs to (content GEAR_SETS). */
  setId: string;
  /** Display name (mirrors the base item name). */
  name: string;
  /** One-line flavour in the old realms / BG2 voice. */
  flavor: string;
  /**
   * The canonical equip slot the piece fills. Rings use `ring1` as their
   * canonical slot; the normal inventory equip flow routes a ring to the first
   * free band.
   */
  slot: EquipSlot;
  /** The effect payload folded onto the character while the piece is worn. */
  effects: AffixModifiers;
  /** Player-facing one-line effect text. */
  effectLine: string;
  /**
   * Flat `+N` enhancement materialised onto the piece's ItemRef (weapons:
   * attack + damage; armour/shield: AC). Keeps the piece above the best rolled
   * loot for its slot. Absent on accessories / robes (no base stats to lift).
   */
  enhancement?: number;
  /** Class-bound: only drops for, themes to, and equips while playing this class. */
  classGate?: ClassId;
  /** Ascension-EXCLUSIVE: only drops on a New Game+ run (Ascension >= 1). */
  ascensionExclusive?: boolean;
}

export interface SetBonusTier {
  /** Active set pieces required for this tier to apply. */
  piecesRequired: number;
  /** Player-facing line shown on the set-gear screen. */
  label: string;
  /** Effect payload granted while the tier is met. */
  bonuses: AffixModifiers;
}

export interface GearSet {
  id: string;
  name: string;
  flavor: string;
  /** A class-bound set only drops for / equips on this class. */
  classGate?: ClassId;
  /** True for every piece of an Ascension-exclusive (New Game+) set. */
  ascensionExclusive?: boolean;
  /** Piece ids that make up the set, in display order. */
  pieceIds: string[];
  /** Ascending thresholds; EVERY met threshold applies (they stack). */
  bonuses: SetBonusTier[];
}

// ---------------------------------------------------------------------------
// The set pieces. Effects + flavour carry over from the relic-sets they were
// CONVERTED from; each now equips into a real slot instead of a typed relic slot.
// ---------------------------------------------------------------------------

export const SET_PIECES: SetPiece[] = [
  // --- Vigil (universal) ---------------------------------------------------
  {
    id: 'vigil-helm', setId: 'vigil', name: 'Vigil Helm', slot: 'helm',
    flavor: 'A warden’s greathelm, dented by blows that never reached the soul.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
  },
  {
    id: 'vigil-mantle', setId: 'vigil', name: 'Vigil Mantle', slot: 'amulet',
    flavor: 'A heavy cloak stitched with the sigils of the wall-watch.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
  },
  {
    id: 'vigil-heart', setId: 'vigil', name: 'Vigil Heart', slot: 'ring1',
    flavor: 'A locket of clouded amber that steadies a failing pulse.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
  },

  // --- Wayfarer's Kit (universal, 3-piece — the light all-rounder) ----------
  {
    id: 'wayfarer-charm', setId: 'wayfarer', name: 'Wayfarer Charm', slot: 'amulet',
    flavor: 'A traveller’s luck-token, worn smooth on a thousand roads.',
    effects: { damageBonus: 1 }, effectLine: '+1 weapon damage on every hit',
  },
  {
    id: 'wayfarer-belt', setId: 'wayfarer', name: 'Wayfarer Belt', slot: 'belt',
    flavor: 'A broad belt of cracked leather, every notch a province crossed.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
  },
  {
    id: 'wayfarer-treads', setId: 'wayfarer', name: 'Wayfarer Treads', slot: 'boots',
    flavor: 'Boots resoled too many times to count, sure on any ground.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
  },

  // --- Lanternkeeper's Watch (universal, 4-piece — defensive sustain) -------
  {
    id: 'lanternkeeper-helm', setId: 'lanternkeeper', name: 'Lanternkeeper Helm', slot: 'helm',
    flavor: 'A hooded helm with a shuttered lamp at the brow — the last light on the wall.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
  },
  {
    id: 'lanternkeeper-charm', setId: 'lanternkeeper', name: 'Lanternkeeper Charm', slot: 'amulet',
    flavor: 'A glass-bead amulet that holds a coal-glow long after the fire is out.',
    effects: { tempHpPerCombat: 5 }, effectLine: 'Gain 5 temporary HP at the start of each fight',
  },
  {
    id: 'lanternkeeper-signet', setId: 'lanternkeeper', name: 'Lanternkeeper Signet', slot: 'ring1',
    flavor: 'A watch-captain’s signet; those who wear it mend slow but never stop.',
    effects: { regenPerTurn: 1 }, effectLine: 'Regenerate 1 HP each turn',
  },
  {
    id: 'lanternkeeper-cord', setId: 'lanternkeeper', name: 'Lanternkeeper Cord', slot: 'belt',
    flavor: 'A knotted watch-cord that cinches tighter as the night turns against you.',
    effects: { acBonusWhileBloodied: 2 }, effectLine: '+2 AC while bloodied',
  },

  // --- Gravewright's Due (universal, 4-piece — vampiric attrition) ----------
  {
    id: 'gravewright-locket', setId: 'gravewright', name: 'Gravewright Locket', slot: 'amulet',
    flavor: 'A grave-digger’s locket of bone-ash; what you spill, it gathers back.',
    effects: { lifestealPct: 4 }, effectLine: 'Heal 4% of the damage you deal',
  },
  {
    id: 'gravewright-band', setId: 'gravewright', name: 'Gravewright Band', slot: 'ring1',
    flavor: 'An iron band notched like a saw — its wounds are slow to close.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
  },
  {
    id: 'gravewright-seal', setId: 'gravewright', name: 'Gravewright Seal', slot: 'ring2',
    flavor: 'A black wax seal pressed with a spade-and-skull; the dead pay their tithe.',
    effects: { lifestealPct: 3 }, effectLine: 'Heal 3% of the damage you deal',
  },
  {
    id: 'gravewright-girdle', setId: 'gravewright', name: 'Gravewright Girdle', slot: 'belt',
    flavor: 'A girdle hung with grave-iron tools, each one heavier than it looks.',
    effects: { damageBonus: 2 }, effectLine: '+2 weapon damage on every hit',
  },

  // --- Pilgrim's Reliquary (universal, 6-piece — the GRAND trinket set) -----
  {
    id: 'pilgrim-circlet', setId: 'pilgrim', name: 'Pilgrim Circlet', slot: 'helm',
    flavor: 'A thin band of pilgrim-iron, blessed at shrines whose names are lost.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
  },
  {
    id: 'pilgrim-reliquary', setId: 'pilgrim', name: 'Pilgrim Reliquary', slot: 'amulet',
    flavor: 'A locket-shrine of a dozen saints, each owed a little of your road.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
  },
  {
    id: 'pilgrim-ring-road', setId: 'pilgrim', name: 'Pilgrim Ring of the Road', slot: 'ring1',
    flavor: 'A vow-ring sworn at the setting out: to walk until the work is done.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
  },
  {
    id: 'pilgrim-ring-vow', setId: 'pilgrim', name: 'Pilgrim Ring of the Vow', slot: 'ring2',
    flavor: 'A vow-ring sworn at the journey’s turning: to strike true at the end of it.',
    effects: { damageBonus: 1 }, effectLine: '+1 weapon damage on every hit',
  },
  {
    id: 'pilgrim-cincture', setId: 'pilgrim', name: 'Pilgrim Cincture', slot: 'belt',
    flavor: 'A rope cincture knotted once for each shrine; the bound soul mends as it walks.',
    effects: { lifestealPct: 3 }, effectLine: 'Heal 3% of the damage you deal',
  },
  {
    id: 'pilgrim-sandals', setId: 'pilgrim', name: 'Pilgrim Sandals', slot: 'boots',
    flavor: 'Sandals worn to the thickness of a prayer, and still they carry you.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
  },

  // --- Warlord's Panoply (Fighter, GRAND 9-piece full kit) -----------------
  {
    id: 'warlord-blade', setId: 'warlord', name: 'Warlord Blade', slot: 'mainHand',
    flavor: 'A commander’s longsword, balanced for the killing stroke at the end of a charge.',
    effects: { damageBonus: 2 }, effectLine: '+2 weapon damage on every hit',
    enhancement: 2, classGate: 'fighter',
  },
  {
    id: 'warlord-bulwark', setId: 'warlord', name: 'Warlord Bulwark', slot: 'offHand',
    flavor: 'A tower shield blazoned with a sigil men learned not to charge.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
    enhancement: 1, classGate: 'fighter',
  },
  {
    id: 'warlord-plate', setId: 'warlord', name: 'Warlord Plate', slot: 'armor',
    flavor: 'Full plate dented at every seam and never once breached.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    enhancement: 2, classGate: 'fighter',
  },
  {
    id: 'warlord-greathelm', setId: 'warlord', name: 'Warlord Greathelm', slot: 'helm',
    flavor: 'A crowned greathelm; through its slit the killing opening always shows.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'fighter',
  },
  {
    id: 'warlord-torc', setId: 'warlord', name: 'Warlord Torc', slot: 'amulet',
    flavor: 'A war-torc of twisted gold, weight enough to steady any second blow.',
    effects: { followupDamageBonus: 3 }, effectLine: '+3 damage on each follow-up swing',
    classGate: 'fighter',
  },
  {
    id: 'warlord-ring-command', setId: 'warlord', name: 'Warlord Ring of Command', slot: 'ring1',
    flavor: 'A signet that has ordered a thousand to hold the line — and they held.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
    classGate: 'fighter',
  },
  {
    id: 'warlord-ring-war', setId: 'warlord', name: 'Warlord Ring of War', slot: 'ring2',
    flavor: 'A blood-iron band that hums when the killing work begins.',
    effects: { damageBonus: 2 }, effectLine: '+2 weapon damage on every hit',
    classGate: 'fighter',
  },
  {
    id: 'warlord-warbelt', setId: 'warlord', name: 'Warlord War-Belt', slot: 'belt',
    flavor: 'A broad campaign belt heavy with the trophies of held ground.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
    classGate: 'fighter',
  },
  {
    id: 'warlord-sabatons', setId: 'warlord', name: 'Warlord Sabatons', slot: 'boots',
    flavor: 'Steel-shod sabatons that do not step back, whatever crosses the field.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
    classGate: 'fighter',
  },

  // --- Ruinhide (Barbarian, 4-piece — rage bruiser) ------------------------
  {
    id: 'ruinhide-fang', setId: 'ruinhide', name: 'Ruinhide Fang', slot: 'amulet',
    flavor: 'A great predator’s fang on a thong of gut — the rage runs hotter for the wearing.',
    effects: { rageDamageBonus: 3 }, effectLine: '+3 melee damage while Rage burns',
    classGate: 'barbarian',
  },
  {
    id: 'ruinhide-band', setId: 'ruinhide', name: 'Ruinhide Band', slot: 'ring1',
    flavor: 'A bone band filed to a saw’s teeth; its wounds are slow to close.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    classGate: 'barbarian',
  },
  {
    id: 'ruinhide-girdle', setId: 'ruinhide', name: 'Ruinhide Girdle', slot: 'belt',
    flavor: 'A girdle of layered hide that drinks a little life back from each kill.',
    effects: { lifestealPct: 4 }, effectLine: 'Heal 4% of the damage you deal',
    classGate: 'barbarian',
  },
  {
    id: 'ruinhide-treads', setId: 'ruinhide', name: 'Ruinhide Treads', slot: 'boots',
    flavor: 'Wraps of dire-beast hide that carry the fury into the first exchange.',
    effects: { tempHpPerCombat: 5 }, effectLine: 'Gain 5 temporary HP at the start of each fight',
    classGate: 'barbarian',
  },

  // --- Nightveil (Rogue, 4-piece — sneak & crit) ---------------------------
  {
    id: 'nightveil-cowl', setId: 'nightveil', name: 'Nightveil Cowl', slot: 'helm',
    flavor: 'A hood of light-eating cloth; the throat it finds never hears it come.',
    effects: { sneakDamageBonus: 3 }, effectLine: '+3 sneak-attack damage',
    classGate: 'rogue',
  },
  {
    id: 'nightveil-pendant', setId: 'nightveil', name: 'Nightveil Pendant', slot: 'amulet',
    flavor: 'A shard of black glass that shows the killing opening a heartbeat early.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'rogue',
  },
  {
    id: 'nightveil-ring', setId: 'nightveil', name: 'Nightveil Ring', slot: 'ring1',
    flavor: 'A thief’s ring worn smooth, sure on hilt and lock alike.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
    classGate: 'rogue',
  },
  {
    id: 'nightveil-treads', setId: 'nightveil', name: 'Nightveil Treads', slot: 'boots',
    flavor: 'Felt-soled treads that leave no sound for a mark to startle at.',
    effects: { sneakDamageBonus: 2 }, effectLine: '+2 sneak-attack damage',
    classGate: 'rogue',
  },

  // --- Wolfpack Kit (Ranger, 4-piece — mark & bleed hunter) ----------------
  {
    id: 'wolfpack-hood', setId: 'wolfpack', name: 'Wolfpack Hood', slot: 'helm',
    flavor: 'A grey-wolf hood that sharpens the eye for the quarry already bleeding.',
    effects: { markDamageBonus: 3 }, effectLine: '+3 damage to your marked quarry',
    classGate: 'ranger',
  },
  {
    id: 'wolfpack-fang', setId: 'wolfpack', name: 'Wolfpack Fang', slot: 'amulet',
    flavor: 'A pack-leader’s fang on a cord — what it opens does not close.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    classGate: 'ranger',
  },
  {
    id: 'wolfpack-band', setId: 'wolfpack', name: 'Wolfpack Band', slot: 'ring1',
    flavor: 'A hunter’s ring notched once for every quarry that did not get away.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
    classGate: 'ranger',
  },
  {
    id: 'wolfpack-quiver', setId: 'wolfpack', name: 'Wolfpack Quiver', slot: 'belt',
    flavor: 'A worn belt-quiver whose every shaft seems to find the marked one.',
    effects: { markDamageBonus: 2 }, effectLine: '+2 damage to your marked quarry',
    classGate: 'ranger',
  },

  // --- Cloudstep (Monk, 3-piece — speed & poise) ---------------------------
  {
    id: 'cloudstep-band', setId: 'cloudstep', name: 'Cloudstep Band', slot: 'amulet',
    flavor: 'A jade band that hangs weightless, as if the wearer were already half air.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
    classGate: 'monk',
  },
  {
    id: 'cloudstep-wraps', setId: 'cloudstep', name: 'Cloudstep Wraps', slot: 'ring1',
    flavor: 'Hand-wraps worn to silk that guide the strike to the opening.',
    effects: { attackBonus: 1 }, effectLine: '+1 to attack rolls',
    classGate: 'monk',
  },
  {
    id: 'cloudstep-sash', setId: 'cloudstep', name: 'Cloudstep Sash', slot: 'belt',
    flavor: 'A long sash that snaps taut at the first blow and holds the breath steady.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
    classGate: 'monk',
  },

  // --- Oathbound (Paladin, 5-piece — radiant bulwark) ----------------------
  {
    id: 'oathbound-helm', setId: 'oathbound', name: 'Oathbound Helm', slot: 'helm',
    flavor: 'A visored helm graven with a vow no blow has yet made the wearer break.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
    classGate: 'paladin',
  },
  {
    id: 'oathbound-amulet', setId: 'oathbound', name: 'Oathbound Amulet', slot: 'amulet',
    flavor: 'A reliquary medallion that hums warm when the oath is kept in blood.',
    effects: { damageBonus: 2 }, effectLine: '+2 weapon damage on every hit',
    classGate: 'paladin',
  },
  {
    id: 'oathbound-ring', setId: 'oathbound', name: 'Oathbound Ring', slot: 'ring1',
    flavor: 'A signet of the order; the wounds it deals feed the hand that keeps faith.',
    effects: { lifestealPct: 4 }, effectLine: 'Heal 4% of the damage you deal',
    classGate: 'paladin',
  },
  {
    id: 'oathbound-belt', setId: 'oathbound', name: 'Oathbound Belt', slot: 'belt',
    flavor: 'A consecrated war-belt that stands the bearer up when lesser men would fall.',
    effects: { tempHpPerCombat: 5 }, effectLine: 'Gain 5 temporary HP at the start of each fight',
    classGate: 'paladin',
  },
  {
    id: 'oathbound-sabatons', setId: 'oathbound', name: 'Oathbound Sabatons', slot: 'boots',
    flavor: 'Blessed sabatons that hold the line where the oath was first sworn.',
    effects: { acBonus: 1 }, effectLine: '+1 AC',
    classGate: 'paladin',
  },

  // --- Arcanist's Study (Wizard, 4-piece — spell power) --------------------
  {
    id: 'arcanist-circlet', setId: 'arcanist', name: 'Arcanist Circlet', slot: 'helm',
    flavor: 'A thin silver circlet that keeps the mind cold and the working precise.',
    effects: { spellDamageBonus: 2 }, effectLine: '+2 spell damage',
    classGate: 'wizard',
  },
  {
    id: 'arcanist-pendant', setId: 'arcanist', name: 'Arcanist Pendant', slot: 'amulet',
    flavor: 'A focus-crystal pendant that makes a working harder to shrug off.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'wizard',
  },
  {
    id: 'arcanist-ring', setId: 'arcanist', name: 'Arcanist Ring', slot: 'ring1',
    flavor: 'A scholar’s signet that steadies the hand that aims the spell.',
    effects: { spellAttackBonus: 1 }, effectLine: '+1 to spell attack rolls',
    classGate: 'wizard',
  },
  {
    id: 'arcanist-sash', setId: 'arcanist', name: 'Arcanist Sash', slot: 'belt',
    flavor: 'A rune-stitched sash that wards the body while the mind is elsewhere.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
    classGate: 'wizard',
  },

  // --- Greenmantle (Druid, 5-piece — nature caster/sustain) ----------------
  {
    id: 'greenmantle-crown', setId: 'greenmantle', name: 'Greenmantle Crown', slot: 'helm',
    flavor: 'A crown of living briar that answers when the wild is called.',
    effects: { spellDamageBonus: 2 }, effectLine: '+2 spell damage',
    classGate: 'druid',
  },
  {
    id: 'greenmantle-charm', setId: 'greenmantle', name: 'Greenmantle Charm', slot: 'amulet',
    flavor: 'A seed-pod charm that knits the bearer whole the way the forest mends.',
    effects: { regenPerTurn: 1 }, effectLine: 'Regenerate 1 HP each turn',
    classGate: 'druid',
  },
  {
    id: 'greenmantle-ring', setId: 'greenmantle', name: 'Greenmantle Ring', slot: 'ring1',
    flavor: 'A ring of woven root that lends the wild’s call a harder edge.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'druid',
  },
  {
    id: 'greenmantle-cord', setId: 'greenmantle', name: 'Greenmantle Cord', slot: 'belt',
    flavor: 'A girdle of green vine that thickens the hide before the first blow.',
    effects: { tempHpPerCombat: 5 }, effectLine: 'Gain 5 temporary HP at the start of each fight',
    classGate: 'druid',
  },
  {
    id: 'greenmantle-boots', setId: 'greenmantle', name: 'Greenmantle Boots', slot: 'boots',
    flavor: 'Bark-soled boots that draw a little life up from the ground with each step.',
    effects: { lifestealPct: 3 }, effectLine: 'Heal 3% of the damage you deal',
    classGate: 'druid',
  },

  // --- Troubadour's Motley (Bard, 3-piece — song & sustain) ----------------
  {
    id: 'troubadour-cap', setId: 'troubadour', name: 'Troubadour Cap', slot: 'helm',
    flavor: 'A feathered cap that makes every cutting verse land a little sharper.',
    effects: { spellDamageBonus: 2 }, effectLine: '+2 spell damage',
    classGate: 'bard',
  },
  {
    id: 'troubadour-medallion', setId: 'troubadour', name: 'Troubadour Medallion', slot: 'amulet',
    flavor: 'A guild medallion that makes a mocking working harder to ignore.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'bard',
  },
  {
    id: 'troubadour-ring', setId: 'troubadour', name: 'Troubadour Ring', slot: 'ring1',
    flavor: 'A ring that turns a little of the song’s bite back into the singer.',
    effects: { spellLifestealPct: 4 }, effectLine: 'Heal 4% of the damage your spells deal',
    classGate: 'bard',
  },

  // --- Warsong (Fighter-bound) ---------------------------------------------
  {
    id: 'warsong-gauntlet', setId: 'warsong', name: 'Warsong Gauntlet', slot: 'belt',
    flavor: 'A war-leader’s gauntlet, its knuckles scarred from a hundred charges.',
    effects: { followupDamageBonus: 3 }, effectLine: '+3 damage on each follow-up swing',
    classGate: 'fighter',
  },
  {
    id: 'warsong-crest', setId: 'warsong', name: 'Warsong Crest', slot: 'helm',
    flavor: 'A crested helm that turns a battle-cry into something men follow.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    classGate: 'fighter',
  },

  // --- Ironclad Vow (Fighter, NG+) -----------------------------------------
  {
    id: 'ironclad-banner', setId: 'ironclad', name: 'Ironclad Banner', slot: 'mainHand',
    flavor: 'A war-standard half-burned and never lowered; its haft strikes like the line it rallies.',
    effects: { followupDamageBonus: 2 }, effectLine: '+2 damage on each follow-up swing',
    enhancement: 2, classGate: 'fighter', ascensionExclusive: true,
  },
  {
    id: 'ironclad-greaves', setId: 'ironclad', name: 'Ironclad Greaves', slot: 'armor',
    flavor: 'Plate that has held a line no enemy crossed, dented but never turned.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    enhancement: 2, classGate: 'fighter', ascensionExclusive: true,
  },
  {
    id: 'ironclad-helm', setId: 'ironclad', name: 'Ironclad Helm', slot: 'helm',
    flavor: 'A line-captain’s greathelm, the visor worn smooth by oaths sworn through it.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'fighter', ascensionExclusive: true,
  },

  // --- Bloodrage Wrath (Barbarian, NG+, GRAND 8-piece) ---------------------
  {
    id: 'bloodrage-fang', setId: 'bloodrage', name: 'Bloodrage Greataxe', slot: 'mainHand',
    flavor: 'A two-handed axe of dire-beast bone and black iron; the rage runs down the haft into the edge.',
    effects: { rageDamageBonus: 4 }, effectLine: '+4 melee damage while Rage burns',
    enhancement: 2, classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-pelt', setId: 'bloodrage', name: 'Bloodrage Pelt', slot: 'armor',
    flavor: 'The hide of a thing that died screaming, and screams a little still when the rage takes you.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    enhancement: 2, classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-totem', setId: 'bloodrage', name: 'Bloodrage Totem', slot: 'amulet',
    flavor: 'Bone and red ochre bound with sinew — the ancestors lean close when it is carried into the dark.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-helm', setId: 'bloodrage', name: 'Bloodrage Skullhelm', slot: 'helm',
    flavor: 'A helm cut from a great beast’s skull; through its empty eyes the killing blow comes easy.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-ring', setId: 'bloodrage', name: 'Bloodrage Tusk-Ring', slot: 'ring1',
    flavor: 'A ring of yellowed tusk that drinks a little life back from every wound it opens.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-band', setId: 'bloodrage', name: 'Bloodrage Sinew-Band', slot: 'ring2',
    flavor: 'Braided sinew that tightens as the fury rises, lending the arm a deeper savagery.',
    effects: { rageDamageBonus: 2 }, effectLine: '+2 melee damage while Rage burns',
    classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-belt', setId: 'bloodrage', name: 'Bloodrage Girdle', slot: 'belt',
    flavor: 'A wide girdle of stitched hides, heavy with the weight of every kill it has carried.',
    effects: { damageBonus: 2 }, effectLine: '+2 weapon damage on every hit',
    classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-boots', setId: 'bloodrage', name: 'Bloodrage Treads', slot: 'boots',
    flavor: 'Wraps of beast-leather that knit the body back together between blows.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    classGate: 'barbarian', ascensionExclusive: true,
  },

  // --- Wildstalker's Garb (Ranger, NG+) ------------------------------------
  {
    id: 'wildstalker-pelt', setId: 'wildstalker', name: 'Wildstalker Pelt', slot: 'armor',
    flavor: 'A predator’s hide that drinks a little of every kill and gives some warmth back.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    enhancement: 2, classGate: 'ranger', ascensionExclusive: true,
  },
  {
    id: 'wildstalker-cowl', setId: 'wildstalker', name: 'Wildstalker Cowl', slot: 'helm',
    flavor: 'A hood of oiled leaf and shadow; under it, the marked quarry never quite leaves your sight.',
    effects: { markDamageBonus: 3 }, effectLine: '+3 damage against your Hunter’s Mark target',
    classGate: 'ranger', ascensionExclusive: true,
  },
  {
    id: 'wildstalker-quiver', setId: 'wildstalker', name: 'Wildstalker Quiver', slot: 'belt',
    flavor: 'Fletched with feathers from birds that hunt in silence; the draw finds the gap of its own accord.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'ranger', ascensionExclusive: true,
  },

  // --- Vestments of the Archmagi (Wizard, NG+, GRAND 9-piece) --------------
  {
    id: 'archmagi-wand', setId: 'archmagi', name: 'Wand of the Archmagi', slot: 'mainHand',
    flavor: 'A slim rod of starmetal that hums when law is spoken near it; the ruin it shapes bites deeper.',
    effects: { spellDamageBonus: 3 }, effectLine: '+3 spell damage',
    enhancement: 2, classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-orb', setId: 'archmagi', name: 'Orb of the Archmagi', slot: 'offHand',
    flavor: 'A sphere of frozen quintessence; spoken law settles into the world a fraction harder around it.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-vestments', setId: 'archmagi', name: 'Vestments of the Archmagi', slot: 'armor',
    flavor: 'Indigo silk sewn with cold-burning sigils; the weave thins the wall between word and ruin.',
    effects: { spellDamageBonus: 3 }, effectLine: '+3 spell damage',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-amulet', setId: 'archmagi', name: 'Amulet of the Archmagi', slot: 'amulet',
    flavor: 'A pendant of glass that holds a fixed star; the eye behind the spell never wavers.',
    effects: { spellAttackBonus: 1 }, effectLine: '+1 spell attack rolls',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-helm', setId: 'archmagi', name: 'Crown of the Archmagi', slot: 'helm',
    flavor: 'A circlet of blued silver; the law it crowns the wearer with settles a fraction harder.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-ring', setId: 'archmagi', name: 'Ring of the Archmagi', slot: 'ring1',
    flavor: 'A band that holds an extra breath of the Weft for the one who knows how to spend it.',
    effects: { bonusSpellSlotsL1: 1 }, effectLine: '+1 level-1 spell slot (refills on rest)',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-band', setId: 'archmagi', name: 'Band of the Archmagi', slot: 'ring2',
    flavor: 'A ring of cold iron etched with a single closing sigil; the ruin it shapes runs deeper.',
    effects: { spellDamageBonus: 2 }, effectLine: '+2 spell damage',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-girdle', setId: 'archmagi', name: 'Girdle of the Archmagi', slot: 'belt',
    flavor: 'A sash of woven sigil-thread; the aim behind the spell steadies under it.',
    effects: { spellAttackBonus: 1 }, effectLine: '+1 spell attack rolls',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-slippers', setId: 'archmagi', name: 'Slippers of the Archmagi', slot: 'boots',
    flavor: 'Soft shoes that walk the wearer a half-step out of harm and knit small hurts as they go.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    classGate: 'wizard', ascensionExclusive: true,
  },

  // --- Greenwarden's Mantle (Druid, NG+) -----------------------------------
  {
    id: 'greenwarden-mantle', setId: 'greenwarden', name: 'Greenwarden Mantle', slot: 'armor',
    flavor: 'Living moss and bark grown into a cloak; it knits the wearer’s hurts as it does the forest’s.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    enhancement: 2, classGate: 'druid', ascensionExclusive: true,
  },
  {
    id: 'greenwarden-circlet', setId: 'greenwarden', name: 'Greenwarden Circlet', slot: 'helm',
    flavor: 'A ring of braided green wood that never dries; the old growl of the wild speaks louder through it.',
    effects: { spellDamageBonus: 3 }, effectLine: '+3 spell damage',
    classGate: 'druid', ascensionExclusive: true,
  },
  {
    id: 'greenwarden-seed', setId: 'greenwarden', name: 'Greenwarden Seed', slot: 'amulet',
    flavor: 'A seed that quickens against the skin; what it takes from the foe, it returns to the bearer as sap.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    classGate: 'druid', ascensionExclusive: true,
  },

  // --- Shadowdancer's Suite (Rogue, NG+) -----------------------------------
  {
    id: 'shadowdancer-blade', setId: 'shadowdancer', name: 'Shadowdancer Blade', slot: 'mainHand',
    flavor: 'A fang of black glass that drinks the light off its own edge; it bites true more often than it should.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    enhancement: 2, classGate: 'rogue', ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-cloak', setId: 'shadowdancer', name: 'Shadowdancer Cloak', slot: 'armor',
    flavor: 'It pools like spilled ink and pays the wearer back a little life for every wound dealt.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    enhancement: 2, classGate: 'rogue', ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-cowl', setId: 'shadowdancer', name: 'Shadowdancer Cowl', slot: 'helm',
    flavor: 'A cowl woven from the dark between torches; the killing strike finds the seam every time.',
    effects: { sneakDamageBonus: 3 }, effectLine: '+3 damage on the strike Sneak Attack fires',
    classGate: 'rogue', ascensionExclusive: true,
  },

  // --- Revenant's Resolve (universal, NG+) ---------------------------------
  {
    id: 'revenant-heart', setId: 'revenant', name: 'Revenant Heart', slot: 'amulet',
    flavor: 'A heart of cold iron that beats only when its bearer has died at least once. It has.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-shroud', setId: 'revenant', name: 'Revenant Shroud', slot: 'boots',
    flavor: 'Grave-linen that refused to stay in the grave; the wounds beneath it close on their own.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-chain', setId: 'revenant', name: 'Revenant Chain', slot: 'ring1',
    flavor: 'A length of funeral chain that binds a fragment of the wheel to the one who carries it.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    ascensionExclusive: true,
  },

  // --- Conqueror's Wake (universal, NG+) -----------------------------------
  {
    id: 'conqueror-crown', setId: 'conqueror', name: 'Conqueror Crown', slot: 'helm',
    flavor: 'Beaten from the melted crowns of kings who fell to the chain. It weighs more than gold should.',
    effects: { bleedDamage: 4 }, effectLine: 'Your blows rend for +4 bleed damage',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-gauntlet', setId: 'conqueror', name: 'Conqueror Gauntlet', slot: 'ring1',
    flavor: 'A gauntlet that has closed on a hundred surrenders; the killing eye comes easy to its hand.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-sigil', setId: 'conqueror', name: 'Conqueror Sigil', slot: 'amulet',
    flavor: 'A war-seal that drinks the field’s spilled strength back into the one who holds the ground.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    ascensionExclusive: true,
  },
];

export const GEAR_SETS: GearSet[] = [
  {
    id: 'vigil',
    name: 'Aegis of the Vigil',
    flavor: 'Wargear of the wardens who never broke at the wall.',
    pieceIds: ['vigil-helm', 'vigil-mantle', 'vigil-heart'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 temporary HP each fight', bonuses: { tempHpPerCombat: 4 } },
      { piecesRequired: 3, label: '3-piece: heal 5% of the damage you deal', bonuses: { lifestealPct: 5 } },
    ],
  },
  {
    id: 'wayfarer',
    name: "Wayfarer's Kit",
    flavor: 'The road-worn gear of those who walk every province and outlast them all.',
    pieceIds: ['wayfarer-charm', 'wayfarer-belt', 'wayfarer-treads'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 to attack rolls', bonuses: { attackBonus: 1 } },
      { piecesRequired: 3, label: '3-piece: +2 weapon damage and +1 AC', bonuses: { damageBonus: 2, acBonus: 1 } },
    ],
  },
  {
    id: 'lanternkeeper',
    name: "Lanternkeeper's Watch",
    flavor: 'The kit of the night-watch who held the wall until dawn, and held it again.',
    pieceIds: ['lanternkeeper-helm', 'lanternkeeper-charm', 'lanternkeeper-signet', 'lanternkeeper-cord'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +6 temporary HP each fight', bonuses: { tempHpPerCombat: 6 } },
      { piecesRequired: 4, label: '4-piece: +2 AC and regenerate 2 HP each turn', bonuses: { acBonus: 2, regenPerTurn: 2 } },
    ],
  },
  {
    id: 'gravewright',
    name: "Gravewright's Due",
    flavor: 'A grave-tender’s tools — what the field spills, they gather quietly back.',
    pieceIds: ['gravewright-locket', 'gravewright-band', 'gravewright-seal', 'gravewright-girdle'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: heal 4% of the damage you deal', bonuses: { lifestealPct: 4 } },
      { piecesRequired: 4, label: '4-piece: +4 bleed damage and heal 5% more', bonuses: { bleedDamage: 4, lifestealPct: 5 } },
    ],
  },
  {
    id: 'pilgrim',
    name: "Pilgrim's Reliquary",
    flavor: 'A full reliquary gathered shrine by shrine — the complete pilgrimage made armour.',
    pieceIds: [
      'pilgrim-circlet', 'pilgrim-reliquary', 'pilgrim-ring-road',
      'pilgrim-ring-vow', 'pilgrim-cincture', 'pilgrim-sandals',
    ],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 AC', bonuses: { acBonus: 1 } },
      { piecesRequired: 4, label: '4-piece: +2 weapon damage and +1 to attack rolls', bonuses: { damageBonus: 2, attackBonus: 1 } },
      {
        piecesRequired: 6,
        label: '6-piece: +10 temporary HP each fight, critical hits land on 19–20, and heal 5% of the damage you deal',
        bonuses: { tempHpPerCombat: 10, critRangeBonus: 1, lifestealPct: 5 },
      },
    ],
  },
  {
    id: 'warlord',
    name: "Warlord's Panoply",
    flavor: 'The full war-kit of a line-breaking commander — every piece worn, nothing left to chance.',
    classGate: 'fighter',
    pieceIds: [
      'warlord-blade', 'warlord-bulwark', 'warlord-plate', 'warlord-greathelm', 'warlord-torc',
      'warlord-ring-command', 'warlord-ring-war', 'warlord-warbelt', 'warlord-sabatons',
    ],
    bonuses: [
      { piecesRequired: 3, label: '3-piece: +2 weapon damage on every hit', bonuses: { damageBonus: 2 } },
      { piecesRequired: 6, label: '6-piece: +6 temporary HP each fight and +1 to attack rolls', bonuses: { tempHpPerCombat: 6, attackBonus: 1 } },
      {
        piecesRequired: 9,
        label: '9-piece: critical hits land on 19–20, +4 damage on each follow-up swing, and +2 AC',
        bonuses: { critRangeBonus: 1, followupDamageBonus: 4, acBonus: 2 },
      },
    ],
  },
  {
    id: 'ruinhide',
    name: 'Ruinhide Harness',
    flavor: 'Trophy-hide and beast-bone, strapped on to carry the fury into the fight.',
    classGate: 'barbarian',
    pieceIds: ['ruinhide-fang', 'ruinhide-band', 'ruinhide-girdle', 'ruinhide-treads'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +3 melee damage while Rage burns', bonuses: { rageDamageBonus: 3 } },
      { piecesRequired: 4, label: '4-piece: +4 bleed damage and heal 5% of the damage you deal', bonuses: { bleedDamage: 4, lifestealPct: 5 } },
    ],
  },
  {
    id: 'nightveil',
    name: 'Nightveil Garb',
    flavor: 'The soundless kit of a killer who is never seen until the blade is already in.',
    classGate: 'rogue',
    pieceIds: ['nightveil-cowl', 'nightveil-pendant', 'nightveil-ring', 'nightveil-treads'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 to attack rolls', bonuses: { attackBonus: 1 } },
      { piecesRequired: 4, label: '4-piece: critical hits land on 19–20 and +4 sneak-attack damage', bonuses: { critRangeBonus: 1, sneakDamageBonus: 4 } },
    ],
  },
  {
    id: 'wolfpack',
    name: 'Wolfpack Kit',
    flavor: 'A pack-hunter’s rig — it runs the marked quarry down and does not let the wound close.',
    classGate: 'ranger',
    pieceIds: ['wolfpack-hood', 'wolfpack-fang', 'wolfpack-band', 'wolfpack-quiver'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 to attack rolls', bonuses: { attackBonus: 1 } },
      { piecesRequired: 4, label: '4-piece: +4 damage to your marked quarry and +3 bleed damage', bonuses: { markDamageBonus: 4, bleedDamage: 3 } },
    ],
  },
  {
    id: 'cloudstep',
    name: 'Cloudstep Regalia',
    flavor: 'Featherweight wraps and jade — the kit of a fist that lands before the eye can follow.',
    classGate: 'monk',
    pieceIds: ['cloudstep-band', 'cloudstep-wraps', 'cloudstep-sash'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 AC', bonuses: { acBonus: 1 } },
      { piecesRequired: 3, label: '3-piece: critical hits land on 19–20 and +2 weapon damage', bonuses: { critRangeBonus: 1, damageBonus: 2 } },
    ],
  },
  {
    id: 'oathbound',
    name: 'Oathbound Regalia',
    flavor: 'The consecrated war-gear of a vow kept in blood — it stands where the oath was sworn.',
    classGate: 'paladin',
    pieceIds: ['oathbound-helm', 'oathbound-amulet', 'oathbound-ring', 'oathbound-belt', 'oathbound-sabatons'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +6 temporary HP each fight', bonuses: { tempHpPerCombat: 6 } },
      { piecesRequired: 3, label: '3-piece: +2 weapon damage on every hit', bonuses: { damageBonus: 2 } },
      { piecesRequired: 5, label: '5-piece: +2 AC and heal 5% of the damage you deal', bonuses: { acBonus: 2, lifestealPct: 5 } },
    ],
  },
  {
    id: 'arcanist',
    name: "Arcanist's Study",
    flavor: 'A working scholar’s focuses — they sharpen the spell and steel the body that casts it.',
    classGate: 'wizard',
    pieceIds: ['arcanist-circlet', 'arcanist-pendant', 'arcanist-ring', 'arcanist-sash'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 spell save DC', bonuses: { spellDcBonus: 1 } },
      { piecesRequired: 4, label: '4-piece: +3 spell damage and +1 to spell attack rolls', bonuses: { spellDamageBonus: 3, spellAttackBonus: 1 } },
    ],
  },
  {
    id: 'greenmantle',
    name: 'Greenmantle Vestments',
    flavor: 'Living briar and root grown into regalia — the wild lends its strength and its mending.',
    classGate: 'druid',
    pieceIds: ['greenmantle-crown', 'greenmantle-charm', 'greenmantle-ring', 'greenmantle-cord', 'greenmantle-boots'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 temporary HP each fight', bonuses: { tempHpPerCombat: 5 } },
      { piecesRequired: 3, label: '3-piece: +1 spell save DC', bonuses: { spellDcBonus: 1 } },
      { piecesRequired: 5, label: '5-piece: +3 spell damage and regenerate 2 HP each turn', bonuses: { spellDamageBonus: 3, regenPerTurn: 2 } },
    ],
  },
  {
    id: 'troubadour',
    name: "Troubadour's Motley",
    flavor: 'A wandering player’s kit — every cutting verse lands sharper and feeds the singer a little.',
    classGate: 'bard',
    pieceIds: ['troubadour-cap', 'troubadour-medallion', 'troubadour-ring'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +1 spell save DC', bonuses: { spellDcBonus: 1 } },
      { piecesRequired: 3, label: '3-piece: +3 spell damage and heal 4% of the damage your spells deal', bonuses: { spellDamageBonus: 3, spellLifestealPct: 4 } },
    ],
  },
  {
    id: 'warsong',
    name: 'Warsong Panoply',
    flavor: 'A war-leader’s regalia, forged for those who lead the charge.',
    classGate: 'fighter',
    pieceIds: ['warsong-gauntlet', 'warsong-crest'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: crits land on 19-20, +2 follow-up damage',
        bonuses: { critRangeBonus: 1, followupDamageBonus: 2 },
      },
    ],
  },
  {
    id: 'ironclad',
    name: 'Ironclad Vow',
    flavor: 'The regalia of a line-captain who never gave ground, sworn anew across the wheel.',
    classGate: 'fighter',
    ascensionExclusive: true,
    pieceIds: ['ironclad-banner', 'ironclad-greaves', 'ironclad-helm'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 damage on each follow-up swing', bonuses: { followupDamageBonus: 4 } },
      {
        piecesRequired: 3,
        label: '3-piece: +8 temporary HP each fight, and crits land on 19–20',
        bonuses: { tempHpPerCombat: 8, critRangeBonus: 1 },
      },
    ],
  },
  {
    id: 'bloodrage',
    name: 'Bloodrage Wrath',
    flavor: 'The full war-trophies of a soul that learned to carry its fury back through every death.',
    classGate: 'barbarian',
    ascensionExclusive: true,
    pieceIds: [
      'bloodrage-fang', 'bloodrage-pelt', 'bloodrage-totem', 'bloodrage-helm',
      'bloodrage-ring', 'bloodrage-band', 'bloodrage-belt', 'bloodrage-boots',
    ],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 melee damage while Rage burns', bonuses: { rageDamageBonus: 4 } },
      {
        piecesRequired: 4,
        label: '4-piece: +8 temporary HP each fight, and crits land on 19–20',
        bonuses: { tempHpPerCombat: 8, critRangeBonus: 1 },
      },
      {
        piecesRequired: 6,
        label: '6-piece: +5 bleed damage, and heal 6% of the damage you deal',
        bonuses: { bleedDamage: 5, lifestealPct: 6 },
      },
      {
        piecesRequired: 8,
        label: '8-piece: +6 melee damage while Rage burns, and +3 damage on every hit',
        bonuses: { rageDamageBonus: 6, damageBonus: 3 },
      },
    ],
  },
  {
    id: 'wildstalker',
    name: "Wildstalker's Garb",
    flavor: 'A hunter’s gear worn so long across so many lives that the quarry forgets it can be unseen.',
    classGate: 'ranger',
    ascensionExclusive: true,
    pieceIds: ['wildstalker-pelt', 'wildstalker-cowl', 'wildstalker-quiver'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 damage against your Hunter’s Mark target', bonuses: { markDamageBonus: 5 } },
      { piecesRequired: 3, label: '3-piece: heal 6% of the damage you deal', bonuses: { lifestealPct: 6 } },
    ],
  },
  {
    id: 'archmagi',
    name: 'Vestments of the Archmagi',
    flavor: 'The full panoply of a mage who outlived the spells that should have ended them.',
    classGate: 'wizard',
    ascensionExclusive: true,
    pieceIds: [
      'archmagi-wand', 'archmagi-orb', 'archmagi-vestments', 'archmagi-amulet',
      'archmagi-helm', 'archmagi-ring', 'archmagi-band', 'archmagi-girdle', 'archmagi-slippers',
    ],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 spell damage and +1 spell attack', bonuses: { spellDamageBonus: 4, spellAttackBonus: 1 } },
      { piecesRequired: 4, label: '4-piece: +1 spell save DC and +1 level-1 spell slot', bonuses: { spellDcBonus: 1, bonusSpellSlotsL1: 1 } },
      { piecesRequired: 6, label: '6-piece: +6 spell damage', bonuses: { spellDamageBonus: 6 } },
      {
        piecesRequired: 9,
        label: '9-piece: +2 spell save DC, +2 spell attack, and +1 level-1 spell slot',
        bonuses: { spellDcBonus: 2, spellAttackBonus: 2, bonusSpellSlotsL1: 1 },
      },
    ],
  },
  {
    id: 'greenwarden',
    name: "Greenwarden's Mantle",
    flavor: 'Living gear grown for a warden of the wild who tends their own wounds as the forest’s.',
    classGate: 'druid',
    ascensionExclusive: true,
    pieceIds: ['greenwarden-mantle', 'greenwarden-circlet', 'greenwarden-seed'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: regenerate 3 HP each turn', bonuses: { regenPerTurn: 3 } },
      { piecesRequired: 3, label: '3-piece: +4 spell damage and heal 5% of the damage you deal', bonuses: { spellDamageBonus: 4, lifestealPct: 5 } },
    ],
  },
  {
    id: 'shadowdancer',
    name: "Shadowdancer's Suite",
    flavor: 'The dark-woven kit of a killer who steps between lives the way they step between shadows.',
    classGate: 'rogue',
    ascensionExclusive: true,
    pieceIds: ['shadowdancer-blade', 'shadowdancer-cloak', 'shadowdancer-cowl'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 damage on the strike Sneak Attack fires', bonuses: { sneakDamageBonus: 5 } },
      { piecesRequired: 3, label: '3-piece: crits land on 19–20, and heal 5% of the damage you deal', bonuses: { critRangeBonus: 1, lifestealPct: 5 } },
    ],
  },
  {
    id: 'revenant',
    name: "Revenant's Resolve",
    flavor: 'Grave-gear that only answers to a soul the wheel has already carried back from death.',
    ascensionExclusive: true,
    pieceIds: ['revenant-heart', 'revenant-shroud', 'revenant-chain'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +8 temporary HP each fight', bonuses: { tempHpPerCombat: 8 } },
      { piecesRequired: 3, label: '3-piece: regenerate 3 HP each turn, and heal 5% of the damage you deal', bonuses: { regenPerTurn: 3, lifestealPct: 5 } },
    ],
  },
  {
    id: 'conqueror',
    name: "Conqueror's Wake",
    flavor: 'Forged from the spoils of cleared chains, for the soul that takes ground and keeps it.',
    ascensionExclusive: true,
    pieceIds: ['conqueror-crown', 'conqueror-gauntlet', 'conqueror-sigil'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 bleed damage', bonuses: { bleedDamage: 5 } },
      { piecesRequired: 3, label: '3-piece: crits land on 19–20, and heal 6% of the damage you deal', bonuses: { critRangeBonus: 1, lifestealPct: 6 } },
    ],
  },
];

const SET_BY_ID = new Map(GEAR_SETS.map((s) => [s.id, s]));
const PIECE_BY_ID = new Map(SET_PIECES.map((p) => [p.id, p]));

/** Stable id list of every set piece — drop pools, validity checks. */
export const SET_PIECE_ORDER: readonly string[] = SET_PIECES.map((p) => p.id);

export function getGearSet(id: string): GearSet | undefined {
  return SET_BY_ID.get(id);
}

export function getSetPiece(id: string): SetPiece | undefined {
  return PIECE_BY_ID.get(id);
}

/** The set a piece belongs to, if any. */
export function setForPiece(pieceId: string): GearSet | undefined {
  const piece = PIECE_BY_ID.get(pieceId);
  return piece ? SET_BY_ID.get(piece.setId) : undefined;
}

/** Whether a set piece may be EQUIPPED by a character of the given class. */
export function canEquipSetPiece(id: string, classId: ClassId): boolean {
  const piece = PIECE_BY_ID.get(id);
  if (!piece) return false;
  return !piece.classGate || piece.classGate === classId;
}

/**
 * Sets a class can EARN pieces of: every universal set plus that class's own
 * bound sets, with the Ascension-exclusive (New Game+) sets folded in only when
 * `allowExclusive`. The unlock-on-find drop (metaStore.grantSetPieceDrop) picks
 * a set from here, marks it unlocked, and hands over one of its class-legal pieces.
 */
export function setDropPool(classId: ClassId, allowExclusive: boolean): GearSet[] {
  return GEAR_SETS.filter(
    (s) => (!s.classGate || s.classGate === classId) && (allowExclusive || !s.ascensionExclusive),
  );
}

/**
 * Every met set-tier bonus from the currently-equipped set-piece ids, as a flat
 * list of effect payloads (each met threshold contributes its own entry; they
 * stack).
 */
export function computeSetBonuses(activeIds: readonly string[]): AffixModifiers[] {
  const active = new Set(activeIds);
  const out: AffixModifiers[] = [];
  for (const set of GEAR_SETS) {
    const have = set.pieceIds.filter((id) => active.has(id)).length;
    if (have < 2) continue;
    for (const tier of set.bonuses) {
      if (have >= tier.piecesRequired) out.push(tier.bonuses);
    }
  }
  return out;
}

/** Total pieces that make up a set — its "size" (3 up to the grand 8/9-piece sets). */
export function setSize(set: GearSet): number {
  return set.pieceIds.length;
}

/** How many pieces of a set are in the given active-id list (set-progress UI). */
export function setProgress(set: GearSet, activeIds: readonly string[]): number {
  const active = new Set(activeIds);
  return set.pieceIds.filter((id) => active.has(id)).length;
}

/**
 * The effect payloads of the given set pieces PLUS any completed-set bonuses, as
 * a flat list. The engine calls this LIVE on the WORN pieces
 * (engine/items/setGear.equippedSetMods → characterAffixMods), folding each entry
 * into the shared affix pipeline so the effects ride every channel the engine
 * already reads. The pieces' base stats + `+N` enhancement ride the normal
 * equipment path instead.
 */
export function aggregateSetEffects(ids: readonly string[]): AffixModifiers[] {
  const out: AffixModifiers[] = [];
  for (const id of ids) {
    const piece = PIECE_BY_ID.get(id);
    if (piece) out.push(piece.effects);
  }
  out.push(...computeSetBonuses(ids));
  return out;
}
