import { describe, it, expect } from 'vitest';
import { listEvents, eventsForChapter } from '.';
import { getMonster } from '../monsters';
import { isSkillEnabled, type SkillName } from '../../types/skills';
import type { EventOutcome } from '../../schemas/event';

// The chapter bands the run passes through past Athkatla/Spellhold/Ust Natha.
// Each must have at least one event authored for it, so a late-chapter event
// room is dominated by fitting content rather than Ch1 roadside fare.
const BANDS: { name: string; min: number; max: number; sample: number }[] = [
  { name: 'Godwake descent (Ch5–9)', min: 5, max: 9, sample: 9 },
  { name: 'Suldanessellar (Ch10)', min: 10, max: 10, sample: 10 },
  { name: 'Hell trials (Ch11)', min: 11, max: 11, sample: 11 },
  { name: 'Throne of Bhaal (Ch12–14)', min: 12, max: 14, sample: 14 },
];

function flatOutcomes(): EventOutcome[] {
  const out: EventOutcome[] = [];
  for (const ev of listEvents()) {
    for (const choice of ev.choices) {
      for (const oc of [choice.outcome, choice.failureOutcome]) {
        if (!oc) continue;
        if ('random' in oc) out.push(...oc.random.map((r) => r.outcome));
        else out.push(oc);
      }
    }
  }
  return out;
}

describe('chapter-progression events — every late band is covered', () => {
  for (const band of BANDS) {
    it(`${band.name} has a thematically-gated event eligible at Ch${band.sample}`, () => {
      const inBand = eventsForChapter(band.sample).filter(
        (e) => (e.minChapter ?? 1) >= band.min && (e.minChapter ?? 1) <= band.max,
      );
      expect(inBand.length, `no event gated in [${band.min}, ${band.max}]`).toBeGreaterThan(0);
    });
  }

  it('the deepest chapter draws mostly deep-chapter events (recency band weight)', () => {
    // The cumulative pool at Ch14 still contains every early event; the weight
    // in pickEventByRecency must tip the draw toward the endgame bands. Sanity
    // floor: deep events (Ch10+) must out-weight the entire Ch1–4 base.
    const eligible = eventsForChapter(14);
    const weightAt = (ch: number, min: number) => 2 ** -(ch - min);
    const deep = eligible
      .filter((e) => (e.minChapter ?? 1) >= 10)
      .reduce((a, e) => a + weightAt(14, e.minChapter ?? 1), 0);
    const early = eligible
      .filter((e) => (e.minChapter ?? 1) <= 4)
      .reduce((a, e) => a + weightAt(14, e.minChapter ?? 1), 0);
    expect(deep).toBeGreaterThan(early);
  });
});

describe('chapter-progression events — payloads resolve', () => {
  it('every spawn_ambush names monster def ids that resolve', () => {
    for (const oc of flatOutcomes()) {
      for (const eff of oc.effects) {
        if (eff.kind !== 'spawn_ambush') continue;
        for (const defId of eff.monsterDefIds) {
          expect(() => getMonster(defId), `unknown monster ${defId}`).not.toThrow();
        }
      }
    }
  });

  it('every skill-gated choice names an enabled skill and offers a failure fork', () => {
    for (const ev of listEvents()) {
      for (const choice of ev.choices) {
        if (!choice.skillCheck) continue;
        const skill = choice.skillCheck.skill as SkillName;
        expect(isSkillEnabled(skill), `${ev.id}/${choice.id} rolls disabled ${skill}`).toBe(true);
        expect(
          choice.failureOutcome,
          `${ev.id}/${choice.id} is a free skill upside with no failure branch`,
        ).toBeDefined();
      }
    }
  });
});
