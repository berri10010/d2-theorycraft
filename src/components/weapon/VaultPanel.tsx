'use client';

import React, { useEffect, useRef } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useVaultStore } from '../../store/useVaultStore';
import { useWeaponDb } from '../../store/useWeaponDb';

// ─── Hash-fragment reader ─────────────────────────────────────────────────────

/**
 * After Bungie OAuth redirects back to /#vault=<encoded>, this hook parses
 * the fragment, hydrates the store, and clears the hash from the URL.
 */
function useOAuthHashReader() {
  const setCredentials = useVaultStore((s) => s.setCredentials);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#vault=')) return;

    handledRef.current = true;
    try {
      const raw = decodeURIComponent(hash.slice('#vault='.length));
      const parsed = JSON.parse(raw) as {
        accessToken: string;
        membershipId: string;
        expiresIn: number;
      };
      setCredentials({
        accessToken: parsed.accessToken,
        membershipId: parsed.membershipId,
        membershipType: 0, // will be resolved during syncVault
      });
    } catch {
      // Malformed hash — ignore silently
    }
    // Clear the hash from the URL bar so it's not bookmarked or shared
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [setCredentials]);
}

/**
 * Restores credentials from sessionStorage on page load (persisted after first sync).
 */
function useSessionRestore() {
  const { credentials, setCredentials } = useVaultStore();

  useEffect(() => {
    if (credentials) return; // already loaded
    const raw = sessionStorage.getItem('d2tc_vault_creds');
    if (!raw) return;
    try {
      const creds = JSON.parse(raw);
      if (creds?.accessToken && creds?.membershipId) {
        setCredentials(creds);
      }
    } catch {
      sessionStorage.removeItem('d2tc_vault_creds');
    }
  }, [credentials, setCredentials]);
}

// ─── Vault badge (shows on weapon name when in vault) ─────────────────────────

export function VaultBadge({ weaponHash }: { weaponHash: string }) {
  const inVault = useVaultStore((s) => s.vaultHashes.has(weaponHash));
  if (!inVault) return null;
  return (
    <span
      title="This weapon is in your vault"
      className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded"
    >
      VAULT
    </span>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const VaultPanel: React.FC = () => {
  useOAuthHashReader();
  useSessionRestore();

  const { credentials, vaultHashes, isSyncing, error, lastSyncedAt, syncVault, clearCredentials } =
    useVaultStore();
  const { activeWeapon } = useWeaponStore();
  const { weapons } = useWeaponDb();

  // Vault weapons that match the manifest (mapped to their names)
  const vaultWeaponNames = React.useMemo(() => {
    if (!weapons?.length || !vaultHashes.size) return [];
    return weapons
      .filter((w) => vaultHashes.has(w.hash))
      .map((w) => w.name)
      .sort();
  }, [weapons, vaultHashes]);

  const activeInVault = activeWeapon ? vaultHashes.has(activeWeapon.hash) : false;

  const syncAge = lastSyncedAt
    ? Math.round((Date.now() - lastSyncedAt) / 1000 / 60)
    : null;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Vault Sync</h2>
        {credentials && (
          <button
            onClick={clearCredentials}
            className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>

      {!credentials ? (
        /* ── Not signed in ── */
        <div className="space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Connect your Bungie.net account to see which weapons from the database
            you already own in your vault.
          </p>
          <p className="text-[10px] text-amber-500/80 bg-amber-500/5 border border-amber-500/15 rounded px-2 py-1.5 leading-snug">
            Clicking below will navigate to Bungie.net to authorize — you&rsquo;ll be redirected back automatically.
          </p>
          <a
            href="/api/auth/bungie"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors text-white text-sm font-semibold"
          >
            <BungieIcon />
            Sign in with Bungie.net ↗
          </a>
          <p className="text-[9px] text-slate-600 leading-relaxed">
            Read-only access · no write permissions requested ·
            token stored only in this browser tab
          </p>
        </div>
      ) : (
        /* ── Signed in ── */
        <div className="space-y-4">
          {/* Sync status */}
          <div className="flex items-center gap-3">
            <button
              onClick={syncVault}
              disabled={isSyncing}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 disabled:text-slate-600 transition-colors"
            >
              {isSyncing ? 'Syncing…' : 'Refresh vault'}
            </button>
            {syncAge !== null && (
              <span className="text-[10px] text-slate-600">
                Last synced {syncAge === 0 ? 'just now' : `${syncAge}m ago`}
              </span>
            )}
          </div>

          {error && (
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Active weapon indicator */}
          {activeWeapon && (
            <div className={[
              'px-3 py-2 rounded-lg border text-[11px] font-medium',
              activeInVault
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                : 'bg-white/3 border-white/8 text-slate-500',
            ].join(' ')}>
              {activeInVault
                ? `✓ ${activeWeapon.name} is in your vault`
                : `${activeWeapon.name} is not in your vault`}
            </div>
          )}

          {/* Vault weapon count */}
          {vaultHashes.size > 0 && (
            <p className="text-[11px] text-slate-400">
              {vaultWeaponNames.length} recognized weapons in vault
              {vaultHashes.size !== vaultWeaponNames.length &&
                ` (${vaultHashes.size - vaultWeaponNames.length} not in current manifest)`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Bungie logo icon (SVG inline, simplified)
function BungieIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 110 16A8 8 0 0112 4zm-1 3v5.586L8.707 10.29 7.293 11.707 12 16.414l4.707-4.707-1.414-1.414L13 12.586V7h-2z" />
    </svg>
  );
}
