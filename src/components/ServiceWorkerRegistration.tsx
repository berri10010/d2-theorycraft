'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Dev chunks aren't content-hashed, so the SW's cache-first strategy would
      // serve stale code. Drop any worker left over from a production visit.
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {/* silent — SW is enhancement only */});
  }, []);
  return null;
}
