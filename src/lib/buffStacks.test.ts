import { describe, it, expect } from 'vitest';
import { BUFF_DATABASE, getBuffMultiplier } from './buffDatabase';

// BUG_REPORT_2 N3: Golden Tricorn's stacks are labelled x2 and x3 (no x1), so the first stack is at index 0.
describe('Golden Tricorn stack indexing (BUG_REPORT_2 N3)', () => {
  const buff = BUFF_DATABASE.golden_tricorn;

  it('indexes stacks by position, not by their count', () => {
    expect(getBuffMultiplier(buff, 0)).toBe(1.15); // x2: weapon kill
    expect(getBuffMultiplier(buff, 1)).toBe(1.5);  // x3: ability kill
  });
  it('defaults to the strongest stack and clamps out-of-range indexes', () => {
    expect(getBuffMultiplier(buff)).toBe(1.5);
    expect(getBuffMultiplier(buff, 9)).toBe(1.5);
    expect(getBuffMultiplier(buff, -3)).toBe(1.15);
  });
  it('is the only buff whose first stack count is not 1, and every stack has a label', () => {
    const odd = Object.entries(BUFF_DATABASE).filter(([, b]) => b.stacks?.length && b.stacks[0].count !== 1).map(([key]) => key);
    expect(odd).toEqual(['golden_tricorn']);
    expect(buff.stacks!.every((s) => s.label.length > 0)).toBe(true);
  });
});
