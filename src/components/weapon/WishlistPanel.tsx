'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { useWeaponStore } from '../../store/useWeaponStore';
import { SavedRollScore } from './RollVsMeta';
import { useWeaponDb } from '../../store/useWeaponDb';
import { groupWeapons } from '../../lib/weaponGroups';
import { perkNamesFromHashes, perkSelectionFromHashes } from '../../lib/rollHelpers';
import { type PersonalRoll, parsePersonalRolls } from '../../lib/personalRolls';
import {
  WishlistDb,
  parseWishlist,
  isWishlistMatch,
  exportPersonalWishlist,
} from '../../lib/wishlistParser';

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_WISHLIST_KEY    = 'd2tc_wishlist_raw';
const LS_PERSONAL_KEY   = 'd2tc_personal_rolls';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Hook: persisted wishlist state ──────────────────────────────────────────

function useWishlist() {
  const [wishlistDb, setWishlistDb]     = useState<WishlistDb | null>(null);
  const [wishlistName, setWishlistName] = useState<string>('');
  const [entryCount, setEntryCount]     = useState(0);
  const [isLoading, setIsLoading]       = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WISHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { name: string; text: string };
        const db = parseWishlist(parsed.text);
        setWishlistDb(db);
        setWishlistName(parsed.name);
        setEntryCount(Array.from(db.values()).reduce((n, arr) => n + arr.length, 0));
      }
    } catch { /* ignore */ }
  }, []);

  const loadFile = useCallback((file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const db = parseWishlist(text);
      const count = Array.from(db.values()).reduce((n, arr) => n + arr.length, 0);
      setWishlistDb(db);
      setWishlistName(file.name);
      setEntryCount(count);
      setIsLoading(false);
      try {
        localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify({ name: file.name, text }));
      } catch { /* ignore */ }
    };
    reader.onerror = () => {
      console.error('WishlistPanel: Failed to read file', file.name);
      setWishlistName('');
      setEntryCount(0);
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const clear = useCallback(() => {
    setWishlistDb(null);
    setWishlistName('');
    setEntryCount(0);
    localStorage.removeItem(LS_WISHLIST_KEY);
  }, []);

  return { wishlistDb, wishlistName, entryCount, isLoading, loadFile, clear };
}

