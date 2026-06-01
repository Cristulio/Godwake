import { describe, it, expect } from 'vitest';
import { hasMonsterSprite } from './MonsterPortrait';
import { listMonsters } from '../../content/monsters';

describe('MonsterPortrait sprite coverage', () => {
  it('every registered monster has its own sprite entry (no goblin fallback)', () => {
    const missing = listMonsters()
      .map((m) => m.id)
      .filter((id) => !hasMonsterSprite(id));
    expect(missing).toEqual([]);
  });
});
