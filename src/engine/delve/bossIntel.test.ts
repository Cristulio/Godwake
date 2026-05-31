import { describe, it, expect } from 'vitest';
import {
  createGodwakeDelve,
} from './createDelve';
import { applyEventOutcome } from './applyEventOutcome';
import { getEvent } from '../../content/events';
import {
  BOSS_INTEL_CARDS,
  getBossIntelCard,
  bossIntelBuffFor,
  intelEventIdFor,
} from '../../content/bossIntel';
import { createCombat } from '../combat/createCombat';
import { getMonster } from '../../content/monsters';
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
  it('Godwake delve has an intel event 1 room before each chapter boss', () => {
    const d = createGodwakeDelve(1);
    const bossIndices = d.rooms
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.kind === 'boss')
      .map(({ i }) => i);
    expect(bossIndices).toHaveLength(7);
    const expectedBossIds = [
      'duergar-ilyich',
      'athkatla-magistrate',
      'asylum-director',
      'drow-matron-mother',
      'hollow-dawn',
      'the-unmade',
      'drowned-custodian', // Ch7 · The Drowned Archive
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
  it('finding the weak spot readies the free edge for the right boss (no gold cost)', () => {
    const tpl = getEvent(intelEventIdFor('duergar-ilyich'));
    const free = tpl.choices.find((c) => c.id === 'find-weak-spot');
    expect(free).toBeTruthy();
    expect(free?.requiresGold).toBeUndefined();
    const character = dummyCharacter();
    const outcome = free!.outcome as EventOutcome;
    const result = applyEventOutcome(character, outcome, roller());
    expect(result.character.bossIntel?.['duergar-ilyich']).toBe('weak-spot');
    expect(result.character.goldInPocket).toBe(100);
  });

  it('studying the approach deducts the chapter-scaled coin cost and readies the battle plan', () => {
    const cases: Array<[string, number]> = [
      ['duergar-ilyich', 25],
      ['athkatla-magistrate', 60],
      ['asylum-director', 105],
      ['drow-matron-mother', 160],
    ];
    for (const [bossDefId, expectedPrice] of cases) {
      const tpl = getEvent(intelEventIdFor(bossDefId));
      const paid = tpl.choices.find((c) => c.id === 'study-the-approach');
      expect(paid?.requiresGold).toBe(expectedPrice);
      // Purse above the steepest Ch4 fee so every deduction lands exactly.
      const character = { ...dummyCharacter(), goldInPocket: 500 };
      const outcome = paid!.outcome as EventOutcome;
      const result = applyEventOutcome(character, outcome, roller());
      expect(result.character.goldInPocket).toBe(500 - expectedPrice);
      expect(result.character.bossIntel?.[bossDefId]).toBe('battle-plan');
    }
  });

  it('walking past sets the bold-approach flag and never readies a buff', () => {
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

  it('battle-plan supersedes weak-spot when both fire on the same boss', () => {
    const character = dummyCharacter();
    const after1 = applyEventOutcome(
      character,
      {
        resolution: '',
        effects: [
          { kind: 'grant_boss_buff', bossDefId: 'asylum-director', tier: 'weak-spot' },
        ],
      },
      roller(),
    );
    const after2 = applyEventOutcome(
      after1.character,
      {
        resolution: '',
        effects: [
          { kind: 'grant_boss_buff', bossDefId: 'asylum-director', tier: 'battle-plan' },
        ],
      },
      roller(),
    );
    expect(after2.character.bossIntel?.['asylum-director']).toBe('battle-plan');
  });

  it('weak-spot does not downgrade an existing battle-plan', () => {
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'asylum-director': 'battle-plan' },
    };
    const after = applyEventOutcome(
      character,
      {
        resolution: '',
        effects: [
          { kind: 'grant_boss_buff', bossDefId: 'asylum-director', tier: 'weak-spot' },
        ],
      },
      roller(),
    );
    expect(after.character.bossIntel?.['asylum-director']).toBe('battle-plan');
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

describe('boss intel — buff definitions', () => {
  it('weak-spot is the minor opener edge for every boss (advantage, no gird, no brace)', () => {
    for (const card of BOSS_INTEL_CARDS) {
      const buff = bossIntelBuffFor(card.bossDefId, 'weak-spot');
      expect(buff).toBeTruthy();
      expect(buff!.firstStrikeAdvantage).toBe(true);
      expect(buff!.bracedSave).toBe(false);
      expect(buff!.tempHp).toBe(0);
    }
  });

  it('battle-plan adds the braced save and a chapter-scaled temp-HP gird', () => {
    const expectedGird: Record<string, number> = {
      'duergar-ilyich': 6, // chapter 1
      'athkatla-magistrate': 9, // chapter 2
      'asylum-director': 12, // chapter 3
      'drow-matron-mother': 15, // chapter 4
      'hollow-dawn': 18, // chapter 5
      'the-unmade': 21, // chapter 6
      'drowned-custodian': 24, // chapter 7
    };
    for (const card of BOSS_INTEL_CARDS) {
      const buff = bossIntelBuffFor(card.bossDefId, 'battle-plan');
      expect(buff).toBeTruthy();
      expect(buff!.firstStrikeAdvantage).toBe(true);
      expect(buff!.bracedSave).toBe(true);
      expect(buff!.tempHp).toBe(expectedGird[card.bossDefId]);
    }
  });

  it('returns null for an unknown boss', () => {
    expect(bossIntelBuffFor('not-a-boss', 'weak-spot')).toBeNull();
  });
});

describe('boss intel — applied at the boss fight (createCombat)', () => {
  it('weak-spot arms advantage on the opening strike, no gird, no braced save', () => {
    const def = getMonster('duergar-ilyich');
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'duergar-ilyich': 'weak-spot' },
    };
    const { character: after } = createCombat({
      character,
      monsters: [{ def }],
      isBoss: true,
    });
    expect(after.nextAttackAdvantage).toBe(true);
    expect(after.nextSaveAdvantage).toBeFalsy();
    expect(after.hp.temp).toBe(0);
  });

  it('battle-plan arms opening strike + braced save + the chapter gird', () => {
    const def = getMonster('duergar-ilyich');
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'duergar-ilyich': 'battle-plan' },
    };
    const { character: after } = createCombat({
      character,
      monsters: [{ def }],
      isBoss: true,
    });
    expect(after.nextAttackAdvantage).toBe(true);
    expect(after.nextSaveAdvantage).toBe(true);
    expect(after.hp.temp).toBe(6); // Ilyich is chapter 1 → 6 temp HP
  });

  it('does not apply the buff to a non-boss encounter', () => {
    const def = getMonster('duergar-ilyich');
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'duergar-ilyich': 'battle-plan' },
    };
    const { character: after } = createCombat({
      character,
      monsters: [{ def }],
      isBoss: false,
    });
    expect(after.nextAttackAdvantage).toBeFalsy();
    expect(after.nextSaveAdvantage).toBeFalsy();
    expect(after.hp.temp).toBe(0);
  });

  it('does not apply when the readied intel is for a different boss', () => {
    const def = getMonster('duergar-ilyich');
    const character: Character = {
      ...dummyCharacter(),
      bossIntel: { 'asylum-director': 'battle-plan' },
    };
    const { character: after } = createCombat({
      character,
      monsters: [{ def }],
      isBoss: true,
    });
    expect(after.nextAttackAdvantage).toBeFalsy();
    expect(after.hp.temp).toBe(0);
  });
});

