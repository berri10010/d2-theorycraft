/**
 * Vault sync state — stores Bungie OAuth credentials and the fetched vault
 * item hashes in memory (sessionStorage for tab persistence).
 */
import { create } from 'zustand';

interface VaultCredentials {
  accessToken: string;
  membershipId: string;
  membershipType: number; // usually 3 (Steam) or 1 (Xbox) etc — we'll resolve via /User/GetMembershipsForCurrentUser
}

interface VaultState {
  credentials: VaultCredentials | null;
  vaultHashes: Set<string>;    // weapon hashes found in vault
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: number | null; // epoch ms

  /** Called by the hash-fragment reader in VaultPanel when OAuth completes */
  setCredentials: (creds: VaultCredentials) => void;
  clearCredentials: () => void;

  /** Fetch vault item hashes from the server proxy */
  syncVault: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  credentials: null,
  vaultHashes: new Set(),
  isSyncing: false,
  error: null,
  lastSyncedAt: null,

  setCredentials: (creds) => {
    set({ credentials: creds, error: null });
    // Auto-sync immediately after login
    get().syncVault();
  },

  clearCredentials: () => {
    set({ credentials: null, vaultHashes: new Set(), error: null, lastSyncedAt: null });
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('d2tc_vault_creds');
    }
  },

  syncVault: async () => {
    const { credentials } = get();
    if (!credentials) {
      set({ error: 'Not signed in' });
      return;
    }

    set({ isSyncing: true, error: null });

    try {
      // First resolve membership type if we don't have it
      let { membershipType } = credentials;
      if (!membershipType) {
        const membRes = await fetch(
          'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/',
          { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
        );
        if (membRes.ok) {
          const membData = await membRes.json();
          const primary = membData?.Response?.primaryMembershipId;
          const memberships: { membershipType: number; membershipId: string }[] =
            membData?.Response?.destinyMemberships ?? [];
          const match = memberships.find((m) => m.membershipId === primary) ?? memberships[0];
          if (match) membershipType = match.membershipType;
        }
      }

      const params = new URLSearchParams({
        membershipType: String(membershipType),
        membershipId: credentials.membershipId,
      });

      const vaultRes = await fetch(`/api/vault?${params.toString()}`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!vaultRes.ok) {
        throw new Error(`Vault API error: ${vaultRes.status}`);
      }

      const { itemHashes }: { itemHashes: string[] } = await vaultRes.json();
      set({
        vaultHashes: new Set(itemHashes),
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
      });

      // Persist to sessionStorage so page refresh doesn't require re-login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('d2tc_vault_creds', JSON.stringify(credentials));
      }
    } catch (err) {
      set({
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  },
}));
