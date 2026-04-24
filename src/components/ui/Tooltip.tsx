'use client';

import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

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

  const show = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      const above = rect.top > 140;
      tipRef.current = {
        x: rect.left + rect.width / 2,
        y: above ? rect.top : rect.bottom,
        above,
      };
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  if (!content) return children;

  return (
    <>
      <div onMouseEnter={show} onMouseLeave={hide}>
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
