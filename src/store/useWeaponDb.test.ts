import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// CODE_REVIEW B: every editor mount refetched and re-unpacked all the weapon data.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'public', 'data', file), 'utf8');

function stubFetch(opts: { failFirst?: boolean } = {}) {
  let calls = 0;
  let failed = !opts.failFirst;
  vi.stubGlobal('fetch', async (url: string) => {
    calls++;
    if (!failed) { failed = true; return { ok: false, status: 500, json: async () => ({}) }; }
    const file = url.replace('/data/', '');
    return { ok: true, status: 200, json: async () => JSON.parse(read(file)) };
  });
  return () => calls;
}

async function freshStore() {
  vi.resetModules();
  return (await import('./useWeaponDb')).useWeaponDb;
}

describe('fetchWeapons loads the data once (CODE_REVIEW B)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('shares one load between calls made at the same time', async () => {
    const calls = stubFetch();
    const store = await freshStore();
    await Promise.all([store.getState().fetchWeapons(), store.getState().fetchWeapons()]);
    expect(calls()).toBe(4); // weapons, perks, mods, statgroups: once, not twice
    expect(store.getState().weapons.length).toBeGreaterThan(1000);
  });

  it('does not refetch, or flash the loading state, once weapons are loaded', async () => {
    const calls = stubFetch();
    const store = await freshStore();
    await store.getState().fetchWeapons();
    const states: boolean[] = [];
    const unsubscribe = store.subscribe((s) => states.push(s.isLoading));
    await store.getState().fetchWeapons();
    unsubscribe();
    expect(calls()).toBe(4);
    expect(states).not.toContain(true);
  });

  it('can be retried after a failed load', async () => {
    stubFetch({ failFirst: true });
    const store = await freshStore();
    await store.getState().fetchWeapons();
    expect(store.getState().error).toMatch(/HTTP 500/);
    await store.getState().fetchWeapons();
    expect(store.getState().error).toBeNull();
    expect(store.getState().weapons.length).toBeGreaterThan(1000);
  });
});
