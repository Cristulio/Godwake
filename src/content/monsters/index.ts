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
];

const MONSTER_BY_ID: Map<string, Monster> = new Map(ALL_MONSTERS.map((m) => [m.id, m]));

export function getMonster(id: string): Monster {
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
};
