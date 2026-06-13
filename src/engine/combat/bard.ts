import type { DiceRoller } from '../dice';
import type { DieSize } from '../../types/dice';
import type { BardSongId, Character } from '../../types/character';
import type { CombatState, CombatLogEntry } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { characterHasMechanic, effectiveAbilityScores } from '../character/derived';
import {
  combatResult,
  patchActionEconomy,
  patchResources,
  type CombatActionResult,
} from './types';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import { t } from '../../i18n';

/** True for the Charisma support-caster. */
export function isBard(character: Readonly<Character>): boolean {
  return character.classId === 'bard';
}

/**
 * The Bardic Inspiration die size at the Bard's current level — the SONG die.
 * Grows on the same cadence as the Monk's Martial Arts die — d6 → d8 (L5) →
 * d10 (L10) → d12 (L15) — so the music itself deepens as the soul does. Read
 * wherever a song's magnitude scales (the pulse tables below), rolled raw when
 * a Valor war-song rides a weapon hit or a playing song sharpens Vicious
 * Mockery, and spent defensively by Cutting Words. Zero for a non-Bard.
 */
export function bardInspirationDieSize(character: Readonly<Character>): DieSize {
  const lvl = character.level;
  if (lvl >= 15) return 12;
  if (lvl >= 10) return 10;
  if (lvl >= 5) return 8;
  return 6;
}

/**
 * Max Bardic Inspiration dice the Bard holds — the pool refreshed each encounter
 * (createCombat). This is the FUEL of the music: starting or switching a song
 * mid-fight spends one, and Lore's Cutting Words reaction sings off blows from
 * the same well. The base is the Charisma modifier (min 1, so a fresh Bard never
 * walks in mute); the chosen college's L10 beat (Lore's Duet / Valor Battle
 * Magic) deepens it by one, and the L20 capstone (Peerless Performer) by two
 * more. Zero for a non-Bard or one that hasn't learned the song kit yet.
 */
export function bardInspirationMax(character: Readonly<Character>): number {
  if (!isBard(character) || !characterHasMechanic(character as Character, 'bardic-inspiration')) {
    return 0;
  }
  const chaMod = abilityModifier(effectiveAbilityScores(character as Character).cha);
  const base = Math.max(1, chaMod);
  const collegeDeepening =
    characterHasMechanic(character as Character, 'the-duet') ||
    characterHasMechanic(character as Character, 'combat-superiority')
      ? 1
      : 0;
  const capstone = characterHasMechanic(character as Character, 'peerless-performer') ? 2 : 0;
  return base + collegeDeepening + capstone;
}

/** Inspiration dice the Bard has banked right now. */
export function bardInspirationLeft(character: Readonly<Character>): number {
  return character.resources.inspirationDiceRemaining ?? 0;
}

// ---- The Song engine --------------------------------------------------------
//
// The bard is never not performing: from L1 exactly one Song is always playing,
// a battlefield aura that pulses on its own at the start of every player turn
// (applyBardSongPulse in turn.ts — the same tick where rage/regen/DOTs live).
// The opening song is free (the music never stopped between fights); switching
// mid-fight is a bonus action + one inspiration die. ALL magnitudes below are
// PROVISIONAL, keyed to the song-die tier so they grow with the existing level
// axis — the end-of-campaign sim batch owns the final values.

/**
 * Shared song magnitude by die tier — Spite's pulse damage, Steel's flat
 * reduction, the Valor war-song's temp-HP pulse, and Lore's spell-damage amp
 * all read this one knob. PROVISIONAL.
 */
const SONG_POWER_BY_DIE: Record<number, number> = { 6: 2, 8: 3, 10: 4, 12: 5 };

/** The Leaden Dirge's drag on enemy attack rolls, by die tier. PROVISIONAL. */
const DIRGE_PENALTY_BY_DIE: Record<number, number> = { 6: 2, 8: 2, 10: 3, 12: 3 };

/** The shared tier magnitude at the bard's current die. */
export function bardSongPower(character: Readonly<Character>): number {
  return SONG_POWER_BY_DIE[bardInspirationDieSize(character)] ?? 2;
}

/** Every song the bard has learned, in book order. Spite and Steel open at L1
 *  with the song engine itself; the Dirge and the Reel ride their own
 *  level-gated class features. */
export function bardKnownSongs(character: Readonly<Character>): BardSongId[] {
  if (!isBard(character) || !characterHasMechanic(character as Character, 'bardic-inspiration')) {
    return [];
  }
  const songs: BardSongId[] = ['song-of-spite', 'song-of-steel'];
  if (characterHasMechanic(character as Character, 'leaden-dirge')) songs.push('leaden-dirge');
  if (characterHasMechanic(character as Character, 'quickstep-reel')) songs.push('quickstep-reel');
  return songs;
}

