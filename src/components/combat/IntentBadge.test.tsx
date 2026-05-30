import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IntentBadge } from './IntentBadge';
import type { MonsterIntent } from '../../types/combat';

function badge(intent: MonsterIntent): HTMLElement {
  const { container } = render(<IntentBadge intent={intent} />);
  return container.firstChild as HTMLElement;
}

function valueOf(el: HTMLElement): string | null {
  return el.querySelector('.enemy-intent-value')?.textContent ?? null;
}

describe('IntentBadge display', () => {
  it('shows an attack as a damage RANGE, not a single value', () => {
    const el = badge({ kind: 'attack', actionKind: 'attack', actionName: 'Scimitar', damageMin: 3, damageMax: 8 });
    expect(valueOf(el)).toBe('3–8');
    expect(el.getAttribute('title')).toContain('3–8');
  });

  it('collapses to a single number when min === max', () => {
    const el = badge({ kind: 'attack', actionKind: 'attack', actionName: 'Slam', damageMin: 5, damageMax: 5 });
    expect(valueOf(el)).toBe('5');
  });

  it('reads a multiattack as count × per-hit range', () => {
    const el = badge({
      kind: 'multiattack',
      actionKind: 'multiattack',
      actionName: 'Frenzied Rake',
      hits: 2,
      damageMin: 3,
      damageMax: 6,
    });
    expect(valueOf(el)).toBe('2× 3–6');
    const title = el.getAttribute('title') ?? '';
    expect(title).toContain('2 separate hits');
    expect(title).toContain('3–6');
    // Total across both swings: 6–12.
    expect(title).toContain('6–12 total');
  });

  it('gives every intent kind a non-empty, effect-describing tooltip', () => {
    const kinds: MonsterIntent[] = [
      { kind: 'attack', actionKind: 'attack', actionName: 'a', damageMin: 1, damageMax: 4 },
      { kind: 'multiattack', actionKind: 'multiattack', actionName: 'b', hits: 2, damageMin: 1, damageMax: 4 },
      { kind: 'drain', actionKind: 'attack', actionName: 'c', damageMin: 2, damageMax: 5 },
      { kind: 'paralyze', actionKind: 'paralyze', actionName: 'd' },
      { kind: 'debuff', actionKind: 'debuff', actionName: 'e', condition: 'poisoned' },
      { kind: 'summon', actionKind: 'summon', actionName: 'f' },
      { kind: 'sustain-heal', actionKind: 'sustain', actionName: 'g' },
      { kind: 'ward', actionKind: 'sustain', actionName: 'h' },
    ];
    for (const intent of kinds) {
      const el = badge(intent);
      const title = el.getAttribute('title') ?? '';
      expect(title.length).toBeGreaterThan(10);
      expect(el.getAttribute('aria-label')).toBe(title);
    }
  });

  it('names the condition effect in a debuff tooltip so the player can plan', () => {
    const el = badge({ kind: 'debuff', actionKind: 'debuff', actionName: 'Gaze', condition: 'blinded' });
    const title = el.getAttribute('title') ?? '';
    expect(title).toContain('blinded');
    expect(title.toLowerCase()).toContain('disadvantage');
  });
});
