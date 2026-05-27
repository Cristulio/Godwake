import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack, applyDamage, sneakAttackDiceForLevel } from './attack';
import { useCunningAction } from './cunningAction';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { MonsterCombatant } from '../../types/combat';
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

function findMonster(state: ReturnType<typeof createCombat>): MonsterCombatant {
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
      const rogue = makeRogue({ level });
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const log = state.log.find((l) => l.text.includes('Sneak Attack'));
      if (log) return log.text;
    }
    return undefined;
  }

  it('logs 1d6 at L1', () => {
    const text = fireSneakAtLevel(1);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (1d6)');
  });

  it('logs 2d6 at L3', () => {
    const text = fireSneakAtLevel(3);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (2d6)');
  });

  it('logs 3d6 at L5', () => {
    const text = fireSneakAtLevel(5);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (3d6)');
  });
});

describe('Rogue — Knife in the Dark (permanentBonuses.sneakAttackDice)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  function fireSneakAtLevelWithBonus(level: number, bonus: number): string | undefined {
    for (let seed = 1; seed <= 120; seed++) {
      const goblin = getMonster('goblin');
      const rogue = makeRogue({ level, permanentBonuses: { sneakAttackDice: bonus } });
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
      const goblinId = (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const log = state.log.find((l) => l.text.includes('Sneak Attack'));
      if (log) return log.text;
    }
    return undefined;
  }

  it('L3 rogue with +1 bonus rolls 3d6 (2d6 base + 1d6 bonus)', () => {
    const text = fireSneakAtLevelWithBonus(3, 1);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (3d6)');
  });

  it('L1 rogue with +2 bonus rolls 3d6 (1d6 base + 2d6 bonus)', () => {
    const text = fireSneakAtLevelWithBonus(1, 2);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (3d6)');
  });

  it('bonus = 0 matches the no-bonus baseline at L1 (1d6)', () => {
    const text = fireSneakAtLevelWithBonus(1, 0);
    expect(text).toBeDefined();
    expect(text).toContain('Sneak Attack (1d6)');
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
      const rogue = makeRogue();
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      // Trigger Hide so the attack rolls with advantage.
      state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
      expect(rogue.nextAttackAdvantage).toBe(true);
      const goblinId = findMonster(state).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const damageLog = state.log.find((l) => l.text.includes('Sneak Attack'));
      if (damageLog) {
        observed = true;
        expect(state.sneakAttackUsedThisTurn).toBe(true);
        // Hide was consumed by the actual attack roll.
        expect(rogue.nextAttackAdvantage).toBe(false);
      }
    }
    expect(observed).toBe(true);
  });

  it('fires on a wounded (bloodied) target without advantage', () => {
    let observed = false;
    for (let seed = 1; seed <= 60 && !observed; seed++) {
      const goblin = getMonster('goblin');
      const rogue = makeRogue();
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
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
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const sneakLog = state.log.find((l) => l.text.includes('Sneak Attack'));
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
      const rogue = makeRogue();
      // Give the rogue a longer reach: bring its action back so we can
      // attack twice in one "turn" without invoking Action Surge plumbing.
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
      state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
      const goblinId = findMonster(state).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const firstSneak = state.log.filter((l) => l.text.includes('Sneak Attack')).length;
      if (firstSneak !== 1) continue;
      if (state.status !== 'active') continue;

      // Manually refund the action so we can attack again without ending the turn.
      rogue.actionEconomy = { ...rogue.actionEconomy, actionUsed: false };
      // Wound the goblin so the second attack has a sneak trigger regardless.
      state = {
        ...state,
        combatants: state.combatants.map((c) =>
          c.kind === 'monster'
            ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 1 } } }
            : c,
        ),
      };

      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const totalSneak = state.log.filter((l) => l.text.includes('Sneak Attack')).length;
      expect(totalSneak).toBe(1);
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('resets the per-turn flag on endTurn so the next turn can sneak again', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const roller = createDiceRoller(5);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    state = { ...state, sneakAttackUsedThisTurn: true };
    state = endTurn(state, rogue).state;
    expect(state.sneakAttackUsedThisTurn).toBe(false);
  });

  it('does not fire for non-Rogue characters even with advantage', () => {
    const goblin = getMonster('goblin');
    const fighter: Character = {
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
    fighter.nextAttackAdvantage = true; // unlikely path, but proves gating
    const roller = createDiceRoller(11);
    let state = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    const goblinId = findMonster(state).id;
    state = playerAttack({ roller, character: fighter, state }, goblinId, 'longsword').state;
    const sneak = state.log.find((l) => l.text.includes('Sneak Attack'));
    expect(sneak).toBeUndefined();
  });
});

