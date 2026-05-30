import cultFanaticUrl from '../../assets/sprites/monsters/cult-fanatic.svg';
import shadowUrl from '../../assets/sprites/monsters/shadow.svg';
import cowledEnforcerUrl from '../../assets/sprites/monsters/cowled-enforcer.svg';
import slaverCuirassierUrl from '../../assets/sprites/monsters/slaver-cuirassier.svg';
import athkatlaMagistrateUrl from '../../assets/sprites/monsters/athkatla-magistrate.svg';
import stirgeUrl from '../../assets/sprites/monsters/stirge.svg';
import ghoulUrl from '../../assets/sprites/monsters/ghoul.svg';
import hobgoblinUrl from '../../assets/sprites/monsters/hobgoblin.svg';
import bugbearUrl from '../../assets/sprites/monsters/bugbear.svg';
import impUrl from '../../assets/sprites/monsters/imp.svg';
import duergarIlyichUrl from '../../assets/sprites/monsters/duergar-ilyich.svg';
import dustMephitUrl from '../../assets/sprites/monsters/dust-mephit.svg';
import animatedArmorUrl from '../../assets/sprites/monsters/animated-armor.svg';
import skeletonUrl from '../../assets/sprites/monsters/skeleton.svg';
import koboldUrl from '../../assets/sprites/monsters/kobold.svg';
import goblinUrl from '../../assets/sprites/monsters/goblin.svg';
import goblinWardenUrl from '../../assets/sprites/monsters/goblin-warden.svg';
import banditCaptainUrl from '../../assets/sprites/monsters/bandit-captain.svg';
import boneStalkerUrl from '../../assets/sprites/monsters/bone-stalker.svg';
import boneboundTestSubjectUrl from '../../assets/sprites/monsters/bonebound-test-subject.svg';
import driderUrl from '../../assets/sprites/monsters/drider.svg';
import driderlingUrl from '../../assets/sprites/monsters/driderling.svg';
import drowCrossbowmanUrl from '../../assets/sprites/monsters/drow-crossbowman.svg';
import drowMatronMotherUrl from '../../assets/sprites/monsters/drow-matron-mother.svg';
import drowWarriorUrl from '../../assets/sprites/monsters/drow-warrior.svg';
import hollowSageUrl from '../../assets/sprites/monsters/hollow-sage.svg';
import madMagePrisonerUrl from '../../assets/sprites/monsters/mad-mage-prisoner.svg';
import mindFlayerFragmentUrl from '../../assets/sprites/monsters/mind-flayer-fragment.svg';
import shadowHoundUrl from '../../assets/sprites/monsters/shadow-hound.svg';
import slayerHoundUrl from '../../assets/sprites/monsters/slayer-hound.svg';
import asylumDirectorUrl from '../../assets/sprites/monsters/asylum-director.svg';
import plagueboundCurUrl from '../../assets/sprites/monsters/plaguebound-cur.svg';
import cellWightUrl from '../../assets/sprites/monsters/cell-wight.svg';
import famishedGhastUrl from '../../assets/sprites/monsters/famished-ghast.svg';
import duergarTaskmasterUrl from '../../assets/sprites/monsters/duergar-taskmaster.svg';
import cowledConjurerUrl from '../../assets/sprites/monsters/cowled-conjurer.svg';
import lashCaptainUrl from '../../assets/sprites/monsters/lash-captain.svg';
import cowledWardpriestUrl from '../../assets/sprites/monsters/cowled-wardpriest.svg';
import gibberingHuskUrl from '../../assets/sprites/monsters/gibbering-husk.svg';
import mindLeechUrl from '../../assets/sprites/monsters/mind-leech.svg';
import sphereAberrationUrl from '../../assets/sprites/monsters/sphere-aberration.svg';
import asylumFleshwrightUrl from '../../assets/sprites/monsters/asylum-fleshwright.svg';
import hollowGazeUrl from '../../assets/sprites/monsters/hollow-gaze.svg';
import witnessMoteUrl from '../../assets/sprites/monsters/witness-mote.svg';
import gloamingEyeUrl from '../../assets/sprites/monsters/gloaming-eye.svg';
import spiderBroodmotherUrl from '../../assets/sprites/monsters/spider-broodmother.svg';
import drowWarPriestessUrl from '../../assets/sprites/monsters/drow-war-priestess.svg';
import cavernHuntingSpiderUrl from '../../assets/sprites/monsters/cavern-hunting-spider.svg';
import rebornHuskUrl from '../../assets/sprites/monsters/reborn-husk.svg';
import ashenChoristerUrl from '../../assets/sprites/monsters/ashen-chorister.svg';
import hollowSeraphUrl from '../../assets/sprites/monsters/hollow-seraph.svg';
import cycleShepherdUrl from '../../assets/sprites/monsters/cycle-shepherd.svg';
import deathlessPenitentUrl from '../../assets/sprites/monsters/deathless-penitent.svg';
import godsbloodWelterUrl from '../../assets/sprites/monsters/godsblood-welter.svg';
import apostleOfStillnessUrl from '../../assets/sprites/monsters/apostle-of-stillness.svg';
import starflensedMawnUrl from '../../assets/sprites/monsters/starflensed-mawn.svg';
import fallenArchonUrl from '../../assets/sprites/monsters/fallen-archon.svg';
import hollowDawnUrl from '../../assets/sprites/monsters/hollow-dawn.svg';
// ─── Chapter 6 · Beyond the Godwake ─────────────────────────────────────
import threadbarePenitentUrl from '../../assets/sprites/monsters/threadbare-penitent.svg';
import cycleRevenantUrl from '../../assets/sprites/monsters/cycle-revenant.svg';
import fateSpinnerUrl from '../../assets/sprites/monsters/fate-spinner.svg';
import loomApostleUrl from '../../assets/sprites/monsters/loom-apostle.svg';
import karmicEchoUrl from '../../assets/sprites/monsters/karmic-echo.svg';
import theUnwoundUrl from '../../assets/sprites/monsters/the-unwound.svg';
import axleWardenUrl from '../../assets/sprites/monsters/axle-warden.svg';
import theUnmadeUrl from '../../assets/sprites/monsters/the-unmade.svg';

