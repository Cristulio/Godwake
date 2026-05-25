/**
 * Mulberry32 PRNG. Small, fast, decent statistical quality for game use.
 * Single 32-bit state — easy to serialize for save/resume.
 */
export interface SeededRng {
  next(): number;
  getState(): number;
}

export function createRng(seedOrState: number): SeededRng {
  let state = seedOrState >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState(): number {
      return state;
    },
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
