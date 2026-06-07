import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack, applyDamage, monsterAttack, sneakAttackDiceForLevel } from './attack';
import {
  useCunningAction,
  regenCunningActionForRound,
  isCunningRegenRound,
  turnsUntilCunningRegen,
  CUNNING_ACTION_REGEN_INTERVAL,
} from './cunningAction';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function makeRogue(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-rogue',
      name: 'Shiv',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8
        dex: STANDARD_ARRAY[0], // 15
        con: STANDARD_ARRAY[1], // 14
        int: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        cha: STANDARD_ARRAY[4], // 10
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
    ...extra,
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

describe('sneakAttackDiceForLevel', () => {
  it('returns 1d6 at L1-2, 2d6 at L3-4, 3d6 at L5-6, 4d6 at L7-8', () => {
    expect(sneakAttackDiceForLevel(1)).toBe(1);
    expect(sneakAttackDiceForLevel(2)).toBe(1);
    expect(sneakAttackDiceForLevel(3)).toBe(2);
    expect(sneakAttackDiceForLevel(4)).toBe(2);
    expect(sneakAttackDiceForLevel(5)).toBe(3);
    expect(sneakAttackDiceForLevel(6)).toBe(3);
    expect(sneakAttackDiceForLevel(7)).toBe(4);
    expect(sneakAttackDiceForLevel(8)).toBe(4);
  });
});

describe('Rogue — Sneak Attack scaling in combat', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function fireSneakAtLevel(level: number): string | undefined {
    for (let seed = 1; seed <= 120; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue({ level });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // Past the opener so base Sneak scaling is isolated from Assassinate's
      // opener-only bonus dice (Hide + dagger still trigger the Sneak).
      state = { ...state, playerHasAttacked: true };
      const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      const log = state.log.find((l) => l.text.includes('sneak ('));
      if (log) return log.text;
    }
    return undefined;
  }

  it('logs 1d6 at L1', () => {
    const text = fireSneakAtLevel(1);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (1d6)');
  });

  it('logs 2d6 at L3', () => {
    const text = fireSneakAtLevel(3);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (2d6)');
  });

  it('logs 3d6 at L5', () => {
    const text = fireSneakAtLevel(5);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (3d6)');
  });
});

describe('Rogue — Knife in the Dark (permanentBonuses.sneakAttackDice)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function fireSneakAtLevelWithBonus(level: number, bonus: number): string | undefined {
    for (let seed = 1; seed <= 120; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue({ level, permanentBonuses: { sneakAttackDice: bonus } });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // Past the opener so base Sneak scaling is isolated from Assassinate.
      state = { ...state, playerHasAttacked: true };
      const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      const log = state.log.find((l) => l.text.includes('sneak ('));
      if (log) return log.text;
    }
    return undefined;
  }

  it('L3 rogue with +1 bonus rolls 3d6 (2d6 base + 1d6 bonus)', () => {
    const text = fireSneakAtLevelWithBonus(3, 1);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (3d6)');
  });

  it('L1 rogue with +2 bonus rolls 3d6 (1d6 base + 2d6 bonus)', () => {
    const text = fireSneakAtLevelWithBonus(1, 2);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (3d6)');
  });

  it('bonus = 0 matches the no-bonus baseline at L1 (1d6)', () => {
    const text = fireSneakAtLevelWithBonus(1, 0);
    expect(text).toBeDefined();
    expect(text).toContain('sneak (1d6)');
  });
});

