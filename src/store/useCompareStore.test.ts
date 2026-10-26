import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore, MAX_SNAPSHOTS } from './useCompareStore';
import type { CompareSnapshot, Weapon } from '../types/weapon';

// CODE_REVIEW C / BUG_REPORT_2 N5: snapshots (about 24 KB each) piled up until localStorage was full.
const snap = (n: number) => ({
  label: `Snapshot ${n}`, weapon: { hash: String(n) } as Weapon, calculatedStats: {}, selectedPerks: {}, ttk: null, mode: 'pve', multiplier: 1,
}) as Omit<CompareSnapshot, 'id'>;

describe('compare snapshots are capped', () => {
  beforeEach(() => useCompareStore.getState().clearSnapshots());

  it('keeps the newest snapshots and drops the oldest past the cap', () => {
    const { addSnapshot } = useCompareStore.getState();
    for (let i = 1; i <= MAX_SNAPSHOTS + 3; i++) addSnapshot(snap(i));
    const labels = useCompareStore.getState().snapshots.map((s) => s.label);
    expect(labels).toHaveLength(MAX_SNAPSHOTS);
    expect(labels[0]).toBe('Snapshot 4');
    expect(labels[labels.length - 1]).toBe(`Snapshot ${MAX_SNAPSHOTS + 3}`);
  });

  it('adds normally below the cap, with unique ids', () => {
    const { addSnapshot } = useCompareStore.getState();
    addSnapshot(snap(1)); addSnapshot(snap(1));
    const { snapshots } = useCompareStore.getState();
    expect(snapshots).toHaveLength(2);
    expect(new Set(snapshots.map((s) => s.id)).size).toBe(2);
  });
});
