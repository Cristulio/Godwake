import { describe, it, expect } from 'vitest';
import {
  createGodwakeDelve,
  chapterLabel,
  reachableRooms,
  roomById,
  REST_MAX_GAP,
  REST_MIN_SPACING,
  TOTAL_CHAPTERS,
  BASE_GAME_CHAPTERS,
} from './createDelve';
import { ASCENDANT_ELITE_POOL } from './ascensionElitePool';
import { getMonster } from '../../content/monsters';
import { getBossIntelCard, BOSS_INTEL_CARDS } from '../../content/bossIntel';
import type { DelveState, RoomSpec } from '../../types/delve';

describe('createGodwakeDelve', () => {
  it('emits a deep room graph for the base chained run (the default)', () => {
    const d = createGodwakeDelve(1);
    // Default is the base game (Cells→Velnaris, 11 chapters) — still a deep graph.
    expect(d.chapterCount).toBe(BASE_GAME_CHAPTERS);
    expect(d.rooms.length).toBeGreaterThanOrEqual(80);
  });

  it('has one camp seam between each pair of chained chapters', () => {
    const d = createGodwakeDelve(1);
    const camps = d.rooms.filter((r) => r.kind === 'camp');
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    // One camp per boss except the terminal chapter (no seam after the last).
    expect(camps).toHaveLength(bosses.length - 1);
  });

  it('opens with the six canonical chapter bosses in order', () => {
    const d = createGodwakeDelve({ seed: 1, fullChain: true });
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    // The Ch1-6 spine is fixed; later chapters (Ch7-9) append after it.
    expect(bosses.length).toBeGreaterThanOrEqual(6);
    const canonical = [
      'duergar-ilyich',
      'athkatla-magistrate',
      'asylum-director',
      'drow-matron-mother',
      'hollow-dawn',
      'the-unmade',
    ];
    canonical.forEach((id, i) => {
      expect(bosses[i].monsters?.[0].defId).toBe(id);
    });
    // L20-expansion chapters append after the spine: Ch7 Drowned Archive, then
    // Ch8 The Ashfall March, Ch9 The Court of Masks, and the BG2 endgame Ch10-14.
    const bossIds = bosses.map((b) => b.monsters?.[0]?.defId);
    expect(bossIds).toContain('drowned-custodian');
    expect(bossIds).toContain('ashen-marshal');
    expect(bossIds).toContain('the-hollow-pretender');
    expect(bossIds).toContain('nizidramaniiyt'); // Ch10 — Tor Maladin
    expect(bossIds).toContain('irenicus'); // Ch11 — The Trials of the Pit
    expect(bossIds).toContain('yaga-shura'); // Ch12 — The Siege of Karthen
    expect(bossIds).toContain('abazigal'); // Ch13 — The Last of the Five
    expect(bossIds).toContain('melissan'); // Ch14 — The Throne of the Slain God
  });

  it('is the full fourteen-chapter chain ending at Maevra, every boss wired', () => {
    const d = createGodwakeDelve({ seed: 1, fullChain: true });
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    // Fourteen chapters → fourteen distinct chapter bosses, in order 1..14.
    // TOTAL_CHAPTERS is the standalone constant delveStore reads; assert the
    // generated chain matches it so the two can never drift.
    expect(TOTAL_CHAPTERS).toBe(14);
    expect(bosses).toHaveLength(TOTAL_CHAPTERS);
    const chapters = bosses.map((b) => b.chapter);
    expect(chapters).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

    // Each boss def resolves to a registered monster and has exactly one intel card.
    for (const boss of bosses) {
      const defId = boss.monsters?.[0]?.defId;
      expect(defId).toBeTruthy();
      expect(() => getMonster(defId!)).not.toThrow();
      expect(getBossIntelCard(defId!)).not.toBeNull();
      const cards = BOSS_INTEL_CARDS.filter((c) => c.bossDefId === defId);
      expect(cards).toHaveLength(1);
    }

    // The very last room of the chain is the Ch14 Maevra boss — the finale.
    const finalRoom = d.rooms[d.rooms.length - 1];
    expect(finalRoom.kind).toBe('boss');
    expect(finalRoom.chapter).toBe(14);
    expect(finalRoom.monsters?.[0]?.defId).toBe('melissan');
    expect(finalRoom.next ?? []).toHaveLength(0);
  });

  it('threads exactly one omen + one pre-boss intel beat per chapter', () => {
    // Both render as event-kind RoomSpecs, but the OMEN is the budget's lone
    // `event` slot (cut 1-2 -> 1, so the player walks past fewer omens) and the
    // INTEL is the deterministic pre-boss beat (untouched). The intel sits alone
    // in the next-to-last column of its chapter, just before the boss.
    const d = createGodwakeDelve(1);
    const events = d.rooms.filter((r) => r.kind === 'event');
    // Every event room must resolve against the registry — no orphan ids.
    for (const e of events) {
      expect(e.eventTemplateId).toBeTruthy();
    }
    for (let ch = 1; ch <= d.chapterCount!; ch++) {
      const inCh = d.rooms.filter((r) => r.chapter === ch);
      const eventKind = inCh.filter((r) => r.kind === 'event');
      const bossLayer = Math.max(...inCh.map((r) => r.layer ?? 0));
      const intel = eventKind.filter((r) => (r.layer ?? 0) === bossLayer - 1);
      const omens = eventKind.filter((r) => (r.layer ?? 0) !== bossLayer - 1);
      expect(intel).toHaveLength(1); // one pre-boss intel beat, always
      expect(omens).toHaveLength(1); // one omen, down from up to two
    }
  });

  it('draws the fight-dense combat budget — 6-7 plain fights + exactly 1 elite per chapter', () => {
    // The playtest wanted more fighting and fewer shrines/omens, so the combat
    // pad was bumped back up (5-6). Plain combat = the lone warmup entry + the
    // 5-6 combat pad; the elite is now exactly one per chapter (was 1-2). Fights
    // are a clear majority of the middle (6-7 plain + 1 elite vs at most 5
    // non-combat specials).
    for (let seed = 0; seed < 24; seed++) {
      const d = createGodwakeDelve({ seed, ascension: 0 });
      for (let ch = 1; ch <= d.chapterCount!; ch++) {
        const inCh = d.rooms.filter((r) => r.chapter === ch);
        const combat = inCh.filter((r) => r.kind === 'combat').length;
        const elite = inCh.filter((r) => r.kind === 'elite').length;
        expect(combat).toBeGreaterThanOrEqual(6);
        expect(combat).toBeLessThanOrEqual(7);
        expect(elite).toBe(1);
      }
    }
  });

  it('has exactly one shrine per chapter span (lean, per the playtest)', () => {
    // Shrines were cut 2 -> 1 per chapter: the player kept being routed past
    // altars instead of fights. One per chapter, every chapter, every seed.
    for (let seed = 0; seed < 12; seed++) {
      const d = createGodwakeDelve({ seed });
      const shrines = d.rooms.filter((r) => r.kind === 'shrine');
      expect(shrines.length).toBe(d.chapterCount);
    }
  });

  it('has at least one rest room per chapter span', () => {
    const d = createGodwakeDelve(1);
    const rests = d.rooms.filter((r) => r.kind === 'rest');
    expect(rests.length).toBeGreaterThanOrEqual(d.chapterCount!);
  });

  it('chapterId is godwake', () => {
    const d = createGodwakeDelve(42);
    expect(d.chapterId).toBe('godwake');
  });

  it('is deterministic per seed', () => {
    const a = createGodwakeDelve(42);
    const b = createGodwakeDelve(42);
    expect(a.rooms.map((r) => r.id)).toEqual(b.rooms.map((r) => r.id));
    expect(a.rooms.map((r) => r.monsters)).toEqual(b.rooms.map((r) => r.monsters));
    expect(a.rooms.map((r) => r.eventTemplateId)).toEqual(
      b.rooms.map((r) => r.eventTemplateId),
    );
  });

  it('camp rooms carry no combat / loot fields', () => {
    const d = createGodwakeDelve(7);
    for (const camp of d.rooms.filter((r) => r.kind === 'camp')) {
      expect(camp.monsters).toBeUndefined();
      expect(camp.goldReward).toBeUndefined();
      expect(camp.xpReward).toBeUndefined();
    }
  });

  it('every monster id referenced in the chain resolves via getMonster', () => {
    for (let s = 0; s < 6; s++) {
      const d = createGodwakeDelve(s);
      for (const room of d.rooms) {
        for (const m of room.monsters ?? []) {
          expect(() => getMonster(m.defId)).not.toThrow();
        }
      }
    }
  });

  it('the chained delve places the chapter bosses in order', () => {
    const d = createGodwakeDelve(99);
    const bossIndices = d.rooms
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.kind === 'boss')
      .map(({ idx }) => idx);
    expect(bossIndices).toEqual([...bossIndices].sort((a, b) => a - b));
    const campIndices = d.rooms
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.kind === 'camp')
      .map(({ idx }) => idx);
    // Each camp seam falls between two bosses (one camp per non-terminal boss).
    for (let i = 0; i < campIndices.length; i++) {
      expect(campIndices[i]).toBeGreaterThan(bossIndices[i]);
      expect(campIndices[i]).toBeLessThan(bossIndices[i + 1]);
    }
  });
});

