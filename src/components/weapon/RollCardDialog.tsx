'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { intrinsicDescription } from '../../lib/intrinsicText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { buildRollCardData, drawRollCard, loadCardImages, rollCardFileName, CARD_W, CARD_H } from '../../lib/rollCard';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Permalink for the roll, shown under the card so the picture can be traced back to the exact roll. */
  permalink: string;
}

/** A shareable picture of the current roll: weapon art, chosen perks and stats, drawn on a canvas and saved as PNG. */
export function RollCardDialog({ open, onClose, permalink }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  useDialogFocus(open, ref, onClose);
  const { data: clarity } = useClarityPerks();

  const { activeWeapon, selectedPerks, mode, masterworkStat, isCrafted, getCalculatedStats } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon: s.activeWeapon, selectedPerks: s.selectedPerks, mode: s.mode,
      masterworkStat: s.masterworkStat, isCrafted: s.isCrafted, getCalculatedStats: s.getCalculatedStats,
    })),
  );

  const data = useMemo(() => {
    if (!open || !activeWeapon) return null;
    return buildRollCardData({
      weapon: activeWeapon, selectedPerks, calcStats: getCalculatedStats(), mode, masterworkStat, isCrafted, url: permalink,
      intrinsicDescription: activeWeapon.intrinsicTrait ? intrinsicDescription(activeWeapon.intrinsicTrait, clarity) : null,
    });
  // The store snapshot is read when the dialog opens; the card is a picture of that moment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clarity]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setStatus('loading');
    setNotice('');
    (async () => {
      try {
        const [images] = await Promise.all([loadCardImages(data), document.fonts?.ready]);
        if (cancelled || !canvasRef.current) return;
        const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
        drawRollCard(canvasRef.current, data, images, family);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [data]);

  if (!open || !data) return null;

  const toBlob = () => new Promise<Blob | null>((resolve) => {
    const canvas = canvasRef.current;
    if (!canvas) { resolve(null); return; }
    try { canvas.toBlob(resolve, 'image/png'); } catch { resolve(null); } // a tainted canvas throws
  });

  const save = async () => {
    const blob = await toBlob();
    if (!blob) { setNotice('Could not make the image.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rollCardFileName(data.name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Saved.');
  };

  const copy = async () => {
    const blob = await toBlob();
    try {
      if (!blob || typeof ClipboardItem === 'undefined') throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setNotice('Image copied.');
    } catch {
      setNotice('Your browser cannot copy images. Use Save instead.');
    }
  };

  const btn = 'min-h-[44px] px-4 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50';

  return (
    <div className="scrim fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Roll card"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-white/15 rounded-2xl p-4 sm:p-6 w-full max-w-3xl max-h-full overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Roll card</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-md text-ink-4 hover:text-ink transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${data.name} roll card: ${data.columns.flatMap((c) => c.perks.filter((p) => p.selected).map((p) => p.name)).join(', ') || 'no perks chosen'}`}
            className="w-full h-full block"
            style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
          />
        </div>
        {status === 'loading' && <p className="text-2xs text-ink-4 mt-2">Drawing the card…</p>}
        {status === 'error' && <p className="text-2xs text-red-400 mt-2">The card could not be drawn.</p>}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={save} disabled={status !== 'ready'} className={`${btn} bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30`}>Save image</button>
          <button onClick={copy} disabled={status !== 'ready'} className={`${btn} bg-white/5 border-white/10 text-ink hover:bg-white/10`}>Copy image</button>
          <span role="status" className="text-2xs text-ink-4">{notice}</span>
        </div>
        <p className="text-2xs text-ink-4 mt-3 break-all">Open this exact roll: {permalink}</p>
      </div>
    </div>
  );
}