/** The songs currently playing (unknown ids filtered — a stale save never
 *  resurrects a song the soul doesn't know). */
export function bardActiveSongs(character: Readonly<Character>): BardSongId[] {
  const known = bardKnownSongs(character);
  return (character.activeSongIds ?? []).filter((s) => known.includes(s));
}

/** How many songs can play at once — one, or two under the Lore college's L10
 *  Duet (the music deepens). */
export function bardMaxActiveSongs(character: Readonly<Character>): number {
  return characterHasMechanic(character as Character, 'the-duet') ? 2 : 1;
}

/** True while any music plays — the gate for every "while the song plays" rider. */
export function bardSongPlaying(character: Readonly<Character>): boolean {
  return bardActiveSongs(character).length > 0;
}

/** Song of Steel: flat incoming-damage reduction while the march plays. Read in
 *  applyDamage beside the Paladin's Unbreakable Aura. */
export function bardSteelReduction(character: Readonly<Character>): number {
  return bardActiveSongs(character).includes('song-of-steel') ? bardSongPower(character) : 0;
}

/** Song of Spite: psychic damage every living enemy takes at each pulse. */
export function bardSpitePulseDamage(character: Readonly<Character>): number {
  return bardActiveSongs(character).includes('song-of-spite') ? bardSongPower(character) : 0;
}

/** The Leaden Dirge: the drag on enemy attack rolls while it plays. Read in
 *  monsterAttack's roll. */
export function bardDirgePenalty(character: Readonly<Character>): number {
  return bardActiveSongs(character).includes('leaden-dirge')
    ? (DIRGE_PENALTY_BY_DIE[bardInspirationDieSize(character)] ?? 2)
    : 0;
}

/** The Quickstep Reel: true when the pulse should hand the bard advantage on
 *  its next strike (the first swing each round rolls quickened). */
export function bardReelActive(character: Readonly<Character>): boolean {
  return bardActiveSongs(character).includes('quickstep-reel');
}

/**
 * College of Valor — the War-Song (L3): while ANY music plays, every weapon hit
 * automatically carries the song die as bonus damage (no banking — the war-skald
 * turns whatever is playing to war). Returns the die size to roll on the hit, or
 * 0 when silent / not a war-singer.
 */
export function bardWarSongDie(character: Readonly<Character>): DieSize | 0 {
  if (!characterHasMechanic(character as Character, 'war-song')) return 0;
  return bardSongPlaying(character) ? bardInspirationDieSize(character) : 0;
}

/** College of Valor — the war-song's temp-HP pulse (the front-line staying
 *  power). Granted at each pulse while music plays; temp HP takes the larger
 *  pool, never stacks. */
export function bardWarSongTempHp(character: Readonly<Character>): number {
  if (!characterHasMechanic(character as Character, 'war-song')) return 0;
  return bardSongPlaying(character) ? bardSongPower(character) : 0;
}

/** College of Lore — Resonant Lore (L3): flat spell-damage amp while the music
 *  plays. Folded into spellDamageBonus so every working reads it. */
export function bardLoreAmpDamage(character: Readonly<Character>): number {
  if (!characterHasMechanic(character as Character, 'resonant-lore')) return 0;
  return bardSongPlaying(character) ? bardSongPower(character) : 0;
}

/** College of Lore — Resonant Lore (L3): +1 spell save DC while the music
 *  plays. Folded into spellSaveDC. */
export function bardLoreAmpDc(character: Readonly<Character>): number {
  if (!characterHasMechanic(character as Character, 'resonant-lore')) return 0;
  return bardSongPlaying(character) ? 1 : 0;
}

// ---- College of Whispers — the dread-singer (the Controller) ----------------
//
// While a Song plays (a bard is never silent), the terror in it sings on its own
// and frightens the enemy — a frightened foe throws its blows at disadvantage
// (resolveSingleAttack / monsterAttack), so the controller wins by mitigation.
// The SAVE + frighten application lives in whispers.ts (it needs the roller and
// the spell save DC, which would cycle through here); these are the cheap
// predicates + the sim knobs. PROVISIONAL magnitudes — the sim owns the finals.

/** Bonus the dread save adds on top of the bard's spell save DC. 0 = a straight
 *  spell-DC save; raise if the fear sticks too rarely to define the build. */
export const WHISPERS_FEAR_DC_BONUS = 0;

/** Rounds a gripped foe stays frightened. Re-applied every player turn-start, so
 *  1 already keeps the foe shaken when it next acts; the knob is the safety dial. */
export const WHISPERS_FEAR_DURATION = 1;

/** College of Whispers — Words of Terror (L3): the song frightens on its own. */
export function hasWordsOfTerror(character: Readonly<Character>): boolean {
  return isBard(character) && characterHasMechanic(character as Character, 'words-of-terror');
}