describe('createGodwakeDelve — ascension elite variants', () => {
  const ASCENDANT_DEF_IDS = new Set(
    ASCENDANT_ELITE_POOL.flatMap((e) => e.monsters.map((m) => m.defId)),
  );

  const eliteRooms = (d: DelveState) => d.rooms.filter((r) => r.kind === 'elite');
  const ascendantBearingRooms = (d: DelveState) =>
    d.rooms.filter((r) => (r.monsters ?? []).some((m) => ASCENDANT_DEF_IDS.has(m.defId)));

  it('never fields an ascendant elite at Ascension 0 or 1', () => {
    for (const ascension of [0, 1]) {
      for (let seed = 0; seed < 24; seed++) {
        const d = createGodwakeDelve({ seed, ascension });
        expect(ascendantBearingRooms(d)).toHaveLength(0);
      }
    }
  });

  it('mixes ascendant elites into elite rooms at Ascension >= 2', () => {
    // Probabilistic per seed (they share the elite pool with the chapter's own
    // elites), so assert in aggregate across a span of seeds.
    let withAscendant = 0;
    for (let seed = 0; seed < 24; seed++) {
      const d = createGodwakeDelve({ seed, ascension: 2 });
      if (ascendantBearingRooms(d).length > 0) withAscendant++;
    }
    expect(withAscendant).toBeGreaterThan(0);
  });

  it('only ever places ascendant horrors in elite rooms (never plain combat)', () => {
    for (let seed = 0; seed < 24; seed++) {
      const d = createGodwakeDelve({ seed, ascension: 6 });
      for (const room of ascendantBearingRooms(d)) {
        expect(room.kind).toBe('elite');
      }
    }
  });

  it('augments rather than replaces the chapter elite pool (ordinary elites still appear)', () => {
    const d = createGodwakeDelve({ seed: 3, ascension: 6 });
    const ordinaryElites = eliteRooms(d).filter(
      (r) => !(r.monsters ?? []).some((m) => ASCENDANT_DEF_IDS.has(m.defId)),
    );
    expect(ordinaryElites.length).toBeGreaterThan(0);
  });
});

