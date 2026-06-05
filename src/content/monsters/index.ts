import type { Monster } from '../../schemas/monster';
import { GOBLIN } from './goblin';
import { GOBLIN_WARDEN } from './goblin-warden';
import { SKELETON } from './skeleton';
import { KOBOLD } from './kobold';
import { ILYICH } from './duergar-ilyich';
import { DUST_MEPHIT } from './dust-mephit';
import { ANIMATED_ARMOR } from './animated-armor';
import { BUGBEAR } from './bugbear';
import { IMP } from './imp';
import { STIRGE } from './stirge';
import { GHOUL } from './ghoul';
import { HOBGOBLIN } from './hobgoblin';
import { CULT_FANATIC } from './cult-fanatic';
import { SHADOW } from './shadow';
import { COWLED_ENFORCER } from './cowled-enforcer';
import { SLAVER_CUIRASSIER } from './slaver-cuirassier';
import { ATHKATLA_MAGISTRATE } from './athkatla-magistrate';
import { BANDIT_CAPTAIN } from './bandit-captain';
import { DUST_MEPHIT_ELDER } from './dust-mephit-elder';
import { BONE_STALKER } from './bone-stalker';
import { SHADOW_HOUND } from './shadow-hound';
import { MAD_MAGE_PRISONER } from './mad-mage-prisoner';
import { BONEBOUND_TEST_SUBJECT } from './bonebound-test-subject';
import { HOLLOW_SAGE } from './hollow-sage';
import { WARDENS_APPRENTICE } from './wardens-apprentice';
import { SLAYER_HOUND } from './slayer-hound';
import { ASYLUM_DIRECTOR } from './asylum-director';
import { DROW_WARRIOR } from './drow-warrior';
import { DROW_CROSSBOWMAN } from './drow-crossbowman';
import { DRIDERLING } from './driderling';
import { DRIDER } from './drider';
import { MIND_FLAYER_FRAGMENT } from './mind-flayer-fragment';
import { DROW_MATRON_MOTHER } from './drow-matron-mother';
import { PLAGUEBOUND_CUR } from './plaguebound-cur';
import { CELL_WIGHT } from './cell-wight';
import { FAMISHED_GHAST } from './famished-ghast';
import { DUERGAR_TASKMASTER } from './duergar-taskmaster';
import { COWLED_CONJURER } from './cowled-conjurer';
import { LASH_CAPTAIN } from './lash-captain';
import { COWLED_WARDPRIEST } from './cowled-wardpriest';
import { GIBBERING_HUSK } from './gibbering-husk';
import { MIND_LEECH } from './mind-leech';
import { SPHERE_ABERRATION } from './sphere-aberration';
import { ASYLUM_FLESHWRIGHT } from './asylum-fleshwright';
import { HOLLOW_GAZE } from './hollow-gaze';
import { WITNESS_MOTE } from './witness-mote';
import { GLOAMING_EYE } from './gloaming-eye';
// ─── Elite-identity pass · bespoke ELITE leaders for Ch1–3 ────────────────
import { BUGBEAR_HEADSMAN } from './bugbear-headsman';
import { HOBGOBLIN_DRILLMASTER } from './hobgoblin-drillmaster';
import { IMP_NEEDLER } from './imp-needler';
import { GALLOWS_WIGHT } from './gallows-wight';
import { COWLED_MAGUS } from './cowled-magus';
import { COWLED_HOUNDMASTER } from './cowled-houndmaster';
import { SLAVER_OVERSEER } from './slaver-overseer';
import { WARDEN_LICTOR } from './warden-lictor';
import { SPIDER_BROODMOTHER } from './spider-broodmother';
import { DROW_WAR_PRIESTESS } from './drow-war-priestess';
import { CAVERN_HUNTING_SPIDER } from './cavern-hunting-spider';
import { REBORN_HUSK } from './reborn-husk';
import { ASHEN_CHORISTER } from './ashen-chorister';
import { HOLLOW_SERAPH } from './hollow-seraph';
import { CYCLE_SHEPHERD } from './cycle-shepherd';
import { DEATHLESS_PENITENT } from './deathless-penitent';
import { GODSBLOOD_WELTER } from './godsblood-welter';
import { APOSTLE_OF_STILLNESS } from './apostle-of-stillness';
import { STARFLENSED_MAWN } from './starflensed-mawn';
import { FALLEN_ARCHON } from './fallen-archon';
import { HOLLOW_DAWN } from './hollow-dawn';
// ─── Chapter 6 · Beyond the Godwake (bestiary; wiring deferred) ───────────
import { THREADBARE_PENITENT } from './threadbare-penitent';
import { CYCLE_REVENANT } from './cycle-revenant';
import { FATE_SPINNER } from './fate-spinner';
import { LOOM_APOSTLE } from './loom-apostle';
import { KARMIC_ECHO } from './karmic-echo';
import { THE_UNWOUND } from './the-unwound';
import { AXLE_WARDEN } from './axle-warden';
import { THE_UNMADE } from './the-unmade';
// ─── Chapter 7 · The Drowned Archive ──────────────────────────────────────
import { DROWNED_ACOLYTE } from './drowned-acolyte';
import { PAGE_WRAITH } from './page-wraith';
import { INK_DROWNED_SCHOLAR } from './ink-drowned-scholar';
import { BRINE_ARCHIVIST } from './brine-archivist';
import { DROWNED_MNEMONIC } from './drowned-mnemonic';
import { THE_UNINDEXED } from './the-unindexed';
import { TIDEBOUND_CODEX } from './tidebound-codex';
import { DROWNED_CUSTODIAN } from './drowned-custodian';
// ─── Chapter 8 · The Ashfall March (bestiary) ─────────────────────────────
import { EMBER_CONSCRIPT } from './ember-conscript';
import { CINDERWAKE_HOUND } from './cinderwake-hound';
import { SLAGBOUND_LEGIONARY } from './slagbound-legionary';
import { ASHCHOKE_HERALD } from './ashchoke-herald';
import { GRAVESMOKE_REVENANT } from './gravesmoke-revenant';
import { PYRE_CHAPLAIN } from './pyre-chaplain';
import { SLAG_COLOSSUS } from './slag-colossus';
import { ASHEN_MARSHAL } from './ashen-marshal';
// ─── Chapter 9 · The Court of Masks ───────────────────────────────────────
import { MASQUE_WISP } from './masque-wisp';
import { MIRROR_DOUBLE } from './mirror-double';
import { VEILSWORN_COURTIER } from './veilsworn-courtier';
import { GLASSWRIGHT_DUELIST } from './glasswright-duelist';
import { PALE_FAVOURITE } from './pale-favourite';
import { MASQUERADE_WARDEN } from './masquerade-warden';
import { MASK_CHAMBERLAIN } from './mask-chamberlain';
import { THE_HOLLOW_PRETENDER } from './the-hollow-pretender';
// ─── Chapter 10 · Suldanessellar (the Tree of Life) ───────────────────────
import { BODHI_SPAWN } from './bodhi-spawn';
import { SULDANESSELLAR_ARCHER } from './suldanessellar-archer';
import { SULDANESSELLAR_BLADESINGER } from './suldanessellar-bladesinger';
import { SULDANESSELLAR_WARPRIEST } from './suldanessellar-warpriest';
import { DEFILED_DRYAD } from './defiled-dryad';
import { DEFILED_TREANT } from './defiled-treant';
import { PALACE_GOLEM } from './palace-golem';
import { RAKSHASA } from './rakshasa';
import { NIZIDRAMANIIYT } from './nizidramaniiyt';
// ─── Chapter 11 · The Trials of the Pit (Hell + Irenicus) ─────────────────
import { MIRROR_OF_PRIDE } from './mirror-of-pride';
import { DEVOURER_OF_SELFISHNESS } from './devourer-of-selfishness';
import { HOARDING_FIEND_OF_GREED } from './hoarding-fiend-of-greed';
import { AVATAR_OF_WRATH } from './avatar-of-wrath';
import { WRAITH_OF_FEAR } from './wraith-of-fear';
import { SLAYER_SHADE } from './slayer-shade';
import { SPINED_ABISHAI } from './spined-abishai';
import { IRENICUS } from './irenicus';
// ─── Chapter 12 · The Siege of Saradush (Yaga-Shura) ──────────────────────
import { SARADUSH_MARAUDER } from './saradush-marauder';
import { BURNING_DEAD } from './burning-dead';
import { FIRE_GIANT } from './fire-giant';
import { FIRE_GIANT_SHAMAN } from './fire-giant-shaman';
import { FIRE_GIANT_WARLORD } from './fire-giant-warlord';
import { HALF_GIANT_SIEGEBREAKER } from './half-giant-siegebreaker';
import { GROMNIR_DEFENDER } from './gromnir-defender';
import { YAGA_SHURA } from './yaga-shura';
// ─── Chapter 13 · The Last of the Five (Sendai + Abazigal) ────────────────
import { SENDAI_HANDMAIDEN } from './sendai-handmaiden';
import { KUO_TOA_DEEPGUARD } from './kuo-toa-deepguard';
import { PETRIFIED_AMBUSHER } from './petrified-ambusher';
import { BLUE_WYRMLING } from './blue-wyrmling';
import { STORMSCALE_DRAKE } from './stormscale-drake';
import { HALF_DRAGON_REAVER } from './half-dragon-reaver';
import { SENDAI } from './sendai';
import { ABAZIGAL } from './abazigal';
// ─── Chapter 14 · The Throne of Bhaal (Melissan) ──────────────────────────
import { BHAAL_ESSENCE_MOTE } from './bhaal-essence-mote';
import { BLOOD_FIEND } from './blood-fiend';
import { ESSENCE_WARDEN } from './essence-warden';
import { MARILITH_WARDEN } from './marilith-warden';
import { MURDER_HERALD } from './murder-herald';
import { SLAYER_ECHO } from './slayer-echo';
import { THRONE_ABISHAI } from './throne-abishai';
import { MELISSAN } from './melissan';
// ─── Ascension-only elites (Ascension ≥ 2; mixed into every chapter) ──────
import { ASCENDANT_SLAYER } from './ascendant-slayer';
import { VOID_WARDEN } from './void-warden';
import { DEATHLESS_ASCENDANT } from './deathless-ascendant';