/** College of Whispers — Mantle of Dread (L10): the dread grips EVERY living foe
 *  each round, not just the deadliest — mass control, the whole room at bay. */
export function hasMantleOfDread(character: Readonly<Character>): boolean {
  return isBard(character) && characterHasMechanic(character as Character, 'mantle-of-dread');
}

/** Mantle of Dread (L10): flat bonus damage the bard's every blow and working
 *  deals to a FRIGHTENED foe — the lever that turns the controller's fear into
 *  kills, the offense its siblings get from spell/weapon amps. Scales on the song
 *  tier (the shared +2→+5 ladder) like Lore's amp, so it grows with the soul.
 *  Read at the single damage chokepoint (applyDamage). Zero without the L10 beat. */
export function dreadTerrorBonus(character: Readonly<Character>): number {
  return hasMantleOfDread(character) ? bardSongPower(character) : 0;
}

/**
 * Vicious Mockery's dice count at the standard cantrip breakpoints —
 * 1d4 → 2d4 (L5) → 3d4 (L11) → 4d4 (L17). The dice ARE the level scaling (VM
 * does not also ride the multiplicative cantrip curve), so the insult grows
 * like a real cantrip across the campaign.
 */
export function bardViciousMockeryDice(level: number): number {
  if (level >= 17) return 4;
  if (level >= 11) return 3;
  if (level >= 5) return 2;
  return 1;
}

export interface BardContext {
  character: Character;
  state: CombatState;
}

/**
 * Strike up (or switch to) a Song — bonus action + one inspiration die. The new
 * song starts playing at once: its passive (Steel's dulling, the Dirge's drag)
 * applies immediately, and it joins the pulse at the next turn tick. Under the
 * Lore Duet a second song ADDS until both slots ring; at capacity the oldest
 * tune yields. Refused (state unchanged) when the song is unknown or already
 * playing, the bonus action is spent, or the well is dry.
 */
export function startBardSong(ctx: BardContext, songId: BardSongId): CombatActionResult {
  const { character, state } = ctx;
  if (!isBard(character)) return combatResult(state, character);
  if (!bardKnownSongs(character).includes(songId)) return combatResult(state, character);
  const active = bardActiveSongs(character);
  if (active.includes(songId)) return combatResult(state, character);
  if (character.actionEconomy.bonusActionUsed) return combatResult(state, character);
  if (bardInspirationLeft(character) <= 0) return combatResult(state, character);

  const max = bardMaxActiveSongs(character);
  const nextSongs =
    active.length < max ? [...active, songId] : [...active.slice(1), songId];

  let nextCharacter: Character = { ...character, activeSongIds: nextSongs };
  nextCharacter = patchResources(nextCharacter, {
    inspirationDiceRemaining: bardInspirationLeft(character) - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { bonusActionUsed: true });

  const log: CombatLogEntry = {
    id: state.log.length + 1,
    kind: 'narration',
    text: t('combat.log.songStrikeUp', {
      name: nextCharacter.name,
      song: t(`combat.songs.${songId}.name`),
    }),
  };
  return combatResult(attachCombatVfx(appendLog(state, log), 'song-pulse', 'player'), nextCharacter);
}

/**
 * College of Lore — Cutting Words. A reaction the Lore bard fires when a foe's
 * blow would land: spend an inspiration die to roll it off the enemy's attack
 * total. The engine only spends the die when it would actually flip the hit to a
 * miss (the smart-play auto-fire, mirroring the Wizard's Shield reaction), so the
 * scarce pool is never wasted on a blow that lands anyway. Spends the reaction;
 * a crit (nat 20) can't be cut. Returns the patched `{ state, character, hit }`,
 * or null to leave the incoming attack untouched.
 */
export function tryCuttingWords(
  character: Readonly<Character>,
  state: CombatState,
  ac: number,
  attackTotal: number,
  roller: DiceRoller,
): { state: CombatState; character: Character; hit: boolean } | null {
  if (!isBard(character)) return null;
  if (!characterHasMechanic(character as Character, 'cutting-words')) return null;
  if (character.actionEconomy.reactionUsed) return null;
  if (bardInspirationLeft(character) <= 0) return null;

  const die = roller.roll({ count: 1, die: bardInspirationDieSize(character), modifier: 0 });
  // Only spend the die when it would actually negate the hit.
  if (attackTotal - die.total >= ac) return null;

  let nextCharacter: Character = patchResources(character as Character, {
    inspirationDiceRemaining: bardInspirationLeft(character) - 1,
  });
  nextCharacter = patchActionEconomy(nextCharacter, { reactionUsed: true });

  const logged = appendLog(state, {
    id: state.log.length + 1,
    kind: 'system',
    text: t('combat.log.cuttingWords', { name: character.name, n: die.total }),
  });
  return { state: attachCombatVfx(logged, 'shield', 'player'), character: nextCharacter, hit: false };
}