describe('Rogue — Sneak Attack', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('fires when the attack has advantage (Hide → next attack)', () => {
    // Try several seeds — we want one where the dagger actually hits with
    // Hide-advantage so the Sneak Attack damage line appears.
    let observed = false;
    for (let seed = 1; seed <= 60 && !observed; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // Trigger Hide so the attack rolls with advantage.
      const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
      state = ca.state;
      rogue = ca.character;
      expect(rogue.nextAttackAdvantage).toBe(true);
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      rogue = atk.character;
      const damageLog = state.log.find((l) => l.text.includes('sneak ('));
      if (damageLog) {
        observed = true;
        expect(state.sneakAttackUsedThisTurn).toBe(true);
        // Hide was consumed by the actual attack roll.
        expect(rogue.nextAttackAdvantage).toBe(false);
      }
    }
    expect(observed).toBe(true);
  });

  it('fires on the first attack of combat with no Hide, no bloodied, no dagger (opening strike)', () => {
    // The rogue steps from shadow on the opener — no setup required.
    // Use a rapier so the dagger synergy path is closed.
    let observed = false;
    for (let seed = 1; seed <= 60 && !observed; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue({
        inventory: [{ itemId: 'rapier' }],
        equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: null },
      });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // No Hide, goblin at full HP — only isFirstAttack should fire sneak.
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'rapier');
      state = atk.state;
      const sneakLog = state.log.find((l) => l.text.includes('sneak ('));
      if (sneakLog) {
        observed = true;
        expect(state.sneakAttackUsedThisTurn).toBe(true);
      }
    }
    expect(observed).toBe(true);
  });

  it('fires on a wounded (bloodied) target without advantage', () => {
    let observed = false;
    for (let seed = 1; seed <= 60 && !observed; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // Pre-wound the goblin to below half HP.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 2 } } }
            : c,
        ),
      };
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      const sneakLog = state.log.find((l) => l.text.includes('sneak ('));
      if (sneakLog) {
        observed = true;
        expect(state.sneakAttackUsedThisTurn).toBe(true);
      }
    }
    expect(observed).toBe(true);
  });

  it('does NOT double-fire on a single turn', () => {
    // Find a seed where the rogue hits twice via Hide + a wounded follow-up.
    // Sneak Attack must fire on the first hit, then not appear on the
    // second within the same turn even though triggers still apply.
    let validated = false;
    for (let seed = 1; seed <= 120 && !validated; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue();
      // Give the rogue a longer reach: bring its action back so we can
      // attack twice in one "turn" without invoking Action Surge plumbing.
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = findMonster(state).id;
      const atk1 = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk1.state;
      rogue = atk1.character;
      const firstSneak = state.log.filter((l) => l.text.includes('sneak (')).length;
      if (firstSneak !== 1) continue;
      if (state.status !== 'active') continue;

      // Manually refund the action so we can attack again without ending the turn.
      rogue = { ...rogue, actionEconomy: { ...rogue.actionEconomy, actionUsed: false } };
      // Wound the goblin so the second attack has a sneak trigger regardless.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 1 } } }
            : c,
        ),
      };

      const atk2 = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk2.state;
      const totalSneak = state.log.filter((l) => l.text.includes('sneak (')).length;
      expect(totalSneak).toBe(1);
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('resets the per-turn flag on endTurn so the next turn can sneak again', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(5);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    state = { ...state, sneakAttackUsedThisTurn: true };
    const et = endTurn(state, rogue);
    state = et.state;
    rogue = et.character;
    expect(state.sneakAttackUsedThisTurn).toBe(false);
    void rogue;
  });

  it('does not fire for non-Rogue characters even with advantage', () => {
    const goblin = getMonster('goblin');
    let fighter: Character = {
      ...createCharacter({
        id: 'test-fighter',
        name: 'Brick',
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
      }),
      inventory: [{ itemId: 'longsword' }],
      equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    };
    fighter = { ...fighter, nextAttackAdvantage: true }; // unlikely path, but proves gating
    const roller = createDiceRoller(11);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    let state = init.state;
    fighter = init.character;
    const goblinId = findMonster(state).id;
    const atk = playerAttack({ roller, character: fighter, state }, goblinId, 'longsword');
    state = atk.state;
    fighter = atk.character;
    const sneak = state.log.find((l) => l.text.includes('sneak ('));
    expect(sneak).toBeUndefined();
    void fighter;
  });
});

