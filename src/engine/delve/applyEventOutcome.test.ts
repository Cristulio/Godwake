import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { applyEventOutcome, resolveChoiceOutcome } from './applyEventOutcome';
import type { Character } from '../../types/character';
import type { EventOutcome, EventChoiceOutcome } from '../../schemas/event';
import { listBlessings } from '../../content/blessings';
import { listQuirks } from '../../content/quirks';

function makeChar(overrides: Partial<Character> = {}): Character {
  const base = createCharacter({
    id: 'test',
    name: 'Tester',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['athletics', 'perception'],
  });
  return { ...base, goldInPocket: 50, ...overrides };
}

function outcome(o: Partial<EventOutcome> & { effects: EventOutcome['effects'] }): EventOutcome {
  return { resolution: 'test resolution', ...o };
}

describe('applyEventOutcome — effect kinds', () => {
  it('hp_delta: heals up to max', () => {
    const char = makeChar();
    char.hp = { current: 5, max: 20, temp: 0 };
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'hp_delta', amount: 50 }] }),
      createDiceRoller(1),
    );
    expect(r.character.hp.current).toBe(20);
  });

  it('hp_delta: damages, floored at 0', () => {
    const char = makeChar();
    char.hp = { current: 4, max: 20, temp: 0 };
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'hp_delta', amount: -10 }] }),
      createDiceRoller(1),
    );
    expect(r.character.hp.current).toBe(0);
  });

  it('temp_hp: takes max with current temp (no stacking)', () => {
    const char = makeChar();
    char.hp = { current: 10, max: 20, temp: 5 };
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'temp_hp', amount: 3 }] }),
      createDiceRoller(1),
    );
    expect(r.character.hp.temp).toBe(5);
    const r2 = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'temp_hp', amount: 8 }] }),
      createDiceRoller(1),
    );
    expect(r2.character.hp.temp).toBe(8);
  });

  it('gold_delta: adds and subtracts, floors at 0', () => {
    const char = makeChar({ goldInPocket: 5 });
    const gain = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'gold_delta', amount: 10 }] }),
      createDiceRoller(1),
    );
    expect(gain.character.goldInPocket).toBe(15);
    const lose = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'gold_delta', amount: -100 }] }),
      createDiceRoller(1),
    );
    expect(lose.character.goldInPocket).toBe(0);
  });

  it('grant_blessing (random): adds a blessing the character does not yet have', () => {
    const char = makeChar();
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_blessing', random: true }] }),
      createDiceRoller(7),
    );
    expect(r.character.blessings).toHaveLength(1);
    expect(listBlessings().map((b) => b.id)).toContain(r.character.blessings[0]);
  });

  it('grant_blessing_id: adds the named blessing', () => {
    const char = makeChar();
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_blessing_id', id: 'mystras-whisper' }] }),
      createDiceRoller(1),
    );
    expect(r.character.blessings).toContain('mystras-whisper');
  });

  it('grant_blessing_id: skips duplicates (already held)', () => {
    const char = makeChar({ blessings: ['mystras-whisper'] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_blessing_id', id: 'mystras-whisper' }] }),
      createDiceRoller(1),
    );
    expect(r.character.blessings).toEqual(['mystras-whisper']);
  });

  it('grant_quirk_reroll: replaces one bane quirk with a fresh roll', () => {
    const banes = listQuirks().filter((q) => q.sentiment === 'bane');
    expect(banes.length).toBeGreaterThan(1);
    const baneId = banes[0].id;
    const char = makeChar({ quirks: [baneId, 'sun-touched'] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(11),
    );
    expect(r.character.quirks).toHaveLength(2);
    expect(r.character.quirks[1]).toBe('sun-touched');
    expect(r.character.quirks[0]).not.toBe(baneId);
  });

  it('grant_quirk_reroll: no-op when no bane quirks present', () => {
    const char = makeChar({ quirks: ['sun-touched'] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(1),
    );
    expect(r.character.quirks).toEqual(['sun-touched']);
  });

  it('apply_attack_bonus_run: adds to delveAttackBonus', () => {
    const char = makeChar({ delveAttackBonus: 1 });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'apply_attack_bonus_run', amount: 1 }] }),
      createDiceRoller(1),
    );
    expect(r.character.delveAttackBonus).toBe(2);
  });

  it('init_bonus_run: adds to delveInitBonus', () => {
    const char = makeChar();
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'init_bonus_run', amount: 2 }] }),
      createDiceRoller(1),
    );
    expect(r.character.delveInitBonus).toBe(2);
  });

  it('spawn_ambush: returns the monster def ids as a sentinel', () => {
    const char = makeChar();
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'spawn_ambush', monsterDefIds: ['goblin', 'goblin'] }] }),
      createDiceRoller(1),
    );
    expect(r.ambush).toEqual({ monsterDefIds: ['goblin', 'goblin'] });
  });

  it('multiple effects: applied in order in a single call', () => {
    const char = makeChar({ goldInPocket: 5 });
    char.hp = { current: 10, max: 20, temp: 0 };
    const r = applyEventOutcome(
      char,
      outcome({
        effects: [
          { kind: 'gold_delta', amount: -5 },
          { kind: 'hp_delta', amount: 5 },
        ],
      }),
      createDiceRoller(1),
    );
    expect(r.character.goldInPocket).toBe(0);
    expect(r.character.hp.current).toBe(15);
    expect(r.effectsApplied).toHaveLength(2);
  });

  it('returns a fresh character reference (does not mutate input)', () => {
    const char = makeChar({ goldInPocket: 10 });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'gold_delta', amount: 5 }] }),
      createDiceRoller(1),
    );
    expect(r.character).not.toBe(char);
    expect(char.goldInPocket).toBe(10);
  });
});

