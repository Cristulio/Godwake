import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './dispatch';
import { createDiceRoller } from '../../dice';
import { computeAC, isRaging } from '../../character/derived';
import { isAscendant, APOTHEOSIS_TEMP_HP, APOTHEOSIS_AC_BONUS } from '../apotheosis';
import {
  isDragonForm,
  SHAPE_CHANGE_ROUNDS,
  SHAPE_CHANGE_TEMP_HP,
  DRAGON_CLAW_ATTACKS,
  DRAGON_CLAW_HIT_BONUS,
  DRAGON_CLAW_DAMAGE_BONUS,
  DRAGON_CLAW_WEAPON_ID,
} from '../shapeChange';
import { TIME_STOP_EXTRA_TURNS } from '../timeStop';
import { maxAttacksPerAction, playerAttack } from '../attack/playerAttack';
import { endTurn, currentCombatantId } from '../turn';
import { availableWizardSpellsForLearn } from '../../character/leveling';
import { wizardSpellSlotsForLevel } from '../../character/actions';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';

/** A level-17 wizard who knows `spellId`, with the full L17 slot table refilled. */
function makeArchmage(spellId: string, level = 17): Character {
  const base = createCharacter({
    id: 'archmage',
    name: 'Veyra Ash',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[3],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[0],
      wis: STANDARD_ARRAY[1],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return {
    ...base,
    level,
    resources: {
      ...base.resources,
      spellSlots: wizardSpellSlotsForLevel(level),
      knownSpells: [...(base.resources.knownSpells ?? []), spellId],
    },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

describe('Apotheosis — the transform-self capstone', () => {
  it('spends a 9th-level slot and turns the caster ascendant', () => {
    const roller = createDiceRoller('apo-seed');
    const w = makeArchmage('apotheosis');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const acBefore = computeAC(init.character);

    const r = castSpell({ roller, character: init.character, state: init.state, spellId: 'apotheosis' });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    expect(isAscendant(r.character)).toBe(true);
    expect(r.character.hp.temp).toBe(APOTHEOSIS_TEMP_HP);
    expect(computeAC(r.character)).toBe(acBefore + APOTHEOSIS_AC_BONUS);
    // It is a self-cast, not a rage — the barbarian's flag stays untouched.
    expect(isRaging(r.character)).toBe(false);
  });
});

describe('Unmake — the remake-the-enemy capstone', () => {
  it('lands heavy necrotic and can paralyze a non-legendary foe', () => {
    // Force every d20 (the CON save) to the floor so the binding lands.
    const roller = createDiceRoller('unmake-seed');
    const w = makeArchmage('unmake');
    const goblin = getMonster('goblin'); // low CON, no legendary resistance
    const init = createCombat({ character: w, monsters: [{ def: goblin }] });
    const mon = findMonster(init.state);
    const hpBefore = mon.instance.hp.current;

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'unmake',
      targetId: mon.id,
    });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    const after = findMonster(r.state);
    // 18d8 + INT + spell-damage flattens a 7-HP goblin.
    expect(after.instance.hp.current).toBeLessThan(hpBefore);
  });

  it('does nothing without a 9th-level slot', () => {
    const roller = createDiceRoller('unmake-noslot');
    const w = makeArchmage('unmake', 8); // L8 → no 9th-level slot
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const mon = findMonster(init.state);
    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'unmake',
      targetId: mon.id,
    });
    expect(r.cast).toBe(false);
  });
});

