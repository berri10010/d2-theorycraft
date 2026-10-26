import { describe, it, expect } from 'vitest';
import { intrinsicDescription, FRAME_FALLBACK } from './intrinsicText';
import type { ClarityDatabase } from './clarity';

const trait = (description: string) => ({ hash: '1', name: 'Adaptive Frame', description });

describe('intrinsicDescription', () => {
  it('prefers the manifest text', () => {
    expect(intrinsicDescription(trait('From the manifest'), null)).toBe('From the manifest');
  });
  it("falls back to Clarity's text, then to the hardcoded frame text", () => {
    const clarity = { '1': { descriptions: { en: [{ linesContent: [{ text: 'From ' }, { text: 'Clarity' }] }] } } } as unknown as ClarityDatabase;
    expect(intrinsicDescription(trait(''), clarity)).toBe('From Clarity');
    expect(intrinsicDescription(trait(''), null)).toBe(FRAME_FALLBACK['Adaptive Frame']);
  });
  it('is null for a trait nothing describes', () => {
    expect(intrinsicDescription({ hash: '9', name: 'Mystery', description: '' }, null)).toBeNull();
  });
});
