import type { Metadata } from 'next';
import Link from 'next/link';
import { CREDITS, CREDIT_GROUPS, type CreditGroup } from '../../data/credits';

export const metadata: Metadata = {
  title: 'Sources & credits — D2 Theorycraft',
  description: 'Everyone whose data, formulas and tools D2 Theorycraft is built on.',
};

const GROUP_ORDER: CreditGroup[] = ['game', 'analysis', 'math', 'built'];
const ISSUES_URL = 'https://github.com/berri10010/d2-theorycraft/issues';
const linkClass ='underline underline-offset-2 hover:text-amber-400 transition-colors';

export default function CreditsPage() {
  return (
    <div className="min-h-screen min-h-dvh safe-pad bg-black text-ink font-sans overflow-x-hidden">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-bold text-base tracking-tight text-white hover:text-amber-400 transition-colors">
          D2 Theorycraft
        </Link>
        <Link
          href="/editor"
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-ink-2 border border-white/10 transition-colors"
        >
          Open Editor
        </Link>
      </nav>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight text-white">Sources &amp; credits</h1>
        <p className="mt-3 text-sm text-ink-3 leading-relaxed">
          D2 Theorycraft is a calculator built on other people&apos;s work. The game data comes from Bungie; the tier lists,
          god rolls, drop sources and damage formulas come from community members who spent real time collecting and testing them.
          Their work is shown as they wrote it and linked wherever it appears on the site. Data is refreshed from these sources every day.
        </p>

        {GROUP_ORDER.map((group) => (
          <section key={group} className="mt-10" aria-labelledby={`g-${group}`}>
            <h2 id={`g-${group}`} className="text-lg font-bold text-white">{CREDIT_GROUPS[group].title}</h2>
            <p className="mt-1 text-sm text-ink-4">{CREDIT_GROUPS[group].blurb}</p>

            <ul className="mt-4 space-y-3">
              {CREDITS.filter((c) => c.group === group).map((c) => (
                <li key={c.id} id={c.id} className="rounded-xl border border-white/10 bg-white/3 p-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-semibold text-ink">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className={linkClass}>{c.name}</a>
                      ) : c.name}
                    </h3>
                    {c.by && <span className="text-xs text-ink-4">by {c.by}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{c.what}</p>
                  <p className="mt-1 text-xs text-ink-4"><span className="font-semibold">Where: </span>{c.where}</p>
                  {c.links && c.links.length > 0 && (
                    <p className="mt-1.5 text-xs text-ink-4 flex flex-wrap gap-x-3">
                      {c.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className={linkClass}>{l.label}</a>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-10 rounded-xl border border-white/10 bg-white/3 p-4 text-sm text-ink-3 leading-relaxed">
          <h2 className="text-base font-bold text-white mb-1">Fine print</h2>
          <p>
            Destiny 2, its names, weapons, perks and artwork are the property of Bungie, Inc. This site is a fan project and is not
            affiliated with or endorsed by Bungie. Community sheets are read from their public pages, are the work of their authors,
            and can be wrong or out of date: where a tool and the game disagree, trust the game.
          </p>
          <p className="mt-2">
            If you made one of these and would like a different credit, link or wording, or would rather it weren&apos;t used, please{' '}
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>open an issue on GitHub</a>{' '}
            and it will be changed. Corrections to any number on the site are welcome there too.
          </p>
        </section>
      </main>
    </div>
  );
}
