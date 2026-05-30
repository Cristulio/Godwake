import { describe, it, expect } from 'vitest';
import { resolveSpriteFloat, type FloatSelf } from './FloatingDamage';
import type { AttackEvent } from '../../types/combat';

function playerHit(over: Partial<AttackEvent> = {}): AttackEvent {
  return {
    id: 1,
    attackerName: 'Brick',
    targetName: 'Goblin',
    attackerKind: 'player',
    weaponName: 'Longsword',
    attackBonus: 5,
    natural: 14,
    total: 19,
    targetAC: 13,
    hit: true,
    crit: false,
    damageDealt: 8,
    ...over,
  };
}

const goblin: FloatSelf = { kind: 'monster', displayName: 'Goblin' };

describe('resolveSpriteFloat', () => {
  it('shows the true rolled damage on a fresh landing hit, ignoring tiny HP delta (the "1-damage" bug)', () => {
    // A crit deals 18 but the goblin only had 1 HP left — the clamped HP delta
    // is 1. The float must read the event's damageDealt, not the delta.
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 7, crit: true, damageDealt: 18 }),
      self: goblin,
      hpDelta: 1,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 18, kind: 'crit' });
  });

  it('shows the full number on a non-crit overkill (delta clamped below damage)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 3, damageDealt: 12 }),
      self: goblin,
      hpDelta: 4,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 12, kind: 'damage' });
  });

  it('surfaces the hit even when temp HP soaks the whole blow (no HP delta)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 4, damageDealt: 9 }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toEqual({ amount: 9, kind: 'damage' });
  });

  it('damageDealt already folds in off-type/affix bonuses — whatever it is, that is what shows', () => {
    // weapon-type 6 + 2 radiant off-type = 8 baked into damageDealt.
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 5, damageDealt: 8 }),
      self: goblin,
      hpDelta: 8,
      isNewAttack: true,
    });
    expect(float?.amount).toBe(8);
  });

  it('falls back to the HP delta for non-attack damage (stale event, e.g. a poison tick)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 7, damageDealt: 18, crit: true }),
      self: goblin,
      hpDelta: 2,
      isNewAttack: false, // same id already processed — this drop is a tick
    });
    expect(float).toEqual({ amount: 2, kind: 'damage' });
  });

  it('does not steal another monster\'s hit (target name mismatch)', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 8, targetName: 'Orc', damageDealt: 10 }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toBeNull();
  });

  it('floats heals on HP gain', () => {
    const float = resolveSpriteFloat({
      lastAttack: undefined,
      self: { kind: 'player' },
      hpDelta: -6,
      isNewAttack: false,
    });
    expect(float).toEqual({ amount: 6, kind: 'heal' });
  });

  it('a player-target sprite reads monster attacks, not the player\'s own swings', () => {
    const self: FloatSelf = { kind: 'player' };
    // Player swinging at a goblin must not float on the player sprite.
    expect(
      resolveSpriteFloat({ lastAttack: playerHit({ id: 9, damageDealt: 8 }), self, hpDelta: 0, isNewAttack: true }),
    ).toBeNull();
    // A monster's blow on the player does.
    const incoming = playerHit({ id: 10, attackerKind: 'monster', attackerName: 'Goblin', targetName: 'Brick', damageDealt: 5 });
    expect(
      resolveSpriteFloat({ lastAttack: incoming, self, hpDelta: 5, isNewAttack: true }),
    ).toEqual({ amount: 5, kind: 'damage' });
  });

  it('a missed attack with no HP change floats nothing', () => {
    const float = resolveSpriteFloat({
      lastAttack: playerHit({ id: 11, hit: false, damageDealt: undefined }),
      self: goblin,
      hpDelta: 0,
      isNewAttack: true,
    });
    expect(float).toBeNull();
  });
});
