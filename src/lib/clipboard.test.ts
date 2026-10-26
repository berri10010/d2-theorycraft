import { describe, it, expect, afterEach, vi } from 'vitest';
import { copyText } from './clipboard';

describe('copyText (finding 8)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes through the async clipboard API and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('reports failure instead of throwing when the clipboard is missing', async () => {
    vi.stubGlobal('navigator', {});
    expect(await copyText('hello')).toBe(false);
  });

  it('reports failure instead of throwing when the write is rejected', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Write permission denied')) } });
    expect(await copyText('hello')).toBe(false);
  });

  it('falls back to a hidden textarea and execCommand when the API is unavailable', async () => {
    const ta = { value: '', style: {} as Record<string, string>, setAttribute: vi.fn(), select: vi.fn(), remove: vi.fn() };
    const doc = { createElement: vi.fn().mockReturnValue(ta), body: { appendChild: vi.fn() }, execCommand: vi.fn().mockReturnValue(true) };
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', doc);
    expect(await copyText('hello')).toBe(true);
    expect(ta.value).toBe('hello');
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
    expect(ta.remove).toHaveBeenCalled();
  });
});
