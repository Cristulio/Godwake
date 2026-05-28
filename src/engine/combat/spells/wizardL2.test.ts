import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../character/initialize';
import { simulateLevelUp, availableWizardSpellsForLearn } from '../../character/leveling';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { monsterAttack } from '../attack';
import { endTurn } from '../turn';
import { castSpell } from './dispatch';
import { createDiceRoller, setActiveRoller, type DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { RollResult } from '../../../types/dice';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';

/**
 * Roller with two independent scripted queues: d20 naturals (consumed by
 * `d20`) and damage-dice faces (consumed by `roll`). Defaults gracefully when a
 * queue runs dry so a test only has to script the rolls it asserts on.
 */
function makeScriptedRoller(opts: {
  d20Faces?: number[];
  damageRolls?: number[][];
}): DiceRoller {
  const d20Faces = opts.d20Faces ?? [];
  const damageRolls = opts.damageRolls ?? [];
  let di = 0;
  let ri = 0;
  const face = () => (di < d20Faces.length ? d20Faces[di++] : 10);
  return {
    d20(advantage = 'normal', modifier = 0): RollResult {
      const first = face();
      if (advantage === 'normal') {
        return {
          expression: { count: 1, die: 20, modifier },
          rolls: [first],
          modifier,
          total: first + modifier,
          natural20: first === 20,
          natural1: first === 1,
          advantage,
        };
      }
      const second = face();
      const chosen =
        advantage === 'advantage' ? Math.max(first, second) : Math.min(first, second);
      const discarded =
        advantage === 'advantage' ? Math.min(first, second) : Math.max(first, second);
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [chosen],
        modifier,
        total: chosen + modifier,
        natural20: chosen === 20,
        natural1: chosen === 1,
        advantage,
        discardedRoll: discarded,
      };
    },
    roll(expression, advantage = 'normal'): RollResult {
      const expr =
        typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      const dice =
        ri < damageRolls.length
          ? damageRolls[ri++]
          : Array.from({ length: expr.count }, () => Math.max(1, Math.floor(expr.die / 2)));
      const sum = dice.reduce((a, b) => a + b, 0);
      return {
        expression: expr,
        rolls: dice,
        modifier: expr.modifier,
        total: sum + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

/** L3 wizard (two 2nd-level slots) with `spellId` written into the spellbook. */
function makeWizardL3Knowing(spellId: string): Character {
  let w = createCharacter({
    id: 'l2-wizard',
    name: 'Veyra',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
    skillProficiencies: ['arcana', 'history'],
  });
  w = simulateLevelUp(w); // L2
  w = simulateLevelUp(w); // L3 — first 2nd-level slot
  return {
    ...w,
    resources: {
      ...w.resources,
      knownSpells: [...(w.resources.knownSpells ?? []), spellId],
    },
  };
}

function monsterId(state: ReturnType<typeof createCombat>['state']): string {
  return state.combatants.find((c) => c.kind === 'monster')!.id;
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
  setActiveRoller('wizard-l2-test-seed');
});

describe('Scorching Ray — three independent attack rolls', () => {
  it('all three rays hit: sums 2d6 per ray and applies once', () => {
    const goblin = getMonster('goblin'); // AC 15, 7 HP
    const init = createCombat({ character: makeWizardL3Knowing('scorching-ray'), monsters: [{ def: goblin }] });
    const w = init.character;
    const slotsBefore = w.resources.spellSlots?.[2] ?? 0;
    // INT 16 (+3) + prof +2 = +5 to hit. Faces 18 → 23 vs AC 15, all hit, no crit.
    const roller = makeScriptedRoller({
      d20Faces: [18, 18, 18],
      damageRolls: [[6, 6], [5, 5], [4, 4]],
    });

    const result = castSpell({ roller, character: w, state: init.state, spellId: 'scorching-ray' });
    expect(result.cast).toBe(true);
    expect(result.character.resources.spellSlots?.[2]).toBe(slotsBefore - 1);
    expect(result.character.actionEconomy.actionUsed).toBe(true);

    const mon = result.state.combatants.find((c) => c.kind === 'monster');
    expect(mon && mon.kind === 'monster' ? mon.instance.hp.current : -1).toBe(0); // 7 - 30, floored
    const dmgLine = result.state.log.find((l) => l.text.includes('3 of 3 rays'));
    expect(dmgLine?.text).toContain('30 fire');
  });

  it('rays roll independently: one miss still lets the others land', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('scorching-ray'), monsters: [{ def: goblin }] });
    // Face 2 → 7 vs AC 15 misses; faces 18 hit. Only two damage rolls consumed.
    const roller = makeScriptedRoller({
      d20Faces: [2, 18, 18],
      damageRolls: [[3, 3], [3, 3]],
    });

    const result = castSpell({ roller, character: init.character, state: init.state, spellId: 'scorching-ray' });
    expect(result.cast).toBe(true);
    const missLine = result.state.log.find((l) => l.text.startsWith('Ray 1') && l.text.includes('miss'));
    expect(missLine).toBeDefined();
    const dmgLine = result.state.log.find((l) => l.text.includes('2 of 3 rays'));
    expect(dmgLine?.text).toContain('12 fire');
  });
});

