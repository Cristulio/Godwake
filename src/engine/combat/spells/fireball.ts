import {
  type CastResult,
  type CastSpellContext,
  castAreaEvocation,
} from './helpers';

export function castFireball(ctx: CastSpellContext): CastResult {
  return castAreaEvocation(ctx, 'fireball');
}
