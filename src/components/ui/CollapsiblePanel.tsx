'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsiblePanelProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  /** Override border/shadow — defaults to 'border-white/10' */
  className?: string;
  children: React.ReactNode;
}

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  headerRight,
  className = 'border-white/10',
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl border ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 md:p-6 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0 text-xl font-bold text-white">{title}</div>
        {headerRight && (
          <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </div>
        )}
        <motion.svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-slate-500 shrink-0"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
