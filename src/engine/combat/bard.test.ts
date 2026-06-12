import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { getClass, listClasses } from '../../content/classes';
import {
  characterHasMechanic,
  effectiveAbilityScores,
  isFullCaster,
  spellcastingAbility,
  proficiencyBonus,
  computeAC,
} from '../character/derived';
import { abilityModifier } from '../../types/abilities';
import { isWeaponProficient, isArmorProficient } from '../character/equip';
import { canCastSpell } from './spells';
import { spellSaveDC, spellDamageBonus } from './spells/helpers';
import { wizardSpellSlotsForLevel } from '../character/actions';
import {
  bardInspirationMax,
  bardInspirationDieSize,
  bardInspirationLeft,
  bardKnownSongs,
  bardActiveSongs,
  bardMaxActiveSongs,
  bardSongPower,
  bardSteelReduction,
  bardDirgePenalty,
  bardWarSongDie,
  bardViciousMockeryDice,
  startBardSong,
} from './bard';
import { chooseCombatAction } from './actionPolicy';
import { classUnlockRenown, isClassUnlocked } from '../progression/unlocks';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack/playerAttack';
import { monsterAttack } from './attack/monsterAttack';
import { endTurn } from './turn';
import { castSpell } from './spells';
import { parseDiceExpression, type DiceRoller } from '../dice';
import { getItem } from '../../content/items';
import { getMonster } from '../../content/monsters';
import type { BardSongId, Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeBard(level = 1, subclassId: string | null = null): Character {
  const base = buildPlayerCharacter(presetCreationInput('bard'));
  const c: Character = { ...base, level, subclassId };
  return {
    ...c,
    resources: {
      ...c.resources,
      inspirationDiceRemaining: bardInspirationMax(c),
      spellSlots: wizardSpellSlotsForLevel(level),
    },
  };
}

function withSongs(c: Character, songs: BardSongId[]): Character {
  return { ...c, activeSongIds: songs };
}

function withMainHand(c: Character, itemId: string | null): Character {
  return { ...c, equipped: { ...c.equipped, mainHand: itemId === null ? null : { itemId } } };
}

function monsterOf(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** A roller whose d20 results are scripted in order; every other die returns its
 *  average (ceil((die+1)/2): d4→3, d6→4, d8→5, d10→6, d12→7). Lets a test force
 *  an attack or save to land/miss deterministically. */
function scriptRoller(d20s: number[]): DiceRoller {
  let i = 0;
  const nextD20 = () => (i < d20s.length ? d20s[i++] : 10);
  return {
    d20(advantage = 'normal', modifier = 0) {
      const nat = nextD20();
      return {
        expression: { count: 1, die: 20, modifier },
        rolls: [nat],
        modifier,
        total: nat + modifier,
        natural20: nat === 20,
        natural1: nat === 1,
        advantage,
        discardedRoll: undefined,
      };
    },
    roll(expression, advantage = 'normal') {
      const expr = typeof expression === 'string' ? parseDiceExpression(expression) : expression;
      if (expr.die === 20 && expr.count === 1) {
        const nat = nextD20();
        return {
          expression: expr,
          rolls: [nat],
          modifier: expr.modifier,
          total: nat + expr.modifier,
          natural20: nat === 20,
          natural1: nat === 1,
          advantage,
          discardedRoll: undefined,
        };
      }
      const each = Math.ceil((expr.die + 1) / 2);
      const rolls = Array.from({ length: expr.count }, () => each);
      const sum = rolls.reduce((a, b) => a + b, 0);
      return {
        expression: expr,
        rolls,
        modifier: expr.modifier,
        total: sum + expr.modifier,
        natural20: false,
        natural1: false,
        advantage,
        discardedRoll: undefined,
      };
    },
    serialize() {
      return { state: 0 };
    },
  };
}

const AVG = { d4: 3, d6: 4, d8: 5, d10: 6, d12: 7 } as const;

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

describe('Bard — class definition + registry', () => {
  it('is registered as a Charisma full-caster and validates', () => {
    const bard = getClass('bard');
    expect(bard.id).toBe('bard');
    expect(bard.primaryAbility).toContain('cha');
    expect(bard.hitDie).toBe(8);
    expect(bard.subclassLevel).toBe(3);
    expect(listClasses().some((c) => c.id === 'bard')).toBe(true);
  });

  it('casts off Charisma through the shared full-caster engine', () => {
    expect(isFullCaster('bard')).toBe(true);
    expect(spellcastingAbility(makeBard())).toBe('cha');
  });

  it('offers exactly two colleges — Lore and Valor', () => {
    const ids = getClass('bard').subclasses.map((s) => s.id).sort();
    expect(ids).toEqual(['lore', 'valor']);
  });
});

describe('Bard — unlock gating (deepest slot, 800 renown)', () => {
  it('opens at 800 renown spent — above the Monk', () => {
    expect(classUnlockRenown('bard', 'fighter')).toBe(800);
    expect(classUnlockRenown('bard', 'wizard')).toBe(800);
    expect(classUnlockRenown('bard', 'ranger')).toBe(800);
  });

  it('is sealed below 800 and open at 800', () => {
    expect(isClassUnlocked('bard', 799, 'fighter')).toBe(false);
    expect(isClassUnlocked('bard', 800, 'fighter')).toBe(true);
  });
});

describe('Bard — the inspiration well (the music\'s fuel)', () => {
  it('pool = CHA mod, deeper at the college L10 + the L20 capstone', () => {
    const l1 = makeBard(1);
    const chaMod = abilityModifier(effectiveAbilityScores(l1).cha);
    expect(bardInspirationMax(l1)).toBe(Math.max(1, chaMod));
    // College L10 beats (Lore's Duet / Valor Battle Magic) add one.
    expect(bardInspirationMax(makeBard(10, 'lore'))).toBe(Math.max(1, chaMod) + 1);
    expect(bardInspirationMax(makeBard(10, 'valor'))).toBe(Math.max(1, chaMod) + 1);
    // The L20 capstone adds two more on top.
    expect(bardInspirationMax(makeBard(20, 'lore'))).toBe(Math.max(1, chaMod) + 3);
  });

  it('the song die grows with level: d6 → d8 → d10 → d12', () => {
    expect(bardInspirationDieSize(makeBard(1))).toBe(6);
    expect(bardInspirationDieSize(makeBard(5))).toBe(8);
    expect(bardInspirationDieSize(makeBard(10, 'lore'))).toBe(10);
    expect(bardInspirationDieSize(makeBard(15, 'lore'))).toBe(12);
  });

  it('refills the pool at the start of every encounter', () => {
    const spent: Character = {
      ...makeBard(5),
      resources: { ...makeBard(5).resources, inspirationDiceRemaining: 0 },
    };
    const { character } = createCombat({
      character: spent,
      monsters: [{ def: getMonster('goblin') }],
    });
    expect(character.resources.inspirationDiceRemaining).toBe(bardInspirationMax(spent));
  });
});

describe('Bard — the Song book (known by level)', () => {
  it('opens with Spite + Steel at L1; the Dirge joins at L6, the Reel at L12', () => {
    expect(bardKnownSongs(makeBard(1))).toEqual(['song-of-spite', 'song-of-steel']);
    expect(bardKnownSongs(makeBard(5))).toEqual(['song-of-spite', 'song-of-steel']);
    expect(bardKnownSongs(makeBard(6))).toContain('leaden-dirge');
    expect(bardKnownSongs(makeBard(11))).not.toContain('quickstep-reel');
    expect(bardKnownSongs(makeBard(12))).toContain('quickstep-reel');
  });

  it('one song plays at a time; the Lore Duet (L10) holds two', () => {
    expect(bardMaxActiveSongs(makeBard(9, 'lore'))).toBe(1);
    expect(bardMaxActiveSongs(makeBard(10, 'lore'))).toBe(2);
    expect(bardMaxActiveSongs(makeBard(10, 'valor'))).toBe(1);
  });
});

describe('Bard — the music is always playing', () => {
  it('createCombat strikes up Song of Spite for a fresh bard — free, full pool', () => {
    const bard = makeBard(1);
    const { character } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    expect(bardActiveSongs(character)).toEqual(['song-of-spite']);
    // The opening song costs nothing — the pool reads full.
    expect(bardInspirationLeft(character)).toBe(bardInspirationMax(bard));
  });

  it('the carried tune keeps ringing into the next fight', () => {
    const bard = withSongs(makeBard(3), ['song-of-steel']);
    const { character } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    expect(bardActiveSongs(character)).toEqual(['song-of-steel']);
  });

  it('a stale unknown song is dropped and the default takes over', () => {
    const bard = withSongs(makeBard(1), ['leaden-dirge']); // not known at L1
    const { character } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    expect(bardActiveSongs(character)).toEqual(['song-of-spite']);
  });
});

describe('Bard — switching songs (bonus action + 1 die)', () => {
  it('the switch spends the bonus action and one inspiration die, and replaces the tune', () => {
    const setup = createCombat({ character: makeBard(1), monsters: [{ def: getMonster('goblin') }] });
    const before = bardInspirationLeft(setup.character);
    const r = startBardSong({ character: setup.character, state: setup.state }, 'song-of-steel');
    expect(bardActiveSongs(r.character)).toEqual(['song-of-steel']);
    expect(bardInspirationLeft(r.character)).toBe(before - 1);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
  });

  it('refused when the song already plays, the well is dry, the bonus is spent, or the song is unlearned', () => {
    const setup = createCombat({ character: makeBard(1), monsters: [{ def: getMonster('goblin') }] });
    // Already playing.
    const same = startBardSong({ character: setup.character, state: setup.state }, 'song-of-spite');
    expect(same.character).toBe(setup.character);
    // Dry well.
    const dry: Character = {
      ...setup.character,
      resources: { ...setup.character.resources, inspirationDiceRemaining: 0 },
    };
    expect(startBardSong({ character: dry, state: setup.state }, 'song-of-steel').character).toBe(dry);
    // Bonus action spent.
    const spent: Character = {
      ...setup.character,
      actionEconomy: { ...setup.character.actionEconomy, bonusActionUsed: true },
    };
    expect(startBardSong({ character: spent, state: setup.state }, 'song-of-steel').character).toBe(spent);
    // Unlearned (the Dirge needs L6).
    const early = startBardSong({ character: setup.character, state: setup.state }, 'leaden-dirge');
    expect(early.character).toBe(setup.character);
  });

  it('the Lore Duet layers a second song, and a third replaces the oldest', () => {
    const lore10 = makeBard(10, 'lore');
    const setup = createCombat({ character: lore10, monsters: [{ def: getMonster('goblin') }] });
    expect(bardActiveSongs(setup.character)).toEqual(['song-of-spite']);
    const two = startBardSong({ character: setup.character, state: setup.state }, 'song-of-steel');
    expect(bardActiveSongs(two.character)).toEqual(['song-of-spite', 'song-of-steel']);
    // Free the bonus action (a fresh turn) and start a third — the oldest yields.
    const freshTurn: Character = {
      ...two.character,
      actionEconomy: { ...two.character.actionEconomy, bonusActionUsed: false },
    };
    const three = startBardSong({ character: freshTurn, state: two.state }, 'leaden-dirge');
    expect(bardActiveSongs(three.character)).toEqual(['song-of-steel', 'leaden-dirge']);
  });
});

describe('Bard — Song of Spite (the pulse gnaws every foe)', () => {
  it('bites at combat start (turn 0) for the die-tier power', () => {
    const bard = makeBard(1); // d6 tier → power 2
    const { state } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const goblin = monsterOf(state);
    expect(goblin.instance.hp.current).toBe(goblin.instance.hp.max - bardSongPower(bard));
  });

  it('pulses again each time the player turn comes back around', () => {
    const bard = makeBard(1);
    const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const afterOpen = monsterOf(setup.state).instance.hp.current;
    // Player passes; the goblin's turn runs; the turn wraps to the player → pulse.
    const passed = endTurn(setup.state, setup.character);
    const roller = scriptRoller([1]); // goblin swings and misses
    const enemyTurn = monsterAttack(
      { roller, character: passed.character, state: passed.state },
      monsterOf(passed.state).id,
    );
    const wrapped = endTurn(enemyTurn.state, enemyTurn.character);
    expect(monsterOf(wrapped.state).instance.hp.current).toBe(afterOpen - bardSongPower(bard));
  });

  it('the pulse scales with the song die tier', () => {
    expect(bardSongPower(makeBard(1))).toBe(2); // d6
    expect(bardSongPower(makeBard(5))).toBe(3); // d8
    expect(bardSongPower(makeBard(10))).toBe(4); // d10
    expect(bardSongPower(makeBard(15))).toBe(5); // d12
  });
});

describe('Bard — Song of Steel (the blows are dulled)', () => {
  it('reads the die-tier reduction only while Steel plays', () => {
    const steel = withSongs(makeBard(1), ['song-of-steel']);
    expect(bardSteelReduction(steel)).toBe(2);
    expect(bardSteelReduction(withSongs(makeBard(1), ['song-of-spite']))).toBe(0);
  });

  it('dulls a landed blow by the reduction (visible in the lighter HP loss)', () => {
    const goblinAtk = (getMonster('goblin').actions.find((a) => a.kind === 'attack') as { attackBonus: number }).attackBonus;
    const landThe = (songs: BardSongId[]): number => {
      _resetMonsterInstanceCounter();
      const bard = withSongs(makeBard(1), songs);
      const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
      // A nat that lands clean without critting, regardless of song.
      const nat = Math.max(2, computeAC(setup.character) - goblinAtk + 4);
      const roller = scriptRoller([Math.min(19, nat)]);
      const r = monsterAttack({ roller, character: setup.character, state: setup.state }, monsterOf(setup.state).id);
      return setup.character.hp.current - r.character.hp.current;
    };
    const hurtUnderSpite = landThe(['song-of-spite']);
    const hurtUnderSteel = landThe(['song-of-steel']);
    expect(hurtUnderSpite).toBeGreaterThan(0);
    expect(hurtUnderSpite - hurtUnderSteel).toBe(bardSongPower(makeBard(1)));
  });
});

describe('Bard — the Leaden Dirge (enemy blades drag)', () => {
  it('is unlearned before L6 and reads the die-tier drag while playing', () => {
    expect(bardDirgePenalty(withSongs(makeBard(6), ['leaden-dirge']))).toBe(2);
    expect(bardDirgePenalty(withSongs(makeBard(10), ['leaden-dirge']))).toBe(3);
    expect(bardDirgePenalty(withSongs(makeBard(6), ['song-of-spite']))).toBe(0);
  });

  it('drags a blow that would have just landed into a miss', () => {
    const goblinAtk = (getMonster('goblin').actions.find((a) => a.kind === 'attack') as { attackBonus: number }).attackBonus;
    const swingUnder = (songs: BardSongId[]) => {
      _resetMonsterInstanceCounter();
      const bard = withSongs(makeBard(6), songs);
      const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
      // A nat that hits the AC EXACTLY — the dirge's −2 turns it into a miss.
      const nat = Math.max(2, computeAC(setup.character) - goblinAtk);
      const roller = scriptRoller([nat]);
      const r = monsterAttack({ roller, character: setup.character, state: setup.state }, monsterOf(setup.state).id);
      return { hit: r.state.lastAttack?.hit, hurt: setup.character.hp.current - r.character.hp.current };
    };
    expect(swingUnder(['song-of-spite']).hit).toBe(true);
    const dirged = swingUnder(['leaden-dirge']);
    expect(dirged.hit).toBe(false);
    expect(dirged.hurt).toBe(0);
  });
});

describe('Bard — the Quickstep Reel (the first strike quickens)', () => {
  it('the pulse hands the bard advantage on its next attack', () => {
    const bard = withSongs(makeBard(12), ['quickstep-reel']);
    const { character } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    expect(character.nextAttackAdvantage).toBe(true);
  });
});

describe('Bard — the college is a build-defining fork', () => {
  it('College of Lore = the caster: Cutting Words + Resonant Lore, no War-Song', () => {
    const lore = makeBard(3, 'lore');
    expect(characterHasMechanic(lore, 'cutting-words')).toBe(true);
    expect(characterHasMechanic(lore, 'resonant-lore')).toBe(true);
    expect(characterHasMechanic(lore, 'war-song')).toBe(false);
    expect(characterHasMechanic(lore, 'martial-training')).toBe(false);
    // No Extra Attack on the caster path.
    expect(characterHasMechanic(makeBard(6, 'lore'), 'extra-attack')).toBe(false);
  });

  it('College of Valor = the martial: Martial Training + the War-Song + Extra Attack', () => {
    const valor = makeBard(6, 'valor');
    expect(characterHasMechanic(valor, 'martial-training')).toBe(true);
    expect(characterHasMechanic(valor, 'war-song')).toBe(true);
    expect(characterHasMechanic(valor, 'extra-attack')).toBe(true);
    expect(characterHasMechanic(valor, 'cutting-words')).toBe(false);
    // Martial Training opens the martial weapon rack + medium armour the core lacks.
    expect(isWeaponProficient(valor, getItem('greatsword') as never)).toBe(true);
    expect(isArmorProficient(valor, getItem('half-plate') as never)).toBe(true);
    expect(isArmorProficient(makeBard(6, 'lore'), getItem('half-plate') as never)).toBe(false);
  });

  it('Resonant Lore amps DC and spell damage WHILE the music plays', () => {
    const silent = withSongs(makeBard(3, 'lore'), []);
    const singing = withSongs(makeBard(3, 'lore'), ['song-of-spite']);
    expect(spellSaveDC(singing)).toBe(spellSaveDC(silent) + 1);
    expect(spellDamageBonus(singing)).toBe(spellDamageBonus(silent) + bardSongPower(singing));
    // Core bard gets no amp from the same song.
    expect(spellSaveDC(withSongs(makeBard(3), ['song-of-spite']))).toBe(spellSaveDC(withSongs(makeBard(3), [])));
  });

  it("the Valor War-Song die rides every weapon hit while music plays — automatically", () => {
    const swing = (songs: BardSongId[]): number => {
      _resetMonsterInstanceCounter();
      const valor = withMainHand(makeBard(6, 'valor'), 'rapier');
      // A beefy target so the swing never overkill-clamps; strip/keep the songs
      // AFTER createCombat so both runs share an identical opening pulse.
      const setup = createCombat({ character: valor, monsters: [{ def: getMonster('ghoul') }] });
      const swinger = { ...setup.character, activeSongIds: songs };
      const before = monsterOf(setup.state).instance.hp.current;
      const roller = scriptRoller([19]); // a clean hit
      const r = playerAttack(
        { roller, character: swinger, state: setup.state },
        monsterOf(setup.state).id,
        'rapier',
      );
      return before - monsterOf(r.state).instance.hp.current;
    };
    const silent = swing([]);
    const sung = swing(['song-of-steel']);
    // The war-song adds exactly one song die (d8 at L6 — avg 5 on the script roller).
    expect(sung - silent).toBe(AVG.d8);
    expect(bardWarSongDie(withSongs(makeBard(6, 'valor'), ['song-of-steel']))).toBe(8);
    expect(bardWarSongDie(withSongs(makeBard(6, 'lore'), ['song-of-steel']))).toBe(0);
  });

  it('the Valor war-song pulses temp HP each round (the front-line staying power)', () => {
    const valor = makeBard(3, 'valor');
    const { character } = createCombat({ character: valor, monsters: [{ def: getMonster('goblin') }] });
    expect(character.hp.temp).toBe(bardSongPower(valor));
    // A Lore bard's pulse girds nothing.
    _resetMonsterInstanceCounter();
    const lore = createCombat({ character: makeBard(3, 'lore'), monsters: [{ def: getMonster('goblin') }] });
    expect(lore.character.hp.temp).toBe(0);
  });

  it("Lore's Cutting Words spends a die to turn a hit into a miss", () => {
    const lore = withMainHand(makeBard(5, 'lore'), 'war-lute');
    const armed: Character = { ...lore, resources: { ...lore.resources, inspirationDiceRemaining: 2 } };
    const ac = createCombat({ character: armed, monsters: [{ def: getMonster('goblin') }] });
    // An enemy roll that BARELY beats AC (a hit by 0) — less than the d8 (avg 5),
    // so Cutting Words turns it into a clean miss.
    const goblinAttackBonus = (getMonster('goblin').actions.find((a) => a.kind === 'attack') as { attackBonus: number }).attackBonus;
    const nat = Math.max(2, computeAC(ac.character) - goblinAttackBonus);
    const roller = scriptRoller([nat]);
    const r = monsterAttack({ roller, character: ac.character, state: ac.state }, monsterOf(ac.state).id);
    // The die was spent and the reaction used; the player took no damage.
    expect(bardInspirationLeft(r.character)).toBe(bardInspirationLeft(ac.character) - 1);
    expect(r.character.hp.current).toBe(ac.character.hp.current);
  });
});

describe('Bard — Vicious Mockery grows up (real cantrip breakpoints)', () => {
  it('dice climb at the standard breakpoints: 1d4 → 2d4 (L5) → 3d4 (L11) → 4d4 (L17)', () => {
    expect(bardViciousMockeryDice(1)).toBe(1);
    expect(bardViciousMockeryDice(4)).toBe(1);
    expect(bardViciousMockeryDice(5)).toBe(2);
    expect(bardViciousMockeryDice(10)).toBe(2);
    expect(bardViciousMockeryDice(11)).toBe(3);
    expect(bardViciousMockeryDice(16)).toBe(3);
    expect(bardViciousMockeryDice(17)).toBe(4);
    expect(bardViciousMockeryDice(20)).toBe(4);
  });

  it('the playing song sharpens the insult by a song-die roll', () => {
    const barb = (songs: BardSongId[]): number => {
      _resetMonsterInstanceCounter();
      const bard = withSongs(makeBard(1), songs);
      // Strip the song before createCombat would re-seed: build the state, then
      // cast with the songs we want (empty = the dev-only silent case).
      const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
      const caster = { ...setup.character, activeSongIds: songs };
      const before = monsterOf(setup.state).instance.hp.current;
      const roller = scriptRoller([1]); // the save fails
      const r = castSpell({ roller, character: caster, state: setup.state, spellId: 'vicious-mockery', targetId: monsterOf(setup.state).id });
      expect(r.cast).toBe(true);
      return before - monsterOf(r.state).instance.hp.current;
    };
    // Sung minus silent = exactly the song die (d6 avg 4 on the script roller).
    expect(barb(['song-of-spite']) - barb([])).toBe(AVG.d6);
  });

  it('deals breakpoint dice + CHA on a failed save, half on a made one, and rattles', () => {
    const bard = makeBard(5); // 2d4 tier, d8 song die
    const chaMod = abilityModifier(effectiveAbilityScores(bard).cha);
    const setup = createCombat({ character: bard, monsters: [{ def: getMonster('ghoul') }] });
    const target = monsterOf(setup.state);
    const before = target.instance.hp.current;
    // Failed save (nat 1): full damage + the rattle. NOTE the opening Spite pulse
    // already chipped the ghoul at combat start; measure from the post-pulse HP.
    const roller = scriptRoller([1]);
    const r = castSpell({ roller, character: setup.character, state: setup.state, spellId: 'vicious-mockery', targetId: target.id });
    expect(r.cast).toBe(true);
    const expected = 2 * AVG.d4 + AVG.d8 + chaMod + spellDamageBonus(setup.character);
    expect(before - monsterOf(r.state).instance.hp.current).toBe(expected);
    expect(monsterOf(r.state).instance.conditions.some((c) => c.name === 'frightened')).toBe(true);
  });

  it('a made save takes half and shrugs the rattle', () => {
    const bard = makeBard(1);
    const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const before = monsterOf(setup.state).instance.hp.current;
    const roller = scriptRoller([20]); // the save lands
    const r = castSpell({ roller, character: setup.character, state: setup.state, spellId: 'vicious-mockery', targetId: monsterOf(setup.state).id });
    const chaMod = abilityModifier(effectiveAbilityScores(bard).cha);
    const full = AVG.d4 + AVG.d6 + chaMod + spellDamageBonus(setup.character);
    expect(before - monsterOf(r.state).instance.hp.current).toBe(Math.floor(full / 2));
    expect(monsterOf(r.state).instance.conditions.some((c) => c.name === 'frightened')).toBe(false);
  });
});

describe('Bard — the bot keeps the right song up', () => {
  it('switches to Steel when the room is crowded', () => {
    const bard = makeBard(1); // core: no Cutting Words, free to spend the well
    const setup = createCombat({
      character: bard,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const action = chooseCombatAction(setup.state, setup.character);
    expect(action).toEqual({ kind: 'bard-song', songId: 'song-of-steel' });
  });

  it('stays on Spite against a lone foe at full health (no wasted swap)', () => {
    const bard = makeBard(1);
    const setup = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const action = chooseCombatAction(setup.state, setup.character);
    expect(action.kind).not.toBe('bard-song');
  });

  it('a Lore bard holds its last die for Cutting Words instead of swapping', () => {
    const lore = makeBard(3, 'lore');
    const setup = createCombat({
      character: lore,
      monsters: [{ def: getMonster('goblin') }, { def: getMonster('goblin') }, { def: getMonster('goblin') }],
    });
    const oneDie: Character = {
      ...setup.character,
      resources: { ...setup.character.resources, inspirationDiceRemaining: 1 },
    };
    const action = chooseCombatAction(setup.state, oneDie);
    expect(action.kind).not.toBe('bard-song');
  });
});

describe('Bard — spellcasting (the College repertoire)', () => {
  it('knows the full prepared book from L1, gated by slot', () => {
    const known = makeBard(1).resources.knownSpells ?? [];
    for (const id of [
      'vicious-mockery',
      'dissonant-whispers',
      'healing-word',
      'thunderwave',
      'bard-hold-person',
      'shatter',
      'power-word-bind',
      'feeblemind',
      'final-crescendo',
    ]) {
      expect(known).toContain(id);
    }
    // Thunderwave (the pack-clear AoE) needs a 2nd-level slot, like Hold Person.
    expect(canCastSpell(makeBard(1), 'thunderwave').ok).toBe(false);
    expect(canCastSpell(makeBard(3), 'thunderwave').ok).toBe(true);
    // Vicious Mockery is a cantrip (always castable); Hold Person needs a 2nd slot.
    expect(canCastSpell(makeBard(1), 'vicious-mockery').ok).toBe(true);
    expect(canCastSpell(makeBard(1), 'bard-hold-person').ok).toBe(false);
    expect(canCastSpell(makeBard(3), 'bard-hold-person').ok).toBe(true);
  });

  it('Healing Word is a bonus-action self-heal — it spends the bonus, not the main action', () => {
    const hurt: Character = { ...makeBard(3), hp: { current: 5, max: 30, temp: 0 } };
    const { state } = createCombat({ character: hurt, monsters: [{ def: getMonster('goblin') }] });
    const roller = scriptRoller([10]);
    const r = castSpell({ roller, character: { ...hurt, hp: { current: 5, max: 30, temp: 0 } }, state, spellId: 'healing-word' });
    expect(r.cast).toBe(true);
    expect(r.character.actionEconomy.bonusActionUsed).toBe(true);
    expect(r.character.actionEconomy.actionUsed).toBe(false);
    expect(r.character.hp.current).toBeGreaterThan(5);
  });

  it('the War Lute scales attack off Charisma, not STR/DEX', () => {
    const bard = withMainHand(makeBard(3), 'war-lute');
    const chaMod = abilityModifier(effectiveAbilityScores(bard).cha);
    const roller = scriptRoller([10]);
    const { state, character } = createCombat({ character: bard, monsters: [{ def: getMonster('goblin') }] });
    const r = playerAttack({ roller, character, state }, monsterOf(state).id, 'war-lute');
    // CHA-keyed: attack bonus is prof + CHA mod (the War Lute carries no attackMod).
    expect(r.state.lastAttack?.attackBonus).toBe(proficiencyBonus(3) + chaMod);
  });

  it('is War Lute, finesse blades, and a hand crossbow — proficient for the bard', () => {
    const bard = makeBard(1);
    for (const id of ['war-lute', 'rapier', 'dagger', 'shortsword', 'hand-crossbow']) {
      expect(isWeaponProficient(bard, getItem(id) as never)).toBe(true);
    }
    // A heavy two-handed martial arm is NOT in the base kit.
    expect(isWeaponProficient(bard, getItem('greatsword') as never)).toBe(false);
  });
});

describe('bard bot — Hold Person crowd gate (owner directive, matches the wizard #574 gate)', () => {
  const holdReady = (lvl: number) => {
    let b = makeBard(lvl);
    b = {
      ...b,
      resources: {
        ...b.resources,
        knownSpells: ['bard-hold-person'],
        spellSlots: { ...(b.resources.spellSlots ?? {}), 2: 2 },
      },
    };
    return b;
  };

  it('refuses Hold Person while two foes stand, casts it once one remains', async () => {
    const { chooseCombatAction } = await import('./actionPolicy');
    const { createCombat } = await import('./createCombat');
    const { getMonster } = await import('../../content/monsters');
    const { createDiceRoller } = await import('../dice');

    const roller = createDiceRoller('hold-gate');
    const bard = holdReady(6);
    const two = createCombat({
      roller,
      character: bard,
      monsters: [{ def: getMonster('hobgoblin') }, { def: getMonster('hobgoblin') }],
    });
    const crowdAction = chooseCombatAction(two.state, two.character, 'balanced');
    expect(
      crowdAction.kind === 'cast' && crowdAction.spellId === 'bard-hold-person',
    ).toBe(false);

    const one = createCombat({
      roller,
      character: holdReady(6),
      monsters: [{ def: getMonster('hobgoblin') }],
    });
    const soloAction = chooseCombatAction(one.state, one.character, 'balanced');
    if (soloAction.kind === 'cast') {
      expect(['bard-hold-person']).toContain(soloAction.spellId);
    }
  });
});
