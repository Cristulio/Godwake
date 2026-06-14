import { getSpell } from '../../../content/spells';
import { appendLog, markPlayerLog } from '../log';
import { characterAffixMods } from '../../items/affixMods';
import { t } from '../../../i18n';
import type { CombatState } from '../../../types/combat';
import { type CastResult, type CastSpellContext, canCastSpell, nextLogId, necromancyLifestealPct } from './helpers';
import { castFireBolt } from './fireBolt';
import { castMagicMissile } from './magicMissile';
import { castBurningHands } from './burningHands';
import { castShield } from './shield';
import { castMageArmor } from './mageArmor';
import { castHoldPerson } from './holdPerson';
import { castMistyStep } from './mistyStep';
import { castScorchingRay } from './scorchingRay';
import { castBlur } from './blur';
import { castMirrorImage } from './mirrorImage';
import { castFireball } from './fireball';
import { castLightningBolt } from './lightningBolt';
import {
  castCataclysm,
  castGlacialCone,
  castRimeBlast,
  castStormcrash,
  castSunfireBurst,
  castThunderwave,
} from './highLevelBlasts';
import {
  castDissolution,
  castForceLance,
  castSoulSnare,
  castVoidRay,
  castWither,
} from './highLevelStrikes';
import { castExsanguinate, castVampiricTouch } from './lifeDrain';
import { castApotheosis, castShapeChange, castTimeStop, castUnmake } from './ninthLevel';
import { castPowerWordKill } from './powerWordKill';
import { castRegrowth } from './regrowth';
import { castEntangle } from './entangle';
import { castSpiritBeast } from './spiritBeast';
import { castViciousMockery } from './viciousMockery';

/**
 * Cast a known spell. Stamps every roll/damage line the cast produced as the
 * player's own (markPlayerLog) so the combat log renders the hero's spell hits
 * and the damage they deal dominant over the enemy's lines — the choke point
 * that covers every spell at once, the new ones included. The same choke point
 * applies the Soulthirst spell vamp, so no handler carries heal plumbing.
 */
export function castSpell(ctx: CastSpellContext): CastResult {
  const beforeLog = new Set(ctx.state.log);
  const hpBefore = monsterHpById(ctx.state);
  const result = runCast(ctx);
  if (!result.cast) return result;
  const drunk = applySpellLifesteal(result, hpBefore);
  return { ...drunk, state: markPlayerLog(drunk.state, beforeLog) };
}

/** Live monster HP keyed by combatant id — the pre-cast baseline the vamp diff reads. */
function monsterHpById(state: CombatState): Map<string, number> {
  const hp = new Map<string, number>();
  for (const c of state.combatants) {
    if (c.kind === 'monster') hp.set(c.id, Math.max(0, c.instance.hp.current));
  }
  return hp;
}

/**
 * Soulthirst (spellLifestealPct gear): heal the caster for a fraction of the
 * damage the cast dealt, min 1 whenever any landed, capped at max HP — the
 * spell-side mirror of the Vampiric weapon drink in playerAttack. "Dealt" is
 * the summed HP the pre-cast monsters lost (AOE included; a monster the cast
 * summoned or that left the field can only shrink its own term to zero, never
 * pollute the sum). Life Drain's inherent half-damage heal raises the CASTER's
 * HP, not a monster's, so it stacks on top untouched.
 */
function applySpellLifesteal(result: CastResult, hpBefore: Map<string, number>): CastResult {
  // Soulthirst gear + the Necromancy school's Grim Harvest sum into one drink.
  const pct =
    characterAffixMods(result.character).spellLifestealPct +
    necromancyLifestealPct(result.character);
  if (pct <= 0) return result;
  const { character } = result;
  if (character.hp.current >= character.hp.max) return result;

  let dealt = 0;
  const after = monsterHpById(result.state);
  for (const [id, before] of hpBefore) {
    dealt += Math.max(0, before - (after.get(id) ?? 0));
  }
  if (dealt <= 0) return result;

  const healed = Math.max(1, Math.floor((dealt * pct) / 100));
  const hpNow = Math.min(character.hp.max, character.hp.current + healed);
  const state = appendLog(result.state, {
    id: nextLogId(result.state),
    kind: 'system',
    text: t('combat.log.spellLifesteal', {
      name: character.name,
      amount: hpNow - character.hp.current,
    }),
  });
  return {
    state,
    character: { ...character, hp: { ...character.hp, current: hpNow } },
    cast: true,
  };
}