describe('createGodwakeDelve — branching graph', () => {
  /** Forward-reachable id set from the entry node. */
  function reachableFromEntry(d: DelveState): Set<string> {
    const seen = new Set<string>();
    const stack = [d.rooms[0].id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of roomById(d, id)?.next ?? []) stack.push(n);
    }
    return seen;
  }

  it('seeds the entry node, current id, and visited trail', () => {
    const d = createGodwakeDelve(1);
    expect(d.currentRoomIdx).toBe(0);
    expect(d.currentRoomId).toBe(d.rooms[0].id);
    expect(d.visitedRoomIds).toEqual([d.rooms[0].id]);
  });

  it('opens with a real fork (the entry reaches more than one node)', () => {
    const d = createGodwakeDelve(1);
    expect(reachableRooms(d, d.rooms[0]).length).toBeGreaterThan(1);
  });

  it('every node is reachable from the entry and every edge resolves', () => {
    const d = createGodwakeDelve(3);
    const reachable = reachableFromEntry(d);
    // Camps + downstream chapters are reachable only through the boss→camp seam,
    // so the whole flat list should be covered.
    expect(reachable.size).toBe(d.rooms.length);
    for (const room of d.rooms) {
      for (const id of room.next ?? []) {
        expect(roomById(d, id)).toBeDefined();
      }
    }
  });

  it('every node can still reach a boss (no dead ends before the convergence)', () => {
    const d = createGodwakeDelve(5);
    const reachesBoss = (start: string): boolean => {
      const seen = new Set<string>();
      const stack = [start];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const r = roomById(d, id);
        if (r?.kind === 'boss') return true;
        for (const n of r?.next ?? []) stack.push(n);
      }
      return false;
    };
    expect(d.rooms.every((r) => reachesBoss(r.id))).toBe(true);
  });

  // ── alternate-route invariant: never trap the player on one node ──────────
  //
  // The map must never force the player onto a single node they can't or won't
  // take. Two guarantees, checked across many seeds and every chapter:
  //   1. Every middle column (between the lone warmup entry and the intel→boss
  //      convergence) holds at least two nodes — a real choice at every step.
  //   2. Even with elites locked (a new soul), the boss is reachable from the
  //      entry using only selectable (non-locked) nodes — a greyed elite can
  //      never be the only way forward.

  /** Group a chapter's non-camp nodes by their layer (= map column). */
  function columnsOf(d: DelveState, chapter: number): RoomSpec[][] {
    const byLayer = new Map<number, RoomSpec[]>();
    for (const r of d.rooms.filter((n) => n.chapter === chapter && n.kind !== 'camp')) {
      const l = r.layer ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)!.push(r);
    }
    return [...byLayer.keys()].sort((a, b) => a - b).map((l) => byLayer.get(l)!);
  }

  it('every middle column offers at least two nodes (no forced single-node bottleneck)', () => {
    for (let seed = 0; seed < 40; seed++) {
      const d = createGodwakeDelve({ seed });
      for (let ch = 1; ch <= d.chapterCount!; ch++) {
        const cols = columnsOf(d, ch);
        // First column = warmup entry (1), last two = intel (1) then boss (1):
        // those are the legitimate convergence/terminal nodes. Everything in
        // between must be at least two wide.
        const middle = cols.slice(1, cols.length - 2);
        for (const col of middle) {
          expect(col.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('every middle column offers at least one fight (no all-non-combat choice column)', () => {
    // The playtest's core frustration: a choice column of OMEN / SHRINE / REST,
    // with no fight to pick. Every column the player routes through (i.e. every
    // middle column — the warmup entry and the intel/boss convergence aside)
    // must hold at least one combat or elite node.
    const COMBAT_KINDS = new Set(['combat', 'elite']);
    for (let seed = 0; seed < 40; seed++) {
      for (const elitesEnabled of [true, false]) {
        const d = createGodwakeDelve({ seed, elitesEnabled });
        for (let ch = 1; ch <= d.chapterCount!; ch++) {
          const cols = columnsOf(d, ch);
          const middle = cols.slice(1, cols.length - 2);
          for (const col of middle) {
            expect(
              col.some((r) => COMBAT_KINDS.has(r.kind)),
              `chapter ${ch} seed ${seed}: column [${col
                .map((r) => r.kind)
                .join(', ')}] offers no fight`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('no column holds more than one elite', () => {
    for (let seed = 0; seed < 40; seed++) {
      const d = createGodwakeDelve({ seed });
      for (let ch = 1; ch <= d.chapterCount!; ch++) {
        for (const col of columnsOf(d, ch)) {
          expect(col.filter((r) => r.kind === 'elite').length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('with elites locked, the boss is still reachable using only selectable nodes', () => {
    for (let seed = 0; seed < 40; seed++) {
      const d = createGodwakeDelve({ seed, elitesEnabled: false });
      // Walk forward from the entry, only ever stepping onto non-locked nodes,
      // and confirm a boss is always within reach — i.e. the locked elites
      // never wall off the road.
      const reachesBossUnlocked = (start: string): boolean => {
        const seen = new Set<string>();
        const stack = [start];
        while (stack.length) {
          const id = stack.pop()!;
          if (seen.has(id)) continue;
          seen.add(id);
          const r = roomById(d, id);
          if (!r || r.locked) continue;
          if (r.kind === 'boss') return true;
          for (const n of r.next ?? []) stack.push(n);
        }
        return false;
      };
      expect(reachesBossUnlocked(d.rooms[0].id)).toBe(true);
      // And at every selectable node short of the convergence there is at least
      // one selectable next step.
      for (const r of d.rooms) {
        if (r.locked || r.kind === 'boss' || r.kind === 'camp') continue;
        const onward = (r.next ?? []).map((id) => roomById(d, id)).filter(Boolean);
        if (onward.length === 0) continue; // terminal final boss already excluded
        expect(onward.some((n) => !n!.locked)).toBe(true);
      }
    }
  });

  it('never joins two same-kind non-combat rooms by an edge (fights may repeat)', () => {
    // The room you step into is always a different non-combat kind from the one
    // you just left — except fights, which may repeat (combat→combat, and the
    // tougher elite fight, are exempt).
    const COMBAT_KINDS = new Set(['combat', 'elite']);
    for (let seed = 0; seed < 60; seed++) {
      for (const elitesEnabled of [true, false]) {
        const d = createGodwakeDelve({ seed, elitesEnabled });
        let sawCombatChain = false;
        for (const room of d.rooms) {
          for (const id of room.next ?? []) {
            const nxt = roomById(d, id);
            if (!nxt) continue;
            if (room.kind === 'combat' && nxt.kind === 'combat') sawCombatChain = true;
            if (COMBAT_KINDS.has(room.kind) || COMBAT_KINDS.has(nxt.kind)) continue;
            expect(
              room.kind === nxt.kind,
              `${room.id} (${room.kind}) → ${id} (${nxt.kind}) repeats a non-combat kind [seed ${seed}]`,
            ).toBe(false);
          }
        }
        // Sanity: the exemption is real — fight→fight adjacency does occur.
        expect(sawCombatChain).toBe(true);
      }
    }
  });

  it('never offers two same-kind non-combat nodes in one column (same-kind combat is allowed)', () => {
    // Within a single column the parallel choices must differ: two rests (or two
    // shrines/events/shops) side by side is a fake choice. Combat is exempt — a
    // column may field several fights/elites.
    const COMBAT_KINDS = new Set(['combat', 'elite']);
    for (let seed = 0; seed < 60; seed++) {
      for (const elitesEnabled of [true, false]) {
        const d = createGodwakeDelve({ seed, elitesEnabled });
        let sawCombatColumn = false;
        for (let ch = 1; ch <= d.chapterCount!; ch++) {
          for (const col of columnsOf(d, ch)) {
            const nonCombatKinds = col
              .filter((r) => !COMBAT_KINDS.has(r.kind))
              .map((r) => r.kind);
            expect(
              new Set(nonCombatKinds).size,
              `column [${col.map((r) => r.kind).join(', ')}] repeats a non-combat kind [seed ${seed}]`,
            ).toBe(nonCombatKinds.length);
            if (col.filter((r) => COMBAT_KINDS.has(r.kind)).length >= 2) sawCombatColumn = true;
          }
        }
        // Sanity: the exemption is real — columns with 2+ fights do occur.
        expect(sawCombatColumn).toBe(true);
      }
    }
  });

  // ── rest cadence: recovery is always close, and rests never bunch ─────────
  //
  // Two guarantees, checked across many seeds and every chapter (the structure
  // is ascension-independent, so ascension 0 covers it).
  //   (a) Max gap: from EVERY node, the best route reaches a rest — or the boss,
  //       whose camp seam restores — within REST_MAX_GAP fights. So no route can
  //       be forced through more than that many fights without recovery in reach.
  //   (b) Min spacing: consecutive rest columns sit at least REST_MIN_SPACING
  //       columns apart, so two rests never share or neighbour a column — they
  //       never bunch (atop #348's no rest→rest edge and #353's no doubled column).

  /**
   * For every node, the fewest fights the player must pass — choosing the best
   * forward route — before reaching a rest or the boss (a fight node counts 1;
   * a rest or boss is recovery and counts 0). Computed bottom-up over the layered
   * DAG. The max over all nodes is the worst unavoidable gap to recovery.
   */
  const fightsToRecovery = (nodes: RoomSpec[]): Map<string, number> => {
    const f = new Map<string, number>();
    for (const r of [...nodes].sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0))) {
      if (r.kind === 'rest' || r.kind === 'boss') {
        f.set(r.id, 0);
        continue;
      }
      const cost = r.kind === 'combat' || r.kind === 'elite' ? 1 : 0;
      let best = Infinity;
      for (const id of r.next ?? []) {
        const v = f.get(id);
        if (v !== undefined) best = Math.min(best, v);
      }
      f.set(r.id, best === Infinity ? cost : cost + best);
    }
    return f;
  };

  it('keeps a reachable rest within REST_MAX_GAP fights from every node (max-gap)', () => {
    expect(REST_MAX_GAP).toBe(3);
    for (let seed = 0; seed < 60; seed++) {
      for (const elitesEnabled of [true, false]) {
        const d = createGodwakeDelve({ seed, elitesEnabled });
        for (let ch = 1; ch <= d.chapterCount!; ch++) {
          const nodes = d.rooms.filter((r) => r.chapter === ch && r.kind !== 'camp');
          // Every chapter offers recovery, so the guarantee is meaningful.
          expect(
            nodes.some((r) => r.kind === 'rest'),
            `chapter ${ch} seed ${seed}: no rest at all`,
          ).toBe(true);
          const f = fightsToRecovery(nodes);
          for (const r of nodes) {
            expect(
              f.get(r.id)!,
              `chapter ${ch} seed ${seed}: ${r.id} (${r.kind}) is ${f.get(r.id)} fights from any reachable rest`,
            ).toBeLessThanOrEqual(REST_MAX_GAP);
          }
        }
      }
    }
  });

  it('never clusters rests — rest columns stay at least REST_MIN_SPACING apart', () => {
    expect(REST_MIN_SPACING).toBe(2);
    for (let seed = 0; seed < 60; seed++) {
      for (const elitesEnabled of [true, false]) {
        const d = createGodwakeDelve({ seed, elitesEnabled });
        for (let ch = 1; ch <= d.chapterCount!; ch++) {
          const restCols = columnsOf(d, ch)
            .map((col, i) => ({ col, i }))
            .filter(({ col }) => col.some((r) => r.kind === 'rest'))
            .map(({ i }) => i);
          for (let k = 1; k < restCols.length; k++) {
            expect(
              restCols[k] - restCols[k - 1],
              `chapter ${ch} seed ${seed}: rest columns ${restCols[k - 1]} and ${restCols[k]} too close`,
            ).toBeGreaterThanOrEqual(REST_MIN_SPACING);
          }
        }
      }
    }
  });

  it('offers shop and elite route nodes, and the final boss is terminal', () => {
    const d = createGodwakeDelve(7);
    expect(d.rooms.some((r) => r.kind === 'shop')).toBe(true);
    expect(d.rooms.some((r) => r.kind === 'elite')).toBe(true);
    // The final chapter's boss is terminal (no onward seam); whichever chapter
    // is wired last owns it — derive it rather than hard-coding the def id.
    const bossRooms = d.rooms.filter((r) => r.kind === 'boss');
    const finalBoss = bossRooms[bossRooms.length - 1];
    expect(finalBoss.next ?? []).toHaveLength(0);
    // Every other chapter boss leads onward to its camp.
    for (const boss of bossRooms.filter((r) => r !== finalBoss)) {
      expect(reachableRooms(d, boss).some((r) => r.kind === 'camp')).toBe(true);
    }
  });
});

describe('createGodwakeDelve — base game vs New Game+ chain split', () => {
  /** Forward-reachable id set from the entry node. */
  function reachableFromEntry(d: DelveState): Set<string> {
    const seen = new Set<string>();
    const stack = [d.rooms[0].id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of roomById(d, id)?.next ?? []) stack.push(n);
    }
    return seen;
  }

  const bossDefIds = (d: DelveState) =>
    d.rooms.filter((r) => r.kind === 'boss').map((r) => r.monsters?.[0]?.defId);

  it('default build is the BASE game: 11 chapters, the Cells→Velnaris arc', () => {
    const d = createGodwakeDelve(1);
    expect(BASE_GAME_CHAPTERS).toBe(11);
    expect(d.chapterCount).toBe(BASE_GAME_CHAPTERS);
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    expect(bosses).toHaveLength(BASE_GAME_CHAPTERS);
    expect(bosses.map((b) => b.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    // Ends on Velnaris, in the heart of his own hell — the base-game final boss.
    const finalRoom = d.rooms[d.rooms.length - 1];
    expect(finalRoom.kind).toBe('boss');
    expect(finalRoom.chapter).toBe(11);
    expect(finalRoom.monsters?.[0]?.defId).toBe('irenicus');
    expect(finalRoom.next ?? []).toHaveLength(0);
    // The Throne-of-the Slain God arc is New Game+ only — absent from a base run.
    const ids = bossDefIds(d);
    expect(ids).not.toContain('yaga-shura');
    expect(ids).not.toContain('abazigal');
    expect(ids).not.toContain('melissan');
  });

  it('full-chain build is New Game+: 14 chapters ending at Maevra', () => {
    const d = createGodwakeDelve({ seed: 1, fullChain: true });
    expect(d.chapterCount).toBe(TOTAL_CHAPTERS);
    const bosses = d.rooms.filter((r) => r.kind === 'boss');
    expect(bosses).toHaveLength(TOTAL_CHAPTERS);
    const finalRoom = d.rooms[d.rooms.length - 1];
    expect(finalRoom.monsters?.[0]?.defId).toBe('melissan');
    expect(finalRoom.next ?? []).toHaveLength(0);
    // Velnaris (Ch11) is still in the chain — now a mid-run boss, not the finale.
    expect(bossDefIds(d)).toContain('irenicus');
  });

  // The camp-seam invariant for BOTH ranges: exactly chapters-1 camp seams, and
  // every node reachable from the entry (no orphans when the chain is sliced).
  it('keeps the camp-seam invariant (chapters-1 camps, no orphans) for BOTH ranges', () => {
    const cases: Array<{ delve: DelveState; chapters: number }> = [
      { delve: createGodwakeDelve(1), chapters: BASE_GAME_CHAPTERS },
      { delve: createGodwakeDelve({ seed: 1, fullChain: true }), chapters: TOTAL_CHAPTERS },
    ];
    for (const { delve: d, chapters } of cases) {
      const camps = d.rooms.filter((r) => r.kind === 'camp');
      const bosses = d.rooms.filter((r) => r.kind === 'boss');
      expect(bosses).toHaveLength(chapters);
      expect(camps).toHaveLength(chapters - 1);
      // Whole flat list reachable through the boss→camp→next-chapter seams.
      expect(reachableFromEntry(d).size).toBe(d.rooms.length);
      for (const room of d.rooms) {
        for (const id of room.next ?? []) expect(roomById(d, id)).toBeDefined();
      }
    }
  });

  it('names the dungeon Godwake for both base and NG+', () => {
    expect(createGodwakeDelve(1).dungeonName).toBe('Godwake');
    expect(createGodwakeDelve({ seed: 1, fullChain: true }).dungeonName).toBe('Godwake');
  });
});

describe('chapterLabel', () => {
  it('names a chapter by its number and boss-room title (no "toward" — stays true post-boss)', () => {
    const d = createGodwakeDelve(1);
    expect(chapterLabel(d, 1)).toBe("Chapter 1 — Karzok's Hall");
  });

  it('falls back to the bare number when the chapter has no boss node', () => {
    const d = createGodwakeDelve(1);
    expect(chapterLabel(d, 999)).toBe('Chapter 999');
  });
});
