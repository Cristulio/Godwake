import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { presetCreationInput } from '../character/defaultCharacter';
import {
  canOffHandWeapon,
  equipItem,
  equipItemToSlot,
  equippedRefsForItemSlot,
  unequipSlot,
} from '../character/equip';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, CombatLogEntry, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';
import type { ItemRef } from '../../schemas/item';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSchooled(
  classId: ClassId,
  subclassId: string | null,
  level: number,
  mainId: string | null,
  offId: string | null,
  extraInventory: string[] = [],
): Character {
  const c = createCharacter({ id: `dw-${classId}`, ...presetCreationInput(classId) });
  const mainRef: ItemRef | null = mainId ? { itemId: mainId } : null;
  const offRef: ItemRef | null = offId ? { itemId: offId } : null;
  return {
    ...c,
    level,
    subclassId,
    inventory: [
      ...(mainRef ? [mainRef] : []),
      ...(offRef ? [offRef] : []),
      ...extraInventory.map((itemId) => ({ itemId })),
    ],
    equipped: { mainHand: mainRef, offHand: offRef, armor: null },
  };
}

/** Index of the item with this id in the character's inventory (must exist). */
function invIdx(c: Character, itemId: string): number {
  const idx = c.inventory.findIndex((r) => r.itemId === itemId);
  expect(idx, `${itemId} in inventory`).toBeGreaterThanOrEqual(0);
  return idx;
}

function monsterByName(state: CombatState, name: string): MonsterCombatant {
  return state.combatants.find(
    (c) => c.kind === 'monster' && c.instance.displayName === name,
  ) as MonsterCombatant;
}

/** Pump a monster's HP so it survives the whole pair of swings. */
function toughen(state: CombatState, id: string, hp: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id
        ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, max: hp, current: hp } } }
        : c,
    ),
  };
}

function rollLines(state: CombatState): CombatLogEntry[] {
  return state.log.filter((l) => l.kind === 'roll');
}

function offhandLine(state: CombatState): CombatLogEntry | undefined {
  return state.log.find((l) => l.text.includes('off-hand follows'));
}

/** The first damage-kind entry after the given log entry (its own hit's line). */
function damageLineAfter(state: CombatState, entry: CombatLogEntry): CombatLogEntry | undefined {
  const at = state.log.indexOf(entry);
  return state.log.slice(at + 1).find((l) => l.kind === 'damage');
}

interface SwungPair {
  state: CombatState;
  character: Character;
  mainLine: CombatLogEntry;
  offLine: CombatLogEntry;
}

/**
 * Run the opening attack across seeds until the main and off-hand swings both
 * resolve with the wanted hit/miss shape — deterministic without hand-picked
 * seeds. `mutate` lets a case surgically shape the opening state (HP etc.).
 */
function findOpeningPair(
  makeChar: () => Character,
  want: { mainHit: boolean; offHit: boolean },
  opts: {
    monsters?: Array<{ defId: string; displayName: string }>;
    toughenTo?: number;
    mutate?: (state: CombatState) => CombatState;
  } = {},
): SwungPair {
  const defs = opts.monsters ?? [{ defId: 'goblin', displayName: 'Goblin A' }];
  for (let seed = 1; seed <= 600; seed++) {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(seed);
    const init = createCombat({
      roller,
      character: makeChar(),
      monsters: defs.map((d) => ({ def: getMonster(d.defId), displayName: d.displayName })),
    });
    let state = init.state;
    if (opts.toughenTo) {
      for (const d of defs) {
        state = toughen(state, monsterByName(state, d.displayName).id, opts.toughenTo);
      }
    }
    if (opts.mutate) state = opts.mutate(state);
    const targetId = monsterByName(state, defs[0].displayName).id;
    const r = playerAttack(
      { roller, character: init.character, state },
      targetId,
      init.character.equipped.mainHand!.itemId,
    );
    const rolls = rollLines(r.state);
    const off = offhandLine(r.state);
    if (rolls.length < 2 || !off) continue;
    const mainLine = rolls[0];
    const mainHit = / hit\.$|CRITICAL HIT\.$/.test(mainLine.text);
    const offHit = / hit\.$|CRITICAL HIT\.$/.test(off.text);
    if (mainHit === want.mainHit && offHit === want.offHit) {
      return { state: r.state, character: r.character, mainLine, offLine: off };
    }
  }
  throw new Error('no seed produced the wanted hit/miss pair within 600 tries');
}