/**
 * Spell-by-spell switch — slot consumption and action marking handled inside
 * each branch so spells with unique cost shapes (e.g., Shield as a future
 * reaction) stay flexible. Returns updated combat state.
 */
function runCast(ctx: CastSpellContext): CastResult {
  const check = canCastSpell(ctx.character, ctx.spellId);
  if (!check.ok) return { state: ctx.state, character: ctx.character, cast: false };

  // Sealed Wards twist: blessings are inert this fight. Cast against a
  // blessing-stripped view of the character so the caster's spell blessings
  // (DC / damage / attack) don't fire — parity with the martial seal in
  // playerAttack. No other blessing mod is read during a cast, so an empty
  // blessing list is the whole effect.
  const sealed = ctx.state.blessingsSealed ?? false;
  const cc: CastSpellContext = sealed
    ? { ...ctx, character: { ...ctx.character, blessings: [] } }
    : ctx;
  const { character, state, spellId, roller } = cc;

  const spell = getSpell(spellId);
  switch (spell.effectKey) {
    case 'fire-bolt':
      return castFireBolt(cc);
    case 'magic-missile':
      return castMagicMissile(cc);
    case 'burning-hands':
      return castBurningHands(cc);
    case 'shield':
      return castShield(character, state);
    case 'mage-armor':
      return castMageArmor(character, state);
    case 'hold-person':
      return castHoldPerson(cc);
    case 'misty-step':
      return castMistyStep(character, state);
    case 'scorching-ray':
      return castScorchingRay(cc);
    case 'blur':
      return castBlur(character, state);
    case 'mirror-image':
      return castMirrorImage(character, state);
    case 'fireball':
      return castFireball(cc);
    case 'lightning-bolt':
      return castLightningBolt(cc);
    case 'rime-blast':
      return castRimeBlast(cc);
    case 'force-lance':
      return castForceLance(cc);
    case 'glacial-cone':
      return castGlacialCone(cc);
    case 'void-ray':
      return castVoidRay(cc);
    case 'sunfire-burst':
      return castSunfireBurst(cc);
    case 'dissolution':
      return castDissolution(cc);
    case 'stormcrash':
      return castStormcrash(cc);
    case 'soul-snare':
      return castSoulSnare(cc);
    case 'cataclysm':
      return castCataclysm(cc);
    case 'wither':
      return castWither(cc);
    case 'vampiric-touch':
      return castVampiricTouch(cc);
    case 'exsanguinate':
      return castExsanguinate(cc);
    case 'apotheosis':
      return castApotheosis(character, state);
    case 'unmake':
      return castUnmake(cc);
    case 'power-word-kill':
      return castPowerWordKill(cc);
    case 'time-stop':
      return castTimeStop(character, state);
    case 'shape-change':
      return castShapeChange(character, state);
    // Druid signature workings.
    case 'regrowth':
      return castRegrowth(cc);
    case 'entangle':
      return castEntangle(cc);
    case 'summon-beast':
      return castSpiritBeast(cc);
    // Bard signature workings.
    case 'vicious-mockery':
      return castViciousMockery(cc);
    case 'thunder-wave':
      return castThunderwave(cc);
    default:
      // Exhaustive guard — if a new effectKey is added, this branch becomes
      // unreachable but keeps the switch honest.
      void roller;
      return { state, character, cast: false };
  }
}
