import React from 'react';
import Link from 'next/link';
import { CREDITS, FOOTER_CREDIT_IDS } from '../../data/credits';

const link = 'hover:text-ink-3 transition-colors underline underline-offset-2';

/** Short credit line for the bottom of a page; the full list lives at /credits. */
export function SiteFooter() {
  const shown = FOOTER_CREDIT_IDS.map((id) => CREDITS.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  return (
    <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center space-y-1.5">
      <p className="text-xs text-ink-4 max-w-3xl mx-auto leading-relaxed">
        Built on data and work from{' '}
        {shown.map((c, i) => (
          <React.Fragment key={c.id}>
            {i > 0 && ' · '}
            {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className={link}>{c.short ?? c.name}</a> : (c.short ?? c.name)}
          </React.Fragment>
        ))}
        . <Link href="/credits" className={link}>All sources &amp; credits</Link>
      </p>
      <p className="text-xs text-ink-4">
        Description feedback via{' '}
        <a href="https://d2clarity.com/discord" target="_blank" rel="noopener noreferrer" className={link}>Clarity Discord</a>
        {' · '}Not affiliated with or endorsed by Bungie, Inc.
      </p>
    </footer>
  );
}