describe('Rogue — Uncanny Dodge', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('halves the first incoming hit per round at L5', () => {
    let rogue = makeRogue({ level: 5 });
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    rogue = init.character;
    const hpBefore = rogue.hp.current;
    const dmg = applyDamage(state, 'player', 7, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(hpBefore - 3);
    expect(rogue.actionEconomy.reactionUsed).toBe(true);
    const log = state.log.find((l) => l.text.includes('Uncanny Dodge'));
    expect(log?.text).toContain('damage halved (7 → 3)');
  });

  it('second hit in the same round takes full damage', () => {
    let rogue = makeRogue({ level: 5 });
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    rogue = init.character;
    const hpBefore = rogue.hp.current;
    let dmg = applyDamage(state, 'player', 6, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(hpBefore - 3);
    dmg = applyDamage(state, 'player', 4, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(hpBefore - 3 - 4);
    void state;
  });

  it('does not trigger for L4 Rogue', () => {
    let rogue = makeRogue({ level: 4 });
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    rogue = init.character;
    const hpBefore = rogue.hp.current;
    const dmg = applyDamage(state, 'player', 6, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(hpBefore - 6);
    expect(rogue.actionEconomy.reactionUsed).toBe(false);
    expect(state.log.find((l) => l.text.includes('Uncanny Dodge'))).toBeUndefined();
  });

  it('does not trigger for a Fighter at L5', () => {
    let fighter: Character = {
      ...createCharacter({
        id: 'test-fighter-ud',
        name: 'Brick',
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
      }),
      level: 5,
      inventory: [{ itemId: 'longsword' }],
      equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    };
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: fighter,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    fighter = init.character;
    const hpBefore = fighter.hp.current;
    const dmg = applyDamage(state, 'player', 6, fighter);
    state = dmg.state;
    fighter = dmg.character;
    expect(fighter.hp.current).toBe(hpBefore - 6);
    expect(state.log.find((l) => l.text.includes('Uncanny Dodge'))).toBeUndefined();
  });

  it('reaction resets when the Rogue starts a new turn, re-enabling Uncanny Dodge', () => {
    let rogue = makeRogue({ level: 5 });
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    rogue = init.character;
    let dmg = applyDamage(state, 'player', 8, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.actionEconomy.reactionUsed).toBe(true);

    // Cycle initiative back to the player so reaction resets.
    for (let i = 0; i < state.turnOrder.length; i++) {
      const et = endTurn(state, rogue);
      state = et.state;
      rogue = et.character;
      if (state.turnOrder[state.currentTurnIndex] === 'player') break;
    }
    expect(state.turnOrder[state.currentTurnIndex]).toBe('player');
    expect(rogue.actionEconomy.reactionUsed).toBe(false);

    const hpBefore = rogue.hp.current;
    dmg = applyDamage(state, 'player', 6, rogue);
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(hpBefore - 3);
    expect(rogue.actionEconomy.reactionUsed).toBe(true);
  });

  it('zero or temp-HP-only damage does not waste the reaction', () => {
    let rogue = makeRogue({ level: 5 });
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    let state = init.state;
    rogue = init.character;
    const dmg = applyDamage(state, 'player', 0, rogue);
    state = dmg.state;
    rogue = dmg.character;
    expect(rogue.actionEconomy.reactionUsed).toBe(false);
    expect(state.log.find((l) => l.text.includes('Uncanny Dodge'))).toBeUndefined();
  });
});

describe('Rogue — Nimble Dodge', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function goblinAttacks(character: Character) {
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character,
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblinId = findMonster(init.state).id;
    return monsterAttack({ roller, character: init.character, state: init.state }, goblinId);
  }

  function nimbleNote(state: CombatState) {
    return state.log.find((l) => l.text.includes('disadvantage — nimble dodge'));
  }

  it('imposes disadvantage and spends the reaction at L1', () => {
    const res = goblinAttacks(makeRogue({ level: 1 }));
    expect(nimbleNote(res.state)).toBeDefined();
    expect(res.state.log.find((l) => l.text.includes('twists low'))).toBeDefined();
    expect(res.character.actionEconomy.reactionUsed).toBe(true);
  });

  it('still fires at L4 (boundary)', () => {
    const res = goblinAttacks(makeRogue({ level: 4 }));
    expect(nimbleNote(res.state)).toBeDefined();
    expect(res.character.actionEconomy.reactionUsed).toBe(true);
  });

  it('is inactive at L5 — Uncanny Dodge takes over', () => {
    const res = goblinAttacks(makeRogue({ level: 5 }));
    expect(nimbleNote(res.state)).toBeUndefined();
  });

  it('never fires for a non-Rogue at L1', () => {
    const fighter: Character = {
      ...createCharacter({
        id: 'test-fighter-nimble',
        name: 'Brick',
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
      }),
      inventory: [{ itemId: 'longsword' }],
      equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    };
    const res = goblinAttacks(fighter);
    expect(nimbleNote(res.state)).toBeUndefined();
  });

  it('only the first attack of the round dodges — a second swing lands clean', () => {
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: makeRogue({ level: 1 }),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblinId = findMonster(init.state).id;
    const first = monsterAttack(
      { roller, character: init.character, state: init.state },
      goblinId,
    );
    expect(first.character.actionEconomy.reactionUsed).toBe(true);
    const before = first.state.log.length;
    const second = monsterAttack(
      { roller, character: first.character, state: first.state },
      goblinId,
    );
    const newLines = second.state.log.slice(before);
    expect(newLines.find((l) => l.text.includes('disadvantage — nimble dodge'))).toBeUndefined();
  });
});

describe('Rogue — Cunning Action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Hide sets nextAttackAdvantage and burns the bonus action', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    expect(rogue.actionEconomy.bonusActionUsed).toBe(false);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);

    const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
    state = ca.state;
    rogue = ca.character;
    expect(rogue.nextAttackAdvantage).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(0);
    const log = state.log[state.log.length - 1];
    expect(log.text).toContain('shadow');
  });

  it('Feint arms a guaranteed Sneak Attack and consumes it on the next strike', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    expect(rogue.nextAttackForceSneak ?? false).toBe(false);

    const ca = useCunningAction({ character: rogue, state, choice: 'feint' });
    state = ca.state;
    rogue = ca.character;
    expect(rogue.nextAttackForceSneak).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);
    const log = state.log[state.log.length - 1];
    expect(log.text).toContain('feints');
  });

  it('Feint guarantees Sneak past the opener with no advantage, wound, or dagger', () => {
    // Use a rapier (no dagger synergy) and advance past the opener so the only
    // possible Sneak trigger is the Feint force-flag.
    let observed = false;
    for (let seed = 1; seed <= 80 && !observed; seed++) {
      let rogue = makeRogue({
        inventory: [{ itemId: 'rapier' }],
        equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: null },
      });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: getMonster('goblin') }] });
      let state: CombatState = { ...init.state, playerHasAttacked: true, sneakAttackUsedThisTurn: false };
      rogue = init.character;
      const ca = useCunningAction({ character: rogue, state, choice: 'feint' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'rapier');
      state = atk.state;
      rogue = atk.character;
      const sneakLog = state.log.find((l) => l.text.includes('sneak ('));
      if (sneakLog) {
        observed = true;
        expect(state.sneakAttackUsedThisTurn).toBe(true);
        // Force-sneak flag consumed by the strike.
        expect(rogue.nextAttackForceSneak).toBe(false);
      }
    }
    expect(observed).toBe(true);
  });

  it('Quick Strike queues a bonus swing this turn — player can attack again after the Action is spent', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(7);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    // Inflate the goblin's HP so a single swing can't end combat before the
    // bonus swing has a chance to fire.
    state = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.kind === 'monster'
          ? { ...c, instance: { ...c.instance, hp: { current: 200, max: 200, temp: 0 } } }
          : c,
      ),
    };
    expect(rogue.bonusAttackAvailable ?? false).toBe(false);

    const ca = useCunningAction({ character: rogue, state, choice: 'quick-strike' });
    state = ca.state;
    rogue = ca.character;
    expect(rogue.bonusAttackAvailable).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);

    const goblinId = findMonster(state).id;
    // First swing — uses the Attack action.
    let atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
    state = atk.state;
    rogue = atk.character;
    expect(rogue.actionEconomy.actionUsed).toBe(true);
    expect(rogue.bonusAttackAvailable).toBe(true);

    // Second swing — funded by Quick Strike, action stays spent, flag clears.
    atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
    state = atk.state;
    rogue = atk.character;
    expect(rogue.bonusAttackAvailable).toBe(false);
    expect(rogue.actionEconomy.actionUsed).toBe(true);

    // Two attack lines in the log — one per swing.
    const attackLines = state.log.filter((l) => l.text.includes('attacks Goblin'));
    expect(attackLines.length).toBe(2);
  });

  it('Quick Strike bonus swing does not double Sneak Attack (once-per-turn rule)', () => {
    // Find a seed where the rogue lands both swings on a wounded goblin so
    // Sneak Attack would trigger on every hit if the gate were broken.
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      const goblin = getMonster('goblin');
      let rogue = makeRogue();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      let state = init.state;
      rogue = init.character;
      // Wound the goblin so the SA "bloodied target" trigger is always active.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 100, max: 200 } } }
            : c,
        ),
      };
      // Now drop current to half so it stays bloodied through both swings.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 50 } } }
            : c,
        ),
      };
      const ca = useCunningAction({ character: rogue, state, choice: 'quick-strike' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = findMonster(state).id;
      let atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      rogue = atk.character;
      if (state.status !== 'active') continue;
      atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      const sneakLines = state.log.filter((l) => l.text.includes('sneak ('));
      const attackLines = state.log.filter((l) => l.text.includes('attacks Goblin'));
      if (attackLines.length < 2) continue;
      expect(sneakLines.length).toBeLessThanOrEqual(1);
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('is gated by the per-combat use pool', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
    state = ca.state;
    rogue = ca.character;
    // Reset bonus action to simulate a new turn, but keep the depleted pool.
    rogue = {
      ...rogue,
      actionEconomy: { ...rogue.actionEconomy, bonusActionUsed: false },
      nextAttackAdvantage: false,
    };
    const before = state;
    const ca2 = useCunningAction({ character: rogue, state, choice: 'hide' });
    state = ca2.state;
    rogue = ca2.character;
    expect(state).toBe(before);
    expect(rogue.nextAttackAdvantage).toBe(false);
  });

  it('refuses Cunning Action for non-Rogue characters', () => {
    const goblin = getMonster('goblin');
    let fighter: Character = {
      ...createCharacter({
        id: 'test-fighter-2',
        name: 'Brick',
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
      }),
      inventory: [{ itemId: 'longsword' }],
      equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    };
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    let state = init.state;
    fighter = init.character;
    const before = state;
    const ca = useCunningAction({ character: fighter, state, choice: 'hide' });
    state = ca.state;
    fighter = ca.character;
    expect(state).toBe(before);
    expect(fighter.nextAttackAdvantage).toBeFalsy();
  });
});