const ALL_MONSTERS: Monster[] = [
  GOBLIN,
  GOBLIN_WARDEN,
  SKELETON,
  KOBOLD,
  ILYICH,
  DUST_MEPHIT,
  ANIMATED_ARMOR,
  BUGBEAR,
  IMP,
  STIRGE,
  GHOUL,
  HOBGOBLIN,
  CULT_FANATIC,
  SHADOW,
  COWLED_ENFORCER,
  SLAVER_CUIRASSIER,
  ATHKATLA_MAGISTRATE,
  BANDIT_CAPTAIN,
  DUST_MEPHIT_ELDER,
  BONE_STALKER,
  SHADOW_HOUND,
  MAD_MAGE_PRISONER,
  BONEBOUND_TEST_SUBJECT,
  HOLLOW_SAGE,
  WARDENS_APPRENTICE,
  SLAYER_HOUND,
  ASYLUM_DIRECTOR,
  DROW_WARRIOR,
  DROW_CROSSBOWMAN,
  DRIDERLING,
  DRIDER,
  MIND_FLAYER_FRAGMENT,
  DROW_MATRON_MOTHER,
  PLAGUEBOUND_CUR,
  CELL_WIGHT,
  FAMISHED_GHAST,
  DUERGAR_TASKMASTER,
  COWLED_CONJURER,
  LASH_CAPTAIN,
  COWLED_WARDPRIEST,
  GIBBERING_HUSK,
  MIND_LEECH,
  SPHERE_ABERRATION,
  ASYLUM_FLESHWRIGHT,
  // ─── Chapter 3 · the blind eye-tyrant (the Hollow Gaze) ─────────────────
  HOLLOW_GAZE,
  WITNESS_MOTE,
  GLOAMING_EYE,
  SPIDER_BROODMOTHER,
  DROW_WAR_PRIESTESS,
  CAVERN_HUNTING_SPIDER,
  REBORN_HUSK,
  ASHEN_CHORISTER,
  HOLLOW_SERAPH,
  CYCLE_SHEPHERD,
  DEATHLESS_PENITENT,
  GODSBLOOD_WELTER,
  APOSTLE_OF_STILLNESS,
  STARFLENSED_MAWN,
  FALLEN_ARCHON,
  HOLLOW_DAWN,
  // ─── Elite-identity pass · bespoke ELITE leaders for Ch1–3 ──────────────
  BUGBEAR_HEADSMAN,
  HOBGOBLIN_DRILLMASTER,
  IMP_NEEDLER,
  GALLOWS_WIGHT,
  COWLED_MAGUS,
  COWLED_HOUNDMASTER,
  SLAVER_OVERSEER,
  WARDEN_LICTOR,
  // ─── Chapter 6 · Beyond the Godwake ─────────────────────────────────────
  THREADBARE_PENITENT,
  CYCLE_REVENANT,
  FATE_SPINNER,
  LOOM_APOSTLE,
  KARMIC_ECHO,
  THE_UNWOUND,
  AXLE_WARDEN,
  THE_UNMADE,
  // ─── Chapter 7 · The Drowned Archive ────────────────────────────────────
  DROWNED_ACOLYTE,
  PAGE_WRAITH,
  INK_DROWNED_SCHOLAR,
  BRINE_ARCHIVIST,
  DROWNED_MNEMONIC,
  THE_UNINDEXED,
  TIDEBOUND_CODEX,
  DROWNED_CUSTODIAN,
  // ─── Chapter 8 · The Ashfall March ──────────────────────────────────────
  EMBER_CONSCRIPT,
  CINDERWAKE_HOUND,
  SLAGBOUND_LEGIONARY,
  ASHCHOKE_HERALD,
  GRAVESMOKE_REVENANT,
  PYRE_CHAPLAIN,
  SLAG_COLOSSUS,
  ASHEN_MARSHAL,
  // ─── Chapter 9 · The Court of Masks ─────────────────────────────────────
  MASQUE_WISP,
  MIRROR_DOUBLE,
  VEILSWORN_COURTIER,
  GLASSWRIGHT_DUELIST,
  PALE_FAVOURITE,
  MASQUERADE_WARDEN,
  MASK_CHAMBERLAIN,
  THE_HOLLOW_PRETENDER,
  // ─── Chapter 10 · Suldanessellar ────────────────────────────────────────
  BODHI_SPAWN,
  SULDANESSELLAR_ARCHER,
  SULDANESSELLAR_BLADESINGER,
  SULDANESSELLAR_WARPRIEST,
  DEFILED_DRYAD,
  DEFILED_TREANT,
  PALACE_GOLEM,
  RAKSHASA,
  NIZIDRAMANIIYT,
  // ─── Chapter 11 · The Trials of the Pit ─────────────────────────────────
  MIRROR_OF_PRIDE,
  DEVOURER_OF_SELFISHNESS,
  HOARDING_FIEND_OF_GREED,
  AVATAR_OF_WRATH,
  WRAITH_OF_FEAR,
  SLAYER_SHADE,
  SPINED_ABISHAI,
  IRENICUS,
  // ─── Chapter 12 · The Siege of Saradush ─────────────────────────────────
  SARADUSH_MARAUDER,
  BURNING_DEAD,
  FIRE_GIANT,
  FIRE_GIANT_SHAMAN,
  FIRE_GIANT_WARLORD,
  HALF_GIANT_SIEGEBREAKER,
  GROMNIR_DEFENDER,
  YAGA_SHURA,
  // ─── Chapter 13 · The Last of the Five ──────────────────────────────────
  SENDAI_HANDMAIDEN,
  KUO_TOA_DEEPGUARD,
  PETRIFIED_AMBUSHER,
  BLUE_WYRMLING,
  STORMSCALE_DRAKE,
  HALF_DRAGON_REAVER,
  SENDAI,
  ABAZIGAL,
  // ─── Chapter 14 · The Throne of Bhaal ───────────────────────────────────
  BHAAL_ESSENCE_MOTE,
  BLOOD_FIEND,
  ESSENCE_WARDEN,
  MARILITH_WARDEN,
  MURDER_HERALD,
  SLAYER_ECHO,
  THRONE_ABISHAI,
  MELISSAN,
  // ─── Ascension-only elites (Ascension ≥ 2) ──────────────────────────────
  ASCENDANT_SLAYER,
  VOID_WARDEN,
  DEATHLESS_ASCENDANT,
];

