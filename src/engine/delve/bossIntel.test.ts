import { describe, it, expect } from 'vitest';
import {
  createIronCellsDelve,
  createAthkatlaDelve,
  createSpellholdDelve,
  createUstNathaDelve,
  createGodwakeDelve,
} from './createDelve';
import { applyEventOutcome } from './applyEventOutcome';
import { getEvent } from '../../content/events';
import {
  BOSS_INTEL_CARDS,
  getBossIntelCard,
  intelEventIdFor,
} from '../../content/bossIntel';
import { createDiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { EventOutcome } from '../../schemas/event';

function dummyCharacter(): Character {
  return {
    id: 'dummy',
    name: 'Test',
    raceId: 'human',
    classId: 'fighter',
    subclassId: null,
    baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    xp: 0,
    skillProficiencies: [],
    expertSkills: [],
    hp: { current: 20, max: 20, temp: 0 },
    hitDice: { current: 1, max: 1, die: 10 },
    conditions: [],
    inventory: [],
    equipped: { mainHand: null, offHand: null, armor: null },
    resources: {},
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: 30,
    },
    quirks: [],
    blessings: [],
    goldInPocket: 100,
    renown: 0,
  };
}

function roller() {
  return createDiceRoller(1);
}

describe('boss intel rooms — placement', () => {
  it('Ch1 (Iron Cells) has an intel event exactly 1 room before Ilyich', () => {
    const d = createIronCellsDelve(1);
    const bossIdx = d.rooms.findIndex((r) => r.kind === 'boss');
    expect(bossIdx).toBeGreaterThan(0);
    const before = d.rooms[bossIdx - 1];
    expect(before.kind).toBe('event');
    expect(before.eventTemplateId).toBe(intelEventIdFor('duergar-ilyich'));
  });

  it('Ch2 (Athkatla) has an intel event 1 room before the Magistrate', () => {
    const d = createAthkatlaDelve(1);
    const bossIdx = d.rooms.findIndex((r) => r.kind === 'boss');
    const before = d.rooms[bossIdx - 1];
    expect(before.kind).toBe('event');
    expect(before.eventTemplateId).toBe(intelEventIdFor('athkatla-magistrate'));
  });

  it('Ch3 (Spellhold) has an intel event 1 room before the Director', () => {
    const d = createSpellholdDelve(1);
    const bossIdx = d.rooms.findIndex((r) => r.kind === 'boss');
    const before = d.rooms[bossIdx - 1];
    expect(before.kind).toBe('event');
    expect(before.eventTemplateId).toBe(intelEventIdFor('asylum-director'));
  });

  it('Ch4 (Ust Natha) has an intel event 1 room before the Matron Mother', () => {
    const d = createUstNathaDelve(1);
    const bossIdx = d.rooms.findIndex((r) => r.kind === 'boss');
    const before = d.rooms[bossIdx - 1];
    expect(before.kind).toBe('event');
    expect(before.eventTemplateId).toBe(intelEventIdFor('drow-matron-mother'));
  });

  it('Godwake delve has an intel event 1 room before each of its 4 bosses', () => {
    const d = createGodwakeDelve(1);
    const bossIndices = d.rooms
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.kind === 'boss')
      .map(({ i }) => i);
    expect(bossIndices).toHaveLength(4);
    const expectedBossIds = [
      'duergar-ilyich',
      'athkatla-magistrate',
      'asylum-director',
      'drow-matron-mother',
    ];
    bossIndices.forEach((bossIdx, i) => {
      const before = d.rooms[bossIdx - 1];
      expect(before.kind).toBe('event');
      expect(before.eventTemplateId).toBe(intelEventIdFor(expectedBossIds[i]));
    });
  });

  it('every boss intel card has a corresponding registered event template', () => {
    for (const card of BOSS_INTEL_CARDS) {
      expect(() => getEvent(intelEventIdFor(card.bossDefId))).not.toThrow();
    }
  });
});