function bloatGoblinHp(state: CombatState): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster'
        ? { ...c, instance: { ...c.instance, hp: { current: 200, max: 200, temp: 0 } } }
        : c,
    ),
  };
}

describe('Rogue — Assassinate (L4 opener burst)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('drives extra Sneak dice into the opener at L4 (2d6 base + 2d6 = 4d6)', () => {
    let text: string | undefined;
    for (let seed = 1; seed <= 80 && !text; seed++) {
      let rogue = makeRogue({
        level: 4,
        inventory: [{ itemId: 'rapier' }],
        equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: null },
      });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: getMonster('goblin') }] });
      let state = bloatGoblinHp(init.state);
      rogue = init.character;
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'rapier');
      state = atk.state;
      const log = state.log.find((l) => l.text.includes('sneak ('));
      if (log) text = log.text;
    }
    expect(text).toBeDefined();
    expect(text).toContain('sneak (4d6)');
  });

  it('the bonus dice are opener-only — a later strike rolls base 2d6 at L4', () => {
    let text: string | undefined;
    for (let seed = 1; seed <= 80 && !text; seed++) {
      let rogue = makeRogue({
        level: 4,
        inventory: [{ itemId: 'rapier' }],
        equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: null },
      });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: getMonster('goblin') }] });
      let state: CombatState = bloatGoblinHp({ ...init.state, playerHasAttacked: true });
      rogue = init.character;
      // Hide to enable Sneak on a non-opener strike (Assassinate must not fire).
      const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
      state = ca.state;
      rogue = ca.character;
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'rapier');
      state = atk.state;
      const log = state.log.find((l) => l.text.includes('sneak ('));
      if (log) text = log.text;
    }
    expect(text).toBeDefined();
    expect(text).toContain('sneak (2d6)');
  });
});

