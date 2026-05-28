import { describe, it, expect } from 'vitest';
import { appendLog } from './log';
import { MAX_COMBAT_LOG } from './createCombat';
import type { CombatState, CombatLogEntry } from '../../types/combat';

function mkState(logSize = 0): CombatState {
  const log: CombatLogEntry[] = Array.from({ length: logSize }, (_, i) => ({
    id: i + 1,
    kind: 'system' as const,
    text: `entry ${i + 1}`,
  }));
  return {
    combatants: [],
    turnOrder: [],
    currentTurnIndex: 0,
    round: 1,
    log,
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: 0,
    playerAttacksThisTurn: 0,
  };
}

function entry(id: number, text = `e${id}`): CombatLogEntry {
  return { id, kind: 'system', text };
}

describe('appendLog', () => {
  it('returns a new state with only log changed (other fields preserved by identity)', () => {
    const s = mkState(3);
    const next = appendLog(s, entry(4));
    expect(next).not.toBe(s);
    expect(next.combatants).toBe(s.combatants);
    expect(next.turnOrder).toBe(s.turnOrder);
    expect(next.status).toBe(s.status);
    expect(next.round).toBe(s.round);
    expect(next.currentTurnIndex).toBe(s.currentTurnIndex);
    expect(next.log).not.toBe(s.log);
  });

  it('retains every entry when below the cap (single-entry path)', () => {
    const s = mkState(5);
    const next = appendLog(s, entry(6, 'six'));
    expect(next.log).toHaveLength(6);
    expect(next.log[next.log.length - 1].text).toBe('six');
  });

  it('retains every entry when below the cap (multi-entry path)', () => {
    const s = mkState(5);
    const next = appendLog(s, entry(6, 'six'), entry(7, 'seven'), entry(8, 'eight'));
    expect(next.log).toHaveLength(8);
    expect(next.log.slice(-3).map((e) => e.text)).toEqual(['six', 'seven', 'eight']);
  });

  it('drops the oldest entries when the merged log exceeds the cap', () => {
    const s = mkState(MAX_COMBAT_LOG);
    const next = appendLog(s, entry(MAX_COMBAT_LOG + 1, 'new'));
    expect(next.log).toHaveLength(MAX_COMBAT_LOG);
    expect(next.log[0].text).toBe('entry 2');
    expect(next.log[next.log.length - 1].text).toBe('new');
  });

  it('drops enough oldest entries to fit after a multi-entry append', () => {
    const s = mkState(MAX_COMBAT_LOG - 1);
    const next = appendLog(
      s,
      entry(MAX_COMBAT_LOG, 'a'),
      entry(MAX_COMBAT_LOG + 1, 'b'),
      entry(MAX_COMBAT_LOG + 2, 'c'),
    );
    expect(next.log).toHaveLength(MAX_COMBAT_LOG);
    // We had 199 + 3 = 202 entries; the 2 oldest were dropped.
    expect(next.log[0].text).toBe('entry 3');
    expect(next.log.slice(-3).map((e) => e.text)).toEqual(['a', 'b', 'c']);
  });

  it('preserves order: appended entries come after the existing log', () => {
    const s = mkState(2);
    const next = appendLog(s, entry(3, 'third'), entry(4, 'fourth'));
    expect(next.log.map((e) => e.text)).toEqual(['entry 1', 'entry 2', 'third', 'fourth']);
  });
});