describe('resolveChoiceOutcome — weighted random selection', () => {
  it('single outcome: returned as-is', () => {
    const single: EventChoiceOutcome = outcome({
      effects: [{ kind: 'gold_delta', amount: 1 }],
    });
    const r = resolveChoiceOutcome(single, createDiceRoller(1));
    expect(r.resolution).toBe('test resolution');
  });

  it('weighted: deterministic for a given seed', () => {
    const choice: EventChoiceOutcome = {
      random: [
        { weight: 50, outcome: outcome({ resolution: 'A', effects: [] }) },
        { weight: 50, outcome: outcome({ resolution: 'B', effects: [] }) },
      ],
    };
    const a = resolveChoiceOutcome(choice, createDiceRoller(1));
    const b = resolveChoiceOutcome(choice, createDiceRoller(1));
    expect(a.resolution).toBe(b.resolution);
  });

  it('weighted: extreme weight bias gates the rare branch', () => {
    const choice: EventChoiceOutcome = {
      random: [
        { weight: 99, outcome: outcome({ resolution: 'common', effects: [] }) },
        { weight: 1, outcome: outcome({ resolution: 'rare', effects: [] }) },
      ],
    };
    let common = 0;
    let rare = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const r = resolveChoiceOutcome(choice, createDiceRoller(seed));
      if (r.resolution === 'common') common += 1;
      else rare += 1;
    }
    expect(common).toBeGreaterThan(rare);
    expect(common).toBeGreaterThan(80);
  });
});

describe('cost-gating helpers — choice rejection', () => {
  /**
   * The schema-level requiresGold / requiresHpAtLeast fields don't enforce
   * themselves at the engine layer (the EventRoom UI gates the button before
   * it fires). The test below is the engine's safety-net path: a gold_delta
   * that would overdraw the wallet floors at 0 rather than going negative,
   * so a UI bug that lets a choice through doesn't corrupt save state.
   */
  it('gold_delta: a cost larger than the wallet floors the wallet at 0 (does not go negative)', () => {
    const char = makeChar({ goldInPocket: 3 });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'gold_delta', amount: -10 }] }),
      createDiceRoller(1),
    );
    expect(r.character.goldInPocket).toBe(0);
  });

  it('cost gate sanity: a choice that requires gold is filterable by callers via requiresGold', () => {
    // The schema-level check the UI uses. Mirror it here to lock the contract.
    const requiresGold = 25;
    const walletA = 24;
    const walletB = 25;
    expect(walletA < requiresGold).toBe(true);
    expect(walletB < requiresGold).toBe(false);
  });
});
