'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: '1,180+ Weapons',
    desc: 'Every weapon in Destiny 2, pulled live from Bungie\'s API and updated automatically whenever the manifest changes.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'TTK Math',
    desc: 'Precise time-to-kill calculations for PvE and PvP. Stack damage buffs, tune resilience, and find the fastest kill pattern.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'God Rolls',
    desc: 'S/A/B/C tier perk ratings and community roll recommendations, so you always know what to chase.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: 'Share Builds',
    desc: 'Lock in your perks, masterwork, and buffs, then share the exact roll with a single link.',
  },
];

// ── Redirect handler (for old share links that used /?w=...) ─────────────────

function ShareLinkRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('w')) {
      router.replace(`/editor?${searchParams.toString()}`);
    }
  }, [searchParams, router]);

  return null;
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans flex flex-col overflow-x-hidden">

      {/* Redirect handler for legacy share links */}
      <Suspense fallback={null}>
        <ShareLinkRedirector />
      </Suspense>

      {/* ── Ambient glow ──────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="font-bold text-base tracking-tight text-white">
          D2 Theorycraft
        </span>
        <Link
          href="/editor"
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
        >
          Launch App →
        </Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">

        {/* Eyebrow */}
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500 mb-6 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Destiny 2 Weapon Theory
        </span>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
          Build the{' '}
          <span className="text-amber-400">perfect</span>
          <br />
          weapon roll.
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed mb-10">
          Browse every weapon, calculate time-to-kill, stack buffs,
          and share your rolls — all backed by live Bungie API data.
        </p>

        {/* CTA */}
        <Link
          href="/editor"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg px-8 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(245,158,11,0.25)]"
        >
          Launch App
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>

        <p className="text-xs text-slate-600 mt-4">Free to use · No login required</p>
      </section>

      {/* ── Feature cards ─────────────────────────────── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm hover:bg-white/8 hover:border-white/15 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Second CTA below cards */}
        <div className="flex justify-center mt-12">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            Open the weapon editor →
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center space-y-1">
        <p className="text-xs text-slate-600">
          Weapon data via{' '}
          <a href="https://bungie.net" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            Bungie API
          </a>
          {' · '}God roll analysis by{' '}
          <a href="https://twitter.com/theaegisrelic" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            TheAegisRelic
          </a>
        </p>
        <p className="text-xs text-slate-700">
          Not affiliated with or endorsed by Bungie, Inc.
        </p>
      </footer>

    </div>
  );
}