beforeEach(() => _resetMonsterInstanceCounter());

// ─── equip rules ─────────────────────────────────────────────────────────────

describe('dual wield — equip rules', () => {
  it('a Thief seats a light weapon in the off-hand via the off-hand drop', () => {
    const c = makeSchooled('rogue', 'thief', 3, 'shortsword', null, ['dagger']);
    const next = equipItemToSlot(c, invIdx(c, 'dagger'), 'offHand');
    expect(next.equipped.offHand?.itemId).toBe('dagger');
    expect(next.equipped.mainHand?.itemId).toBe('shortsword');
  });

  it('only LIGHT weapons qualify — a non-light drop on the off-hand auto-routes to main', () => {
    const c = makeSchooled('fighter', 'battle-master', 3, 'longsword', null, ['mace']);
    expect(canOffHandWeapon(c, 'mace')).toBe(false);
    const next = equipItemToSlot(c, invIdx(c, 'mace'), 'offHand');
    expect(next.equipped.mainHand?.itemId).toBe('mace');
    expect(next.equipped.offHand).toBeNull();
  });

  it('shield XOR off-hand weapon — each displaces the other in the one slot', () => {
    const c = makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword', ['shield']);
    const shielded = equipItem(c, invIdx(c, 'shield'));
    expect(shielded.equipped.offHand?.itemId).toBe('shield');
    const back = equipItemToSlot(shielded, invIdx(shielded, 'shortsword'), 'offHand');
    expect(back.equipped.offHand?.itemId).toBe('shortsword');
  });

  it('equipping a two-handed main clears the off-hand blade', () => {
    const c = makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword', [
      'greatsword',
    ]);
    const next = equipItem(c, invIdx(c, 'greatsword'));
    expect(next.equipped.mainHand?.itemId).toBe('greatsword');
    expect(next.equipped.offHand).toBeNull();
  });

  it('dropping a light blade on the off-hand unequips a two-handed main (the shield rule)', () => {
    // Fighter/rogue dual-wield: a light off-hand needs a free hand, so a
    // two-handed main yields (exactly as a shield drop would).
    const c = makeSchooled('fighter', 'battle-master', 3, 'greatsword', null, ['dagger']);
    const next = equipItemToSlot(c, invIdx(c, 'dagger'), 'offHand');
    expect(next.equipped.offHand?.itemId).toBe('dagger');
    expect(next.equipped.mainHand).toBeNull();
  });

  // ─── barbarian Twin Fury: TWO two-handed weapons ──────────────────────────
  it('Twin Fury off-hand takes a TWO-HANDED weapon, not a light one', () => {
    const barb = makeSchooled('barbarian', 'berserker', 3, 'greataxe', null, [
      'greatsword',
      'dagger',
    ]);
    // The savage titan seats a second great weapon in the off-hand…
    expect(canOffHandWeapon(barb, 'greatsword')).toBe(true);
    // …and a light blade no longer qualifies for the off-hand at all.
    expect(canOffHandWeapon(barb, 'dagger')).toBe(false);
  });

  it('Twin Fury keeps the two-handed main when a second great weapon drops on the off-hand', () => {
    const barb = makeSchooled('barbarian', 'berserker', 3, 'greataxe', null, ['greatsword']);
    const next = equipItemToSlot(barb, invIdx(barb, 'greatsword'), 'offHand');
    expect(next.equipped.mainHand?.itemId).toBe('greataxe');
    expect(next.equipped.offHand?.itemId).toBe('greatsword');
  });

  it('Twin Fury tap-equip fills an empty off-hand with a second two-hander beside a 2H main', () => {
    const barb = makeSchooled('barbarian', 'berserker', 3, 'greataxe', null, ['greatsword']);
    const next = equipItem(barb, invIdx(barb, 'greatsword'));
    expect(next.equipped.mainHand?.itemId).toBe('greataxe');
    expect(next.equipped.offHand?.itemId).toBe('greatsword');
  });

  it('a 2H off-hand is barbarian-only — a Battle Master still cannot off-hand a greatsword', () => {
    const fighter = makeSchooled('fighter', 'battle-master', 3, 'longsword', null, ['greatsword']);
    expect(canOffHandWeapon(fighter, 'greatsword')).toBe(false);
    // Auto-routes to the main hand (clearing the off-hand as any 2H main does).
    const next = equipItemToSlot(fighter, invIdx(fighter, 'greatsword'), 'offHand');
    expect(next.equipped.mainHand?.itemId).toBe('greatsword');
    expect(next.equipped.offHand).toBeNull();
  });

  it('classes and schools without the mechanic are unchanged', () => {
    const champion = makeSchooled('fighter', 'champion', 3, 'longsword', null, ['dagger']);
    expect(canOffHandWeapon(champion, 'dagger')).toBe(false);
    const next = equipItemToSlot(champion, invIdx(champion, 'dagger'), 'offHand');
    expect(next.equipped.mainHand?.itemId).toBe('dagger');
    expect(next.equipped.offHand).toBeNull();

    const undecided = makeSchooled('rogue', null, 3, 'shortsword', null, ['dagger']);
    expect(canOffHandWeapon(undecided, 'dagger')).toBe(false);
  });

  it('tap-equip fills an EMPTY off-hand for a dual-wielder holding a one-hander', () => {
    const c = makeSchooled('rogue', 'thief', 3, 'shortsword', null, ['dagger']);
    const next = equipItem(c, invIdx(c, 'dagger'));
    expect(next.equipped.offHand?.itemId).toBe('dagger');
    expect(next.equipped.mainHand?.itemId).toBe('shortsword');
  });

  it('tap-equip never displaces a worn shield — that trade is the explicit drop', () => {
    const c = makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shield', ['dagger']);
    const next = equipItem(c, invIdx(c, 'dagger'));
    expect(next.equipped.mainHand?.itemId).toBe('dagger');
    expect(next.equipped.offHand?.itemId).toBe('shield');
  });

  it('unequip flows clean — the blade returns to the bag-only state', () => {
    const c = makeSchooled('rogue', 'thief', 3, 'shortsword', 'dagger');
    const next = unequipSlot(c, 'offHand');
    expect(next.equipped.offHand).toBeNull();
    expect(next.inventory.some((r) => r.itemId === 'dagger')).toBe(true);
  });

  it('the compare hover weighs a light weapon against BOTH worn hands', () => {
    const c = makeSchooled('rogue', 'thief', 3, 'shortsword', 'dagger', ['sickle']);
    const refs = equippedRefsForItemSlot(c, 'sickle');
    expect(refs.map((r) => r.itemId).sort()).toEqual(['dagger', 'shortsword']);
  });
});

