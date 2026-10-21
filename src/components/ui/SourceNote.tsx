import React from 'react';
import Link from 'next/link';
import { CREDITS } from '../../data/credits';

/**
 * A one-line "where this came from" note for the bottom of a panel: the creators' names link to
 * their work, and "all sources" opens the full credits page.
 */
export function SourceNote({
  label, ids, detail, className = '',
}: { label: string; ids: string[]; detail?: string; className?: string }) {
  const credits = ids.map((id) => CREDITS.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const linkCls = 'underline underline-offset-2 hover:text-ink-2 transition-colors';
  return (
    <p className={`text-[9px] text-ink-4 leading-relaxed ${className}`}>
      {label}:{' '}
      {credits.map((c, i) => (
        <React.Fragment key={c.id}>
          {i > 0 && ' · '}
          {c.url
            ? <a href={c.url} target="_blank" rel="noopener noreferrer" className={linkCls}>{c.short ?? c.name}</a>
            : <Link href={`/credits#${c.id}`} className={linkCls}>{c.short ?? c.name}</Link>}
        </React.Fragment>
      ))}
      {detail ? ` (${detail})` : ''}
      {' · '}
      <Link href="/credits" className={linkCls}>all sources</Link>
    </p>
  );
}