/** Saving is best-effort: with storage full or blocked the list still works for this visit. */
function persistRolls(next: PersonalRoll[]) {
  try { localStorage.setItem(LS_PERSONAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

function usePersonalRolls() {
  const [rolls, setRolls] = useState<PersonalRoll[]>([]);

  useEffect(() => {
    try {
      setRolls(parsePersonalRolls(localStorage.getItem(LS_PERSONAL_KEY)));
    } catch { /* storage blocked: start with no saved rolls */ }
  }, []);

  /** Sort-stable equality so perk selection order doesn't matter */
  const hashesEqual = (a: string[], b: string[]) =>
    [...a].sort().join('\0') === [...b].sort().join('\0');

  const save = useCallback((roll: PersonalRoll) => {
    setRolls((prev) => {
      const next = [
        roll,
        ...prev.filter((r) => !(r.weaponHash === roll.weaponHash && hashesEqual(r.perkHashes, roll.perkHashes))),
      ];
      persistRolls(next);
      return next;
    });
  }, []);

  const remove = useCallback((weaponHash: string, perkHashes: string[]) => {
    setRolls((prev) => {
      const next = prev.filter(
        (r) => !(r.weaponHash === weaponHash && hashesEqual(r.perkHashes, perkHashes))
      );
      persistRolls(next);
      return next;
    });
  }, []);

  const exportFile = useCallback((rolls: PersonalRoll[]) => {
    const content = exportPersonalWishlist(rolls);
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personal-god-rolls.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { rolls, save, remove, exportFile };
}

// ─── WishlistPanel ─────────────────────────────────────────────────────────────

const ROLLS_PREVIEW = 4; // number of personal rolls shown before "show all"

export const WishlistPanel: React.FC = () => {
  const { activeWeapon, selectedPerks, loadWeapon, selectPerk } = useWeaponStore();
  const mode = useWeaponStore((s) => s.mode);
  const { weapons } = useWeaponDb();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllRolls, setShowAllRolls] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { wishlistDb, wishlistName, entryCount, isLoading, loadFile, clear } = useWishlist();
  const { rolls, save: saveRoll, remove: removeRoll, exportFile } = usePersonalRolls();

  if (!activeWeapon) return null;

  /** Open a saved roll in the editor: switch weapon, then re-select its perks. */
  const loadSavedRoll = (roll: PersonalRoll) => {
    const target = weapons.find((w) => w.hash === roll.weaponHash);
    if (!target) return;
    const group = groupWeapons(weapons).find((g) => g.variants.some((v) => v.hash === target.hash));
    loadWeapon(target, group?.variants);
    for (const { column, hash } of perkSelectionFromHashes(target, roll.perkHashes)) selectPerk(column, hash);
  };

  // Selected perk hashes (base + enhanced)
  const selectedHashes = Object.values(selectedPerks);
  const hasSelection = selectedHashes.length > 0;

  // Community wishlist match
  const isMatch = wishlistDb
    ? isWishlistMatch(wishlistDb, activeWeapon.hash, selectedHashes)
    : false;

  // Personal god roll match for current roll
  const isPersonal = rolls.some(
    (r) =>
      r.weaponHash === activeWeapon.hash &&
      JSON.stringify([...r.perkHashes].sort()) === JSON.stringify([...selectedHashes].sort())
  );

  const handleMarkPersonal = () => {
    if (!hasSelection) return;
    if (isPersonal) {
      removeRoll(activeWeapon.hash, selectedHashes);
    } else {
      saveRoll({
        weaponHash: activeWeapon.hash,
        weaponName: activeWeapon.name,
        perkHashes: selectedHashes,
        savedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <CollapsiblePanel
      defaultOpen={false}
      storageKey="wishlist"
      className={
        isMatch    ? 'border-yellow-500/60 shadow-[0_0_24px_rgba(234,179,8,0.2)]' :
        isPersonal ? 'border-cyan-500/50 shadow-[0_0_24px_rgba(6,182,212,0.15)]' :
                     'border-white/10'
      }
      title={
        <span className="flex items-center gap-2 flex-wrap">
          Wishlists &amp; Saved Rolls
          {isMatch && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
              ★ Wishlist Match
            </span>
          )}
          {isPersonal && !isMatch && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              ★ Personal Roll
            </span>
          )}
        </span>
      }
      headerRight={
        <button
          onClick={handleMarkPersonal}
          disabled={!hasSelection}
          title={isPersonal ? 'Remove personal god roll' : 'Mark as personal god roll'}
          className={[
            'text-xs font-bold px-3 py-2.5 md:py-1.5 rounded-lg border transition-all',
            isPersonal
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40'
              : 'bg-white/5 text-ink-3 border-white/10 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30',
            !hasSelection ? 'opacity-40 pointer-events-none' : '',
          ].join(' ')}
        >
          {isPersonal ? <><span aria-hidden="true">★ </span>Saved</> : <><span aria-hidden="true">☆ </span>Save Roll</>}
        </button>
      }
    >

      {/* Community wishlist section */}
      <div className="space-y-3">
        <div>
          <p className="text-2xs font-bold text-ink-4 uppercase tracking-widest mb-2">Community Wishlist</p>

          {wishlistDb ? (
            <div className="flex items-center justify-between bg-black/30 rounded-lg border border-white/8 px-3 py-2">
              <div>
                <p className="text-xs text-ink-2 font-medium truncate max-w-[160px]">{wishlistName}</p>
                <p className="text-2xs text-ink-4">{entryCount.toLocaleString()} entries</p>
              </div>
              <button
                onClick={clear}
                className="text-2xs text-ink-4 hover:text-red-400 transition-colors font-bold"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) loadFile(file);
              }}
              className={[
                'w-full border border-dashed rounded-lg py-3 text-center text-xs transition-all disabled:opacity-50 disabled:cursor-wait',
                dragging
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.15)]'
                  : 'border-white/15 text-ink-4 hover:text-ink-2 hover:border-white/30',
              ].join(' ')}
            >
              {isLoading ? 'Parsing…' : dragging ? 'Drop to import…' : 'Drop a DIM wishlist (.txt) here, or click to browse'}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
          />

          {/* Match callout */}
          {wishlistDb && hasSelection && (
            <p className={[
              'text-2xs mt-2 text-center font-bold',
              isMatch ? 'text-yellow-400' : 'text-ink-4',
            ].join(' ')}>
              {isMatch
                ? '★ Your selected roll matches a community wishlist entry!'
                : 'Current roll not on wishlist.'}
            </p>
          )}
        </div>

        {/* Personal god rolls */}
        {rolls.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-2xs font-bold text-ink-4 uppercase tracking-widest">Saved Rolls</p>
              <button
                onClick={() => exportFile(rolls)}
                className="text-2xs font-bold text-ink-4 hover:text-amber-400 transition-colors"
              >
                Export ↓
              </button>
            </div>
            <div className="space-y-1.5">
              {(showAllRolls ? rolls : rolls.slice(0, ROLLS_PREVIEW)).map((roll) => {
                const target = weapons.find((w) => w.hash === roll.weaponHash);
                const names  = target ? perkNamesFromHashes(target, roll.perkHashes) : [];
                const isCurrent = roll.weaponHash === activeWeapon.hash &&
                  JSON.stringify([...roll.perkHashes].sort()) === JSON.stringify([...selectedHashes].sort());
                return (
                  <div
                    key={`${roll.weaponHash}-${roll.perkHashes.join('-')}`}
                    className={[
                      'flex items-stretch bg-black/30 rounded-lg border',
                      isCurrent ? 'border-cyan-500/40' : 'border-white/8',
                    ].join(' ')}
                  >
                    <button
                      onClick={() => loadSavedRoll(roll)}
                      disabled={!target}
                      title={target ? 'Load this roll in the editor' : 'Weapon no longer in the database'}
                      className="flex-1 min-w-0 text-left px-3 py-2 md:py-1.5 active:bg-white/5 hover:bg-white/5 rounded-l-lg disabled:opacity-50"
                    >
                      <p className="text-xs text-ink font-medium truncate">{roll.weaponName}</p>
                      <p className="text-2xs text-ink-4 truncate">
                        {names.length ? names.join(' · ') : `${roll.perkHashes.length} perks`}
                      </p>
                      <p className="text-2xs text-ink-4 flex items-center gap-1.5">
                        {new Date(roll.savedAt).toLocaleDateString()}
                        <SavedRollScore weapon={target ?? null} hashes={roll.perkHashes} mode={mode} />
                      </p>
                    </button>
                    <button
                      onClick={() => removeRoll(roll.weaponHash, roll.perkHashes)}
                      aria-label={`Delete saved roll for ${roll.weaponName}`}
                      className="shrink-0 w-11 md:w-9 text-ink-4 hover:text-red-400 active:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {rolls.length > ROLLS_PREVIEW && (
                <button
                  onClick={() => setShowAllRolls((v) => !v)}
                  className="w-full text-center text-xs md:text-2xs font-semibold text-ink-4 hover:text-ink-2 transition-colors py-2.5 md:py-2"
                >
                  {showAllRolls ? 'Show fewer' : `Show all ${rolls.length} rolls →`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
};
