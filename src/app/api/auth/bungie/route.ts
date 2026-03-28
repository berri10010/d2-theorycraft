/**
 * GET /api/auth/bungie
 *
 * Redirects the browser to Bungie's OAuth authorization URL.
 * Client ID is read from the BUNGIE_CLIENT_ID env var.
 * The redirect_uri must be registered in your Bungie app settings at
 * https://www.bungie.net/en/Application
 */
import { NextRequest, NextResponse } from 'next/server';

/** Resolve the canonical public origin for OAuth redirect URIs.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL   — set this explicitly in production (.env / hosting dashboard)
 *  2. VERCEL_URL            — auto-set by Vercel to the deployment domain (no protocol)
 *  3. req.nextUrl.origin    — works on localhost; unreliable behind proxies in prod
 */
function getPublicOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return req.nextUrl.origin;
}

export function GET(req: NextRequest) {
  const clientId = process.env.BUNGIE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'BUNGIE_CLIENT_ID not configured' }, { status: 500 });
  }

  const origin = getPublicOrigin(req);
  const redirectUri = `${origin}/api/auth/bungie/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: crypto.randomUUID(), // CSRF protection (not persisted — stateless preview)
  });

  const authUrl = `https://www.bungie.net/en/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
