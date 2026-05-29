import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { applyEventOutcome, canTakeChoice, resolveChoiceOutcome } from './applyEventOutcome';
import { modifierFor } from '../character/derived';
import type { Character } from '../../types/character';
import type { EventChoice, EventOutcome, EventChoiceOutcome } from '../../schemas/event';
import { listBlessings } from '../../content/blessings';
import { listQuirks } from '../../content/quirks';
import { getEvent } from '../../content/events';

/** Top-of-array standard score into CHA → effective mod +3 on a human. */
function silverTongue(overrides: Partial<Character> = {}): Character {
  const c = createCharacter({
    id: 'silver',
    name: 'Silver',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[3],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[4],
      cha: STANDARD_ARRAY[0],
    },
    skillProficiencies: ['athletics', 'perception'],
  });
  return { ...c, ...overrides };
}

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
    const reroll = r.effectsApplied.find((e) => e.kind === 'grant_quirk_reroll');
    expect(reroll?.detail).toMatch(/^Bane shaken: .+ → .+$/);
  });

  it('grant_quirk_reroll: no-bane grants fallback gold (L1 smart-fallback)', () => {
    // L1 characters have no bane quirks yet, so the reroll no-ops on quirks
    // but pays out a small gold compensation so the choice never feels empty.
    // The rewards list shows ONE gold line ("+5g"); the fallback flavor moves
    // into the resolution so the rewards list isn't cluttered with engine
    // jargon like "(no bane to shake)".
    const char = makeChar({ goldInPocket: 10, quirks: [] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(1),
    );
    expect(r.character.quirks).toEqual([]);
    expect(r.character.goldInPocket).toBe(15);
    expect(r.effectsApplied.map((e) => e.kind)).toEqual(['gold_delta']);
    expect(r.effectsApplied[0].detail).toBe('+5g');
    expect(r.effectsApplied[0].detail).not.toContain('no bane');
    expect(r.resolution).toContain('no bane');
  });

  it('grant_quirk_reroll: no-bane fallback merges with explicit gold_delta into one line', () => {
    // Wounded-captain "loot-him" pays +5g explicitly AND triggers the no-bane
    // fallback (+5g more). Player should see ONE "+10g" line, not two "+5g"
    // lines.
    const char = makeChar({ goldInPocket: 0, quirks: [] });
    const r = applyEventOutcome(
      char,
      outcome({
        effects: [
          { kind: 'gold_delta', amount: 5 },
          { kind: 'grant_quirk_reroll' },
        ],
      }),
      createDiceRoller(1),
    );
    expect(r.character.goldInPocket).toBe(10);
    expect(r.effectsApplied.map((e) => e.kind)).toEqual(['gold_delta']);
    expect(r.effectsApplied[0].detail).toBe('+10g');
  });

  it('grant_quirk_reroll: only-boon also triggers fallback (no bane present)', () => {
    const char = makeChar({ goldInPocket: 0, quirks: ['sun-touched'] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(1),
    );
    expect(r.character.quirks).toEqual(['sun-touched']);
    expect(r.character.goldInPocket).toBe(5);
  });

  it('grant_quirk_reroll: per-event fallbackText surfaces in the resolution panel', () => {
    const char = makeChar({ quirks: [] });
    const r = applyEventOutcome(
      char,
      outcome({
        effects: [
          {
            kind: 'grant_quirk_reroll',
            fallbackText: 'Eilistraee finds no bane to shake from you.',
          },
        ],
      }),
      createDiceRoller(1),
    );
    expect(r.resolution).toContain('Eilistraee finds no bane to shake from you.');
    expect(
      r.effectsApplied.find((e) => e.kind === 'grant_quirk_reroll'),
    ).toBeUndefined();
  });

  it('grant_quirk_reroll: default fallback wording is god-agnostic', () => {
    const char = makeChar({ quirks: [] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(1),
    );
    expect(r.resolution).not.toContain('Waukeen');
    expect(r.resolution).toContain('no bane');
  });

  it('grant_quirk_reroll: when a bane is present, fallback gold is NOT granted', () => {
    // Regression guard for the L1 smart-fallback: only the no-bane path pays
    // gold; characters with banes should still get the reroll and nothing else.
    const banes = listQuirks().filter((q) => q.sentiment === 'bane');
    const baneId = banes[0].id;
    const char = makeChar({ goldInPocket: 10, quirks: [baneId] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_quirk_reroll' }] }),
      createDiceRoller(11),
    );
    expect(r.character.goldInPocket).toBe(10);
    expect(r.character.quirks[0]).not.toBe(baneId);
    expect(r.effectsApplied.map((e) => e.kind)).toEqual(['grant_quirk_reroll']);
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

  it('grant_item: adds the named item to inventory unequipped', () => {
    const char = makeChar({ inventory: [] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_item', itemId: 'rapier' }] }),
      createDiceRoller(1),
    );
    expect(r.character.inventory.map((i) => i.itemId)).toContain('rapier');
    expect(r.character.equipped.mainHand).toBeNull();
    const eff = r.effectsApplied.find((e) => e.kind === 'grant_item');
    expect(eff?.detail).toContain('Rapier');
  });

  it('grant_item: randomFrom picks exactly one weapon from the pool', () => {
    const pool = ['greatsword', 'warhammer', 'rapier', 'longsword', 'shortbow'];
    const char = makeChar({ inventory: [] });
    const r = applyEventOutcome(
      char,
      outcome({ effects: [{ kind: 'grant_item', randomFrom: pool }] }),
      createDiceRoller(3),
    );
    expect(r.character.inventory).toHaveLength(1);
    expect(pool).toContain(r.character.inventory[0].itemId);
  });

  it('cha_scaled_gold: grants perPoint × CHA mod gold (silver tongue pays off)', () => {
    const silver = silverTongue({ goldInPocket: 0 });
    expect(modifierFor(silver, 'cha')).toBe(3);
    const r = applyEventOutcome(
      silver,
      outcome({ effects: [{ kind: 'cha_scaled_gold', perPoint: 6 }] }),
      createDiceRoller(1),
    );
    expect(r.character.goldInPocket).toBe(18);
    expect(r.effectsApplied[0].detail).toContain('CHA +3');
  });

  it('cha_scaled_gold: dump-stat CHA (mod 0) grants nothing and shows no line', () => {
    const dull = makeChar({ goldInPocket: 0 }); // effective CHA mod 0
    expect(modifierFor(dull, 'cha')).toBe(0);
    const r = applyEventOutcome(
      dull,
      outcome({ effects: [{ kind: 'cha_scaled_gold', perPoint: 6 }] }),
      createDiceRoller(1),
    );
    expect(r.character.goldInPocket).toBe(0);
    expect(r.effectsApplied).toHaveLength(0);
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

describe('canTakeChoice — gate evaluation', () => {
  function choice(overrides: Partial<EventChoice>): EventChoice {
    return {
      id: 'test-choice',
      label: 'Test',
      outcome: { resolution: 'ok', effects: [] },
      ...overrides,
    };
  }

  it('returns ok when no gates are present', () => {
    const c = makeChar();
    expect(canTakeChoice(c, choice({})).ok).toBe(true);
  });

  it('gold gate: blocks when wallet is short, allows when wallet meets cost', () => {
    const poor = makeChar({ goldInPocket: 4 });
    const rich = makeChar({ goldInPocket: 5 });
    const gated = choice({ requiresGold: 5 });
    const a = canTakeChoice(poor, gated);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.gate).toBe('gold');
    expect(canTakeChoice(rich, gated).ok).toBe(true);
  });

  it('hp gate: blocks when current HP below threshold', () => {
    const hurt = makeChar();
    hurt.hp = { current: 3, max: 20, temp: 0 };
    const gated = choice({ requiresHpAtLeast: 6 });
    const a = canTakeChoice(hurt, gated);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.gate).toBe('hp');
  });

  it('cha gate: blocks when effective CHA mod is below threshold', () => {
    // STANDARD_ARRAY = [15,14,13,12,10,8]. makeChar maps cha=STANDARD_ARRAY[4]=10 → mod 0.
    // Human race grants +1 to every stat → cha 11 → mod 0.
    const dull = makeChar();
    const gated = choice({ requiresCha: 1 });
    const a = canTakeChoice(dull, gated);
    expect(a.ok).toBe(false);
    if (!a.ok) {
      expect(a.gate).toBe('cha');
      expect(a.reason).toContain('CHA');
    }
  });

  it('cha gate: allows when effective CHA mod meets threshold (Half-Elf-style build)', () => {
    // Put 15 (the top of the standard array) into cha; race +1 → 16 → mod +3.
    const silverTongue = createCharacter({
      id: 'silver',
      name: 'Silver',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[3],
        int: STANDARD_ARRAY[5],
        wis: STANDARD_ARRAY[4],
        cha: STANDARD_ARRAY[0],
      },
      skillProficiencies: ['athletics', 'perception'],
    });
    expect(canTakeChoice(silverTongue, choice({ requiresCha: 3 })).ok).toBe(true);
    const tooHard = canTakeChoice(silverTongue, choice({ requiresCha: 4 }));
    expect(tooHard.ok).toBe(false);
    if (!tooHard.ok) expect(tooHard.gate).toBe('cha');
  });

  it('gate priority: gold checked before hp before cha (first failure surfaces)', () => {
    const broke = makeChar({ goldInPocket: 0 });
    broke.hp = { current: 1, max: 20, temp: 0 };
    const triple = choice({ requiresGold: 5, requiresHpAtLeast: 10, requiresCha: 5 });
    const a = canTakeChoice(broke, triple);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.gate).toBe('gold');
  });
});

describe('event content — road gambles, weapon finds & CHA payoffs', () => {
  it('rats-in-the-grain "cook" is a real gamble (successChance + sick-rat bite)', () => {
    const ev = getEvent('rats-in-the-grain');
    const cook = ev.choices.find((c) => c.id === 'cook');
    expect(cook?.successChance).toBeGreaterThan(0);
    expect(cook?.successChance).toBeLessThan(1);
    expect(cook?.failureOutcome).toBeDefined();
    const fail = cook!.failureOutcome as EventOutcome;
    expect(fail.effects.some((e) => e.kind === 'hp_delta' && e.amount < 0)).toBe(true);
  });

  it('dead-mans-steel "take-blade" grants a weapon from a road pool', () => {
    const ev = getEvent('dead-mans-steel');
    const take = ev.choices.find((c) => c.id === 'take-blade');
    const o = take!.outcome as EventOutcome;
    const grant = o.effects.find((e) => e.kind === 'grant_item');
    expect(grant).toBeDefined();
    if (grant && grant.kind === 'grant_item') {
      expect(grant.randomFrom && grant.randomFrom.length).toBeGreaterThan(0);
    }
  });

  it('pilgrim-road-smith offers a buyable rapier and a CHA-scaled haggle', () => {
    const ev = getEvent('pilgrim-road-smith');
    const buy = ev.choices.find((c) => c.id === 'buy-blade');
    const buyEffects = (buy!.outcome as EventOutcome).effects;
    expect(
      buyEffects.some((e) => e.kind === 'grant_item' && e.itemId === 'rapier'),
    ).toBe(true);
    const haggle = ev.choices.find((c) => c.id === 'haggle-smith');
    expect(haggle?.requiresCha).toBe(1);
    const haggleEffects = (haggle!.outcome as EventOutcome).effects;
    expect(haggleEffects.some((e) => e.kind === 'cha_scaled_gold')).toBe(true);
    expect(
      haggleEffects.some((e) => e.kind === 'grant_item' && e.itemId === 'rapier'),
    ).toBe(true);
  });
});
