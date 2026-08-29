import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BadgeStyle = 'pill' | 'letter' | 'dot';
export type AppTheme  = 'dark' | 'light' | 'system';

export interface SiteSettings {
  // Appearance
  theme:             AppTheme;
  tierBadgeStyle:    BadgeStyle;
  // Defaults
  defaultMode:       'pve' | 'pvp';
  // Editing
  inAppTierEditing:  boolean;
  autoApplyGodRoll:  boolean;
  // Panels
  showGodRollPanel:  boolean;
  showWishlistPanel: boolean;
  showEffectsPanel:  boolean;
  showExternalBuffs: boolean;
  showSimilarWeapons: boolean;
  showWeaponData:    boolean;
  showTierListPanel: boolean;
}

interface SiteSettingsStore extends SiteSettings {
  setSetting: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
}

export const useSiteSettings = create<SiteSettingsStore>()(
  persist(
    (set) => ({
      theme:             'dark',
      tierBadgeStyle:    'pill',
      defaultMode:       'pve',
      inAppTierEditing:  false,
      autoApplyGodRoll:  false,
      showGodRollPanel:  true,
      showWishlistPanel: true,
      showEffectsPanel:  true,
      showExternalBuffs: true,
      showSimilarWeapons: true,
      showWeaponData:    true,
      showTierListPanel: true,

      setSetting: (key, value) => set({ [key]: value }),
    }),
    { name: 'site-settings', version: 2 }
  )
);
