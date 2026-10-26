import { describe, it, expect } from 'vitest';
import { isTypingTarget } from './useKeyboardShortcuts';

const el = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable }) as unknown as HTMLElement;

describe('isTypingTarget (finding 9)', () => {
  it('treats text fields and contenteditable as typing', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('DIV', true))).toBe(true);
  });
  it('treats a select as typing so type-ahead does not trigger shortcuts', () => {
    expect(isTypingTarget(el('SELECT'))).toBe(true);
  });
  it('lets shortcuts through from everything else', () => {
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(el('BODY'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
