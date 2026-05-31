import { describe, it, expect } from 'vitest';
import { scoreBlessing, chooseBlessing } from './actionPolicy';
import { characterAtLevel } from '../../test/sim/encounterStress';

// Blessing ids referenced (see content/blessings):
//   helms-aegis      -> { acBonus: 1 }
//   tempus-edge      -> { critRangeBonus: 1 }     (weapon-keyed, non-stacking)
//   mystras-whisper  -> { damageBonus: 1 }        (weapon-keyed)
//   tymoras-coin     -> { rerollMissesPerEncounter: 1 } (weapon-keyed)
//   ilmaters-patience-> { extraStabiliseCharges: 1 }
//   silvanus-burden  -> { acBonusPerBaneQuirk: 1 }
//   lathanders-dawn  -> { extraTempHpPerRoom: 3 }
//   ilmaters-crown   -> { extraTempHpPerRoom: 2 }

describe('scoreBlessing', () => {
  it('values AC for a wizard but scores weapon-keyed offense at zero', () => {
    const wiz = characterAtLevel('wizard', 3);
    expect(scoreBlessing('helms-aegis', wiz)).toBeGreaterThan(0);
    // Damage / reroll never fire for the wizard's save/auto-hit kit.
    expect(scoreBlessing('mystras-whisper', wiz)).toBe(0);
    expect(scoreBlessing('tymoras-coin', wiz)).toBe(0);
  });

  it('values flat damage more for a fighter with Extra Attack (L5+) than at L1', () => {
    const f1 = characterAtLevel('fighter', 1);
    const f5 = characterAtLevel('fighter', 5);
    expect(scoreBlessing('mystras-whisper', f5)).toBeGreaterThan(
      scoreBlessing('mystras-whisper', f1),
    );
  });

  it('rates a free death-save (stabilise charge) above a single point of AC', () => {
    const f = characterAtLevel('fighter', 3);
    expect(scoreBlessing('ilmaters-patience', f)).toBeGreaterThan(scoreBlessing('helms-aegis', f));
  });

  it('treats a non-stacking lever already owned as a dead pick', () => {
    const f = characterAtLevel('fighter', 3, ['tempus-edge']); // already crit +1
    // tempus-edge is { critRangeBonus: 1 } — same signature, so it is inert now.
    expect(scoreBlessing('tempus-edge', f)).toBe(-1);
  });

  it('credits only the marginal temp HP over the best source already held', () => {
    const fresh = characterAtLevel('fighter', 3);
    const ownsBig = characterAtLevel('fighter', 3, ['lathanders-dawn']); // +3 temp HP/room
    // A fresh soul values +2 temp HP; one already holding +3 gains nothing more.
    expect(scoreBlessing('ilmaters-crown', fresh)).toBeGreaterThan(0);
    expect(scoreBlessing('ilmaters-crown', ownsBig)).toBe(0);
  });

  it('scores a per-bane lever at zero for a bare (curse-free) soul', () => {
    const bare = characterAtLevel('rogue', 3);
    expect(bare.quirks.length).toBe(0);
    expect(scoreBlessing('silvanus-burden', bare)).toBe(0);
  });
});

describe('chooseBlessing', () => {
  it('returns undefined for an empty offer', () => {
    const f = characterAtLevel('fighter', 3);
    expect(chooseBlessing([], f)).toBeUndefined();
  });

  it('a wizard takes AC over a weapon blessing', () => {
    const wiz = characterAtLevel('wizard', 3);
    expect(chooseBlessing(['mystras-whisper', 'helms-aegis'], wiz)).toBe('helms-aegis');
  });

  it('avoids an owned non-stacking duplicate in favour of a fresh option', () => {
    const f = characterAtLevel('fighter', 3, ['tempus-edge']);
    // tempus-edge is inert (dup crit); mystras-whisper still adds damage.
    expect(chooseBlessing(['tempus-edge', 'mystras-whisper'], f)).toBe('mystras-whisper');
  });
});
