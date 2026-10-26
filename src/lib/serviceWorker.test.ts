import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');

/** Runs public/sw.js against fake cache and network, and returns what a data-file fetch would answer with. */
async function fetchData(opts: { network: () => Promise<Response>; cached?: Response }) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const puts: Response[] = [];
  const caches = {
    open: async () => ({ put: async (_req: unknown, res: Response) => { puts.push(res); } }),
    match: async () => opts.cached,
    keys: async () => [],
    delete: async () => true,
  };
  const self = { addEventListener: (type: string, h: (e: unknown) => void) => { handlers[type] = h; }, location: { origin: 'http://site' }, skipWaiting() {}, clients: { claim() {} } };
  vm.runInNewContext(SOURCE, { self, caches, fetch: opts.network, URL, Response, Promise });

  let answer: Promise<Response> | undefined;
  handlers.fetch({ request: { url: 'http://site/data/weapons.json' }, respondWith: (p: Promise<Response>) => { answer = p; } });
  const response = await answer!; // respondWith must be given a promise of a Response, never undefined
  await new Promise((r) => setTimeout(r, 0));
  return { response, puts };
}

describe('service worker data files (finding 14)', () => {
  it('caches a good response', async () => {
    const { response, puts } = await fetchData({ network: async () => new Response('ok', { status: 200 }) });
    expect(response.status).toBe(200);
    expect(puts).toHaveLength(1);
  });

  it('does not cache an error response, and serves the cached copy instead when there is one', async () => {
    const cached = new Response('old but good', { status: 200 });
    const { response, puts } = await fetchData({ network: async () => new Response('nope', { status: 500 }), cached });
    expect(puts).toHaveLength(0);
    expect(response).toBe(cached);
  });

  it('passes an error response through when there is nothing cached', async () => {
    const { response, puts } = await fetchData({ network: async () => new Response('missing', { status: 404 }) });
    expect(puts).toHaveLength(0);
    expect(response.status).toBe(404);
  });

  it('offline with nothing cached still answers with a Response instead of undefined', async () => {
    const { response } = await fetchData({ network: async () => { throw new TypeError('offline'); } });
    expect(response).toBeInstanceOf(Response);
  });

  it('offline with a cached copy serves it', async () => {
    const cached = new Response('cached', { status: 200 });
    const { response } = await fetchData({ network: async () => { throw new TypeError('offline'); }, cached });
    expect(response).toBe(cached);
  });
});
