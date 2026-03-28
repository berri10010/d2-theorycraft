/**
 * GET /api/vault?membershipType=<n>&membershipId=<id>
 *
 * Fetches the user's vault character inventories from the Bungie API.
 * Requires Authorization: Bearer <access_token> header from the client.
 *
 * Returns: { itemHashes: string[] }  — deduplicated list of vault weapon hashes
 */
import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://www.bungie.net/Platform';

export async function GET(req: NextRequest) {
  const apiKey  = process.env.BUNGIE_API_KEY;
  const auth    = req.headers.get('authorization');
  const mType   = req.nextUrl.searchParams.get('membershipType');
  const mId     = req.nextUrl.searchParams.get('membershipId');

  if (!apiKey || !auth || !mType || !mId) {
    return NextResponse.json({ error: 'Missing required headers or params' }, { status: 400 });
  }

  const components = '102'; // ProfileInventories (vault items)
  const url = `${BASE}/Destiny2/${mType}/Profile/${mId}/?components=${components}`;

  const profileRes = await fetch(url, {
    headers: { 'X-API-Key': apiKey, Authorization: auth },
  });

  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Bungie API error', status: profileRes.status }, { status: 502 });
  }

  const data = await profileRes.json();

  // Bungie response shape:
  // Response.profileInventory.data.items: Array<{ itemHash, bucketHash, ... }>
  // Vault bucket hash = 138197802
  const VAULT_BUCKET = 138197802;
  const items: { itemHash: number; bucketHash: number }[] =
    data?.Response?.profileInventory?.data?.items ?? [];

  const rawHashes = items
    .filter((i) => i.bucketHash === VAULT_BUCKET)
    .map((i) => String(i.itemHash));
  const weaponHashes = Array.from(new Set(rawHashes));

  return NextResponse.json({ itemHashes: weaponHashes });
}
