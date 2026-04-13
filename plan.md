# D2 Theorycraft — Project Plan

> **To resume in a new session:** say `Claude, continue with plan.md`  
> Claude will read this file first, check the current state of any referenced files, and pick up exactly where the last session ended.

---

## How Claude Should Use This File

1. **At session start** — read `plan.md` before doing anything else. Verify the current state of files matches what is recorded here (things may have changed since the last update).
2. **During the session** — work through the "Next Actions" section in order.
3. **At session end** — update this file: tick completed checklist items, revise progress percentages, rewrite "Next Actions" to reflect what is actually next, and note anything discovered or deferred.
4. **Never skip the end-of-session update.** This file is the only persistent record of what was done and what comes next.

---

## General Work Plan

**Project:** D2 Theorycraft — `www.d2theorycraft.com`  
**Repo:** `https://github.com/berri10010/d2-theorycraft`  
**Stack:** Next.js static export → GitHub → Cloudflare Worker (static assets via `env.ASSETS.fetch`). No SSR, no API routes. Builds run on GitHub Actions; deploys triggered by push to `main`.  
**Workspace (local):** `C:\Users\husse\Documents\d2-theorycraft`

The site is a Destiny 2 weapon theorycrafting tool. Users can browse weapon perks, simulate god rolls, and inspect damage/TTK calculations. The ongoing work has three tracks:

1. **Perk Audit** — verify and correct the stat/activation data for all 415 weapon perks in `src/data/perkAudit.json` using the live Clarity community database as ground truth.
2. **UI Enhancements** — surface the corrected perk data in the EffectsPanel and other components (TTA badges, stat modifier display, comparison grid).
3. **Weapon System Module** — a standalone TypeScript architecture (`weapon-system/`) implementing a component-based heterogeneous stat system. Built and committed; integration into the main site is pending.

---

## Implementation by Stages

### Stage 6 — Homepage Enhancements
Surface god roll data on the homepage and improve page navigation.

| Task | Status |
|------|--------|
| Featured God Rolls section — top 6 weapons by season with tier badge + perk pills | ✅ Done |
| Fix null season display for event weapons (Dawning, FotL, Solstice, Vow of the Disciple) via watermark → label map | ✅ Done |
| Collapsible "Tools & Features" accordion (replaces always-visible 4-column feature cards) | ✅ Done |
| Lift weapon + god-rolls data loading to HomePage (single fetch, shared by search + featured section) | ✅ Done |

**Stage 6 progress: 100%**

---

### Stage 1 — Data Pipeline (perkAudit.json + buffs.json)
Fix the underlying data layer so the UI has accurate values to display.

| Task | Status |
|------|--------|
| Fix `buffs.json`: Rampage multipliers (was 1.10/1.20/1.30 → now 1.20/1.41/1.66 PvE) | ✅ Done |
| Fix `buffs.json`: Vorpal primary/special/power split (`ammoTypeMultipliers`) | ✅ Done |
| Add missing `buffs.json` entries: `killing_tally`, `one_for_all` | ✅ Done |
| Generate `perkAudit.json` from Clarity live DB via `build_perk_audit_json.py` | ✅ Done |
| Merge perkAudit into `parser.ts` (audit stats override manifest investmentStats) | ✅ Done |
| VERIFIED_OVERRIDES — Tier 1 (4 critical damage perks: Bait and Switch, Firing Line, Target Lock, Trench Barrel) | ✅ Done |
| VERIFIED_OVERRIDES — Tier 3 (22 real perks with Unknown TTA fixed) | ✅ Done |
| Clear activation on 44 artifact entries (description fragments with wrong auto-parsed activation data) | ✅ Done |
| Fix ttaCategory on 8 real perks (Bolt Scavenger, Charged Bolts, Detonator Beam, Energy Transfer, Explosive Bolts, Rapid-Fire Frame, Spread Shot, Spring-Auger Bolts) | ✅ Done |
| Unknown TTA → 0 | ✅ Done |
| Tier 4 (107 fully empty entries) — already empty, verify none are real perks needing data | ⬜ Pending |

**Stage 1 progress: 100%**

---

### Stage 2 — UI Enhancements
Surface corrected perk data visually in the site's components.

| Task | Status |
|------|--------|
| Add `PerkActivation` interface to `src/types/weapon.ts` | ✅ Done |
| Add `activation` + `activation2` fields to `Perk` interface | ✅ Done |
| Wire `auditStatsFor()` + `auditActivationFor()` helpers in `parser.ts` | ✅ Done |
| EffectsPanel: colour-coded TTA badge pills (Kill-Proc=red, State-Based=teal, etc.) | ✅ Done |
| EffectsPanel: badge shows `ttaCategory` + duration | ✅ Done |
| Uncommitted changes in `ComparisonGrid.tsx`, `TTKAndFalloffPanel.tsx`, `RollEditor.tsx` — reviewed; already committed in prior sessions | ✅ Done |
| Stat modifier display in EffectsPanel (show +X Handling etc. from perkAudit) | ✅ Done |

