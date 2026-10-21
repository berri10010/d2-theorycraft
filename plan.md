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

### Stage 9 — God Roll Database Refresh (TheAegisRelic)

Replace the 38-weapon stub `god-rolls.json` with TheAegisRelic's full weapon ranking database.

| Task | Status |
|------|--------|
| Extract all 683 weapons from `Destiny 2_ Endgame Analysis.xlsx` (20 sheets: Autos, Bows, HCs, Pulses, Scouts, Sidearms, SMGs, BGLs, Fusions, Glaives, Shotguns, Snipers, Swords, Rocket Sidearms, Traces, HGLs, LFRs, LMGs, Rockets, Other) | ✅ Done |
| Map multi-option perk fields (newline-delimited → string[]) | ✅ Done |
| Align weapon type strings with `godRolls.ts` TAB_TO_TYPE (e.g. SMGs → 'Submachine Gun') | ✅ Done |
| 0 non-standard tier values; 7 null rank/tier entries in 'Other' sheet (intentionally unranked) | ✅ Done |
| Verified key weapons resolve correctly for Featured God Rolls (Praedyth's Revenge S/1, Perfect Paradox S/1, etc.) | ✅ Done |

**Stage 9 progress: 100%**

---

### Stage 10 — Weapon List Polish

Minor UX and display fixes to the weapon browser sidebar.

| Task | Status |
|------|--------|
| GodRollPanel collapsible (header click) | ✅ Done |
| Weapon list sidebar collapsible on desktop (chevron button, always accessible) | ✅ Done |
| Graph overlay via React portal (covers full viewport incl. sidebar) | ✅ Done |
| Back-fill `seasonNumber` for event weapons (Dawning, Solstice, FotL) from god-rolls data | ✅ Done |
| Season 1 labelled "The Red War" in sidebar; full "The Red War (Season 1, Year 1)" in weapon detail | ✅ Done |
| Ammo type colors: Primary → gray, Special → green, Heavy → purple | ✅ Done |

**Stage 10 progress: 100%**

---

### Stage 11 — PvE Damage Model Accuracy

Source-accurate PvE scalars and power-level delta scaling, sourced from MossyMax's Outgoing Damage Scaling spreadsheet.

| Task | Status |
|------|--------|
| `src/data/combatantScalars.json` — per-archetype PvE damage scalars for 20 weapon subtypes, normalised to Major/Elite = 3.0, keyed by Bungie `itemSubType` integer | ✅ Done |
| `src/data/plDeltaCurve.json` — EoF Standard PL delta → damage multiplier curve (δ −50 to +30, 81 entries, normalised so δ0 = 1.0) | ✅ Done |
| `src/lib/plDelta.ts` — `getPlDeltaMultiplier(delta)` + `fmtPlDelta(delta)` helpers | ✅ Done |
| `src/lib/damageMath.ts` — replace global `PVE_DAMAGE_SCALAR = 3.0` with `getCombatantScalar(itemSubType, tier)`; expand `PVE_HEALTH_TIERS` from 3 tiers (Minor/Major/Champion) to 5 (add Miniboss 2500 HP, Boss 4000 HP); change `calculateTTK` / `calculateTTKCurve` API to accept `enemyTier: string` instead of `enemyHealth: number` | ✅ Done |
| Update all call sites: `TTKPanel`, `TTKAndFalloffPanel`, `ComparisonGrid`, `editor/page.tsx` | ✅ Done |
| `TTKAndFalloffPanel` — PL delta slider (−30 to +10, presets −20/−10/−5/0/+5/+10, colour-coded label); `effectiveMultiplier = multiplier × plMult` flows into TTK, breakpoint sparkline, and falloff chart Y-axis | ✅ Done |
| `TTKPanel` — same PL delta slider added to PvE section | ✅ Done |

**Stage 11 progress: 100%**

---

### Stage 12 — Feature Backlog

A broad set of UI, data, and UX improvements requested for the next development cycle.

#### 12A — Combat Mechanics

| Task | Status |
|------|--------|
| Handling breakdown: surface Ready / ADS / Stow times as separate stats | ✅ Done |
| Reload time in seconds: show below Reload stat bar (oracle_engine quadratic formula) | ✅ Done |
| Charge Time: show actual charge duration on hover over Charge Time bar | ✅ Done |
| Perfect Draw Window: show exact start time in seconds below Draw Time bar (Bows) | ✅ Done |
| DPS panel: Optimal DPS + Sustained DPS (PvP/PvE), per-shot damage, burst size, RPM, mag, reload | ✅ Done |
| All stat breakdowns (Handling/Reload/ChargeTime/DrawTime/Range/Zoom) moved to hover tooltips | ✅ Done |
| Range stat: hover shows Hip Xm (cyan) + ADS Xm (amber) using adsMultiplier(zoom) | ✅ Done |
| Zoom stat: hover shows magnification multiplier (zoom/10, e.g. 1.4×) | ✅ Done |
| Compare tab: Ready/ADS/Stow handling chips + Reload/Charge/Perfect timing row (per-weapon-type) | ✅ Done |
| Damage vs Distance chart: interactive line chart showing actual damage values per meter (hip-fire vs ADS) | ✅ Done |
| Flinch resistance: show flinch resist derived from Stability + Health (0–100 → 0–10%) | ✅ Done |
| Per-activity PvE scaling: Activity + Difficulty + Enemy Type dropdown scales all damage numbers; include custom option | ⬜ Pending |

#### 12B — Sharing & Presentation

| Task | Status |
|------|--------|
| Screenshot mode: Destiny-style weapon card renderer for social sharing | ⬜ Pending |
| Screenshot mode: multi-select (weapons can have more than one perk per column; only one active at a time) | ⬜ Pending |
| Share button: offer choice between "DIM Wishlist Item" and "Roll Permalink" | ✅ Done |

#### 12C — Perk & Annotation System

| Task | Status |
|------|--------|
| Community research annotations: show empirically verified perk values on hover | ✅ Done |
| Clarity description shown inline for single-option perk/origin columns in Weapon Perks grid | ✅ Done |

#### 12D — External Buffs Panel

| Task | Status |
|------|--------|
| Add class-neutral buffs (Sect of Force, Disruption Break, Tractor Cannon, Sever, etc.) | ✅ Done |
| Add Hunter buffs (Flow State, On Your Mark, Moebius Quiver, Deadfall) | ✅ Done |
| Add Warlock buffs (Heat Rises) | ✅ Done |
| Add Titan buffs (Rally Barricade, Sentinel Shield) | ✅ Done |
| Active external buffs apply flat stat bonuses to weapon stat bars (Amplified +40 Handling, Spark of Frequency +40 Reload, Flow State +40 Reload, Thread of Ascent +30 AE/Reload, Heat Rises +30 AE, Rally Barricade +50 Reload) | ✅ Done |
| Exotic armor selector in External Buffs panel — Hunter: Foetracer, Knucklehead Radar, Mask of Bakris, Mechaneer's Tricksleeves, Oathkeeper, Sealed Ahamkara Grasps, Triton Vice, The Dragon's Shadow, Lucky Pants, Speedloader Slacks | ✅ Done |
| Exotic armor selector — Warlock: Astrocyte Verse, Eye of Another World, Felwinter's Helm, Ballidorse Wrathweavers, Necrotic Grips, Ophidian Aspect, Mantle of Battle Harmony, Sanguine Alchemy, Wings of Sacred Dawn, Boots of the Assembler, Lunafaction Boots, Rain of Fire | ✅ Done |
| Exotic armor selector — Titan: Eternal Warrior, Icefall Mantle, No Backup Plans, Actium War Rig, Doom Fang Pauldron, Hallowfire Heart, Lion Rampant, The Path of Burning Steps, Peacekeepers, Peregrine Greaves | ✅ Done |

#### 12E — Weapon Stats Panel Rework

| Task | Status |
|------|--------|
| Show ALL weapon stats in the Weapon Stats panel (Ammo Generation now included) | ✅ Done |
| Make Airborne, Zoom, Ammo Gen, Recoil, Magazine more compact (2-col card grid) | ✅ Done |
| Recoil Direction chart redesigned as DIM-style white pie sector (ones digit = direction, value = tightness) | ✅ Done |
| Sword Ammo Capacity bar missing — add `'Ammo Capacity'` to `ALL_BAR_STAT_KEYS` in StatDisplay.tsx | ✅ Done |
| Sword Guard Resistance / Guard Endurance hidden when 0 (Legacy/Vortex frames have no guard) — added `ALWAYS_SHOW_STATS` bypass | ✅ Done |
| Grenade Launcher stats blank — renamed mapping key `'Special/Heavy Grenade Launcher'` → `'Grenade Launcher'` in weaponStatMappings.ts | ✅ Done |
| Micro-Missile Frame stat layout missing — added both `'Micro-Missile'` and `'Micro-Missile Frame'` keys to Sidearm mapping | ✅ Done |

#### 12F — Search Panel Rework (Homepage & Editor)

| Task | Status |
|------|--------|
| Category-based filter panel: clickable category buttons expand searchable option lists | ✅ Done |
| 3-state inc/exc selection on all filter options; active filters shown as dismissible chips | ✅ Done |
| Toggles: Featured (exotics + s27+), Craftable, Adept, Sunset (season ≤ 12) | ✅ Done |
| Filters: Weapon Type, Frame, Trait (cols 3&4), Energy, Ammo, Slot, Rarity, Perk (any col), Column 1–5 (nested subcats), Source, Season, Foundry | ✅ Done |
| Foundry field added to parser (from Bungie traitIds), bungieTypes, and Weapon interface | ✅ Done |
| Recent searches shown on search focus; hidden when typing begins | ✅ Done |

#### 12G — Homepage & Navigation

| Task | Status |
|------|--------|
| Consolidate the three "go to editor" buttons into one ("Browse All Weapons", no →) | ✅ Done |

#### 12H — UI / UX Polish

| Task | Status |
|------|--------|
| Improve tooltip GUI styling | ✅ Done |
| Retrieve weapon mods and masterworks from the Bungie API | ✅ Done |
| MW whitelist — blocks cross-type stat bleed (e.g. Sword Impact showing on all weapons): per-type + per-frame whitelist in parser.ts (`MW_WHITELIST_BY_TYPE` + `getMwWhitelist()`) | ✅ Done |
| Bow "Charge Time" MW renamed → "Draw Time" in parser; positive bonus negated (lower = better stat) | ✅ Done |
| Charge Time MW for Fusion Rifles / LFRs: positive bonus also negated | ✅ Done |
| Season 27+ tiered weapon secondary MW bonus: flat +5 to all other applicable stats (replaces old +2/+3/+4 adept/crafted/enhanced ladder for s27+) | ✅ Done |
| MasterworkPanel labels updated to show correct season-aware secondary bonus count | ✅ Done |
| Draw Time MW hardcoded to −34ms; Charge Time MW −33ms (LFR + FR Rapid-Fire/Precision) or −34ms (other FR frames) | ✅ Done |
| Ammo Generation excluded from masterworkSecondaryStats (never a secondary MW bonus stat) | ✅ Done |
| Sunset filter excludes Exotic weapons (exotics cannot be sunset in D2) | ✅ Done |
| Enhanced state auto-derived from perk selection — no longer a manual toggle; "Enhanceable" badge (non-interactive) shows when off, "Enhanced" (violet) when both Perk 1 & 2 are enhanced | ✅ Done |
| Barrel/mag columns skip enhanced state for non-featured (pre-s27, non-Exotic) weapons unless craftable is active | ✅ Done |
| Adept toggle circle vertically centered (`top-1/2 -translate-y-1/2`) | ✅ Done |
| Craftable (inactive) and Enhanceable badge border updated to `border-white/10` matching Adept grey style | ✅ Done |
| StatDisplay subscribes to `isEnhanced` so stat bars and masterwork label update when enhanced state auto-triggers | ✅ Done |
| Ammo panel: uses Bungie manifest first (ammoType, Magazine stat, Ammo Capacity reserves); MossyMax only for mag round count and reserve mod tiers | ✅ Done |
| Adept/Craftable mutual exclusion: clicking Adept disables Craftable and vice versa (no double-disable bug) | ✅ Done |
| Move Weapon Stat row in PvE Masterwork & Mods panel into TTK & Falloff panel (mirrors PvP layout) | ✅ Done |
| Clear weapon perks when switching to a different weapon | ✅ Done |
| Combine "Armor Mods" and "Masterwork & Mods" panels into one panel | ✅ Done |
| Move Weapon Surge into the Armor Mods section (not Masterwork) | ✅ Done |
| Primary weapons show infinite reserves | ✅ Done |
| High-Impact Frame Combat Bows: surface Persistence and Velocity stats | ✅ Done (prior session) |
| God Roll panel hidden when weapon has no god roll | ✅ Done |
| Add weapon acquisition info (how to obtain each weapon) | ✅ Done |
| All perk columns (barrel/mag/perk/origin) unified into one scrollable grid; single-option columns auto-selected, show Clarity description inline | ✅ Done |
| Rename "Perk 3" label in Weapon Perks panel to "Origin Trait" | ✅ Done (parser already emits "Origin Trait") |
| Effects panel always visible regardless of whether perks are fixed (removed allPerksFixed guard) | ✅ Done |
| Similar Weapons panel: show season number and year (e.g. "Echoes (Season 24, Year 7)") | ✅ Done |
| Improve intrinsic bonuses information display | ✅ Done |
| Weapon stat slider: defer graph updates until slider is released (onPointerUp pattern with local state) | ✅ Done |
| Fix Weapons Stat description text: "0–100" and "100–200" (was "1–100" / "101–200") | ✅ Done |
| Weapons Stat defaults to 0 on initial load for both PvE and PvP; PvP slider min changed from 100 to 0 | ✅ Done |
| Progressive Web App: `manifest.json`, service worker (`sw.js`), `ServiceWorkerRegistration` component, `Viewport` export, `appleWebApp` metadata | ✅ Done |
| App icons: triple-chevron SVG (`icon.svg`), 192px and 512px PNGs | ✅ Done |
| Mobile-friendly sidebar: `w-[85vw] max-w-72` so drawer is usable on small phones | ✅ Done |
| Animated stat bar numbers: `useAnimatedValue` hook with cubic ease-out; `StatBarRow` / `CompactStatCard` extracted as components to satisfy Rules of Hooks | ✅ Done |
| Perk selection ring burst: CSS `@keyframes perkRing` overlay span; 380 ms box-shadow expand + fade | ✅ Done |
| Weapon panel fade-in on weapon switch: `key={activeWeapon.hash}` + `animate-weapon-in` CSS class (220 ms cubic-bezier) | ✅ Done |
| Sidebar weapon list hover accent: `border-l-2 border-transparent` → `hover:border-white/15` / active `border-amber-500/50` | ✅ Done |
| `CollapsiblePanel` shared component: card background + toggle header with `stopPropagation` on `headerRight` slot | ✅ Done |
| All panels collapsible via `CollapsiblePanel`; External Buffs, Similar Weapons, Wishlists collapsed by default | ✅ Done |
| Service worker cache strategy: never pre-cache HTML (prevents stale CSS hash mismatches after deploys); cache-first only for `/_next/static/` immutable hashed assets | ✅ Done |
| Weapon Surge dmg label floating-point fix: `(multiplier - 1) * 100` → `.toFixed(2)` + unary `+` to strip trailing zeros | ✅ Done |
| `ErrorBoundary` React class component (`src/components/ui/ErrorBoundary.tsx`): per-panel crash isolation with "Try again" reset; wraps all major panels in `page.tsx` | ✅ Done |
| `CollapsiblePanel` `storageKey` prop: persists open/closed state in `localStorage` under `panel-<key>`; added to Weapon Perks, Stats, Effects, God Roll, Wishlists, Similar Weapons | ✅ Done |
| CompareStore: `reorderSnapshot(id, 'left'|'right')` action; ComparisonGrid: ‹ › arrows + "Load ↗" button per snapshot card | ✅ Done |
| WishlistPanel drag-and-drop: `dragging` state + amber glow + "Drop to import…" label on drag-over | ✅ Done |
| Perk tooltip stat modifier badges: unconditional `PerkMod[]` entries shown as green/red pills below description | ✅ Done |
| Mobile perk grid scroll hint: right-fade gradient overlay on `md:hidden` so horizontal scroll is discoverable | ✅ Done |
| MasterworkPanel: Exotic weapons now show a Catalyst info card instead of rendering nothing | ✅ Done |
| Data vintage notes: "TTK & falloff data: Season 26" on `TTKAndFalloffPanel`; "Timing data: Season 26" on `DpsPanel` | ✅ Done |
| SimilarWeaponsPanel: weapon icon card (36×36, element-tinted border) replaces element-colour dot | ✅ Done |
| URL import banner: dismissible sky banner "Imported: [Weapon Name]" when roll loaded from `?w=` permalink | ✅ Done |

**Stage 12 progress: ~97%**

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
| 9 — God Roll Database Refresh | 100% | Complete |
| 10 — Weapon List Polish | 100% | Complete |
| 11 — PvE Damage Model Accuracy | 100% | Complete |
| 12 — Feature Backlog | ~97% | Active |
| 13 — Mobile-first redesign, tests + CI, theming | 100% | Complete (see Engineering notes) |
| 14 — Formula accuracy audit | 100% | Complete; remaining estimates listed below |
| 15 — Community data (PvP wishlist, sources, WeaponStat Chart) | 100% | Complete; refreshed daily |
| 16 — Icons for buffs and armor mods | 100% | Complete |
| 17 — Pride Eternal PvP sheet, PvE/PvP tiers | 100% | Complete: Aegis tiers in PvE, Pride in PvP |
| 18 — External buff audit | 100% | Complete; sources and open questions in Known Issues |
| 19 — Roll vs meta score | 100% | Complete |
| 20 — Sources & credits page | 100% | Complete |
| 21 — Cohesion pass (editor order, panel shells, naming) | 100% | Complete |
| **Overall** | **~98%** | |

---

## Checklist (Quick Reference)

### Ongoing
- [ ] After a balance patch: `FORCE_WEAPON_STATS=1 npm run refresh-data` if huwugo's sheet is still flagged "currently updating"; otherwise the daily `refresh-data` workflow handles it
- [ ] New data source or data file: add it to `src/data/credits.ts` (a credit and its `DATA_FILE_CREDITS` entry) and, if it shows in a panel, a `SourceNote`
- [ ] New icon for a buff or armor mod: add a line to `scripts/build-icons.mjs`, run it, commit `src/data/localIcons.json` + `public/icons`
- [ ] Push: `git push` — GitHub Actions handles build + deploy automatically

---

## Known Issues (deferred)

| Issue | Notes |
|-------|-------|
| Exotic effects: partly modelled | Six exotic traits are toggles with numbers from Clarity (Business Time, Desperation, Rat Pack, Silkbound Slayer, Ignition Trigger, Release the Wolves). The sheet's chart-tab values for these were wrong in places and were replaced. Not modelled: Hard Light, Monte Carlo (stack semantics unclear), Turncoat, Chaperone (perk not in our data), Slayer's Fang, Ice Breaker, Duality's slug mode, Trespasser's trait, and any exotic armor damage effect other than the general buffs. 78 of 146 exotics still have no stat row at all. |
| Buff values still unverified | Weapons of Light (Ward of Dawn) +25% is from a fan wiki, no PvP value published; Hazardous Propulsion has no PvP value (none applied); Amplified / Spark of Frequency / Thread of Ascent / Flow State / Rally Barricade stat bonuses were not re-checked; Explosive Light and Surrounded special cases beyond grenade/rocket launchers and swords are not modelled. |
| Sheet corrections (STAT_OVERRIDES) | `src/lib/weaponStatSheet.ts` overrides the sheet where it is wrong, and they survive every refresh: Spread Shot HC = 11 pellets sharing the sheet's 120 damage per shot (matches the chart: 2 shots, 0.6s); Bastion fusion = 3 bullets x 7 pellets. Bastion keeps the sheet's 30.6 damage per pellet (confirmed by the owner), i.e. 642 per trigger. Trespasser stays a 3-round burst: Bungie's own RPM stat (491) equals 3 bullets x 164 bursts/min, WeaponData agrees, and the chart tab's 6 is its Unrepentant trait state. |
| Unused art | Weapons of Light, Amplified, Sever and Deadfall icons are local WebP because the manifest has none. Set-bonus, armor, archetype and silhouette art in `D2Assets/` is not used anywhere yet. |
| LFR charge-time damage penalty not modelled | oracle_engine applies a proportional damage penalty when perks reduce charge time below base on LFRs: `dmg *= 1.0 - (0.6 * delta) / base_damage`. We don't apply this. |

---

## Next Actions

> These are ordered by priority. Claude should start from the top.

Everything in Stages 1–11 and 13–16 is done. Remaining priorities, in order:

1. **More exotic effects** — Hard Light, Monte Carlo, Turncoat, Slayer's Fang, Ice Breaker, Duality (see Known Issues); needs in-game confirmation of what each trait does.
2. **Exotics with no stat row** — 78 of 146; ask huwugo's sheet to cover them or add rows by hand.
3. **12B** — Shareable roll links with Open Graph previews; screenshot-mode weapon card.
4. **12A** — Per-activity PvE scaling dropdown.
5. **Use the unused D2Assets** — set bonuses, archetype images (Similar Weapons), weapon-type silhouettes (filter chips).
6. **Accessibility** — dim-text contrast, focus rings and labels on icon-only buttons (a first pass is in Engineering notes).

---

*Last updated: 2026-10-21 (evening) — Pride Eternal's PvP sheet ingested (Pride tiers and rolls in PvP, Aegis in PvE); external buff audit with PvE/PvP values and corrections (see Engineering notes); roll-vs-meta score in the God Roll panel, compare cards and saved rolls.*

---

*Last updated: 2026-10-21 (later) — exotic trait effects (7 toggles), exotic stat lookup by weapon name (0 → 68 exotics with timing data), Trespasser verified, data-health report in the refresh workflow, Spread Shot/Bastion corrections.*

---

*Last updated: 2026-10-21 — Session summary: WeaponStat Chart v2.1 ingest rebuilt on the WeaponData tab (pellets/bolts per bullet, pre-charged fusion/bow TTK, no recovery gap for bow DPS; commit ad017bd); buff and armor-mod icons from the manifest with four local fallbacks (981bc29, 9d01d7b); plan.md refreshed.*

---

*Last updated: 2026-04-25 — Session summary (11 UI/UX polish improvements, commit fc6d447):*

*1. `src/components/ui/ErrorBoundary.tsx` (new): React class component with `getDerivedStateFromError` + `componentDidCatch`. Default fallback shows a red error card with the panel label and a "Try again" reset button. All major panels in `page.tsx` wrapped (`<ErrorBoundary label="…">`).*

*2. `CollapsiblePanel` persistence: added `storageKey?: string` prop. Initial state reads `localStorage.getItem('panel-<key>')` (lazy initializer to avoid SSR mismatch). Toggle writes `'open'`/`'closed'` back. `storageKey` added to: Weapon Perks, Weapon Stats, Effects, God Roll (both loading + main branch), Wishlists, Similar Weapons.*

*3. CompareStore + ComparisonGrid: added `reorderSnapshot(id, 'left'|'right')` to `useCompareStore` (swaps adjacent items in the array). Each snapshot card gains ‹ › move arrows (disabled at boundaries) and a "Load ↗" button in the top-left that calls `loadWeapon(snapshot.weapon)` to open the snapshot in the editor.*

*4. WishlistPanel drag-and-drop: `dragging` boolean state tracks hover; `onDragEnter/Over/Leave/Drop` handlers on the drop-zone button. On drag-over: amber glow border + `bg-amber-500/10` background + "Drop to import…" label. `onDrop` reads `e.dataTransfer.files[0]` and calls `loadFile()`.*

*5. Perk tooltip stat modifier badges (RollEditor): `displayPerk.statModifiers` (a `PerkMod[]`) filtered to `value !== 0 && !isConditional` then rendered as green/red pills (`+X StatName`) below the perk description in the tooltip.*

*6. Mobile perk grid scroll hint (RollEditor): wrapped the `flex overflow-x-auto` grid in a `relative` div; a `pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0d0d0f]` overlay fades the right edge on `md:hidden`.*

*7. MasterworkPanel — Exotic Catalyst card: replaced `return null` for Exotic rarity with an amber-bordered info card (`⬡ Catalyst`) explaining that Exotic weapons upgrade via a Catalyst, not a masterwork.*

*8. Data vintage notes: added `"TTK & falloff data: Season 26"` footnote to `TTKAndFalloffPanel` (inserted before the fullscreen portal block); added `"Timing data: Season 26"` `<br>` line to `DpsPanel` footer.*

*9. SimilarWeaponsPanel weapon icons: imported `Image` from `next/image` and `BUNGIE_URL`. `SimilarRow` now shows a 36×36 rounded weapon icon with element-tinted border (`border-sky-500/60` for arc, `border-orange-500/60` for solar, etc.) in place of the old 8px element dot. Header row `w-2` spacer widened to `w-9` to align.*

*10. URL import banner: `importedWeaponName` state (`useState<string | null>(null)`) added to `Dashboard`. Set inside the URL-restore `useEffect` after a successful `loadWeapon`. Banner renders as an `AnimatePresence`-animated sky-tinted div above the editor tab with a × dismiss button.*

---

*Last updated: 2026-04-13 — Session summary:*

*1. Parser fix (commit 9e60175): Exotic weapons with choosable mods (e.g. Praxic Blade Tang/Grip) now show all options. Root cause: Bungie sets currentlyCanRoll:false on non-default alternatives in reusablePlugSetHash; old code filtered them out. Fix splits plug set handling by type — reusablePlugSetHash always includes all items, randomizedPlugSetHash keeps the currentlyCanRoll filter.*

*2. Build cache fix (commit 5a0e45a): Added DATA_FORMAT_VERSION to manifest cache key so parser logic changes force a full re-parse even when the Bungie manifest version is unchanged. Bumped to '2' to pick up the reusablePlugSet fix.*

*3. Weapon Perks redesign (commit b907927): RollEditor now splits perk columns into two zones — "Fixed Traits" (single-option columns shown as inline rows with icon + name + stat mods + description) and "Choosable Mods" (multi-option columns shown as the existing icon-grid selector). Zone headers only appear when both zones are present. Store auto-selects single-option perks on weapon load so their stat modifiers always apply without user interaction.*

*4. Intrinsic trait moved (commit c4a5971): Removed intrinsic perk from RollEditor Fixed Traits zone. WeaponHeader now loads the intrinsic description from Compendium via useCompendiumPerks (previously blank because build pipeline strips manifest text).*

*5. External Buffs UX (commits cf460d8, be1dc4a): Empowering and Debuffs sections are now collapsible accordions with chevron headers, active count badge visible when collapsed. Broken Bungie CDN icons removed. Both sections start collapsed by default.*

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
| `src/data/combatantScalars.json` | Per-archetype PvE damage scalars (20 weapon subtypes, 5 enemy tiers) |
| `src/data/plDeltaCurve.json` | EoF Standard PL delta curve (δ −50 to +30, normalised) |
| `src/lib/plDelta.ts` | `getPlDeltaMultiplier` + `fmtPlDelta` helpers |
| `build_perk_audit_json.py` | Generates perkAudit.json from Clarity + VERIFIED dict |
| `weapon-system/src/` | Standalone weapon stat architecture module |
| `.github/workflows/deploy.yml` | GitHub Actions — build + Wrangler deploy on push to main |
| `wrangler.toml` | Cloudflare Worker config — static assets from `./out` |
| `src/components/ui/Tooltip.tsx` | Portal-based tooltip component (renders to `document.body` to escape overflow-hidden ancestors) |
| `src/data/exoticArmor.ts` | Exotic armor data: stat bonuses per exotic per class, weapon-type-specific bonuses |
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

*Last updated: 2026-04-19 — Stage 12 batch completions:*

*Batch 3 (commit db6cee4): Weapons Stat slider debounce (onPointerUp pattern with local state so charts only update on release); PvP slider min changed 100→0 with "0" preset added; description text corrected to "0–100"/"100–200"; Weapon Surge moved from MasterworkPanel into ArmorModPanel.*

*Batch 4 (commit df5bbec): AmmoPanel now reads ammoType, Magazine stat, and Ammo Capacity (reserves) from Bungie manifest first — MossyMax static data only for mag round count and reserve mod tiers. RollEditor single-option columns show Clarity description + stat mods inline beside the icon.*

*Batch 5 (commit ef8f16f): All perk columns (barrel/mag/perk/origin) unified into one scrollable grid — no more Fixed Traits zone. EffectsPanel guard removed (now available for all weapons). External buffs now apply flat stat bonuses to weapon stat bars via new `statBonuses` field in DamageBuff interface and buffs.json (Amplified +40 Handling/+20 AE, Spark of Frequency +40 Reload, Flow State +40 Reload/+20 Handling, Thread of Ascent +30 AE/+30 Reload, Heat Rises +30 AE, Rally Barricade +50 Reload). Recoil Direction chart redesigned as DIM-style white pie sector (ones digit → directional tilt, overall value → cone tightness).*

---

*Last updated: 2026-04-20 — Session summary:*

*1. RecoilChart formula fix: corrected arc direction so recoil 60→right, 50→left, 55→center (was inverted — changed `90 +` to `90 −`). Also removed erroneous `× 0.45` scaling factor. Final formula: `centerAngle = 90 − sin((x+5)·2π/20)·(100−x)`, `arcWidth = ((100−x)/100)·180`.*

*2. Unified perk column layout: removed all single-option column special-casing in RollEditor.tsx that caused inline text to bleed behind adjacent icons. All columns now use identical layout (`flex-col`, `items-center`, `min-w-[60px]`). Single-option perks auto-selected on weapon load.*

*3. Portal-based Tooltip component (`src/components/ui/Tooltip.tsx`): escapes overflow-hidden parents via `createPortal` to `document.body` with `position: fixed` + `getBoundingClientRect()`. 220 ms show delay, instant hide, flips above/below based on trigger y-position. Wrapped around all perk icons in RollEditor.*

*4. Intrinsic stat modifier pills in WeaponHeader: intrinsic trait card now shows green/red stat mod pills (e.g. "+5 Handling"). Description resolved via 4-source cascade: manifest → Clarity DB (by hash) → compendium (filtered, colon-terminated entries rejected) → FRAME_FALLBACK hardcoded map (20 common archetypes). Fixes blank descriptions for exotic intrinsics, Rapid-Fire Frame, Adaptive Frame, and others.*

*5. Exotic armor selector (12D complete): `src/data/exoticArmor.ts` with 10 Hunter / 12 Warlock / 10 Titan exotics, each with `statBonuses` and optional `weaponTypeStatBonuses` (e.g. Lucky Pants +100 Handling for Hand Cannons). BuffToggle.tsx gains ExoticArmorSection per class — `<select>` dropdown + stat pills (green when active weapon type matches, grey otherwise). `useWeaponStore` extended with `activeExoticArmor` state and `setExoticArmor` action; `getCalculatedStats` applies exotic bonuses after buff bonuses, clamped 0–100.*

*6. wrangler.toml observability sync: added full `[observability]`, `[observability.logs]`, and `[observability.traces]` sections to match Cloudflare dashboard configuration.*

---

*Last updated: 2026-04-23 — Session summary (filter panel):*

*Search filter panel rework (commit 1701572): FilterDrawer replaced with a category-button panel. Clicking a category (Weapon Type, Frame, Trait, Energy, Ammo, Slot, Rarity, Perk, Column 1–5, Source, Season, Foundry) expands a searchable options list with 3-state inc/exc picking. Column 1–5 is nested — shows Barrel/Magazine/Perk 1/Perk 2/Origin sub-categories. Toggles row (Featured, Craftable, Adept, Sunset) at top of panel. Foundry field added end-to-end: BungieInventoryItem.traitIds, parser extractFoundry(), Weapon.foundry. DATA_FORMAT_VERSION bumped 12→13 to force re-parse.*

---

*Last updated: 2026-04-23 — Session summary (animations, PWA, collapsible panels):*

*1. Clarity descriptions on perk hover in RollEditor (commit b2a961d): `renderClarityDesc` and `CLASS_COLOURS` extracted to `src/lib/clarityRender.tsx` shared module. RollEditor now calls `useClarityPerks()` and shows Clarity community text in the perk tooltip; falls back to manifest description when no Clarity entry exists.*

*2. PWA + mobile (commit ad3129d, d0ff23f): Added `manifest.json`, `public/sw.js` (cache-first for `/_next/static/` hashed assets, network-first for HTML), `ServiceWorkerRegistration` client component wired into `layout.tsx`, `Viewport` export (device-width, themeColor), `appleWebApp` metadata. App icons: triple-chevron SVG + 192px/512px PNGs. Sidebar drawer width changed to `w-[85vw] max-w-72` for small phones.*

*3. Animations (commit eb4e7b3): (a) Stat bar numbers count up smoothly on weapon load via `useAnimatedValue` hook (cubic ease-out, 250 ms). (b) Perk selection ring burst: `@keyframes perkRing` box-shadow expand+fade (380 ms) renders as sibling span on click. (c) Weapon panel fade-in: `key={activeWeapon.hash}` forces remount → `@keyframes weaponFadeIn` plays (220 ms). (d) Sidebar weapon list left-border hover accent: `border-l-2 border-transparent` → `hover:border-white/15` / active `border-amber-500/50`.*

*4. Collapsible panels (commit d1c394d): `CollapsiblePanel` shared component (`src/components/ui/CollapsiblePanel.tsx`) — card background, toggle header, `stopPropagation` on `headerRight` slot. All panels (StatDisplay, RollEditor, EffectsPanel, GodRollPanel, WishlistPanel, SimilarWeaponsPanel, BuffToggle) converted. External Buffs, Similar Weapons, and Wishlists start collapsed by default.*

*5. Service worker cache fix (commits 533a628, 21ae818): Homepage was unstyled after deploys because sw.js pre-cached `'/'` HTML; after Next.js rotated CSS filenames the stale HTML referenced missing stylesheets. Fix: removed HTML pre-caching, bumped cache to `d2tc-v2`. Also removed non-existent `weapons-2.json` fetch from homepage `Promise.all`.*

*6. WeaponDataPanel grey sub-panels fix (commit acc8883): Wrapping WeaponDataPanel in CollapsiblePanel caused `bg-white/5` double-stacking (panel card + sub-panel card). Fixed by replacing CollapsiblePanel with inline collapse logic (plain `<button>` + toggle state, no card background), so sub-panels render directly on the black background.*

---

*Last updated: 2026-04-22 — Session summary:*

*1. MW whitelist system (parser.ts, commits in this session): added `MW_WHITELIST_BY_TYPE` constant and `getMwWhitelist()` function. Blocks cross-type stat bleed — e.g. Sword `Impact` MW showing on Auto Rifles and Bows. Handles frame-level overrides: Micro-Missile, Balanced/Dynamic Heat Weapon, High-Impact Combat Bow.*

*2. Draw Time / Charge Time fixes (parser.ts): bow "Charge Time" masterwork option renamed → "Draw Time"; positive bonuses on both Draw Time and Charge Time are negated at parse time (lower raw value = better, so +10 from Bungie → -10 displayed). Both `'Micro-Missile'` and `'Micro-Missile Frame'` intrinsic names now accepted.*

*3. Grenade Launcher stat display fix (weaponStatMappings.ts): renamed key from `'Special/Heavy Grenade Launcher'` → `'Grenade Launcher'` to match the actual `itemTypeDisplayName` in Bungie's manifest. GL weapon stats were completely blank before this fix.*

*4. Sword stat display fixes (StatDisplay.tsx): added `'Ammo Capacity'` to `ALL_BAR_STAT_KEYS` so sword reserve bar renders. Added `ALWAYS_SHOW_STATS = new Set(['Guard Resistance', 'Guard Endurance'])` so guard stats show even at 0 (Legacy/Vortex frames have no guard by design).*

*5. Season 27+ tiered masterwork secondary bonus (useWeaponStore.ts + MasterworkPanel.tsx): weapons from season 27 onward always get a flat +5 secondary bonus — the old +2/+3/+4 adept/crafted/enhanced ladder only applies to pre-s27 weapons. MasterworkPanel label logic rewritten to compute the correct total from `isTiered` + role flags.*

*Known issue resolved this session: Handling breakdown (Ready/ADS/Stow) wired up via oracle_engine linear formulas; Draw Time / Charge Time math no longer deferred.*

---

*Last updated: 2026-04-23 — Session summary (oracle_engine stat breakdowns + DPS panel):*

*1. `src/lib/reloadTimes.ts` (new): quadratic reload time formulas for 16 weapon types from d2foundry/oracle_engine. Grenade Launchers split by ammo type (special vs heavy). `NORMALIZE` map handles Bungie display name variants.*

*2. `src/lib/handlingTimes.ts` (new, from previous session): linear Ready/ADS/Stow formulas for 16 weapon types. `HandlingBreakdown` component shows three amber ms values below the Handling stat bar.*

*3. `src/lib/bowDrawWindow.ts` (new): bow perfect-draw-start formula from oracle_engine subFamilies 905/906. Precision Frame → `0.003×stability + 0.5s`; all other bow frames → `stability/400 + 0.3s`. Result shown as "Perfect X.XXs" below the Draw Time bar.*

*4. `src/lib/dpsCalc.ts` (new): DPS calculation using weaponStats timing data. Handles standard, burst (Pulse Rifle, burst Sidearm), and charge (Fusion, LFR, Bow) weapon categories. Returns optimalDps (continuous fire, all-crit) and sustainedDps (mag + reload cycle, all-crit) for both PvP and PvE (3× Major/Elite scalar). Also computes derived RPM from shot timing.*

*5. `src/components/weapon/DpsPanel.tsx` (new): DPS panel tab in WeaponDataPanel. Shows body/crit/burst chips, Optimal DPS and Sustained DPS rows with PvP and PvE columns, and RPM/Mag/Reload chips. Shows "no data" gracefully for archetypes without timing entries.*

*6. `src/components/weapon/StatDisplay.tsx` updated: `ReloadBreakdown` component shows reload time in seconds below Reload bar. `DrawWindowBreakdown` component shows perfect draw start time below Draw Time bar (bows only, gated on `itemSubType === 31`).*

*7. Share button (from previous session, commits da71feb + b5c5903): replaced single Share button with dropdown offering "Roll Permalink" and "DIM Wishlist Item". DIM format uses `&perks=` separator. Perk sort order matches DIM: non-origin perks descending by socket index, origin trait last.*

---

*Last updated: 2026-04-24 — Session summary (MW fixes, enhanced state rework, sunset filter):*

*1. MW bonus corrections (parser.ts, DATA_FORMAT_VERSION → 14): Draw Time MW hardcoded to −34ms for all bows (was −10 from naive negation). Charge Time MW: −33ms for LFR and FR Rapid-Fire/Precision frames, −34ms for all other FR frames. Ammo Generation excluded from masterworkSecondaryStats. Sunset filter excludes Exotic weapons.*

*2. Enhanced state auto-derive (RollEditor.tsx + WeaponHeader.tsx): removed manual Enhanced toggle. `isEnhanced` is now computed in a `useMemo` + `useEffect` in RollEditor — activates only when both Perk 1 AND Perk 2 have their enhanced version explicitly selected (and craftable is off). Guard added for the `undefined === undefined` false-positive that caused single-perk enhancement to trigger the state. WeaponHeader shows a non-interactive "Enhanceable" badge (grey) when available, "Enhanced" badge (violet) when active.*

*3. Barrel/mag enhancement restriction: for non-featured weapons (pre-s27, non-Exotic), double-clicking a barrel or mag perk skips the enhanced step and goes straight to deselect, unless craftable mode is active. Featured weapons (Exotic or s27+) are exempt.*

*4. StatDisplay fix: added `isEnhanced` to the `useShallow` subscription and `useMemo` dependency array so stat bars and masterwork label recompute when the auto-enhanced state changes.*

*5. UI polish: Adept toggle circle now uses `top-1/2 -translate-y-1/2` for correct vertical centering. Craftable (inactive) and Enhanceable badge borders updated to `border-white/10`.*

---

*Last updated: 2026-04-24 — Session summary (stat hover tooltips + compare tab timing chips):*

*1. Removed AE "flinch" annotation — Airborne Effectiveness does not measure flinch resistance.*

*2. All derived stat values moved to hover tooltips (80ms delay, via existing portal Tooltip component): Handling (Ready/ADS/Stow ms), Reload (X.XXs), Charge Time (X.XXs), Draw Time (Perfect X.XXs for bows), Range (Hip Xm in cyan + ADS Xm in amber-300), Zoom (magnification X.X×). StatBarRow `details` prop and CompactStatCard `annotation` prop removed. Stat bars and compact cards are now clean by default.*

*3. ComparisonGrid new chip rows (commits d69b437, 1cb0999, 7833f63): after TTK/Hip/ADS row, added Ready/ADS/Stow handling chips (slate-200, only shown when formula data exists for weapon type) and a dynamic Reload/Charge/Perfect timing row (amber, 1–2 chips depending on weapon type). Zoom magnification not added to compare tab per user request.*

*4. Charge Time tooltip added (X.XXs on hover over Charge Time bar) — Charge Time stat is stored as raw ms in Bungie manifest, so no formula needed, just divide by 1000.*

*5. oracle_engine research: investigated Magazine, Draw Time, and Charge Time stat math (see Known Issues and Reference sections below). Key findings: (a) `baseStats['Magazine']` is a 0–100 investmentStat, not round count — oracle_engine applies a per-archetype quadratic formula to convert it to actual rounds; our DPS panel currently uses the raw stat value which is incorrect. (b) Draw Time and Charge Time are also 0–100 investmentStats in oracle_engine's model; archetype-specific linear formulas convert stat deltas to seconds. Our display of the raw ms Bungie manifest value is correct for the stat bar but perk effects on these stats interact with the formula, not directly with ms. (c) One special case: Sniper Rifles with mag_stat > 90 receive +1 bonus round after the quadratic formula. (d) LFRs: perks that reduce charge time below base also apply a proportional damage penalty (`dmg *= 1.0 - 0.6 * delta / base_damage`), which we do not model.*

---

*Last updated: 2026-04-24 — Session summary (bug fix):*

*1. Weapon Surge dmg label floating-point fix (commit eb1c920, ArmorModPanel.tsx line 175): `(multiplier - 1) * 100` with no rounding produced `5.499999999999994%` due to IEEE 754 representation of `1.055`. Fixed with `.toFixed(2)` + unary `+` to strip trailing zeros → displays `+5.5% dmg`.*

---

## Data format note (weapon payload)

`public/data/weapons-{0,1,2}.json` (~50 MB) was replaced by a normalised pack: `weapons.json` (weapons reference perks/mods by hash), `perks.json`, `mods.json` (~6 MB total). Format + pack/unpack live in `src/lib/weaponPack.ts`; `useWeaponDb` unpacks into the plain `Weapon[]` the UI uses, and the landing page loads `weapons.json` alone. `scripts/build-static-data.ts` writes the pack. `/admin` is now `src/app/admin/page.dev.tsx` and only exists under `next dev` (see `pageExtensions` in `next.config.mjs`).

---

## Engineering notes (tests, CI, theming)

- **Tests:** `npm test` (vitest, `src/**/*.test.ts`) — covers `weaponPack`, damage/TTK/DPS math, stat calculation in `useWeaponStore`, filters, wishlist parsing, share/DIM builders and chart geometry. Tests load the committed `public/data` pack, so a bad data refresh fails them.
- **CI:** `deploy.yml` runs typecheck → tests → `build:ci` (no data fetch) → `wrangler deploy`. `ci.yml` does the same on PRs. `refresh-data.yml` (daily + manual) re-fetches Bungie/Clarity data, validates it, commits `public/data` and dispatches the deploy.
- **Compendium removed:** the Google "Gear Perks" tab now returns an HTMLView placeholder, so the Data Compendium integration was deleted. Perk text = manifest → Clarity → frame fallback.
- **Theming:** colours are CSS variables (`globals.css`); Tailwind maps `black`/`white` plus `ink`/`ink-2..4` (text) and `surface`/`surface-2`. Light mode and "System" (OS) are just variable sets. Use `text-ink-*` for text; `perk-icon` gives Bungie glyphs a dark disc in light mode.
- **URL sync:** the editor keeps `?w&p&m&mw&ws&b&tier` current via `history.replaceState` (see `lastWrittenRef` in `editor/page.tsx` for the loop guard). Saved rolls ("My Rolls" in the Wishlist panel) can be loaded back with one tap.
- **Icons:** the buff toggles and armor-mod rows have no icon data of their own. `src/data/localIcons.json` maps `buff:<name>` / `mod:<label>` to either a Bungie CDN path (resolved from the manifest by `scripts/build-icons.mjs`) or a local `/icons/*.webp`; `localIcon()` in `src/lib/localIcons.ts` returns a loadable URL. `D2Assets/` (hand-collected art) is gitignored; only the four icons the manifest lacks are converted into `public/icons`. `localIcons.test.ts` fails if a non-perk buff has no icon or a file is unused.
- **Accessibility:** contrast checked (dim text `ink-4` is 5.6:1 dark / 6.0:1 light, AA needs 4.5:1) and a global `:focus-visible` ring exists in `globals.css`. Icon-only buttons (✓/✕, tier badge, tier selector dots, surge stacks) now have `aria-label`; buff and armor-mod toggles expose `aria-pressed`. Still to do: a screen-reader pass on the perk grid and charts, and a touch-target size audit.
- **Buff model (PvE/PvP):** each buff in `src/data/buffs.json` has PvE values; `pvp` overrides replace them in the Crucible (Radiant +25% PvE / +10% PvP, Tractor Cannon 30 / 50, Weaken 15 / 7.5 …). `weaponTypes`, `damageTypes`, `weaponTypeMultipliers` and `ammoTypeMultipliers` restrict or vary a buff by weapon; `stacks` can carry their own timing effects (Rat Pack). `buffForMode`, `resolveBuffMultiplier` and `resolveBuffEffects` in `src/lib/buffDatabase.ts` are the only places that apply this, and the store, `BuffToggle`, `EffectsPanel` and `EffectControls` all go through them. Sources: Blueberries' buff/debuff tables (general buffs, debuffs, surges), Clarity's perk text (weapon perks, exotic traits, PvE vs PvP in the `pve` / `pvp` classes) and the manifest's own descriptions. Audit changes (Oct 2026): Rampage was double (now 10/21/33.1%); Adrenaline Junkie 6.7% a stack; Bait and Switch 30%; Firing Line 20%; Successful Warm-Up and Desperado are timing perks, not damage; One-Two Punch (melee) and All at Once removed; Sever, Whisper of Hedrons, On Your Mark, Heat Rises no longer add damage; Sect of Force/Insight and Judgment removed; Disruption Break stacks with other debuffs and is kinetic-only; Worm Byproduct (Wormgod Caress) is a real +35%/+25% buff; added Helm of Saint-14, Gyrfalcon's Hauberk, No Backup Plans, Hazardous Propulsion, Prismatic Transfer, Felwinter's Helm, Flash Counter. Changing buffs.json also needs a `DATA_FORMAT_VERSION` bump and `npm run refresh-data` (perk links are written at parse time).
- **Exotic effects:** buffs in `src/data/buffs.json` can carry `critMultiplier` (crit only, relative to `multiplier`), `shotDelayMultiplier` and `chargeMultiplier`. `useWeaponStore.getWeaponEffects()` folds the active ones into a `WeaponEffects`, and `calculateTTK`, `calculateTTKCurve`, `calcDps` and compare snapshots take it as an optional last argument (`src/lib/weaponEffects.ts`). A perk gets a toggle in the Effects panel when its name is in a buff's `perkNames` (linked at parse time, so changing buffs.json needs a `DATA_FORMAT_VERSION` bump and `npm run refresh-data`). Numbers are the chart tab's modified value divided by its base value.
- **Exotic stat lookup:** `lookupWeaponStat(subType, ammo, intrinsic, weaponName)` matches an exotic's own sheet row by weapon name (ignoring case, punctuation and a leading "The"); before this, exotics reported their intrinsic ("Payday") and found no timing data at all.
- **Data health:** `scripts/data-health.ts` (logic in `src/lib/dataHealth.ts`) compares refreshed data with HEAD, prints a Markdown report into the refresh run summary and commit message, and fails the job if weapons, perks or stat rows vanish or a stat row is non-numeric.
- **Editor layout and naming:** desktop is two columns: left Weapon Perks, Perk Effects, External Buffs, God Roll + Wishlists & Saved Rolls; right Weapon Stats, Weapon Data (tabs Mods / Ammo / TTK / DPS / Subclass), Similar Weapons, Tier Lists. On mobile the columns dissolve (`display: contents`) and `order-N` classes in `editor/page.tsx` give one reading order: perks, stats, effects, buffs, weapon data, then the community panels. Every panel is a `CollapsiblePanel` card (Weapon Data included); sections inside a panel use an `h3` `text-sm font-bold text-ink-2`. Vocabulary: **Add to Compare** (desktop button, mobile "Add", toast "Added to Compare") is the compare action, **Save Roll** / **Saved Rolls** is a personal roll, **Weapons** is the list (sidebar and mobile nav). Settings toggles use the panel titles. Keep new panels to these rules.
- **Credits:** `src/data/credits.ts` is the single list of every outside source (data, formulas, art, libraries). The `/credits` page, the home footer (`SiteFooter`) and the in-panel notes (`SourceNote`: TTK/falloff, DPS, Weapon Stats, External Buffs, Tier Lists, God Roll, Ammo, weapon sources) are all built from it, and Settings links to it. `src/data/credits.test.ts` fails if a file is added to `public/data` or `src/data` without an entry in `DATA_FILE_CREDITS`, so a new data source can't ship uncredited. rockstarmatt's and MossyMax's sheets have no public link on file, so they are credited by name only; `perkTiers.json` is credited to Aegis on the assumption that it came from his perk tab.
- **Known leftover:** `useWeaponStore.loadWeapon` still records each weapon's roll in `weaponRolls` (and persists it) but only restores the mod; perk restore was removed in ed77958.

---

## Formula accuracy audit (what changed, what is still an estimate)

**Fixed (verified against Bungie's own data, with tests)**
- *Stat maths:* the manifest's `stats` are **display** values, but every modifier (perks, mods, masterwork, armour) is in **raw investment** units. Stats with a non-1:1 display curve (Magazine, Impact, RPM, Draw/Charge Time, Ammo Capacity…) were being added to as if both were the same unit — e.g. a sniper with Extended Mag showed 34 rounds (now ≈5), and a faster bowstring *raised* draw time. `src/lib/statCalc.ts` adds raw deltas to the raw base and re-interpolates through `DestinyStatGroupDefinition` (`Weapon.rawStats` + `displayCurves`, shipped as `statgroups.json`). Contributions are summed once and clamped once (no per-source clamping).
- *Masterwork Draw/Charge Time:* hard-coded −34/−33 ms replaced by the raw +10 so the curve gives the exact per-frame value.
- *Subtype mapping:* the stat spreadsheets number Sword/Grenade Launcher/Trace Rifle differently from Bungie (`src/lib/subtypes.ts`); Trace Rifles were reading Grenade Launcher data. Bow Reload is clamped at 85 like the reference engine.
- *TTK now includes reloads* when a kill needs more shots than the magazine (reload speed from the Reload stat).

**Still estimates / unverified (no ground truth available offline)**
- Range falloff: `archetypes.json` range curves are 3-point calibrations; falloff end distance and the damage floor are assumed (end = 2× ADS start, floor 0.5). The d2foundry oracle models start/end/floor per frame, but its data stops at patch 8.2.6 (May 2025) and disagrees with ours by up to ~18%.
- ADS range multiplier is derived from the Zoom stat; the oracle uses fixed per-archetype constants.
- Frame damage/timing data (huwugo / rockstarmatt, patch 9.7) is newer than the oracle's; refresh it when balance patches land.
- Perk audit stat values (`perkAudit.json`) mix display and raw units (Sneak Bow's draw time was corrected to raw); other audit magazine entries are unverified.
- Magazine for burst weapons snaps to multiples of the burst size in game; modifiers are applied as a curve *delta* on the displayed base, so results can be ±1–3 rounds off after perks.
- LFR charge-time damage penalty and PvP resilience HP table are not modelled / unverified.

---

## Community data sources (PvP wishlist, weapon sources)

- **PvP god rolls** — `public/data/pvp-wishlist.json`, built by `scripts/build-static-data.ts` from the r/CrucibleGuidebook community PvP DIM wishlist (Wunderkammern/CrucibleGuidebook-PVP-DIM-Wishlist, list by u/SirTurnUp). `src/lib/pvpWishlist.ts` collapses the per-combination `dimwishlist:` lines into recommended perks per column (matched to each weapon's own sockets by perk hash). In PvP mode the God Roll panel and the perk stars use it (`pvpGodRoll` in `lib/godRolls.ts`); hand-curated `pvp*` fields on a god-roll entry (admin editor) take priority. The larger blended list (CrucibleGuidebook + Pride Eternal + author favourites, ~14k lines) is not used: Pride's own sheet is ingested directly instead (below).
- **Pride Eternal's PvP sheet** — `public/data/pride.json`, built by the `pride` step of `scripts/build-static-data.ts` from the Legendary Weapons and Exotic Weapons tabs (`src/lib/prideSheet.ts`; only the gviz endpoint is readable, the CSV export returns 401). Same shape as `god-rolls.json`: frame, perks per column (ordered by PvP usefulness), origin, notes, tier S–F; exotics get tier plus how they do in Trials / Comp / Quickplay / vs DR / Duels. Variants are merged under the base name (best tier, combined perks), misspelled weapon and perk names are snapped to the real ones. **Tiers: Aegis's in PvE, Pride's in PvP** (`weaponTier` in `godRolls.ts`; the sidebar badges and sort follow the mode). PvP perk recommendations: hand-curated fields on the Aegis entry, then Pride, with empty columns filled from the CrucibleGuidebook wishlist (`pvpGodRoll`).
- **Roll vs meta** — `src/lib/rollScore.ts` scores the selected perks against the meta for the mode (`useMetaRoll`): trait columns 30% each, barrel and magazine 12%, origin and masterwork 8%; a top pick scores 100%, #2 85%, #3 70%, any other listed perk 55%, unlisted 0. Grades: 92+ God roll, 78 Great, 60 Good, 40 Mixed. Shown as a breakdown in the God Roll panel (with a suggestion per column) and as a badge on compare cards and saved rolls.
- **Weapon sources** — `public/data/sources.json` from Sax's "ALL Monument of Triumph Legendary Loot Sources" sheet (tabs Vendors / Destinations / Dungeons / Raids / Craftable Weapon Sources). `src/lib/weaponSources.ts` matches sheet names to weapons (exact → version-stripped → ≤2 edits for the sheet's typos). Shown in the weapon header (`WeaponSources`); Bungie's source text is the fallback.
- Both are refreshed by the daily `refresh-data` workflow. A failed fetch keeps the previous committed file instead of failing the build.
- **WeaponStat Chart (v2.1, patch 9.7.0.3):** `src/data/weaponStats.json` is generated from huwugo's sheet by the `weapon-stats` build step (`src/lib/weaponStatSheet.ts`; provenance in `weaponStatsMeta.json`). The numbers come from the sheet's **WeaponData** tab (damage *per projectile*, shot/burst delay in 30fps frames, charge ms, `shotsPerBurst` = bullets per trigger pull, `pellets` = projectiles per bullet: shotgun pellets, fusion bolts); the chart tab is only used for its banner/version and to name merged frames ("Adaptive / Lightweight") and renames. Engine rules follow the sheet: damage per trigger = per-projectile × bullets × pellets; charge/draw weapons assume the first shot is already charged, so TTK = (shots − 1) × (charge + recovery gap) and bows have no recovery gap. **The automated daily job skips the sheet while its "CURRENTLY UPDATING / INACCURATE" banner is up** — run `FORCE_WEAPON_STATS=1 npm run refresh-data` to ingest it anyway. The chart's own TtK column bakes in exotic-intrinsic effects and counts pellet hits as triggers, so agreement checks only make sense for plain frames (bows 5/9, Sniper 12/12, MG 6/6, HC 13/16, Pulse 11/14). Rows that look implausible and are worth checking against the game: Spread Shot hand cannons (12 pellets on a 120-damage hit) and Fusion Bastion (3 bullets × 12 pellets). `archetypes.json` (range curves, falloff-chart damage) is unchanged.
