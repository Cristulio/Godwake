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
};