describe('Rogue — Cunning Action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Hide sets nextAttackAdvantage and burns the bonus action', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const roller = createDiceRoller(2);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    expect(rogue.actionEconomy.bonusActionUsed).toBe(false);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(1);

    state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
    expect(rogue.nextAttackAdvantage).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);
    expect(rogue.resources.cunningActionUsesRemaining).toBe(0);
    const log = state.log[state.log.length - 1];
    expect(log.text).toContain('shadow');
  });

  it('Disengage arms incoming-damage reduction and consumes it on the next hit', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const roller = createDiceRoller(2);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    expect(rogue.incomingDamageReduction ?? 0).toBe(0);

    state = useCunningAction({ character: rogue, state, choice: 'disengage' }).state;
    expect(rogue.incomingDamageReduction).toBe(2);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);

    // Take a 5-damage hit. Reduction should turn it into 3, then clear.
    const hpBefore = rogue.hp.current;
    state = applyDamage(state, 'player', 5, rogue);
    expect(rogue.hp.current).toBe(hpBefore - 3);
    expect(rogue.incomingDamageReduction).toBe(0);

    // A second hit gets no discount.
    state = applyDamage(state, 'player', 4, rogue);
    expect(rogue.hp.current).toBe(hpBefore - 3 - 4);
    void state;
  });

  it('Dash queues a bonus swing this turn — player can attack again after the Action is spent', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const roller = createDiceRoller(7);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
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

    state = useCunningAction({ character: rogue, state, choice: 'dash' }).state;
    expect(rogue.bonusAttackAvailable).toBe(true);
    expect(rogue.actionEconomy.bonusActionUsed).toBe(true);

    const goblinId = findMonster(state).id;
    // First swing — uses the Attack action.
    state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
    expect(rogue.actionEconomy.actionUsed).toBe(true);
    expect(rogue.bonusAttackAvailable).toBe(true);

    // Second swing — funded by Dash, action stays spent, flag clears.
    state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
    expect(rogue.bonusAttackAvailable).toBe(false);
    expect(rogue.actionEconomy.actionUsed).toBe(true);

    // Two attack lines in the log — one per swing.
    const attackLines = state.log.filter((l) => l.text.includes('attacks Goblin'));
    expect(attackLines.length).toBe(2);
  });

  it('Dash bonus swing does NOT get Sneak Attack (once-per-turn rule)', () => {
    // Find a seed where the rogue lands both swings on a wounded goblin so
    // Sneak Attack would trigger on every hit if the gate were broken.
    let validated = false;
    for (let seed = 1; seed <= 200 && !validated; seed++) {
      const goblin = getMonster('goblin');
      const rogue = makeRogue();
      const roller = createDiceRoller(seed);
      let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
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
      state = useCunningAction({ character: rogue, state, choice: 'dash' }).state;
      const goblinId = findMonster(state).id;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      if (state.status !== 'active') continue;
      state = playerAttack({ roller, character: rogue, state }, goblinId, 'dagger').state;
      const sneakLines = state.log.filter((l) => l.text.includes('Sneak Attack'));
      const attackLines = state.log.filter((l) => l.text.includes('attacks Goblin'));
      if (attackLines.length < 2) continue;
      expect(sneakLines.length).toBeLessThanOrEqual(1);
      validated = true;
    }
    expect(validated).toBe(true);
  });

  it('is gated by the per-combat use pool', () => {
    const goblin = getMonster('goblin');
    const rogue = makeRogue();
    const roller = createDiceRoller(2);
    let state = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
    // Reset bonus action to simulate a new turn, but keep the depleted pool.
    rogue.actionEconomy = { ...rogue.actionEconomy, bonusActionUsed: false };
    rogue.nextAttackAdvantage = false;
    const before = state;
    state = useCunningAction({ character: rogue, state, choice: 'hide' }).state;
    expect(state).toBe(before);
    expect(rogue.nextAttackAdvantage).toBe(false);
  });

  it('refuses Cunning Action for non-Rogue characters', () => {
    const goblin = getMonster('goblin');
    const fighter: Character = {
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
    let state = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    const before = state;
    state = useCunningAction({ character: fighter, state, choice: 'hide' }).state;
    expect(state).toBe(before);
    expect(fighter.nextAttackAdvantage).toBeFalsy();
  });
});
