'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
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

interface PersonalRoll {
  weaponHash: string;
  weaponName: string;
  perkHashes: string[];
  savedAt: string; // ISO date
}

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

function usePersonalRolls() {
  const [rolls, setRolls] = useState<PersonalRoll[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PERSONAL_KEY);
      if (raw) setRolls(JSON.parse(raw) as PersonalRoll[]);
    } catch { /* ignore */ }
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
      localStorage.setItem(LS_PERSONAL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((weaponHash: string, perkHashes: string[]) => {
    setRolls((prev) => {
      const next = prev.filter(
        (r) => !(r.weaponHash === weaponHash && hashesEqual(r.perkHashes, perkHashes))
      );
      localStorage.setItem(LS_PERSONAL_KEY, JSON.stringify(next));
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
  const { activeWeapon, selectedPerks } = useWeaponStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllRolls, setShowAllRolls] = useState(false);

  const { wishlistDb, wishlistName, entryCount, isLoading, loadFile, clear } = useWishlist();
  const { rolls, save: saveRoll, remove: removeRoll, exportFile } = usePersonalRolls();

  if (!activeWeapon) return null;

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
    <div className={[
      'bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border transition-all',
      isMatch    ? 'border-yellow-500/60 shadow-[0_0_24px_rgba(234,179,8,0.2)]' :
      isPersonal ? 'border-cyan-500/50 shadow-[0_0_24px_rgba(6,182,212,0.15)]' :
                   'border-white/10',
    ].join(' ')}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Wishlists
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
        </h2>

        {/* Personal roll toggle */}
        <button
          onClick={handleMarkPersonal}
          disabled={!hasSelection}
          title={isPersonal ? 'Remove personal god roll' : 'Mark as personal god roll'}
          className={[
            'text-xs font-bold px-3 py-1.5 rounded-lg border transition-all',
            isPersonal
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40'
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30',
            !hasSelection ? 'opacity-40 pointer-events-none' : '',
          ].join(' ')}
        >
          {isPersonal ? '★ Saved' : '☆ Mark as God Roll'}
        </button>
      </div>

      {/* Community wishlist section */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Community Wishlist</p>

          {wishlistDb ? (
            <div className="flex items-center justify-between bg-black/30 rounded-lg border border-white/8 px-3 py-2">
              <div>
                <p className="text-xs text-slate-300 font-medium truncate max-w-[160px]">{wishlistName}</p>
                <p className="text-[10px] text-slate-600">{entryCount.toLocaleString()} entries</p>
              </div>
              <button
                onClick={clear}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors font-bold"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full border border-dashed border-white/15 rounded-lg py-3 text-center text-xs text-slate-500 hover:text-slate-300 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoading ? 'Parsing…' : 'Drop a DIM wishlist (.txt) here, or click to browse'}
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
              'text-[10px] mt-2 text-center font-bold',
              isMatch ? 'text-yellow-400' : 'text-slate-600',
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">My God Rolls</p>
              <button
                onClick={() => exportFile(rolls)}
                className="text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-colors"
              >
                Export ↓
              </button>
            </div>
            <div className="space-y-1.5">
              {(showAllRolls ? rolls : rolls.slice(0, ROLLS_PREVIEW)).map((roll) => (
                <div
                  key={`${roll.weaponHash}-${roll.perkHashes.join('-')}`}
                  className="flex items-center justify-between bg-black/30 rounded-lg border border-white/8 px-3 py-1.5 gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-300 font-medium truncate">{roll.weaponName}</p>
                    <p className="text-[9px] text-slate-600">{roll.perkHashes.length} perks · {new Date(roll.savedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => removeRoll(roll.weaponHash, roll.perkHashes)}
                    className="text-[10px] text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              {rolls.length > ROLLS_PREVIEW && (
                <button
                  onClick={() => setShowAllRolls((v) => !v)}
                  className="w-full text-center text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors pt-1"
                >
                  {showAllRolls ? 'Show fewer' : `Show all ${rolls.length} rolls →`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