// ─── the off-hand swing ──────────────────────────────────────────────────────

describe('dual wield — the off-hand swing', () => {
  it('the Attack action resolves the main swing then the automatic off-hand swing', () => {
    const pair = findOpeningPair(
      () => makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword'),
      { mainHit: true, offHit: true },
      { toughenTo: 200 },
    );
    expect(pair.mainLine.text).toContain('with Longsword');
    expect(pair.offLine.text).toContain('off-hand follows — Shortsword');
    // The pair commits as one state: both events batched so the UI floats each.
    expect(pair.state.attackEvents?.length).toBe(2);
    // One Attack-action swing spent — the follow costs nothing.
    expect(pair.state.playerAttacksThisTurn).toBe(1);
    expect(pair.character.actionEconomy.actionUsed).toBe(true);
  });

  it('off-hand damage carries the ability modifier (5e Two-Weapon Fighting)', () => {
    const pair = findOpeningPair(
      () => makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword'),
      { mainHit: true, offHit: true },
      { toughenTo: 200 },
    );
    const mainDmg = damageLineAfter(pair.state, pair.mainLine);
    const offDmg = damageLineAfter(pair.state, pair.offLine);
    // The off-hand follow now adds the wielder's ability mod, same as the main
    // swing — the dropped-shield trade has to actually pay. Gear edge stays
    // halved (covered by the next case), so only the base bite scaled up.
    expect(mainDmg!.text).toMatch(/\+ \d+ STR/);
    expect(offDmg!.text).toMatch(/\+ \d+ STR/);
  });

  it('the barbarian Twin Fury follow swings a SECOND two-hander for HALF the ability mod', () => {
    const pair = findOpeningPair(
      () => makeSchooled('barbarian', 'berserker', 3, 'greataxe', 'greatsword'),
      { mainHit: true, offHit: true },
      { toughenTo: 400 },
    );
    expect(pair.mainLine.text).toContain('with Greataxe');
    // The off-hand follow is the second great weapon, not a light blade.
    expect(pair.offLine.text).toContain('off-hand follows — Greatsword');
    const strOf = (entry: CombatLogEntry): number => {
      const m = entry.text.match(/\+ (\d+) STR/);
      return m ? Number(m[1]) : 0;
    };
    const mainStr = strOf(damageLineAfter(pair.state, pair.mainLine)!);
    const offStr = strOf(damageLineAfter(pair.state, pair.offLine)!);
    // Main hand keeps the full STR mod; the heavy 2H off-hand takes only half
    // (floored) — the brake on the savage-titan follow.
    expect(mainStr).toBeGreaterThan(0);
    expect(offStr).toBe(Math.floor(mainStr / 2));
  });

  it('the 2H off-hand follow never crits (the structural brake)', () => {
    // Sweep many seeds: the off-hand follow must NEVER log a critical, while the
    // main hand crits on its range as usual (a non-zero crit count confirms the
    // sweep actually exercised crit-eligible rolls).
    let mainCrits = 0;
    let offLines = 0;
    let offCrits = 0;
    for (let seed = 1; seed <= 400; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const character = makeSchooled('barbarian', 'berserker', 5, 'greataxe', 'greatsword');
      const init = createCombat({
        roller,
        character,
        monsters: [{ def: getMonster('goblin'), displayName: 'Goblin A' }],
      });
      const state = toughen(init.state, monsterByName(init.state, 'Goblin A').id, 600);
      const targetId = monsterByName(state, 'Goblin A').id;
      const r = playerAttack({ roller, character: init.character, state }, targetId, 'greataxe');
      for (const l of rollLines(r.state)) {
        if (/off-hand follows/.test(l.text)) {
          offLines++;
          if (/CRITICAL HIT\.$/.test(l.text)) offCrits++;
        } else if (/CRITICAL HIT\.$/.test(l.text)) {
          mainCrits++;
        }
      }
    }
    expect(offLines).toBeGreaterThan(0); // the follow actually fired
    expect(mainCrits).toBeGreaterThan(0); // crits are reachable in the sweep
    expect(offCrits).toBe(0); // …but never on the off-hand follow
  });

  it("the off-hand's gear edge is HALVED and never leaks onto main-hand swings", () => {
    const make = (): Character => {
      const c = makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword');
      const main: ItemRef = {
        itemId: 'longsword',
        rolled: {
          baseId: 'longsword',
          rarity: 'blue',
          affixes: [],
          enhancement: 2,
          name: '+2 Longsword',
        },
      };
      const off: ItemRef = {
        itemId: 'shortsword',
        rolled: {
          baseId: 'shortsword',
          rarity: 'blue',
          affixes: ['cruel'],
          enhancement: 3,
          name: '+3 Cruel Shortsword',
        },
      };
      return { ...c, inventory: [main, off], equipped: { mainHand: main, offHand: off, armor: null } };
    };
    const pair = findOpeningPair(make, { mainHit: true, offHit: true }, { toughenTo: 200 });
    const mainDmg = damageLineAfter(pair.state, pair.mainLine)!;
    const offDmg = damageLineAfter(pair.state, pair.offLine)!;
    // Main swing: its own +2 in full; the off-hand's Cruel (+2) must NOT ride it.
    expect(mainDmg.text).toContain('+ 2 enhancement');
    expect(mainDmg.text).not.toContain('gear');
    // Off-hand swing: its +3 halves to +1, its Cruel +2 halves to +1.
    expect(offDmg.text).toContain('+ 1 enhancement');
    expect(offDmg.text).toContain('+ 1 gear');
  });

  it('the off-hand retargets the next live foe when the main swing fells the first', () => {
    const pair = findOpeningPair(
      () => makeSchooled('fighter', 'battle-master', 3, 'longsword', 'shortsword'),
      { mainHit: true, offHit: true },
      {
        monsters: [
          { defId: 'goblin', displayName: 'Goblin A' },
          { defId: 'goblin', displayName: 'Goblin B' },
        ],
        // First foe drops to any landed hit; second stands through the follow.
        mutate: (state) => {
          const a = monsterByName(state, 'Goblin A');
          const b = monsterByName(state, 'Goblin B');
          let next = toughen(state, b.id, 200);
          next = {
            ...next,
            combatants: next.combatants.map((c) =>
              c.kind === 'monster' && c.id === a.id
                ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current: 1, temp: 0 } } }
                : c,
            ),
          };
          return next;
        },
      },
    );
    expect(monsterByName(pair.state, 'Goblin A').instance.hp.current).toBe(0);
    expect(pair.offLine.text).toContain('at Goblin B');
  });

  it('once per Attack action — Extra Attack does not multiply the follow', () => {
    // L5 Battle Master: two Attack-action swings. Only the FIRST drags the
    // off-hand through; the second is a plain main-hand swing.
    for (let seed = 1; seed <= 200; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const character = makeSchooled('fighter', 'battle-master', 5, 'longsword', 'shortsword');
      const init = createCombat({
        roller,
        character,
        monsters: [{ def: getMonster('goblin'), displayName: 'Goblin A' }],
      });
      let state = toughen(init.state, monsterByName(init.state, 'Goblin A').id, 400);
      const targetId = monsterByName(state, 'Goblin A').id;
      let c = init.character;
      ({ state, character: c } = playerAttack({ roller, character: c, state }, targetId, 'longsword'));
      expect(c.actionEconomy.actionUsed).toBe(false); // swing 1 of 2
      ({ state, character: c } = playerAttack({ roller, character: c, state }, targetId, 'longsword'));
      expect(c.actionEconomy.actionUsed).toBe(true);
      const follows = state.log.filter((l) => l.text.includes('off-hand follows'));
      expect(follows.length).toBe(1);
      expect(state.playerAttacksThisTurn).toBe(2);
      return;
    }
  });

  it('a bonus-action swing never triggers the follow', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const character = makeSchooled('rogue', 'thief', 3, 'shortsword', 'dagger');
    const init = createCombat({
      roller,
      character,
      monsters: [{ def: getMonster('goblin'), displayName: 'Goblin A' }],
    });
    const state = toughen(init.state, monsterByName(init.state, 'Goblin A').id, 200);
    // Quick Strike shape: the Action is already spent; this swing is the bonus.
    const c: Character = {
      ...init.character,
      actionEconomy: { ...init.character.actionEconomy, actionUsed: true },
      bonusAttackAvailable: true,
    };
    const targetId = monsterByName(state, 'Goblin A').id;
    const r = playerAttack({ roller, character: c, state }, targetId, 'shortsword');
    expect(offhandLine(r.state)).toBeUndefined();
    expect(r.character.bonusAttackAvailable).toBe(false);
  });

  it('a class without the school gets no follow even with a smuggled off-hand blade', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(3);
    const character = makeSchooled('fighter', 'champion', 3, 'longsword', 'shortsword');
    const init = createCombat({
      roller,
      character,
      monsters: [{ def: getMonster('goblin'), displayName: 'Goblin A' }],
    });
    const state = toughen(init.state, monsterByName(init.state, 'Goblin A').id, 200);
    const targetId = monsterByName(state, 'Goblin A').id;
    const r = playerAttack({ roller, character: init.character, state }, targetId, 'longsword');
    expect(offhandLine(r.state)).toBeUndefined();
    expect(rollLines(r.state).length).toBe(1);
  });
});

