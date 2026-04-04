/**
 * Minimal Cloudflare Worker entry point.
 *
 * The entire site is a static Next.js export (output: 'export').
 * All files live in the ASSETS binding (wrangler.toml [assets] directory = "./out").
 * This Worker simply forwards every request to the asset store — no server logic.
 *
 * Having an explicit `main` prevents Wrangler from trying to auto-configure
 * the Next.js adapter, which would fail on Next.js < 14.2.35.
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