describe('boss intel cards — content', () => {
  it('exposes one card per chapter boss', () => {
    expect(BOSS_INTEL_CARDS.map((c) => c.bossDefId).sort()).toEqual(
      [
        'asylum-director',
        'athkatla-magistrate',
        'drow-matron-mother',
        'duergar-ilyich',
        'hollow-dawn',
        'the-unmade', // Ch6 (Beyond the Godwake)
        'drowned-custodian', // Ch7 (The Drowned Archive)
      ].sort(),
    );
  });

  it('every card has a unique coin cost scaling super-linearly with chapter', () => {
    const prices = BOSS_INTEL_CARDS.map((c) => c.coinCost);
    expect(new Set(prices).size).toBe(prices.length);
    expect(getBossIntelCard('duergar-ilyich')?.coinCost).toBe(25);
    expect(getBossIntelCard('athkatla-magistrate')?.coinCost).toBe(60);
    expect(getBossIntelCard('asylum-director')?.coinCost).toBe(105);
    expect(getBossIntelCard('drow-matron-mother')?.coinCost).toBe(160);
    expect(getBossIntelCard('hollow-dawn')?.coinCost).toBe(225);
    // Each step grows faster than the last — tracks the rising purse by chapter.
    const steps = prices.slice(1).map((p, i) => p - prices[i]);
    expect(steps.every((s, i) => i === 0 || s > steps[i - 1])).toBe(true);
  });

  it('every card carries the resolution prose for all three choices', () => {
    for (const card of BOSS_INTEL_CARDS) {
      expect(card.weakSpotResolution.length).toBeGreaterThan(0);
      expect(card.battlePlanResolution.length).toBeGreaterThan(0);
      expect(card.walkPastResolution.length).toBeGreaterThan(0);
    }
  });
});
