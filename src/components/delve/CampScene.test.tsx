import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CampScene } from './CampScene';

/** Render a CampScene for one chapter and read back its in-world aria-label. */
function labelFor(chapter: number | undefined): string {
  const { container, unmount } = render(<CampScene chapter={chapter} />);
  const label = container.querySelector('svg[role="img"]')?.getAttribute('aria-label') ?? '';
  unmount();
  return label;
}

const CHAPTERS = Array.from({ length: 14 }, (_, i) => i + 1);

describe('CampScene — a region-appropriate scene for every chapter', () => {
  it('renders a non-empty in-world aria-label for every chapter 1–14', () => {
    for (const ch of CHAPTERS) {
      expect(labelFor(ch), `chapter ${ch}`).not.toBe('');
    }
  });

  it('no chapter 6–14 falls back to the chapter-1 roadside scene', () => {
    const roadside = labelFor(1);
    for (const ch of CHAPTERS.filter((c) => c >= 6)) {
      expect(labelFor(ch), `chapter ${ch} must not reuse the roadside fallback`).not.toBe(roadside);
    }
  });

  it('gives every chapter 1–14 a distinct scene', () => {
    const labels = CHAPTERS.map(labelFor);
    expect(new Set(labels).size).toBe(CHAPTERS.length);
  });

  it('still renders a scene for an unknown or absent chapter', () => {
    expect(labelFor(undefined)).not.toBe('');
    expect(labelFor(99)).not.toBe('');
  });
});