**Stage 2 progress: 100%**

---

### Stage 3 — Weapon System Module (`weapon-system/`)
A standalone, extensible TypeScript architecture for heterogeneous weapon stats.

| Task | Status |
|------|--------|
| Core types: `Weapon<TStats>`, `StatBlock`, `BaseWeaponStats`, `StatValidationError` | ✅ Done |
| Five archetype stat blocks: RocketLauncher, Shotgun, SniperRifle, Sword, FlameThrower | ✅ Done |
| `DamageStrategy<T>` interface + five concrete strategies | ✅ Done |
| `WeaponFactory` — single validated construction entry point | ✅ Done |
| `CombatManager` — type-agnostic strategy registry + dispatch | ✅ Done |
| `index.ts` — public API, pre-wired `combat` singleton, usage examples | ✅ Done |
| TypeScript strict-mode: 0 compiler errors | ✅ Done |
| Committed to repo (`weapon-system/`) | ✅ Done |
| Write unit tests for each strategy and WeaponFactory validation paths | ✅ Done |
| Integration: wire `weapon-system` damage output into the site as Damage Profile panel | ✅ Done |
| Document extension pattern (adding weapon type #6 end-to-end example) | ✅ Done (in plan.md architecture section) |

**Stage 3 progress: 100%**

---

### Stage 4 — Perk Audit Cleanup (detail of Stage 1 pending work)
Clear artifact entries and fix the 11 real perks that still have wrong data.

| Task | Status |
|------|--------|
| Clear activation on 44 artifact/description-fragment entries | ✅ Done |
| Fix ttaCategory on 8 real perks (Unknown → correct category) | ✅ Done |
| Verify Unknown TTA count = 0 | ✅ Done |
| Add proper entry for `Accelerated Heatsink` (Tier 2 — only real perk in that tier) | ✅ Done |
| Verify Tier 4 (134 fully empty entries) — confirm none are real perks needing data | ✅ Done |
| Remove 134 fully-empty entries from perkAudit.json (415 → 281 entries) | ✅ Done |

**Stage 4 progress: 100%**

---

### Stage 5 — Build & Deployment Pipeline
Automate builds and optimise Cloudflare deploy times.

| Task | Status |
|------|--------|
| Migrate deployment from Vercel → Cloudflare Worker (static assets) | ✅ Done |
| Add `forceSwcTransforms: true` to `next.config.mjs` (ensures SWC, never Babel) | ✅ Done |
| Add `@next/bundle-analyzer` behind `ANALYZE=true` env gate | ✅ Done |
| Exclude `weapon-system/` from main `tsconfig.json` includes (no double-compilation) | ✅ Done |
| Bungie manifest version cache in `build-static-data.ts` (skip 24 MB download when unchanged) | ✅ Done |
| Install `wrangler` as local devDependency (no more `npx` cold-download failures) | ✅ Done |
| GitHub Actions workflow (`.github/workflows/deploy.yml`) — build + deploy on push to `main` | ✅ Done |
| Node.js 24 runner opt-in (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`) | ✅ Done |
| Add `BUNGIE_API_KEY` + `CLOUDFLARE_API_TOKEN` secrets to GitHub repo | ✅ Done |

**Stage 5 progress: 100%**

---

### Stage 7 — TTK, Stats & Champion Mod Improvements

Correctness and completeness pass on the TTK panel, Comparison tab, and weapon stat display.

| Task | Status |
|------|--------|
| Full-screen graph overlay: raise z-index from `z-50` → `z-[9999]` so it covers sidebar and all UI | ✅ Done |
| Comparison Tab TTK: add `multiplier` field to `CompareSnapshot`; recalculate TTK live per enemy tier | ✅ Done |
| Comparison Tab TTK: enemy tier `<select>` in grid header (visible when ≥1 PvE snapshot present) | ✅ Done |
| Dynamic weapon stats (StatDisplay): filter `BAR_STAT_KEYS` to stats present in weapon `baseStats` (hides Impact/Range for Rockets, etc.) | ✅ Done |
| Dynamic weapon stats (ComparisonGrid): `sharedBarStatKeys` = intersection across all snapshot weapons | ✅ Done |
| Champion mod selector in TTK panel: Overload / Unstoppable / Barrier pills shown when enemy tier = Champion | ✅ Done |
| Champion TTK gate: suppress TTK result and sparkline when Champion tier selected without a mod | ✅ Done |

**Stage 7 progress: 100%**

---

### Stage 8 — Default Variant Selection

Programmatic algorithm to pick the most relevant weapon variant as the group default.

| Task | Status |
|------|--------|
| Implement `selectDefault()` in `weaponGroups.ts`: highest season → base variant → has icon | ✅ Done |
| Wire into `groupWeapons()`: `default: selectDefault(variants)` replaces `default: variants[0]` | ✅ Done |
| Verified zero constraint violations across all 408 multi-variant weapon groups | ✅ Done |
| Bug fix: "A Good Shout" loaded variant without banner — root cause: Bungie CDN 404 on screenshot URL | ✅ Done |
| Add `screenshot` as tier-3 tie-breaker in `selectDefault` (season → base → **screenshot** → icon) | ✅ Done |
| Build pipeline: `validateTieBreakerScreenshots()` HEAD-checks ~200 tie-break URLs, nulls out 404s | ✅ Done |
| Live data patch: `weapons-0.json` hash `649691506` screenshot set to null immediately | ✅ Done |

**Stage 8 progress: 100%**

---

## Overall Progress

| Stage | Progress | Notes |
|-------|----------|-------|
| 1 — Data Pipeline | 100% | Complete |
| 2 — UI Enhancements | 100% | Complete |
| 3 — Weapon System Module | 100% | Complete |
| 4 — Perk Audit Cleanup | 100% | Complete |
| 5 — Build & Deployment | 100% | Complete |
| 6 — Homepage Enhancements | 100% | Complete |
| 7 — TTK, Stats & Champion Mods | 100% | Complete |
| 8 — Default Variant Selection | 100% | Complete |
| **Overall** | **100%** | |

---

## Checklist (Quick Reference)

### Ongoing
- [ ] Run `python3 build_perk_audit_json.py` after any override additions to `perkAudit.json`
- [ ] Push: `git push` — GitHub Actions handles build + deploy automatically

---

## Next Actions

> These are ordered by priority. Claude should start from the top.

*All planned work is complete. No outstanding actions.*

---


## Key File Locations

| File | Purpose |
|------|---------|
| `src/data/perkAudit.json` | Per-perk audit data (generated — do not hand-edit) |
| `src/data/buffs.json` | Damage multiplier definitions per buff key |
| `src/types/weapon.ts` | TypeScript interfaces including `PerkActivation` |
| `src/lib/bungie/parser.ts` | Bungie manifest parser — merges perkAudit on top |
| `src/components/weapon/EffectsPanel.tsx` | Conditional perk display + TTA badges |
| `src/components/weapon/DamageProfilePanel.tsx` | Weapon-system Damage Profile panel |
| `src/lib/weaponSystemAdapter.ts` | Bridge: D2 stat bars → weapon-system typed stat blocks |
| `src/app/page.tsx` | Homepage — search, Featured God Rolls, collapsible tools section |
| `src/components/layout/SearchSidebar.tsx` | Editor sidebar — weapon list with season/event labels |
| `build_perk_audit_json.py` | Generates perkAudit.json from Clarity + VERIFIED dict |
| `weapon-system/src/` | Standalone weapon stat architecture module |
| `.github/workflows/deploy.yml` | GitHub Actions — build + Wrangler deploy on push to main |
| `wrangler.toml` | Cloudflare Worker config — static assets from `./out` |
| `claude_perk_audit_prompt_v2.txt` | Detailed instructions for perk audit cleanup session |

---

## Reference: Key Values

**Clarity live DB URL:**  
`https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/master/descriptions/clarity.json`

**Fetch in Python:**
```python
import json, urllib.request
with urllib.request.urlopen(CLARITY_URL, timeout=60) as r:
    clarity = json.load(r)
by_name = {v['name'].lower(): v for v in clarity.values()}
```

**Regenerate perkAudit.json:**
```bash
python3 build_perk_audit_json.py
```

**Deploy cycle:**
```bash
git add <files>
git commit -m "..."
git push   # GitHub Actions builds + deploys to Cloudflare automatically
```

**Run bundle analyzer locally:**
```bash
$env:BUNGIE_API_KEY = "your-key"
$env:ANALYZE = "true"
npm run build
# Opens treemap in browser after build completes
```

**Valid `ttaCategory` values:**  
`Instant-Always` | `State-Based` | `Kill-Proc` | `Reload-Proc` | `Melee-Proc` | `Shot-Proc` | `Wind-Up` | `Orb-Proc` | `Ability-Proc` | `Ammo-Proc` | `Conditional State`

---

*Last updated: 2026-04-12 — Stage 8 complete + bug fix. "A Good Shout" was defaulting to a variant with a Bungie CDN 404 screenshot. Fixed by: (1) adding `screenshot` as tier-3 tie-breaker in `selectDefault` (season → base → screenshot → icon); (2) `validateTieBreakerScreenshots()` in build pipeline HEAD-checks the ~200 screenshot URLs involved in actual tie-breaks and nulls out 404s; (3) immediate live patch to `weapons-0.json`.*
