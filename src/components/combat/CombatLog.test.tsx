import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CombatLog } from './CombatLog';
import type { CombatLogEntry } from '../../types/combat';

/**
 * Part A: the player's OWN action beats (their rolls + the damage they deal)
 * render a clear step larger than the foe's lines of the same kind, so a glance
 * at the log surfaces what the player just did. Driven by entry.source.
 */

afterEach(() => cleanup());

/** Pull the `text-[Npx]` size baked into the row's wrapper class. */
function rowPx(container: HTMLElement, needle: string): number {
  const span = [...container.querySelectorAll('span.flex-1')].find((s) =>
    s.textContent?.includes(needle),
  );
  const row = span?.closest('div');
  const m = /text-\[(\d+)px\]/.exec(row?.className ?? '');
  if (!m) throw new Error(`no px size on row for "${needle}": ${row?.className}`);
  return Number(m[1]);
}

describe('CombatLog — the hero\'s own lines read larger than the foe\'s', () => {
  it('sizes a player damage line above an enemy damage line', () => {
    const entries: CombatLogEntry[] = [
      { id: 1, kind: 'damage', source: 'player', text: 'Damage: 12 slashing (mine).' },
      { id: 2, kind: 'damage', source: 'enemy', text: 'Damage: 5 slashing (theirs).' },
    ];
    const { container } = render(<CombatLog entries={entries} />);
    expect(rowPx(container, 'mine')).toBeGreaterThan(rowPx(container, 'theirs'));
  });

  it('sizes a player roll line above an enemy roll line', () => {
    const entries: CombatLogEntry[] = [
      { id: 1, kind: 'roll', source: 'player', text: 'Hero attacks Goblin (mine).' },
      { id: 2, kind: 'roll', source: 'enemy', text: 'Goblin attacks Hero (theirs).' },
    ];
    const { container } = render(<CombatLog entries={entries} />);
    expect(rowPx(container, 'mine')).toBeGreaterThan(rowPx(container, 'theirs'));
  });

  it('leaves the foe / untagged lines at the recessive baseline', () => {
    const tagged: CombatLogEntry[] = [
      { id: 1, kind: 'damage', source: 'enemy', text: 'tagged enemy' },
    ];
    const untagged: CombatLogEntry[] = [
      { id: 1, kind: 'damage', text: 'untagged' },
    ];
    const a = render(<CombatLog entries={tagged} />);
    const aPx = rowPx(a.container, 'tagged enemy');
    cleanup();
    const b = render(<CombatLog entries={untagged} />);
    expect(rowPx(b.container, 'untagged')).toBe(aPx);
  });

  it('does not promote a player-sourced system line (flavor never shouts)', () => {
    const playerSystem = render(
      <CombatLog entries={[{ id: 1, kind: 'system', source: 'player', text: 'sys-p' }]} />,
    );
    const sysSpan = [...playerSystem.container.querySelectorAll('span.flex-1')].find((s) =>
      s.textContent?.includes('sys-p'),
    );
    // system has no px-size class (it uses text-[9px]); confirm it stayed the
    // small system style, never the promoted 15/17px.
    expect(sysSpan?.closest('div')?.className).toContain('text-[9px]');
  });
});
