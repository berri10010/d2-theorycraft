/**
 * Cloudflare Worker entry point.
 *
 * The site is a static Next.js export (output: 'export') in the ASSETS binding (wrangler.toml [assets] directory =
 * "./out"). Almost every request is forwarded straight to it. The exception is a shared roll link,
 * /editor?w=<weapon>&p=...: chat apps and social sites read its Open Graph tags without running JavaScript, so the
 * worker rewrites the page head with the weapon's name, the roll and its picture (src/lib/sharePreview.ts), using the
 * tiny per-weapon file written to out/share/ at build time. Anything unexpected falls back to the plain page.
 *
 * Having an explicit `main` also prevents Wrangler from trying to auto-configure the Next.js adapter, which would
 * fail on Next.js < 14.2.35.
 */
import { buildPreview, previewMetaTags, weaponHashParam, type ShareRecord } from './src/lib/sharePreview';

// The slice of the Workers runtime this file uses (the DOM lib the project compiles against has no HTMLRewriter).
interface RewriterElement {
  setInnerContent(content: string): void;
  setAttribute(name: string, value: string): void;
  append(content: string, options?: { html?: boolean }): void;
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element(el: RewriterElement): void }): HTMLRewriter;
  transform(response: Response): Response;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

async function withPreview(request: Request, env: Env): Promise<Response> {
  const page = await env.ASSETS.fetch(request);
  try {
    const url = new URL(request.url);
    const hash = weaponHashParam(url.searchParams);
    const contentType = page.headers.get('content-type') ?? '';
    if (request.method !== 'GET' || !hash || !page.ok || !contentType.includes('text/html')) return page;

    const recordResponse = await env.ASSETS.fetch(new Request(new URL(`/share/${hash}.json`, url).toString()));
    if (!recordResponse.ok) return page;
    const preview = buildPreview((await recordResponse.json()) as ShareRecord, url.searchParams);
    const canonical = `${url.origin}${url.pathname}${url.search}`;

    const rewritten = new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(preview.title); } })
      .on('meta[name="description"]', { element(el) { el.setAttribute('content', preview.description); } })
      .on('head', { element(el) { el.append(previewMetaTags(preview, canonical), { html: true }); } })
      .transform(page);

    // The page differs per link, so let the CDN keep it briefly but not forever (previews are re-fetched by crawlers).
    const headers = new Headers(rewritten.headers);
    headers.set('cache-control', 'public, max-age=300');
    return new Response(rewritten.body, { status: rewritten.status, headers });
  } catch {
    return page;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/editor' || pathname === '/editor/') return withPreview(request, env);
    return env.ASSETS.fetch(request);
  },
};