interface MonsterPortraitProps {
  defId: string;
  className?: string;
}

// Sprite SVGs ship as separate asset files (see src/assets/sprites/monsters/),
// not inline in the JS bundle. The original inline SVG used
// preserveAspectRatio="xMidYMax meet"; the equivalent for <img> is
// object-fit: contain + object-position: bottom, which preserves the
// pixel-art aspect ratio while keeping feet on the floor of the container.
const SPRITE_STYLE = { objectFit: 'contain', objectPosition: 'bottom' } as const;

interface SpriteEntry {
  url: string;
  label: string;
}

const SPRITES: Record<string, SpriteEntry> = {
  goblin: { url: goblinUrl, label: 'Goblin' },
  'goblin-warden': { url: goblinWardenUrl, label: 'Goblin Warden' },
  skeleton: { url: skeletonUrl, label: 'Skeleton' },
  kobold: { url: koboldUrl, label: 'Kobold' },
  'duergar-ilyich': { url: duergarIlyichUrl, label: 'Ilyich the Duergar' },
  'dust-mephit': { url: dustMephitUrl, label: 'Dust Mephit' },
  'animated-armor': { url: animatedArmorUrl, label: 'Animated Armor' },
  bugbear: { url: bugbearUrl, label: 'Bugbear Brute' },
  imp: { url: impUrl, label: 'Imp' },
  stirge: { url: stirgeUrl, label: 'Stirge' },
  ghoul: { url: ghoulUrl, label: 'Ghoul' },
  hobgoblin: { url: hobgoblinUrl, label: 'Hobgoblin Soldier' },
  'cult-fanatic': { url: cultFanaticUrl, label: 'Cult Fanatic' },
  shadow: { url: shadowUrl, label: 'Shadow' },
  'cowled-enforcer': { url: cowledEnforcerUrl, label: 'Cowled Enforcer' },
  'slaver-cuirassier': { url: slaverCuirassierUrl, label: 'Slaver Cuirassier' },
  'athkatla-magistrate': { url: athkatlaMagistrateUrl, label: 'The Magistrate' },
  'bandit-captain': { url: banditCaptainUrl, label: 'Bandit Captain' },
  'bone-stalker': { url: boneStalkerUrl, label: 'Bone Stalker' },
  'bonebound-test-subject': { url: boneboundTestSubjectUrl, label: 'Bonebound Test Subject' },
  drider: { url: driderUrl, label: 'Drider' },
  driderling: { url: driderlingUrl, label: 'Driderling' },
  'drow-crossbowman': { url: drowCrossbowmanUrl, label: 'Drow Crossbowman' },
  'drow-matron-mother': { url: drowMatronMotherUrl, label: 'Drow Matron Mother' },
  'drow-warrior': { url: drowWarriorUrl, label: 'Drow Warrior' },
  'hollow-sage': { url: hollowSageUrl, label: 'Hollow Sage' },
  'mad-mage-prisoner': { url: madMagePrisonerUrl, label: 'Mad Mage Prisoner' },
  'mind-flayer-fragment': { url: mindFlayerFragmentUrl, label: 'Mind Flayer Fragment' },
  'shadow-hound': { url: shadowHoundUrl, label: 'Shadow Hound' },
  'slayer-hound': { url: slayerHoundUrl, label: 'Slayer Hound' },
  'asylum-director': { url: asylumDirectorUrl, label: 'The Asylum Director' },
  'plaguebound-cur': { url: plagueboundCurUrl, label: 'Plaguebound Cur' },
  'cell-wight': { url: cellWightUrl, label: 'Cell Wight' },
  'famished-ghast': { url: famishedGhastUrl, label: 'Famished Ghast' },
  'duergar-taskmaster': { url: duergarTaskmasterUrl, label: 'Duergar Taskmaster' },
  'cowled-conjurer': { url: cowledConjurerUrl, label: 'Cowled Conjurer' },
  'lash-captain': { url: lashCaptainUrl, label: 'Lash-Captain' },
  'cowled-wardpriest': { url: cowledWardpriestUrl, label: 'Cowled Wardpriest' },
  'gibbering-husk': { url: gibberingHuskUrl, label: 'Gibbering Husk' },
  'mind-leech': { url: mindLeechUrl, label: 'Mind Leech' },
  'sphere-aberration': { url: sphereAberrationUrl, label: 'Reknitting Horror' },
  'asylum-fleshwright': { url: asylumFleshwrightUrl, label: 'Asylum Fleshwright' },
  'hollow-gaze': { url: hollowGazeUrl, label: 'The Hollow Gaze' },
  'witness-mote': { url: witnessMoteUrl, label: 'Witness-Mote' },
  'gloaming-eye': { url: gloamingEyeUrl, label: 'Gloaming Eye' },
  'spider-broodmother': { url: spiderBroodmotherUrl, label: 'Spider Broodmother' },
  'drow-war-priestess': { url: drowWarPriestessUrl, label: 'Drow War-Priestess' },
  'cavern-hunting-spider': { url: cavernHuntingSpiderUrl, label: 'Cavern Hunting-Spider' },
  // ─── Chapter 5 · The Godwake ────────────────────────────────────────────
  'reborn-husk': { url: rebornHuskUrl, label: 'Reborn Husk' },
  'ashen-chorister': { url: ashenChoristerUrl, label: 'Ashen Chorister' },
  'hollow-seraph': { url: hollowSeraphUrl, label: 'Hollow Seraph' },
  'cycle-shepherd': { url: cycleShepherdUrl, label: 'Cycle-Shepherd' },
  'deathless-penitent': { url: deathlessPenitentUrl, label: 'Deathless Penitent' },
  'godsblood-welter': { url: godsbloodWelterUrl, label: 'Godsblood Welter' },
  'apostle-of-stillness': { url: apostleOfStillnessUrl, label: 'Apostle of Stillness' },
  'starflensed-mawn': { url: starflensedMawnUrl, label: 'Starflensed Mawn' },
  'fallen-archon': { url: fallenArchonUrl, label: 'Fallen Archon' },
  'hollow-dawn': { url: hollowDawnUrl, label: 'Aurelach, the Hollow Dawn' },
  // ─── Chapter 6 · Beyond the Godwake ───────────────────────────────────
  'threadbare-penitent': { url: threadbarePenitentUrl, label: 'Threadbare Penitent' },
  'cycle-revenant': { url: cycleRevenantUrl, label: 'Cycle-Revenant' },
  'fate-spinner': { url: fateSpinnerUrl, label: 'Fate-Spinner' },
  'loom-apostle': { url: loomApostleUrl, label: 'Loom-Apostle' },
  'karmic-echo': { url: karmicEchoUrl, label: 'Karmic Echo' },
  'the-unwound': { url: theUnwoundUrl, label: 'The Unwound' },
  'axle-warden': { url: axleWardenUrl, label: 'Axle-Warden' },
  'the-unmade': { url: theUnmadeUrl, label: 'The Unmade' },
  // Narrative-variant aliases: same sprite reused where the creature is
  // an explicit variant of another (bigger/elder version of the same thing).
  'dust-mephit-elder': { url: dustMephitUrl, label: 'Elder Dust Mephit' },
  'wardens-apprentice': { url: cowledEnforcerUrl, label: "Warden's Apprentice" },
};

export function MonsterPortrait({ defId, className = '' }: MonsterPortraitProps) {
  const entry = SPRITES[defId] ?? SPRITES.goblin;
  return <img src={entry.url} alt={entry.label} className={className} style={SPRITE_STYLE} />;
}
