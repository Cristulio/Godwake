import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  type EncounterEntry,
} from './chapter3Pools';
import { getMonster, listMonsters } from '../../content/monsters';

/**
 * Chapter 3 (the Sphere / Asylum) content gate, focused on the blind eye-tyrant
 * lane: the Hollow Gaze elite + its lesser gazers (Witness-Mote, Gloaming Eye).
 * Asserts the new monsters parse + register, sit in the right CR band relative
 * to the chapter's existing elites and boss, expose the intended eye-ray
 * toolkit, and are actually reachable through the Ch3 encounter pools (so the
 * procedural map can place them) — without re-validating the whole chapter.
 */

const EYE_TYRANT_ID = 'hollow-gaze';
const GAZER_IDS = ['witness-mote', 'gloaming-eye'];
const NEW_IDS = [EYE_TYRANT_ID, ...GAZER_IDS];
const BOSS_ID = 'asylum-director';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['early-mid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('Chapter 3 eye-tyrant — monsters parse + register', () => {
  it('every new monster resolves via getMonster with a matching id', () => {
    for (const id of NEW_IDS) {
      expect(() => getMonster(id)).not.toThrow();
      expect(getMonster(id).id).toBe(id);
    }
  });

  it('the registry contains exactly one entry per new id (no dupes)', () => {
    const ids = listMonsters().map((m) => m.id);
    for (const id of NEW_IDS) {
      expect(ids.filter((x) => x === id)).toHaveLength(1);
    }
  });
});

describe('The Hollow Gaze — Ch3 control elite', () => {
  const gaze = getMonster(EYE_TYRANT_ID);

  it('sits in the elite band: a notch above a normal Sphere mob, below the boss', () => {
    const boss = getMonster(BOSS_ID);
    const mob = getMonster('mind-leech');
    expect(gaze.maxHp).toBeGreaterThan(mob.maxHp);
    expect(gaze.maxHp).toBeLessThan(boss.maxHp);
    expect(Number(gaze.cr)).toBeGreaterThanOrEqual(4);
  });

  it('wields the full eye-ray suite: paralyze opener, several debuff rays, a summon, a fallback attack', () => {
    const kinds = gaze.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('summon');
    expect(kinds).toContain('attack');
    expect(kinds.filter((k) => k === 'debuff').length).toBeGreaterThanOrEqual(2);
  });

  it('its debuff rays tax more than one save (no single high stat shrugs the kit)', () => {
    const saves = new Set(
      gaze.actions.flatMap((a) =>
        a.kind === 'debuff' || a.kind === 'paralyze' ? [a.saveAbility] : [],
      ),
    );
    expect(saves.size).toBeGreaterThanOrEqual(2);
  });

  it('summons a registered gazer', () => {
    for (const action of gaze.actions) {
      if (action.kind === 'summon') {
        expect(() => getMonster(action.summonDefId)).not.toThrow();
        expect(GAZER_IDS).toContain(action.summonDefId);
      }
    }
  });
});

describe('The lesser gazers', () => {
  it('are low-CR swarm/escort fodder beneath the tyrant', () => {
    const gazeCr = Number(getMonster(EYE_TYRANT_ID).cr);
    for (const id of GAZER_IDS) {
      const cr = Number(getMonster(id).cr);
      expect(cr).toBeGreaterThanOrEqual(1);
      expect(cr).toBeLessThan(gazeCr);
      expect(getMonster(id).maxHp).toBeLessThan(getMonster(EYE_TYRANT_ID).maxHp);
    }
  });
});

describe('Chapter 3 pools place the new content', () => {
  const poolDefIds = (pools: EncounterEntry[][]) =>
    new Set(pools.flatMap((p) => p.flatMap((e) => e.monsters.map((m) => m.defId))));

  it('the Hollow Gaze appears in the ELITE pool (it shows as a Ch3 elite node)', () => {
    expect(poolDefIds([ELITE_POOL]).has(EYE_TYRANT_ID)).toBe(true);
  });

  it('the gazers seed the mid / elite comps', () => {
    const midElite = poolDefIds([MID_POOL, ELITE_POOL]);
    for (const id of GAZER_IDS) {
      expect(midElite.has(id)).toBe(true);
    }
  });

  it('every encounter references registered monsters with sane counts and rewards', () => {
    for (const [name, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length, `${name}: "${entry.title}"`).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(() => getMonster(m.defId), `${name}: ${m.defId}`).not.toThrow();
          expect(m.count).toBeGreaterThanOrEqual(1);
        }
        expect(entry.xpReward).toBeGreaterThan(0);
        if (entry.goldReward !== undefined) {
          expect(entry.goldReward).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('the chapter boss never appears as a poolable encounter', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        for (const m of entry.monsters) {
          expect(m.defId).not.toBe(BOSS_ID);
        }
      }
    }
  });
});
