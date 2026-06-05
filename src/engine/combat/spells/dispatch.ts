import { getSpell } from '../../../content/spells';
import { markPlayerLog } from '../log';
import { type CastResult, type CastSpellContext, canCastSpell } from './helpers';
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
} from './highLevelBlasts';
import {
  castDissolution,
  castForceLance,
  castSoulSnare,
  castVoidRay,
  castWither,
} from './highLevelStrikes';
import { castExsanguinate, castVampiricTouch } from './lifeDrain';
import { castApotheosis, castUnmake } from './ninthLevel';
import { castRegrowth } from './regrowth';
import { castEntangle } from './entangle';
import { castSpiritBeast } from './spiritBeast';

/**
 * Cast a known spell. Stamps every roll/damage line the cast produced as the
 * player's own (markPlayerLog) so the combat log renders the hero's spell hits
 * and the damage they deal dominant over the enemy's lines — the choke point
 * that covers every spell at once, the new ones included.
 */
export function castSpell(ctx: CastSpellContext): CastResult {
  const beforeLog = new Set(ctx.state.log);
  const result = runCast(ctx);
  return result.cast
    ? { ...result, state: markPlayerLog(result.state, beforeLog) }
    : result;
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
    // Druid signature workings.
    case 'regrowth':
      return castRegrowth(cc);
    case 'entangle':
      return castEntangle(cc);
    case 'summon-beast':
      return castSpiritBeast(cc);
    default:
      // Exhaustive guard — if a new effectKey is added, this branch becomes
      // unreachable but keeps the switch honest.
      void roller;
      return { state, character, cast: false };
  }
}
