'use client';

import React, { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  const [tip, setTip] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const show = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      const above = rect.top > 140;
      setTip({
        x: rect.left + rect.width / 2,
        y: above ? rect.top : rect.bottom,
        above,
      });
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTip(null);
  }, []);

  if (!content) return children;

  return (
    <>
      <div onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </div>
      {mounted && tip && createPortal(
        <div
          style={{
            position:  'fixed',
            left:      `${tip.x}px`,
            top:       `${tip.y}px`,
            transform: tip.above
              ? 'translate(-50%, calc(-100% - 8px))'
              : 'translate(-50%, 8px)',
            zIndex: 9999,
          }}
          className="pointer-events-none bg-[#0f0f0f] border border-white/15 rounded-xl px-3 py-2.5 max-w-[260px] w-max shadow-2xl shadow-black/80"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
