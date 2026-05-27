import {
  type CastResult,
  type CastSpellContext,
  castAreaEvocation,
} from './helpers';

export function castLightningBolt(ctx: CastSpellContext): CastResult {
  return castAreaEvocation(ctx, 'lightning-bolt');
}
