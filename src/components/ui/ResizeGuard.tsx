'use client';

import { useEffect } from 'react';

/**
 * Marks <html> with `resizing` while the window is being dragged and for a moment after. globals.css turns
 * transitions off in that state, so panels that change size at a breakpoint snap with the layout instead
 * of lagging behind it.
 */
export function ResizeGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      root.classList.add('resizing');
      clearTimeout(timer);
      timer = setTimeout(() => root.classList.remove('resizing'), 160);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
      root.classList.remove('resizing');
    };
  }, []);
  return null;
}