describe('boss intel rooms — choices', () => {
  it('reading the omens stores partial intel for the right boss (no gold cost)', () => {
    const tpl = getEvent(intelEventIdFor('duergar-ilyich'));
    const omens = tpl.choices.find((c) => c.id === 'read-omens');
    expect(omens).toBeTruthy();
    const character = dummyCharacter();
    // Outcome here is the deterministic single-branch outcome.
    const outcome = omens!.outcome as EventOutcome;
    const result = applyEventOutcome(character, outcome, roller());
    expect(result.character.bossIntel?.['duergar-ilyich']).toBe('partial');
    expect(result.character.goldInPocket).toBe(100);
  });

  it('paying the scout deducts the chapter-scaled fee and stores full intel', () => {
    const cases: Array<[string, number]> = [
      ['duergar-ilyich', 8],
      ['athkatla-magistrate', 15],
      ['asylum-director', 25],
      ['drow-matron-mother', 40],
    ];
    for (const [bossDefId, expectedPrice] of cases) {
      const tpl = getEvent(intelEventIdFor(bossDefId));
      const scout = tpl.choices.find((c) => c.id === 'pay-for-scout');
      expect(scout?.requiresGold).toBe(expectedPrice);
      const character = dummyCharacter();
      const outcome = scout!.outcome as EventOutcome;
      const result = applyEventOutcome(character, outcome, roller());
      expect(result.character.goldInPocket).toBe(100 - expectedPrice);
      expect(result.character.bossIntel?.[bossDefId]).toBe('full');
    }
  });

  it('walking past sets the bold-approach flag and never stores intel', () => {
    const tpl = getEvent(intelEventIdFor('drow-matron-mother'));
    const past = tpl.choices.find((c) => c.id === 'walk-past');
    expect(past).toBeTruthy();
    const character = dummyCharacter();
    const outcome = past!.outcome as EventOutcome;
    const result = applyEventOutcome(character, outcome, roller());
    expect(result.character.boldApproachBosses).toContain('drow-matron-mother');
    expect(result.character.bossIntel?.['drow-matron-mother']).toBeUndefined();
    expect(result.character.goldInPocket).toBe(100);
  });

  it('full reveal supersedes partial when both fire on the same boss', () => {
    const character = dummyCharacter();
    const after1 = applyEventOutcome(
      character,
      {
        resolution: '',
        effects: [
          { kind: 'reveal_boss_intel', bossDefId: 'asylum-director', level: 'partial' },
        ],
      },
      roller(),
    );
    const after2 = applyEventOutcome(
      after1.character,
      {
        resolution: '',
        effects: [
          { kind: 'reveal_boss_intel', bossDefId: 'asylum-director', level: 'full' },
        ],
      },
      roller(),
    );
    expect(after2.character.bossIntel?.['asylum-director']).toBe('full');
  });

  it('partial reveal does not downgrade an existing full reveal', () => {
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'asylum-director': 'full' },
    };
    const after = applyEventOutcome(
      character,
      {
        resolution: '',
        effects: [
          { kind: 'reveal_boss_intel', bossDefId: 'asylum-director', level: 'partial' },
        ],
      },
      roller(),
    );
    expect(after.character.bossIntel?.['asylum-director']).toBe('full');
  });

  it('walk-past flag is idempotent (re-applying does not double-list)', () => {
    const character: Character = {
      ...dummyCharacter(),
      boldApproachBosses: ['duergar-ilyich'],
    };
    const after = applyEventOutcome(
      character,
      {
        resolution: '',
        effects: [{ kind: 'mark_bold_approach', bossDefId: 'duergar-ilyich' }],
      },
      roller(),
    );
    expect(after.character.boldApproachBosses).toEqual(['duergar-ilyich']);
  });
});

describe('boss intel cards — content', () => {
  it('exposes one card per chapter boss', () => {
    expect(BOSS_INTEL_CARDS.map((c) => c.bossDefId).sort()).toEqual(
      ['asylum-director', 'athkatla-magistrate', 'drow-matron-mother', 'duergar-ilyich'].sort(),
    );
  });

  it('every card has a unique scout price scaling with chapter', () => {
    const prices = BOSS_INTEL_CARDS.map((c) => c.scoutPrice);
    expect(new Set(prices).size).toBe(prices.length);
    expect(getBossIntelCard('duergar-ilyich')?.scoutPrice).toBe(8);
    expect(getBossIntelCard('athkatla-magistrate')?.scoutPrice).toBe(15);
    expect(getBossIntelCard('asylum-director')?.scoutPrice).toBe(25);
    expect(getBossIntelCard('drow-matron-mother')?.scoutPrice).toBe(40);
  });

  it('every card lists at least one full-action stat line', () => {
    for (const card of BOSS_INTEL_CARDS) {
      expect(card.fullActions.length).toBeGreaterThan(0);
      expect(card.signature.length).toBeGreaterThan(0);
    }
  });

  it('no intel stat line leaks a non-functional positional stat (reach/range)', () => {
    // Combat is non-positional — the engine never reads reach or range, so the
    // scout/omen reveal must show only actionable numbers (HP, AC, to-hit,
    // damage, save DCs, triggers).
    for (const card of BOSS_INTEL_CARDS) {
      for (const line of card.fullActions) {
        expect(line).not.toMatch(/\breach\b/i);
        expect(line).not.toMatch(/\brange\b/i);
      }
      expect(card.signature).not.toMatch(/\breach\b/i);
      expect(card.signature).not.toMatch(/\brange\b/i);
    }
  });
});
