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
    default:
      // Exhaustive guard — if a new effectKey is added, this branch becomes
      // unreachable but keeps the switch honest.
      void roller;
      return { state, character, cast: false };
  }
}
