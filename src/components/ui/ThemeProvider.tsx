'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '../../store/useSiteSettings';

export function ThemeProvider() {
  const theme = useSiteSettings((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    // data-resolved is the theme actually on screen; light-accents.css keys off it.
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const resolve = () => root.setAttribute('data-resolved', theme === 'system' ? (media.matches ? 'light' : 'dark') : theme);
    resolve();
    if (theme !== 'system') return;
    media.addEventListener('change', resolve);
    return () => media.removeEventListener('change', resolve);
  }, [theme]);

  return null;
}