const MONSTER_BY_ID: Map<string, Monster> = new Map(ALL_MONSTERS.map((m) => [m.id, m]));

/**
 * Test-only registry overrides. Engine paths re-derive a monster's canonical def
 * by id (intent resolution, multiattack, the boss-framework gate/phase reads), so
 * a fixture with bespoke fields must be resolvable by `getMonster`. Tests register
 * fixtures here and clear them afterwards; production never touches this map.
 * (Same shape as the `_reset*` counters used elsewhere for deterministic tests.)
 */
const TEST_MONSTER_OVERRIDES: Map<string, Monster> = new Map();

export function _setTestMonster(def: Monster): void {
  TEST_MONSTER_OVERRIDES.set(def.id, def);
}

export function _clearTestMonsters(): void {
  TEST_MONSTER_OVERRIDES.clear();
}

export function getMonster(id: string): Monster {
  const override = TEST_MONSTER_OVERRIDES.get(id);
  if (override) return override;
  const monster = MONSTER_BY_ID.get(id);
  if (!monster) {
    throw new Error(`Monster not found: ${id}`);
  }
  return monster;
}

export function listMonsters(): Monster[] {
  return ALL_MONSTERS;
}

export {
  GOBLIN,
  GOBLIN_WARDEN,
  SKELETON,
  KOBOLD,
  ILYICH,
  DUST_MEPHIT,
  ANIMATED_ARMOR,
  BUGBEAR,
  IMP,
  STIRGE,
  GHOUL,
  HOBGOBLIN,
  CULT_FANATIC,
  SHADOW,
  COWLED_ENFORCER,
  SLAVER_CUIRASSIER,
  ATHKATLA_MAGISTRATE,
  BANDIT_CAPTAIN,
  DUST_MEPHIT_ELDER,
  BONE_STALKER,
  SHADOW_HOUND,
  MAD_MAGE_PRISONER,
  BONEBOUND_TEST_SUBJECT,
  HOLLOW_SAGE,
  WARDENS_APPRENTICE,
  SLAYER_HOUND,
  ASYLUM_DIRECTOR,
  DROW_WARRIOR,
  DROW_CROSSBOWMAN,
  DRIDERLING,
  DRIDER,
  MIND_FLAYER_FRAGMENT,
  DROW_MATRON_MOTHER,
  PLAGUEBOUND_CUR,
  CELL_WIGHT,
  FAMISHED_GHAST,
  DUERGAR_TASKMASTER,
  COWLED_CONJURER,
  LASH_CAPTAIN,
  COWLED_WARDPRIEST,
  GIBBERING_HUSK,
  MIND_LEECH,
  SPHERE_ABERRATION,
  ASYLUM_FLESHWRIGHT,
  // ─── Chapter 3 · the blind eye-tyrant (the Hollow Gaze) ─────────────────
  HOLLOW_GAZE,
  WITNESS_MOTE,
  GLOAMING_EYE,
  SPIDER_BROODMOTHER,
  DROW_WAR_PRIESTESS,
  CAVERN_HUNTING_SPIDER,
  REBORN_HUSK,
  ASHEN_CHORISTER,
  HOLLOW_SERAPH,
  CYCLE_SHEPHERD,
  DEATHLESS_PENITENT,
  GODSBLOOD_WELTER,
  APOSTLE_OF_STILLNESS,
  STARFLENSED_MAWN,
  FALLEN_ARCHON,
  HOLLOW_DAWN,
  // ─── Elite-identity pass · bespoke ELITE leaders for Ch1–3 ──────────────
  BUGBEAR_HEADSMAN,
  HOBGOBLIN_DRILLMASTER,
  IMP_NEEDLER,
  GALLOWS_WIGHT,
  COWLED_MAGUS,
  COWLED_HOUNDMASTER,
  SLAVER_OVERSEER,
  WARDEN_LICTOR,
  // ─── Chapter 6 · Beyond the Godwake ─────────────────────────────────────
  THREADBARE_PENITENT,
  CYCLE_REVENANT,
  FATE_SPINNER,
  LOOM_APOSTLE,
  KARMIC_ECHO,
  THE_UNWOUND,
  AXLE_WARDEN,
  THE_UNMADE,
  // ─── Chapter 7 · The Drowned Archive ────────────────────────────────────
  DROWNED_ACOLYTE,
  PAGE_WRAITH,
  INK_DROWNED_SCHOLAR,
  BRINE_ARCHIVIST,
  DROWNED_MNEMONIC,
  THE_UNINDEXED,
  TIDEBOUND_CODEX,
  DROWNED_CUSTODIAN,
  // ─── Chapter 8 · The Ashfall March ──────────────────────────────────────
  EMBER_CONSCRIPT,
  CINDERWAKE_HOUND,
  SLAGBOUND_LEGIONARY,
  ASHCHOKE_HERALD,
  GRAVESMOKE_REVENANT,
  PYRE_CHAPLAIN,
  SLAG_COLOSSUS,
  ASHEN_MARSHAL,
  // ─── Chapter 9 · The Court of Masks ─────────────────────────────────────
  MASQUE_WISP,
  MIRROR_DOUBLE,
  VEILSWORN_COURTIER,
  GLASSWRIGHT_DUELIST,
  PALE_FAVOURITE,
  MASQUERADE_WARDEN,
  MASK_CHAMBERLAIN,
  THE_HOLLOW_PRETENDER,
  // ─── Chapter 10 · Suldanessellar ────────────────────────────────────────
  BODHI_SPAWN,
  SULDANESSELLAR_ARCHER,
  SULDANESSELLAR_BLADESINGER,
  SULDANESSELLAR_WARPRIEST,
  DEFILED_DRYAD,
  DEFILED_TREANT,
  PALACE_GOLEM,
  RAKSHASA,
  NIZIDRAMANIIYT,
  // ─── Chapter 11 · The Trials of the Pit ─────────────────────────────────
  MIRROR_OF_PRIDE,
  DEVOURER_OF_SELFISHNESS,
  HOARDING_FIEND_OF_GREED,
  AVATAR_OF_WRATH,
  WRAITH_OF_FEAR,
  SLAYER_SHADE,
  SPINED_ABISHAI,
  IRENICUS,
  // ─── Chapter 12 · The Siege of Saradush ─────────────────────────────────
  SARADUSH_MARAUDER,
  BURNING_DEAD,
  FIRE_GIANT,
  FIRE_GIANT_SHAMAN,
  FIRE_GIANT_WARLORD,
  HALF_GIANT_SIEGEBREAKER,
  GROMNIR_DEFENDER,
  YAGA_SHURA,
  // ─── Chapter 13 · The Last of the Five ──────────────────────────────────
  SENDAI_HANDMAIDEN,
  KUO_TOA_DEEPGUARD,
  PETRIFIED_AMBUSHER,
  BLUE_WYRMLING,
  STORMSCALE_DRAKE,
  HALF_DRAGON_REAVER,
  SENDAI,
  ABAZIGAL,
  // ─── Chapter 14 · The Throne of Bhaal ───────────────────────────────────
  BHAAL_ESSENCE_MOTE,
  BLOOD_FIEND,
  ESSENCE_WARDEN,
  MARILITH_WARDEN,
  MURDER_HERALD,
  SLAYER_ECHO,
  THRONE_ABISHAI,
  MELISSAN,
  // ─── Ascension-only elites (Ascension ≥ 2) ──────────────────────────────
  ASCENDANT_SLAYER,
  VOID_WARDEN,
  DEATHLESS_ASCENDANT,
};
