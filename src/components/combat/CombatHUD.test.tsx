import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombatHUD } from './CombatHUD';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { applyLevelUp } from '../../engine/character/leveling';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { ClassId } from '../../schemas/ids';

function makeChar(classId: ClassId, overrides: Partial<Character> = {}): Character {
  // Standard array assigned with class-appropriate priority.
  const base = createCharacter({
    id: `hud-${classId}`,
    name: 'Test',
    raceId: 'human',
    classId,
    baseAbilityScores:
      classId === 'fighter'
        ? {
            str: STANDARD_ARRAY[0],
            dex: STANDARD_ARRAY[2],
            con: STANDARD_ARRAY[1],
            int: STANDARD_ARRAY[5],
            wis: STANDARD_ARRAY[3],
            cha: STANDARD_ARRAY[4],
          }
        : classId === 'rogue'
          ? {
              str: STANDARD_ARRAY[5],
              dex: STANDARD_ARRAY[0],
              con: STANDARD_ARRAY[2],
              int: STANDARD_ARRAY[3],
              wis: STANDARD_ARRAY[4],
              cha: STANDARD_ARRAY[1],
            }
          : {
              str: STANDARD_ARRAY[5],
              dex: STANDARD_ARRAY[3],
              con: STANDARD_ARRAY[2],
              int: STANDARD_ARRAY[0],
              wis: STANDARD_ARRAY[1],
              cha: STANDARD_ARRAY[4],
            },
    skillProficiencies:
      classId === 'fighter'
        ? ['athletics', 'intimidation']
        : classId === 'rogue'
          ? ['stealth', 'sleight-of-hand']
          : ['arcana', 'history'],
  });
  return { ...base, ...overrides };
}

function emptyState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    combatants: [],
    turnOrder: [],
    currentTurnIndex: 0,
    round: 1,
    log: [],
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: 0,
    playerAttacksThisTurn: 0,
    ...overrides,
  };
}

describe('CombatHUD', () => {
  it('shows core vitals (HP / AC) for any class', () => {
    const c = makeChar('fighter');
    render(<CombatHUD character={c} state={emptyState()} />);
    expect(screen.getByText(/HP\s+\d+\/\d+/)).toBeInTheDocument();
    expect(screen.getByText(/AC\s+\d+/)).toBeInTheDocument();
    // SPD is gone — speed is inert in a non-positional engine.
    expect(screen.queryByText(/SPD/)).not.toBeInTheDocument();
  });

  it('Fighter L1 shows Second Wind ready but no Action Surge section', () => {
    const f = makeChar('fighter');
    render(<CombatHUD character={f} state={emptyState()} />);
    expect(screen.getByText(/Second Wind/i)).toBeInTheDocument();
    expect(screen.queryByText(/Action Surge/i)).toBeNull();
  });

  it('Fighter L2 shows Action Surge dot', () => {
    let f = makeChar('fighter');
    f = applyLevelUp(f);
    render(<CombatHUD character={f} state={emptyState()} />);
    expect(screen.getByText(/Action Surge/i)).toBeInTheDocument();
  });

  it('Rogue shows Cunning Action + idle Sneak by default; ARMED after Hide', () => {
    const r = makeChar('rogue');
    const { rerender } = render(<CombatHUD character={r} state={emptyState()} />);
    expect(screen.getByText(/Cunning Action/i)).toBeInTheDocument();
    expect(screen.getByText(/^Idle$/i)).toBeInTheDocument();

    const hidden: Character = { ...r, nextAttackAdvantage: true };
    rerender(<CombatHUD character={hidden} state={emptyState()} />);
    expect(screen.getByText(/^Armed$/i)).toBeInTheDocument();
  });

  it('Rogue L5+ surfaces Uncanny Dodge reaction', () => {
    let r = makeChar('rogue');
    for (let i = 0; i < 4; i++) r = applyLevelUp(r);
    render(<CombatHUD character={r} state={emptyState()} />);
    expect(screen.getByText(/UD Ready/i)).toBeInTheDocument();
  });

  it('Wizard L1 shows two L1 slot dots and ATK/DC', () => {
    const w = makeChar('wizard');
    render(<CombatHUD character={w} state={emptyState()} />);
    expect(screen.getByText(/Slot 1/i)).toBeInTheDocument();
    expect(screen.getByText(/^ATK\s+[+-]?\d+/i)).toBeInTheDocument();
    expect(screen.getByText(/^DC\s+\d+/i)).toBeInTheDocument();
  });

  it('Wizard with active Mage Armor shows buff pill', () => {
    const w: Character = {
      ...makeChar('wizard'),
      resources: {
        ...makeChar('wizard').resources,
        mageArmorActive: true,
      },
    };
    render(<CombatHUD character={w} state={emptyState()} />);
    expect(screen.getByText(/Mage Armor/i)).toBeInTheDocument();
  });

  it('Shows blessing glyphs when the character carries any', () => {
    const c: Character = { ...makeChar('fighter'), blessings: ['helms-aegis'] };
    render(<CombatHUD character={c} state={emptyState()} />);
    expect(screen.getByLabelText(/Helm's Aegis/)).toBeInTheDocument();
  });

  it('Shows status condition pill when held / paralyzed', () => {
    const c: Character = {
      ...makeChar('fighter'),
      conditions: [{ name: 'paralyzed', duration: { kind: 'rounds', value: 2 } }],
    };
    render(<CombatHUD character={c} state={emptyState()} />);
    expect(screen.getAllByText(/paralyzed/i).length).toBeGreaterThan(0);
  });
});
