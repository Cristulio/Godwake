import { describe, it, expect, vi } from 'vitest';
import { createDiceRoller } from '../dice';
import { BlessingSchema, type Blessing } from '../../schemas/blessing';
import { aggregateBlessingModifiers, blessingSignature, rollBlessingOptions } from './blessings';

const mocks = vi.hoisted(() => ({
  useFakePool: false,
  fakePool: [] as Blessing[],
}));

vi.mock('../../content/blessings', async () => {
  const actual =
    await vi.importActual<typeof import('../../content/blessings')>('../../content/blessings');
  return {
    ...actual,
    listBlessings: () => (mocks.useFakePool ? mocks.fakePool : actual.listBlessings()),
    getBlessing: (id: string) => {
      if (mocks.useFakePool) {
        const found = mocks.fakePool.find((b) => b.id === id);
        if (!found) throw new Error(`Blessing not found: ${id}`);
        return found;
      }
      return actual.getBlessing(id);
    },
  };
});

function fakeBlessing(id: string, modifiers: Blessing['modifiers']): Blessing {
  return BlessingSchema.parse({
    id,
    name: id,
    god: 'helm',
    flavor: 'test',
    effect: 'test',
    modifiers,
  });
}

function withFakePool<T>(pool: Blessing[], fn: () => T): T {
  mocks.useFakePool = true;
  mocks.fakePool = pool;
  try {
    return fn();
  } finally {
    mocks.useFakePool = false;
    mocks.fakePool = [];
  }
}

describe('blessingSignature', () => {
  it('returns identical signatures for identical modifier bundles', () => {
    const a = fakeBlessing('a', { acBonus: 1 });
    const b = fakeBlessing('b', { acBonus: 1 });
    expect(blessingSignature(a)).toBe(blessingSignature(b));
  });

  it('is order-insensitive across modifier keys', () => {
    const a = fakeBlessing('a', { acBonus: 1, initiativeBonus: -1 });
    const b = fakeBlessing('b', { initiativeBonus: -1, acBonus: 1 });
    expect(blessingSignature(a)).toBe(blessingSignature(b));
  });

  it('differs when a numeric modifier differs', () => {
    const a = fakeBlessing('a', { acBonus: 1 });
    const b = fakeBlessing('b', { acBonus: 2 });
    expect(blessingSignature(a)).not.toBe(blessingSignature(b));
  });

  it('differs when a boolean modifier differs', () => {
    const a = fakeBlessing('a', { firstAttackAdvantage: true });
    const b = fakeBlessing('b', { acBonus: 1 });
    expect(blessingSignature(a)).not.toBe(blessingSignature(b));
  });
});

describe('rollBlessingOptions — signature dedup', () => {
  it('never returns two blessings with identical mechanical signature in one roll', () => {
    const pool: Blessing[] = [
      fakeBlessing('ac-1-a', { acBonus: 1 }),
      fakeBlessing('ac-1-b', { acBonus: 1 }),
      fakeBlessing('dmg-1', { damageBonus: 1 }),
      fakeBlessing('init-2', { initiativeBonus: 2 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3);
        const sigs = new Set<string>();
        for (const id of result) {
          const b = pool.find((p) => p.id === id)!;
          const sig = blessingSignature(b);
          expect(sigs.has(sig)).toBe(false);
          sigs.add(sig);
        }
      }
    });
  });

  it('returns up to N options when the pool collapses to fewer distinct signatures', () => {
    const pool: Blessing[] = [
      fakeBlessing('a', { acBonus: 1 }),
      fakeBlessing('b', { acBonus: 1 }),
      fakeBlessing('c', { acBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const roller = createDiceRoller(42);
      const result = rollBlessingOptions(roller, 3);
      expect(result.length).toBe(1);
    });
  });
});

describe('aggregateBlessingModifiers — temp HP does not stack', () => {
  it('takes max-of-individual for extraTempHpPerRoom (not sum)', () => {
    const pool: Blessing[] = [
      fakeBlessing('lath', { extraTempHpPerRoom: 3 }),
      fakeBlessing('ilm', { extraTempHpPerRoom: 2 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['lath', 'ilm']);
      expect(mods.extraTempHpPerRoom).toBe(3);
    });
  });

  it('still sums numeric fields that are designed to stack (acBonus)', () => {
    const pool: Blessing[] = [
      fakeBlessing('helm', { acBonus: 1 }),
      fakeBlessing('mystra', { acBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['helm', 'mystra']);
      expect(mods.acBonus).toBe(2);
    });
  });
});

describe('rollBlessingOptions — real pool', () => {
  it('100-roll sweep produces no batch with two identical-signature entries', async () => {
    const { getBlessing } = await import('../../content/blessings');
    for (let seed = 0; seed < 100; seed += 1) {
      const roller = createDiceRoller(seed);
      const result = rollBlessingOptions(roller, 3);
      const sigs = new Set<string>();
      for (const id of result) {
        const sig = blessingSignature(getBlessing(id));
        expect(sigs.has(sig)).toBe(false);
        sigs.add(sig);
      }
    }
  });

  it('dedupes by id (no blessing id appears twice in one roll)', async () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const roller = createDiceRoller(seed);
      const result = rollBlessingOptions(roller, 3);
      expect(new Set(result).size).toBe(result.length);
    }
  });
});
