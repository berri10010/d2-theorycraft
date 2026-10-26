import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadCardImage, loadCardImages, type RollCardData } from './rollCard';

// CODE_REVIEW A: one hung image request kept the roll card on "Drawing the card..." for ever.
describe('roll card image loading gives up on a hung request (CODE_REVIEW A)', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('resolves null after about 8 seconds and aborts the request', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => { signal = init?.signal ?? undefined; return new Promise(() => {}); }); // never settles
    let result: unknown = 'pending';
    void loadCardImage('https://example.test/a.png').then((r) => { result = r; });

    await vi.advanceTimersByTimeAsync(7_900);
    expect(result).toBe('pending');
    await vi.advanceTimersByTimeAsync(200);
    expect(result).toBeNull();
    expect(signal?.aborted).toBe(true);
  });

  it('still returns null at once for a missing url, and for an error response', async () => {
    expect(await loadCardImage(null)).toBeNull();
    vi.stubGlobal('fetch', async () => ({ ok: false }));
    expect(await loadCardImage('https://example.test/missing.png')).toBeNull();
  });

  it('loadCardImages finishes even when every image hangs', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const data = {
      imageUrl: 'https://example.test/hero.png', iconUrl: 'https://example.test/icon.png', intrinsic: { iconUrl: 'https://example.test/i.png' },
      columns: [{ perks: [{ iconUrl: 'https://example.test/p1.png' }, { iconUrl: 'https://example.test/p2.png' }] }],
    } as unknown as RollCardData;
    let done = false;
    void loadCardImages(data).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(8_100);
    expect(done).toBe(true);
  });
});
