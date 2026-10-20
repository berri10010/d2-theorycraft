'use client';

import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_WIDTH = 260;
const EDGE_MARGIN = 8;

type Placement =
  | { kind: 'bubble'; x: number; y: number; above: boolean }
  | { kind: 'sheet' };

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  /** Delay before the tooltip appears, ms. Default 220. */
  delay?: number;
}

/**
 * Portal-based tooltip that always escapes overflow-hidden ancestors.
 *
 *  - Mouse hover / keyboard focus: a small bubble above the trigger (flips below
 *    near the top edge, clamped inside the viewport).
 *  - Touch: a persistent card above the bottom nav that is easy to read, and is
 *    dismissed by tapping elsewhere, the close button, or Escape.
 */
export function Tooltip({ content, children, delay = 220 }: TooltipProps) {
  // Keep last-known placement in a ref so exit animations render at the correct spot
  const placeRef = useRef<Placement | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const place = useCallback((rect: DOMRect, touch: boolean, wait: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (touch) {
        placeRef.current = { kind: 'sheet' };
      } else {
        const above = rect.top > 140;
        // Keep the (up to MAX_WIDTH wide, centred) bubble inside the viewport.
        const half = MAX_WIDTH / 2 + EDGE_MARGIN;
        const x = Math.min(Math.max(rect.left + rect.width / 2, half), Math.max(half, window.innerWidth - half));
        placeRef.current = { kind: 'bubble', x, y: above ? rect.top : rect.bottom, above };
      }
      setVisible(true);
    }, wait);
  }, []);

  // Pointer events cover mouse and touch. A touch has no hover, so show right away on tap.
  const onEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const touch = e.pointerType === 'touch';
    place(e.currentTarget.getBoundingClientRect(), touch, touch ? 0 : delay);
  }, [place, delay]);

  const onLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // pointerleave fires on finger-lift for touch; the card stays until dismissed.
    if (e.pointerType !== 'touch') hide();
  }, [hide]);

  // Keyboard users get the same information as hover users.
  const onFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).matches(':focus-visible')) place(e.currentTarget.getBoundingClientRect(), false, 0);
  }, [place]);

  // Losing focus closes a bubble, but not the touch card (tapping inside it to scroll blurs the trigger).
  const onBlur = useCallback(() => {
    if (placeRef.current?.kind === 'bubble') hide();
  }, [hide]);

  // Escape dismisses; a touch outside the card dismisses the touch card.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (sheetRef.current?.contains(e.target as Node)) return;
      hide();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [visible, hide]);

  if (!content) return children;

  const placement = placeRef.current;

  return (
    <>
      <div onPointerEnter={onEnter} onPointerLeave={onLeave} onFocus={onFocus} onBlur={onBlur}>
        {children}
      </div>
      {mounted && createPortal(
        <AnimatePresence>
          {visible && placement?.kind === 'bubble' && (
            // Outer div handles fixed positioning — keeps transform free for motion
            <div
              key="tooltip"
              role="tooltip"
              style={{
                position:      'fixed',
                left:          `${placement.x}px`,
                top:           `${placement.y}px`,
                transform:     placement.above
                  ? 'translate(-50%, calc(-100% - 8px))'
                  : 'translate(-50%, 8px)',
                zIndex:        9999,
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: placement.above ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="bg-surface-2 border border-white/15 rounded-xl px-3 py-2.5 max-w-[260px] w-max shadow-2xl shadow-black/80"
              >
                {content}
              </motion.div>
            </div>
          )}

          {visible && placement?.kind === 'sheet' && (
            <motion.div
              key="tooltip-sheet"
              ref={sheetRef}
              role="dialog"
              aria-label="Details"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[55] max-h-[45dvh] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-surface-2 shadow-2xl shadow-black/80"
            >
              <button
                onClick={hide}
                aria-label="Close details"
                className="sticky top-0 float-right z-10 w-11 h-11 flex items-center justify-center text-ink-3 active:text-white text-xl leading-none"
              >
                ×
              </button>
              {/* The tooltip content is sized for hover bubbles; scale it up for reading on a phone. */}
              <div className="px-4 py-3 pr-1" style={{ zoom: 1.3 }}>
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