describe('Rogue — Envenom (L8 bleed on Sneak)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a landed Sneak leaves a 2/turn bleed for 2 turns at L8', () => {
    let observed = false;
    for (let seed = 1; seed <= 80 && !observed; seed++) {
      let rogue = makeRogue({ level: 8 });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: getMonster('goblin') }] });
      let state = bloatGoblinHp(init.state);
      rogue = init.character;
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      if (state.log.find((l) => l.text.includes('sneak ('))) {
        observed = true;
        const goblin = findMonster(state);
        expect(goblin.instance.bleedDamagePerTurn ?? 0).toBeGreaterThanOrEqual(2);
        expect(goblin.instance.bleedTurnsRemaining ?? 0).toBeGreaterThanOrEqual(2);
        expect(state.log.find((l) => l.text.includes('envenomed'))).toBeDefined();
      }
    }
    expect(observed).toBe(true);
  });

  it('no bleed without Envenom at L7', () => {
    let observed = false;
    for (let seed = 1; seed <= 80 && !observed; seed++) {
      let rogue = makeRogue({ level: 7 });
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: rogue, monsters: [{ def: getMonster('goblin') }] });
      let state = bloatGoblinHp(init.state);
      rogue = init.character;
      const goblinId = findMonster(state).id;
      const atk = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger');
      state = atk.state;
      if (state.log.find((l) => l.text.includes('sneak ('))) {
        observed = true;
        expect(findMonster(state).instance.bleedDamagePerTurn ?? 0).toBe(0);
      }
    }
    expect(observed).toBe(true);
  });
});