// ─── sneak attack stays once a turn ──────────────────────────────────────────

describe('dual wield — Sneak Attack interplay', () => {
  it('main lands the opener sneak — the off-hand never pays it twice', () => {
    const pair = findOpeningPair(
      () => makeSchooled('rogue', 'thief', 3, 'shortsword', 'dagger'),
      { mainHit: true, offHit: true },
      { toughenTo: 200 },
    );
    const sneaks = pair.state.log.filter((l) => l.text.includes('sneak ('));
    expect(sneaks.length).toBe(1);
    expect(pair.state.sneakAttackUsedThisTurn).toBe(true);
    // The single payout rode the MAIN swing's damage line.
    expect(damageLineAfter(pair.state, pair.mainLine)!.text).toContain('sneak (');
  });

  it('main whiffs the opener — the second knife is the second chance to LAND it', () => {
    const pair = findOpeningPair(
      () => makeSchooled('rogue', 'thief', 3, 'shortsword', 'dagger'),
      { mainHit: false, offHit: true },
      { toughenTo: 200 },
    );
    const offDmg = damageLineAfter(pair.state, pair.offLine)!;
    expect(offDmg.text).toContain('sneak (');
    expect(pair.state.sneakAttackUsedThisTurn).toBe(true);
    const sneaks = pair.state.log.filter((l) => l.text.includes('sneak ('));
    expect(sneaks.length).toBe(1);
  });
});