describe('Blur — attackers roll at disadvantage for 3 rounds', () => {
  it('cast arms blurRoundsRemaining and spends a 2nd-level slot + action', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('blur'), monsters: [{ def: goblin }] });
    const slotsBefore = init.character.resources.spellSlots?.[2] ?? 0;

    const roller = createDiceRoller(1);
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'blur' });
    expect(cast.cast).toBe(true);
    expect(cast.character.resources.blurRoundsRemaining).toBe(3);
    expect(cast.character.resources.spellSlots?.[2]).toBe(slotsBefore - 1);
    expect(cast.character.actionEconomy.actionUsed).toBe(true);
  });

  it('a monster attacking a blurred player rolls with disadvantage', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('blur'), monsters: [{ def: goblin }] });
    const roller = makeScriptedRoller({ d20Faces: [12, 12], damageRolls: [[3]] });
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'blur' });

    const mid = monsterId(cast.state);
    const after = monsterAttack({ roller, character: cast.character, state: cast.state }, mid);
    const attackLine = after.state.log.find((l) => l.text.includes('Scimitar'));
    expect(attackLine?.text).toContain('disadvantage');
    expect(attackLine?.text).toContain('Blur');
  });

  it('no disadvantage once Blur has expired', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('blur'), monsters: [{ def: goblin }] });
    const w: Character = {
      ...init.character,
      resources: { ...init.character.resources, blurRoundsRemaining: 0 },
    };
    const roller = makeScriptedRoller({ d20Faces: [15], damageRolls: [[3]] });
    const after = monsterAttack({ roller, character: w, state: init.state }, monsterId(init.state));
    const attackLine = after.state.log.find((l) => l.text.includes('Scimitar'));
    expect(attackLine?.text).not.toContain('disadvantage');
  });

  it('ticks down one round per player turn and lapses after 3 rounds', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('blur'), monsters: [{ def: goblin }] });
    const roller = createDiceRoller(7);
    let { state, character } = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'blur',
    });
    expect(character.resources.blurRoundsRemaining).toBe(3);

    const advanceRound = () => {
      // player -> monster, then monster -> player (one full round back to us).
      ({ state, character } = endTurn(state, character));
      ({ state, character } = endTurn(state, character));
    };
    advanceRound();
    expect(character.resources.blurRoundsRemaining).toBe(2);
    advanceRound();
    expect(character.resources.blurRoundsRemaining).toBe(1);
    advanceRound();
    expect(character.resources.blurRoundsRemaining).toBe(0);

    const after = monsterAttack({ roller, character, state }, monsterId(state));
    const attackLine = after.state.log.find((l) => l.text.includes('Scimitar'));
    expect(attackLine?.text).not.toContain('disadvantage');
  });
});

describe('Mirror Image — duplicates soak blows', () => {
  it('cast conjures 3 images and spends a 2nd-level slot + action', () => {
    const goblin = getMonster('goblin');
    const init = createCombat({ character: makeWizardL3Knowing('mirror-image'), monsters: [{ def: goblin }] });
    const slotsBefore = init.character.resources.spellSlots?.[2] ?? 0;
    const roller = createDiceRoller(1);
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'mirror-image' });
    expect(cast.cast).toBe(true);
    expect(cast.character.resources.mirrorImages).toBe(3);
    expect(cast.character.resources.spellSlots?.[2]).toBe(slotsBefore - 1);
    expect(cast.character.actionEconomy.actionUsed).toBe(true);
  });

  it('absorbs the first 3 hits, then the 4th lands', () => {
    const goblin = getMonster('goblin'); // +4 to hit, 1d6+2 slashing
    const init = createCombat({ character: makeWizardL3Knowing('mirror-image'), monsters: [{ def: goblin }] });
    // Face 19 → 23 vs the wizard's AC 14 always hits. One damage roll [3] for
    // the blow that gets through after the images are gone.
    const roller = makeScriptedRoller({ d20Faces: [19, 19, 19, 19], damageRolls: [[3]] });
    let { state, character } = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'mirror-image',
    });
    const mid = monsterId(state);
    const fullHp = character.hp.current;

    for (let i = 0; i < 3; i++) {
      ({ state, character } = monsterAttack({ roller, character, state }, mid));
      expect(character.resources.mirrorImages).toBe(2 - i);
      expect(character.hp.current).toBe(fullHp); // every blow soaked
    }
    expect(state.log.filter((l) => l.text.includes('duplicate shatters')).length).toBe(3);

    character = monsterAttack({ roller, character, state }, mid).character;
    expect(character.resources.mirrorImages).toBe(0);
    expect(character.hp.current).toBe(fullHp - 5); // 1d6(=3) + 2
  });
});

describe('L3 learn-spell pool', () => {
  it('offers the new 2nd-level spells beyond Misty Step', () => {
    let w = createCharacter({
      id: 'pool-wizard',
      name: 'Pool',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
      skillProficiencies: ['arcana', 'history'],
    });
    w = simulateLevelUp(w); // L2
    const pool = availableWizardSpellsForLearn({ ...w, level: 3 }, 2).map((s) => s.id);
    expect(pool).toContain('scorching-ray');
    expect(pool).toContain('blur');
    expect(pool).toContain('mirror-image');
    expect(pool).toContain('misty-step');
    expect(pool).not.toContain('hold-person'); // already in the L1 spellbook
  });
});
