import { getSpell } from '../../../content/spells';
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
import { castApotheosis, castUnmake } from './ninthLevel';

/**
 * Cast a known spell. Spell-by-spell switch — slot consumption and action
 * marking handled inside each branch so spells with unique cost shapes (e.g.,
 * Shield as a future reaction) stay flexible. Returns updated combat state.
 */
export function castSpell(ctx: CastSpellContext): CastResult {
  const { character, state, spellId, roller } = ctx;
  const check = canCastSpell(character, spellId);
  if (!check.ok) return { state, character, cast: false };

  const spell = getSpell(spellId);
  switch (spell.effectKey) {
    case 'fire-bolt':
      return castFireBolt(ctx);
    case 'magic-missile':
      return castMagicMissile(ctx);
    case 'burning-hands':
      return castBurningHands(ctx);
    case 'shield':
      return castShield(character, state);
    case 'mage-armor':
      return castMageArmor(character, state);
    case 'hold-person':
      return castHoldPerson(ctx);
    case 'misty-step':
      return castMistyStep(character, state);
    case 'scorching-ray':
      return castScorchingRay(ctx);
    case 'blur':
      return castBlur(character, state);
    case 'mirror-image':
      return castMirrorImage(character, state);
    case 'fireball':
      return castFireball(ctx);
    case 'lightning-bolt':
      return castLightningBolt(ctx);
    case 'rime-blast':
      return castRimeBlast(ctx);
    case 'force-lance':
      return castForceLance(ctx);
    case 'glacial-cone':
      return castGlacialCone(ctx);
    case 'void-ray':
      return castVoidRay(ctx);
    case 'sunfire-burst':
      return castSunfireBurst(ctx);
    case 'dissolution':
      return castDissolution(ctx);
    case 'stormcrash':
      return castStormcrash(ctx);
    case 'soul-snare':
      return castSoulSnare(ctx);
    case 'cataclysm':
      return castCataclysm(ctx);
    case 'wither':
      return castWither(ctx);
    case 'apotheosis':
      return castApotheosis(character, state);
    case 'unmake':
      return castUnmake(ctx);
    default:
      // Exhaustive guard — if a new effectKey is added, this branch becomes
      // unreachable but keeps the switch honest.
      void roller;
      return { state, character, cast: false };
  }
}