// ─── ranger Blade Dancer: dual-wield melee + Twin Rend ───────────────────────

describe('ranger Blade Dancer — the two-blade conclave', () => {
  it('a Blade Dancer seats a light blade in the off-hand; other ranger conclaves cannot', () => {
    const dancer = makeSchooled('ranger', 'blade-dancer', 3, 'shortsword', null, ['dagger']);
    expect(canOffHandWeapon(dancer, 'dagger')).toBe(true);
    const next = equipItemToSlot(dancer, invIdx(dancer, 'dagger'), 'offHand');
    expect(next.equipped.offHand?.itemId).toBe('dagger');

    const hunter = makeSchooled('ranger', 'hunter', 3, 'shortsword', null, ['dagger']);
    expect(canOffHandWeapon(hunter, 'dagger')).toBe(false);
  });

  it('the Attack action resolves the main blade then the automatic off-hand follow', () => {
    const pair = findOpeningPair(
      () => makeSchooled('ranger', 'blade-dancer', 3, 'shortsword', 'dagger'),
      { mainHit: true, offHit: true },
      { toughenTo: 200 },
    );
    expect(pair.mainLine.text).toContain('with Shortsword');
    expect(pair.offLine.text).toContain('off-hand follows — Dagger');
    expect(pair.state.attackEvents?.length).toBe(2);
  });

  it('Twin Rend (L10): BOTH blades bite the Hunter\'s Mark quarry the deeper', () => {
    const pair = findOpeningPair(
      () => makeSchooled('ranger', 'blade-dancer', 10, 'shortsword', 'dagger'),
      { mainHit: true, offHit: true },
      {
        toughenTo: 300,
        mutate: (state) => ({
          ...state,
          huntersMarkTargetId: monsterByName(state, 'Goblin A').id,
        }),
      },
    );
    // The rend rider rode both the main and the off-hand swing on the marked foe.
    expect(damageLineAfter(pair.state, pair.mainLine)!.text).toContain('rend');
    expect(damageLineAfter(pair.state, pair.offLine)!.text).toContain('rend');
  });

  it('Twin Rend never fires on an UNMARKED foe', () => {
    const pair = findOpeningPair(
      () => makeSchooled('ranger', 'blade-dancer', 10, 'shortsword', 'dagger'),
      { mainHit: true, offHit: true },
      { toughenTo: 300 }, // no mark set
    );
    expect(damageLineAfter(pair.state, pair.mainLine)!.text).not.toContain('rend');
  });

  it('a pre-L10 Blade Dancer gets no Twin Rend even on the marked quarry', () => {
    const pair = findOpeningPair(
      () => makeSchooled('ranger', 'blade-dancer', 3, 'shortsword', 'dagger'),
      { mainHit: true, offHit: true },
      {
        toughenTo: 200,
        mutate: (state) => ({
          ...state,
          huntersMarkTargetId: monsterByName(state, 'Goblin A').id,
        }),
      },
    );
    expect(damageLineAfter(pair.state, pair.mainLine)!.text).not.toContain('rend');
  });
});
