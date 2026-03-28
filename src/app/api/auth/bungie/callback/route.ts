/**
 * GET /api/auth/bungie/callback
 *
 * Bungie redirects here after the user authorizes. We exchange the `code`
 * for an access token and membership info, then redirect to the home page
 * with the token embedded in the hash fragment (never in a cookie / URL param).
 *
 * Required env vars:
 *   BUNGIE_CLIENT_ID      — your app's client ID
 *   BUNGIE_CLIENT_SECRET  — your app's client secret
 *   BUNGIE_API_KEY        — your app's X-API-Key header value
 */
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_URL = 'https://www.bungie.net/platform/app/oauth/token/';

function getPublicOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code param' }, { status: 400 });
  }

  const clientId     = process.env.BUNGIE_CLIENT_ID;
  const clientSecret = process.env.BUNGIE_CLIENT_SECRET;
  const apiKey       = process.env.BUNGIE_API_KEY;

  if (!clientId || !clientSecret || !apiKey) {
    return NextResponse.json({ error: 'OAuth env vars not configured' }, { status: 500 });
  }

  const origin      = getPublicOrigin(req);
  const redirectUri = `${origin}/api/auth/bungie/callback`;

  // Exchange code for token
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    client_id:     clientId,
    client_secret: clientSecret,
    redirect_uri:  redirectUri,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': apiKey },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: 'Token exchange failed', detail: text }, { status: 502 });
  }

  const token = await tokenRes.json();
  // token shape: { access_token, refresh_token, membership_id, token_type, expires_in }

  // Redirect home — pass minimal auth info as a hash fragment so it's never logged
  const fragment = encodeURIComponent(JSON.stringify({
    accessToken: token.access_token,
    membershipId: token.membership_id,
    expiresIn: token.expires_in,
  }));

  return NextResponse.redirect(`${origin}/#vault=${fragment}`);
}
