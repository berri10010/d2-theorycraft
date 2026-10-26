import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizePersistedWeaponState } from './persistedState';
import { BUFF_DATABASE } from './buffDatabase';
import { getPlDeltaMultiplier } from './plDelta';

const realBuff = Object.keys(BUFF_DATABASE)[0];

describe('sanitizePersistedWeaponState (finding 17)', () => {
  it('keeps a healthy saved state as it is', () => {
    const saved = {
      activeWeaponHash: '123', mode: 'pvp', weaponsStat: 80, enemyTier: 'Boss', powerDelta: -10, difficulty: 'master',
      surgeStacks: 2, activeBuffs: [realBuff], buffStacks: { [realBuff]: 1 }, weaponRolls: {},
    };
    expect(sanitizePersistedWeaponState(saved)).toEqual(saved);
  });

  it('drops values that are the wrong type or not allowed, so the defaults apply', () => {
    const out = sanitizePersistedWeaponState({
      mode: 'coop', weaponsStat: null, enemyTier: 'Bogus', powerDelta: 'x', difficulty: 'nightmare', surgeStacks: 9.5,
      activeWeaponHash: 12, weaponRolls: 'oops',
    });
    expect(out).toEqual({ surgeStacks: 4 });
  });

  it('clamps numbers into range', () => {
    expect(sanitizePersistedWeaponState({ weaponsStat: 999, powerDelta: -99, surgeStacks: -3 })).toEqual({ weaponsStat: 200, powerDelta: -50, surgeStacks: 0 });
  });

  it('keeps only known buffs and finite stack levels', () => {
    const out = sanitizePersistedWeaponState({ activeBuffs: [realBuff, 'nope', 5], buffStacks: { [realBuff]: 2, nope: 1, other: 'x' } });
    expect(out.activeBuffs).toEqual([realBuff]);
    expect(out.buffStacks).toEqual({ [realBuff]: 2 });
  });

  it('copes with a missing or non-object saved state', () => {
    expect(sanitizePersistedWeaponState(undefined)).toEqual({});
    expect(sanitizePersistedWeaponState('text')).toEqual({});
    expect(sanitizePersistedWeaponState(null)).toEqual({});
  });
});

describe('an unknown difficulty cannot reach the curve lookup (finding 17)', () => {
  it('the sanitised state never carries one', () => {
    const { difficulty } = sanitizePersistedWeaponState({ difficulty: 'nightmare' });
    expect(difficulty).toBeUndefined();
    expect(() => getPlDeltaMultiplier(-10, (difficulty ?? 'standard') as 'standard')).not.toThrow();
  });
});

describe('loading the weapon store from bad saved state (finding 17)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('falls back to the defaults for what is unusable and keeps the rest', async () => {
    const bad = { state: { difficulty: 'nightmare', enemyTier: 'Bogus', weaponsStat: null, mode: 'pvp', activeBuffs: ['nope'] }, version: 0 };
    const memory: Record<string, string> = { 'd2tc-weapon': JSON.stringify(bad) };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memory[k] ?? null,
      setItem: (k: string, v: string) => { memory[k] = v; },
      removeItem: (k: string) => { delete memory[k]; },
    });
    vi.resetModules();
    const { useWeaponStore } = await import('../store/useWeaponStore'); // created fresh, so it reads the stubbed storage
    const s = useWeaponStore.getState();
    expect([s.difficulty, s.enemyTier, s.weaponsStat, s.mode, s.activeBuffs]).toEqual(['standard', 'Major / Elite', 0, 'pvp', []]);
  });
});
