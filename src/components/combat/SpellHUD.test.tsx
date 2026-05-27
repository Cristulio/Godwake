import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpellHUD } from './SpellHUD';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import type { Character } from '../../types/character';

function makeWizard(extra: Partial<Character> = {}): Character {
  // Human +1 to all → INT 15 base becomes INT 16 effective (mod +3).
  const base = createCharacter({
    id: 'hud-wizard',
    name: 'Inara',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[3],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[0], // 15 → effective 16 with human +1
      wis: STANDARD_ARRAY[1],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return { ...base, ...extra };
}

describe('SpellHUD', () => {
  it('renders nothing for non-wizards', () => {
    const fighter = createCharacter({
      id: 'hud-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[5],
        wis: STANDARD_ARRAY[4],
        cha: STANDARD_ARRAY[3],
      },
      skillProficiencies: ['athletics', 'intimidation'],
    });
    const { container } = render(<SpellHUD character={fighter} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the live spell attack and save DC for a baseline L1 wizard', () => {
    // INT 16 (mod +3) + prof 2 + wizard "Focused Casting" +1 → DC 14,
    // attack = +3 + 2 = +5.
    const w = makeWizard();
    render(<SpellHUD character={w} />);
    expect(screen.getByText(/spell attack:\s*\+5/i)).toBeInTheDocument();
    expect(screen.getByText(/spell save dc:\s*14/i)).toBeInTheDocument();
  });

  it('folds in Grove permanentBonuses (spellAttack +1, spellDc +1 → +6 / DC 15)', () => {
    const w = makeWizard({
      permanentBonuses: { spellAttack: 1, spellDc: 1 },
    });
    render(<SpellHUD character={w} />);
    expect(screen.getByText(/spell attack:\s*\+6/i)).toBeInTheDocument();
    expect(screen.getByText(/spell save dc:\s*15/i)).toBeInTheDocument();
  });
});