describe('Rogue — Evasion (L10 charged-special)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('halves a charged-special hit without spending the reaction at L10', () => {
    let rogue = makeRogue({ level: 10 });
    const init = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    const state: CombatState = { ...init.state, evasionWindowActive: true };
    rogue = init.character;
    const before = rogue.hp.current;
    const dmg = applyDamage(state, 'player', 10, rogue);
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(before - 5);
    // Evasion is footwork, not a reaction — Uncanny Dodge is still available.
    expect(rogue.actionEconomy.reactionUsed).toBe(false);
    expect(dmg.state.log.find((l) => l.text.includes('Evasion halves'))).toBeDefined();
  });

  it('outside the charged window a L10 rogue falls back to Uncanny Dodge (spends reaction)', () => {
    let rogue = makeRogue({ level: 10 });
    const init = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    rogue = init.character;
    const before = rogue.hp.current;
    const dmg = applyDamage(init.state, 'player', 10, rogue);
    rogue = dmg.character;
    expect(rogue.hp.current).toBe(before - 5);
    expect(rogue.actionEconomy.reactionUsed).toBe(true);
    expect(dmg.state.log.find((l) => l.text.includes('Uncanny Dodge'))).toBeDefined();
  });

  it('a L9 rogue does not Evade — no half, no skip of Uncanny Dodge', () => {
    let rogue = makeRogue({ level: 9 });
    const init = createCombat({
      roller: createDiceRoller(1),
      character: rogue,
      monsters: [{ def: getMonster('goblin') }],
    });
    const state: CombatState = { ...init.state, evasionWindowActive: true };
    rogue = init.character;
    const before = rogue.hp.current;
    const dmg = applyDamage(state, 'player', 10, rogue);
    rogue = dmg.character;
    // Uncanny Dodge still halves (spends reaction); the Evasion line never logs.
    expect(rogue.hp.current).toBe(before - 5);
    expect(rogue.actionEconomy.reactionUsed).toBe(true);
    expect(dmg.state.log.find((l) => l.text.includes('Evasion halves'))).toBeUndefined();
  });
});