describe('Shape Change — the become-a-dragon capstone', () => {
  it('spends a 9th-level slot, grants 100 temp HP, and enters dragon form for 5 rounds', () => {
    const roller = createDiceRoller('shape-seed');
    const w = makeArchmage('shape-change');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });

    const r = castSpell({ roller, character: init.character, state: init.state, spellId: 'shape-change' });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    expect(r.character.resources.dragonFormRoundsRemaining).toBe(SHAPE_CHANGE_ROUNDS);
    expect(r.character.hp.temp).toBe(SHAPE_CHANGE_TEMP_HP);
    expect(isDragonForm(r.character)).toBe(true);
    // It is a transform, not a rage — the barbarian's flag stays untouched.
    expect(isRaging(r.character)).toBe(false);
  });

  it('the take-max temp-HP rule keeps the higher of the two pools', () => {
    const roller = createDiceRoller('shape-temp');
    const w = makeArchmage('shape-change');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });
    const padded: Character = {
      ...init.character,
      hp: { ...init.character.hp, temp: SHAPE_CHANGE_TEMP_HP + 25 },
    };
    const r = castSpell({ roller, character: padded, state: init.state, spellId: 'shape-change' });
    expect(r.character.hp.temp).toBe(SHAPE_CHANGE_TEMP_HP + 25);
  });

  it('a dragon makes three claw swings per Attack action', () => {
    const roller = createDiceRoller('claw-volley');
    const w = makeArchmage('shape-change');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'shape-change' });

    expect(maxAttacksPerAction(cast.character)).toBe(DRAGON_CLAW_ATTACKS);

    const monId = findMonster(cast.state).id;
    let s = cast.state;
    let ch = cast.character;
    let swings = 0;
    for (let i = 0; i < DRAGON_CLAW_ATTACKS; i++) {
      const r = playerAttack({ roller, character: ch, state: s }, monId, DRAGON_CLAW_WEAPON_ID);
      s = r.state;
      ch = r.character;
      if (s.lastAttack?.weaponName === 'Dragon Claws') swings += 1;
    }
    expect(swings).toBe(DRAGON_CLAW_ATTACKS);
    // The third claw spends the one Attack action.
    expect(ch.actionEconomy.actionUsed).toBe(true);
  });

  it('the claws strike at +3 to hit and +3 damage (a +3 enchanted weapon)', () => {
    const w = makeArchmage('shape-change');
    // Heavy INT (the claws' casterWeapon attack stat) so both swings clear the
    // target AC on the same seed — the +3 damage delta is only meaningful when
    // both connect.
    const strong: Character = { ...w, baseAbilityScores: { ...w.baseAbilityScores, int: 30 } };
    const init = createCombat({ character: strong, monsters: [{ def: getMonster('spider-broodmother') }] });
    const monId = findMonster(init.state).id;

    const dragon: Character = {
      ...init.character,
      resources: { ...init.character.resources, dragonFormRoundsRemaining: SHAPE_CHANGE_ROUNDS },
    };
    const plain: Character = {
      ...init.character,
      resources: { ...init.character.resources, dragonFormRoundsRemaining: 0 },
    };

    const rD = playerAttack(
      { roller: createDiceRoller('claw-pair'), character: dragon, state: init.state },
      monId,
      DRAGON_CLAW_WEAPON_ID,
    );
    const rP = playerAttack(
      { roller: createDiceRoller('claw-pair'), character: plain, state: init.state },
      monId,
      DRAGON_CLAW_WEAPON_ID,
    );

    const hitBonusDelta = (rD.state.lastAttack?.attackBonus ?? 0) - (rP.state.lastAttack?.attackBonus ?? 0);
    expect(hitBonusDelta).toBe(DRAGON_CLAW_HIT_BONUS);

    expect(rD.state.lastAttack?.hit).toBe(true);
    expect(rP.state.lastAttack?.hit).toBe(true);
    const dmgDelta = (rD.state.lastAttack?.damageDealt ?? 0) - (rP.state.lastAttack?.damageDealt ?? 0);
    expect(dmgDelta).toBe(DRAGON_CLAW_DAMAGE_BONUS);
  });

  it('the form decrements each player turn and reverts at 0', () => {
    const roller = createDiceRoller('shape-decrement');
    const w = makeArchmage('shape-change');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('fire-giant') }] });
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'shape-change' });

    // Park the turn on the player and tick player turns by cycling endTurn back
    // around to the player (the form decrements at the start of each).
    let s: CombatState = { ...cast.state, currentTurnIndex: cast.state.turnOrder.indexOf('player') };
    let ch: Character = cast.character;
    const seen: number[] = [];
    for (let i = 0; i < SHAPE_CHANGE_ROUNDS; i++) {
      // advance off the player, then back, so the start-of-player-turn upkeep runs
      let r = endTurn(s, ch);
      s = r.state;
      ch = r.character;
      while (currentCombatantId(s) !== 'player') {
        r = endTurn(s, ch);
        s = r.state;
        ch = r.character;
      }
      seen.push(ch.resources.dragonFormRoundsRemaining ?? 0);
    }
    // 5 → 4 → 3 → 2 → 1 → 0 over the player turns; the last tick clears the form.
    expect(seen[seen.length - 1]).toBe(0);
    expect(isDragonForm(ch)).toBe(false);
  });
});

describe('Time Stop — three free player turns, enemies frozen', () => {
  it('spends a 9th-level slot and banks three extra turns', () => {
    const roller = createDiceRoller('timestop-seed');
    const w = makeArchmage('time-stop');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });

    const r = castSpell({ roller, character: init.character, state: init.state, spellId: 'time-stop' });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    expect(r.character.resources.extraTurnsRemaining).toBe(TIME_STOP_EXTRA_TURNS);
  });

  it('the turn returns to the player 3 times before any enemy acts', () => {
    const roller = createDiceRoller('timestop-turns');
    const w = makeArchmage('time-stop');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const cast = castSpell({ roller, character: init.character, state: init.state, spellId: 'time-stop' });

    const goblinHpBefore = findMonster(cast.state).instance.hp.current;
    let s: CombatState = { ...cast.state, currentTurnIndex: cast.state.turnOrder.indexOf('player') };
    let ch: Character = cast.character;

    // The three free turns: each endTurn keeps the turn on the player and spends
    // one banked turn — never advancing to the enemy.
    for (let i = 0; i < TIME_STOP_EXTRA_TURNS; i++) {
      const r = endTurn(s, ch);
      s = r.state;
      ch = r.character;
      expect(currentCombatantId(s)).toBe('player');
      expect(ch.resources.extraTurnsRemaining).toBe(TIME_STOP_EXTRA_TURNS - 1 - i);
      // A fresh action economy each frozen turn.
      expect(ch.actionEconomy.actionUsed).toBe(false);
    }

    // The freeze is spent — the next end finally hands the turn to the enemy.
    const after = endTurn(s, ch);
    expect(currentCombatantId(after.state)).not.toBe('player');
    // No enemy acted during the freeze — endTurn never runs monster AI.
    expect(findMonster(after.state).instance.hp.current).toBe(goblinHpBefore);
  });
});

describe('9th-level capstones are learnable + castable', () => {
  it('Time Stop and Shape Change appear in the wizard tier-9 learn pool', () => {
    const w = makeArchmage('fire-bolt');
    const ids = availableWizardSpellsForLearn(w, 9).map((s) => s.id);
    expect(ids).toContain('time-stop');
    expect(ids).toContain('shape-change');
  });
});
