'use client';

import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_WIDTH = 260;
const EDGE_MARGIN = 8;
const TOUCH_DISMISS_MS = 3500;

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  /** Delay before the tooltip appears, ms. Default 220. */
  delay?: number;
}

/**
 * Portal-based tooltip that always escapes overflow-hidden ancestors.
 * Positions above the trigger by default; flips below when near the top edge.
 */
export function Tooltip({ content, children, delay = 220 }: TooltipProps) {
  // Keep last-known position in a ref so exit animations render at the correct spot
  const tipRef = useRef<{ x: number; y: number; above: boolean } | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Pointer events cover mouse and touch. A touch has no hover, so show right
  // away on tap and auto-dismiss; a mouse keeps the hover delay / leave behaviour.
  const show = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const touch = e.pointerType === 'touch';
    const rect = e.currentTarget.getBoundingClientRect();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const above = rect.top > 140;
      // Keep the (up to MAX_WIDTH wide, centred) bubble inside the viewport.
      const half = MAX_WIDTH / 2 + EDGE_MARGIN;
      const x = Math.min(Math.max(rect.left + rect.width / 2, half), Math.max(half, window.innerWidth - half));
      tipRef.current = { x, y: above ? rect.top : rect.bottom, above };
      setVisible(true);
      if (touch) timerRef.current = setTimeout(hide, TOUCH_DISMISS_MS);
    }, touch ? 0 : delay);
  }, [delay, hide]);

  const onLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // pointerleave fires on finger-lift for touch, so rely on the auto-dismiss there.
    if (e.pointerType !== 'touch') hide();
  }, [hide]);

  // Tapping anywhere else dismisses a touch tooltip.
  useEffect(() => {
    if (!visible) return;
    const onDown = (e: PointerEvent) => { if (e.pointerType === 'touch') hide(); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [visible, hide]);

  if (!content) return children;

  return (
    <>
      <div onPointerEnter={show} onPointerLeave={onLeave}>
        {children}
      </div>
      {mounted && createPortal(
        <AnimatePresence>
          {visible && tipRef.current && (
            // Outer div handles fixed positioning — keeps transform free for motion
            <div
              key="tooltip"
              style={{
                position:      'fixed',
                left:          `${tipRef.current.x}px`,
                top:           `${tipRef.current.y}px`,
                transform:     tipRef.current.above
                  ? 'translate(-50%, calc(-100% - 8px))'
                  : 'translate(-50%, 8px)',
                zIndex:        9999,
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: tipRef.current.above ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="bg-[#0f0f0f] border border-white/15 rounded-xl px-3 py-2.5 max-w-[260px] w-max shadow-2xl shadow-black/80"
              >
                {content}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