describe('Rogue — Opportunist (L12 reaction riposte)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function goblinSwing(character: Character, seed: number) {
    const roller = createDiceRoller(seed);
    const init = createCombat({
      roller,
      character,
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblinId = findMonster(init.state).id;
    return monsterAttack({ roller, character: init.character, state: init.state }, goblinId);
  }

  it('ripostes with a Sneak jab when a foe misses (L12)', () => {
    let fired = false;
    for (let seed = 1; seed <= 80 && !fired; seed++) {
      const res = goblinSwing(makeRogue({ level: 12 }), seed);
      const missed = res.state.log.find((l) => l.text.includes('— miss'));
      const riposte = res.state.log.find((l) => l.text.includes('ripostes for'));
      if (missed && riposte) {
        fired = true;
        expect(res.character.opportunistUsedThisRound).toBe(true);
      }
    }
    expect(fired).toBe(true);
  });

  it('does not riposte for a L11 rogue (no Opportunist yet)', () => {
    let sawMiss = false;
    for (let seed = 1; seed <= 80; seed++) {
      const res = goblinSwing(makeRogue({ level: 11 }), seed);
      if (res.state.log.find((l) => l.text.includes('— miss'))) {
        sawMiss = true;
        expect(res.state.log.find((l) => l.text.includes('ripostes for'))).toBeUndefined();
      }
    }
    expect(sawMiss).toBe(true);
  });
});

describe('Rogue — Cunning Action regen', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('regen ticks every other round starting at round 3', () => {
    expect(CUNNING_ACTION_REGEN_INTERVAL).toBe(2);
    expect(isCunningRegenRound(1)).toBe(false);
    expect(isCunningRegenRound(2)).toBe(false);
    expect(isCunningRegenRound(3)).toBe(true);
    expect(isCunningRegenRound(4)).toBe(false);
    expect(isCunningRegenRound(5)).toBe(true);
  });

  it('turnsUntilCunningRegen counts down to the next tick', () => {
    expect(turnsUntilCunningRegen(1)).toBe(2);
    expect(turnsUntilCunningRegen(2)).toBe(1);
    expect(turnsUntilCunningRegen(3)).toBe(2);
    expect(turnsUntilCunningRegen(4)).toBe(1);
  });

  it('regenCunningActionForRound returns one use on a tick round, capped at max', () => {
    const spent = makeRogue({ resources: { ...makeRogue().resources, cunningActionUsesRemaining: 0 } });
    // Not a tick round — no change.
    expect(regenCunningActionForRound(spent, 2)).toBe(spent);
    // Tick round — one use returned.
    const regened = regenCunningActionForRound(spent, 3);
    expect(regened.resources.cunningActionUsesRemaining).toBe(1);
    // Already at max — no change (same reference).
    expect(regenCunningActionForRound(regened, 5)).toBe(regened);
  });

  it('heavy-than-light armor blocks the regen (kit is locked out)', () => {
    const heavy = makeRogue({
      resources: { ...makeRogue().resources, cunningActionUsesRemaining: 0 },
      equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: { itemId: 'chain-mail' } },
    });
    expect(regenCunningActionForRound(heavy, 3)).toBe(heavy);
  });

  it('spend → wait two turns → regained, in a live fight', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    expect(state.round).toBe(1);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);

    // Spend the only use on the opening turn (round 1).
    const ca = useCunningAction({ character: rogue, state, choice: 'hide' });
    state = ca.state;
    rogue = ca.character;
    expect(rogue.resources.cunningActionUsesRemaining).toBe(0);

    // Rotate the turn order: player → monster → player (r2) → monster → player (r3).
    for (let i = 0; i < 4; i++) {
      const t = endTurn(state, rogue);
      state = t.state;
      rogue = t.character;
    }
    expect(state.round).toBe(3);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);
    expect(state.log.some((l) => l.text.includes('Cunning Action returns'))).toBe(true);
  });

  it('does not regen past the per-combat max while idling at full', () => {
    const goblin = getMonster('goblin');
    let rogue = makeRogue();
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    rogue = init.character;
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);

    for (let i = 0; i < 8; i++) {
      const t = endTurn(state, rogue);
      state = t.state;
      rogue = t.character;
    }
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);
  });
});
