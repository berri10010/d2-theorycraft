import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

// BUG_REPORT_2 N7: one stalled connection hung the daily data refresh until its 20-minute limit.
describe('fetchWithTimeout (BUG_REPORT_2 N7)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('aborts a request that never answers', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
    }));
    await expect(fetchWithTimeout('https://example.test/slow', {}, 30)).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('passes the response and the other options through when the request is quick', async () => {
    let seen: RequestInit | undefined;
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => { seen = init; return { ok: true, status: 200 }; });
    const res = await fetchWithTimeout('https://example.test/fast', { headers: { 'X-API-Key': 'k' } }, 1000);
    expect(res.ok).toBe(true);
    expect(seen?.headers).toEqual({ 'X-API-Key': 'k' });
    expect(seen?.signal).toBeDefined();
  });
});
