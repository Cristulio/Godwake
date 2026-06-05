import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../../engine/dice';
import { createCharacter } from '../../engine/character/initialize';
import { rollChoiceCheck } from '../../engine/delve/applyEventOutcome';
import { getEvent, listEvents } from '.';
import { SKILL_NAMES, isSkillEnabled, type SkillName } from '../../types/skills';

function checkedChoices(): { eventId: string; skill: SkillName }[] {
  const out: { eventId: string; skill: SkillName }[] = [];
  for (const ev of listEvents()) {
    for (const choice of ev.choices) {
      if (choice.skillCheck) out.push({ eventId: ev.id, skill: choice.skillCheck.skill });
    }
  }
  return out;
}

describe('skill picker ↔ event consumers — no dead, no unbacked skills', () => {
  const skillsRead = new Set(checkedChoices().map((c) => c.skill));

  it('every enabled skill is read by at least one event check (no flavor-only picks)', () => {
    // The guard that would have caught the dead `stealth`: a skill the picker
    // offers must have an engine consumer. Keeps SKILL_ENABLED honest.
    const dead = SKILL_NAMES.filter((s) => isSkillEnabled(s) && !skillsRead.has(s));
    expect(dead, `enabled but never read by any event: ${dead.join(', ')}`).toEqual([]);
  });

  it('every event check names an enabled skill (no roll a player cannot train)', () => {
    const orphan = [...skillsRead].filter((s) => !isSkillEnabled(s));
    expect(orphan, `events roll disabled skills: ${orphan.join(', ')}`).toEqual([]);
  });
});

const NEWLY_WIRED: { skill: SkillName; eventId: string; choiceId: string }[] = [
  { skill: 'investigation', eventId: 'dead-mans-steel', choiceId: 'examine-pack' },
  { skill: 'history', eventId: 'bones-on-stake', choiceId: 'name-the-dead' },
  { skill: 'sleight-of-hand', eventId: 'beggar-at-the-gate', choiceId: 'palm-the-takings' },
  { skill: 'arcana', eventId: 'hollow-library', choiceId: 'parse-the-script' },
  { skill: 'stealth', eventId: 'warden-deal', choiceId: 'slip-past-warden' },
  { skill: 'religion', eventId: 'eilistraee-shrine', choiceId: 'observe-the-rite' },
  // Skills-depth additions (this lane)
  { skill: 'arcana', eventId: 'cracked-mirror', choiceId: 'read-the-reflection' },
  { skill: 'athletics', eventId: 'whispering-door', choiceId: 'shoulder-the-door' },
  { skill: 'perception', eventId: 'rats-in-the-grain', choiceId: 'scan-the-mess' },
  { skill: 'history', eventId: 'beggar-at-the-gate', choiceId: 'recall-waukeens-prayer' },
  { skill: 'medicine', eventId: 'street-orphan', choiceId: 'tend-the-cut' },
  { skill: 'sleight-of-hand', eventId: 'pilgrim-road-smith', choiceId: 'pocket-tools' },
  { skill: 'survival', eventId: 'soldier-left-to-die', choiceId: 'assess-his-state' },
  { skill: 'perception', eventId: 'soldier-left-to-die', choiceId: 'notice-what-hes-holding' },
  { skill: 'medicine', eventId: 'soldier-left-to-die', choiceId: 'bind-the-wound' },
  { skill: 'investigation', eventId: 'dropped-ledger', choiceId: 'decode-the-cipher' },
  { skill: 'history', eventId: 'dropped-ledger', choiceId: 'identify-the-house' },
  { skill: 'insight', eventId: 'dropped-ledger', choiceId: 'read-the-margins' },
  { skill: 'religion', eventId: 'forgotten-offering-table', choiceId: 'honour-the-god' },
  { skill: 'arcana', eventId: 'forgotten-offering-table', choiceId: 'read-the-weave' },
  { skill: 'stealth', eventId: 'forgotten-offering-table', choiceId: 'pocket-the-trinkets' },
];

describe('newly wired skill checks — the roll drives both branches', () => {
  for (const { skill, eventId, choiceId } of NEWLY_WIRED) {
    it(`${skill} @ ${eventId}/${choiceId} gates pass vs fail off the d20`, () => {
      const choice = getEvent(eventId).choices.find((c) => c.id === choiceId);
      expect(choice, `${eventId} is missing choice ${choiceId}`).toBeDefined();
      expect(choice!.skillCheck?.skill).toBe(skill);
      expect(isSkillEnabled(skill)).toBe(true);
      // A live skill check must offer a real failure branch, not a free upside.
      expect(choice!.failureOutcome).toBeDefined();

      // Souls no longer train skills in the player flow, but the event mechanic
      // still reads skillProficiencies — seed one here to prove a trained check
      // routes both branches. An untrained soul rolls the same check flat.
      const char = createCharacter({
        id: 'probe',
        name: 'Probe',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: { str: 13, dex: 13, con: 13, int: 13, wis: 13, cha: 13 },
        skillProficiencies: [skill],
      });

      // Sweep seeds: a passing roll must route to `outcome`, a failing roll to
      // `failureOutcome`. The natural-20/natural-1 rule guarantees both appear.
      let sawPass = false;
      let sawFail = false;
      for (let seed = 1; seed <= 80; seed += 1) {
        const r = rollChoiceCheck(choice!, createDiceRoller(seed), char);
        if (r.succeeded) {
          sawPass = true;
          expect(r.outcome).toBe(choice!.outcome);
        } else {
          sawFail = true;
          expect(r.outcome).toBe(choice!.failureOutcome);
        }
      }
      expect(sawPass, `${skill} check never passed across 80 seeds`).toBe(true);
      expect(sawFail, `${skill} check never failed across 80 seeds`).toBe(true);
    });
  }
});

describe('untrained souls — event checks still resolve at a flat roll', () => {
  // Skills were removed from the player flow, so every real character is
  // untrained. The check must still run and route cleanly — just with no
  // proficiency bonus added — and both branches must remain reachable.
  it('routes every wired check to a valid branch with zero proficiency', () => {
    const char = createCharacter({
      id: 'untrained',
      name: 'Untrained',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: { str: 13, dex: 13, con: 13, int: 13, wis: 13, cha: 13 },
    });
    expect(char.skillProficiencies).toEqual([]);

    let sawPass = false;
    let sawFail = false;
    for (const { eventId, choiceId } of NEWLY_WIRED) {
      const choice = getEvent(eventId).choices.find((c) => c.id === choiceId)!;
      for (let seed = 1; seed <= 40; seed += 1) {
        const r = rollChoiceCheck(choice, createDiceRoller(seed), char);
        // No proficiency is ever added for an untrained soul.
        expect(r.skillCheck?.proficiencyMod).toBe(0);
        // The roll still routes to one of the two authored branches.
        expect([choice.outcome, choice.failureOutcome]).toContain(r.outcome);
        if (r.succeeded) sawPass = true;
        else sawFail = true;
      }
    }
    expect(sawPass, 'no untrained check ever passed').toBe(true);
    expect(sawFail, 'no untrained check ever failed').toBe(true);
  });
});
