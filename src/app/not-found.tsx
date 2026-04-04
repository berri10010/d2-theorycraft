import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans flex flex-col overflow-x-hidden">

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-bold text-base tracking-tight text-white hover:text-amber-400 transition-colors">
          D2 Theorycraft
        </Link>
        <Link
          href="/editor"
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
        >
          Open Editor
        </Link>
      </nav>

      {/* 404 content */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">

        <p className="text-7xl font-black text-amber-400 mb-4 tabular-nums">404</p>

        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-3">
          Page not found
        </h1>

        <p className="text-slate-500 max-w-sm mb-10">
          That roll doesn&apos;t exist. It may have been moved, deleted, or the link might be wrong.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/editor"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-colors min-w-[160px] text-center"
          >
            Open Editor
          </Link>
          <Link
            href="/"
            className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold px-6 py-3 rounded-xl text-sm transition-colors border border-white/10 min-w-[160px] text-center"
          >
            Back to Home
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center">
        <p className="text-xs text-slate-700">Not affiliated with or endorsed by Bungie, Inc.</p>
      </footer>

    </div>
  );
}
