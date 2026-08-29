'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '../../store/useSiteSettings';

export function ThemeProvider() {
  const theme = useSiteSettings((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return null;
}
