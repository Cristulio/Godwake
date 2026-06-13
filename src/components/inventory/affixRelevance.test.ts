import { describe, it, expect } from 'vitest';
import { affixRelevanceById, enhancementRelevanceFor } from './affixRelevance';
import type { Character } from '../../types/character';

const wizard = { classId: 'wizard', subclassId: null } as Pick<Character, 'classId' | 'subclassId'>;
const fighter = { classId: 'fighter', subclassId: null } as Pick<Character, 'classId' | 'subclassId'>;
const valorBard = { classId: 'bard', subclassId: 'valor' } as Pick<Character, 'classId' | 'subclassId'>;

describe('affixRelevanceById', () => {
  it('dims a weapon-damage affix for a caster (the owner-reported pain)', () => {
    const rel = affixRelevanceById('cruel', wizard); // damageBonus
    expect(rel.relevant).toBe(false);
    expect(rel.tag).toMatch(/weapon only/i);
  });

  it('dims a spell affix for a martial', () => {
    const rel = affixRelevanceById('arcane', fighter); // spellDcBonus
    expect(rel.relevant).toBe(false);
    expect(rel.tag).toMatch(/spell only/i);
  });

  it('keeps a spell-save-DC affix bright for a caster', () => {
    const rel = affixRelevanceById('arcane', wizard);
    expect(rel.relevant).toBe(true);
    expect(rel.tag).toBeNull();
  });

  it('keeps a weapon-damage affix bright for a martial', () => {
    const rel = affixRelevanceById('cruel', fighter);
    expect(rel.relevant).toBe(true);
  });

  it('never dims a universal (AC) affix — relevant for both camps', () => {
    expect(affixRelevanceById('warded', wizard).relevant).toBe(true); // armour acBonus
    expect(affixRelevanceById('warded', fighter).relevant).toBe(true);
    expect(affixRelevanceById('warding', wizard).relevant).toBe(true); // accessory acBonus
  });

  it('never dims a resist affix for either camp', () => {
    expect(affixRelevanceById('salamander', wizard).relevant).toBe(true); // resist fire
    expect(affixRelevanceById('graveward', fighter).relevant).toBe(true);
  });

  it('treats sustain (lifesteal / regen) as relevant — conservative, never dim', () => {
    expect(affixRelevanceById('vampiric', wizard).relevant).toBe(true); // lifestealPct
    expect(affixRelevanceById('mending', wizard).relevant).toBe(true); // regenPerTurn
  });

  it('dims spell-vamp for a martial and keeps it bright for a caster', () => {
    expect(affixRelevanceById('soulthirst', fighter).relevant).toBe(false); // spellLifestealPct
    expect(affixRelevanceById('soulthirst', wizard).relevant).toBe(true);
  });

  it('reads SUBCLASS lean, not just class — a Valor bard swings, so weapon affixes apply', () => {
    expect(affixRelevanceById('cruel', valorBard).relevant).toBe(true);
    // …and a spell affix dims for that martial-lean bard.
    expect(affixRelevanceById('arcane', valorBard).relevant).toBe(false);
  });

  it('treats an unknown affix id as relevant (never dim what we cannot classify)', () => {
    expect(affixRelevanceById('__nope__', wizard).relevant).toBe(true);
  });

  it('does not dim anything when there is no character', () => {
    expect(affixRelevanceById('cruel', null).relevant).toBe(true);
    expect(affixRelevanceById('arcane', undefined).relevant).toBe(true);
  });
});

describe('enhancementRelevanceFor', () => {
  it('dims a weapon +N for a caster', () => {
    const rel = enhancementRelevanceFor('weapon', wizard);
    expect(rel.relevant).toBe(false);
    expect(rel.tag).toMatch(/weapon only/i);
  });

  it('keeps a weapon +N bright for a martial', () => {
    expect(enhancementRelevanceFor('weapon', fighter).relevant).toBe(true);
  });

  it('never dims an armour +N (AC) for either camp', () => {
    expect(enhancementRelevanceFor('armor', wizard).relevant).toBe(true);
    expect(enhancementRelevanceFor('armor', fighter).relevant).toBe(true);
  });
});
