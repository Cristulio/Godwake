import { describe, it, expect } from 'vitest';
import { resolveBlessingRunValue } from './CombatHUD';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { baneQuirkCount } from '../../engine/character/quirks';
import type { Character } from '../../types/character';

function fighter(level = 1, quirks: string[] = []): Character {
  return {
    ...createCharacter({
      id: 'f1',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    level,
    quirks,
  };
}

describe('resolveBlessingRunValue — computed per-run totals for the HUD', () => {
  it('resolves +2 temp HP per soul-mark to the run total (two banes → +4)', () => {
    const c = fighter(1, ['vertigo', 'touched-beyond']);
    expect(baneQuirkCount(c)).toBe(2);
    const label = resolveBlessingRunValue({ tempHpPerBaneQuirk: 2 }, c);
    expect(label).toBe('+4 temp HP (2 soul-marks)');
  });

  it('singularizes the soul-mark count at one bane', () => {
    const c = fighter(1, ['vertigo']);
    const label = resolveBlessingRunValue({ tempHpPerBaneQuirk: 2 }, c);
    expect(label).toBe('+2 temp HP (1 soul-mark)');
  });

  it('resolves temp HP that scales with delve level', () => {
    const c = fighter(7);
    expect(resolveBlessingRunValue({ tempHpPerDelveLevel: 2 }, c)).toBe(
      '+14 temp HP (level 7)',
    );
  });

  it('resolves AC that scales with soul-marks', () => {
    const c = fighter(1, ['vertigo', 'touched-beyond']);
    expect(resolveBlessingRunValue({ acBonusPerBaneQuirk: 1 }, c)).toBe(
      '+2 AC (2 soul-marks)',
    );
  });

  it('returns null for a blessing with no run-scaling lever', () => {
    const c = fighter(3);
    expect(resolveBlessingRunValue({ damageBonus: 2, acBonus: 1 }, c)).toBeNull();
  });
});
