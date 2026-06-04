import { describe, it, expect } from 'vitest';
import { combatShouldSpawn, type CombatSpawnGate } from './combatSpawn';

/** A combat room sitting ready to fight, no dialogue in the way. */
const READY: CombatSpawnGate = {
  phase: 'in-room',
  hasCombat: false,
  roomKind: 'combat',
  hasMonsters: true,
  eliteEngaged: false,
  dialogueActive: false,
};

describe('combatShouldSpawn — spawn gate', () => {
  it('builds combat for a ready combat/boss room', () => {
    expect(combatShouldSpawn(READY)).toBe(true);
    expect(combatShouldSpawn({ ...READY, roomKind: 'boss' })).toBe(true);
  });

  it('never rebuilds a fight that is already live', () => {
    expect(combatShouldSpawn({ ...READY, hasCombat: true })).toBe(false);
  });

  it('ignores non-combat rooms and empty encounters', () => {
    expect(combatShouldSpawn({ ...READY, roomKind: 'rest' })).toBe(false);
    expect(combatShouldSpawn({ ...READY, roomKind: 'event' })).toBe(false);
    expect(combatShouldSpawn({ ...READY, hasMonsters: false })).toBe(false);
  });

  it('holds an elite fight until the player engages', () => {
    expect(combatShouldSpawn({ ...READY, roomKind: 'elite', eliteEngaged: false })).toBe(false);
    expect(combatShouldSpawn({ ...READY, roomKind: 'elite', eliteEngaged: true })).toBe(true);
  });

  it('only spawns in the in-room phase', () => {
    expect(combatShouldSpawn({ ...READY, phase: 'between-rooms' })).toBe(false);
    expect(combatShouldSpawn({ ...READY, phase: 'completed' })).toBe(false);
  });
});

describe('combatShouldSpawn — dialogue holds the fight', () => {
  it('does NOT build combat while a dialogue is active, even when the room is otherwise ready', () => {
    // The soul-bond lore beat / a post-clear taunt is on screen: the fight (and
    // therefore the first-combat coach) must wait behind it.
    expect(combatShouldSpawn({ ...READY, dialogueActive: true })).toBe(false);
    // Holds across every fight kind, including an engaged elite.
    expect(combatShouldSpawn({ ...READY, roomKind: 'boss', dialogueActive: true })).toBe(false);
    expect(
      combatShouldSpawn({ ...READY, roomKind: 'elite', eliteEngaged: true, dialogueActive: true }),
    ).toBe(false);
  });

  it('builds the held fight once the dialogue is dismissed', () => {
    const held = { ...READY, dialogueActive: true };
    expect(combatShouldSpawn(held)).toBe(false);
    // Dismissing the dialogue flips dialogueActive false; nothing else changes.
    expect(combatShouldSpawn({ ...held, dialogueActive: false })).toBe(true);
  });
});
