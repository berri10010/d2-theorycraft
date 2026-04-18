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
| Handling breakdown: surface Ready / ADS / Stow times as separate stats | ⬜ Pending |
| Damage vs Distance chart: interactive line chart showing actual damage values per meter (hip-fire vs ADS) | ⬜ Pending |
| Flinch resistance: show flinch resist derived from Stability + Health (0–100 → 0–10%); weapon stat can start at 0 in PvP; PvP damage bonus behaviour unchanged | ⬜ Pending |
| Perfect Draw Window: show exact window in seconds alongside Draw Time (Bows) | ⬜ Pending |
| Per-activity PvE scaling: Activity + Difficulty + Enemy Type dropdown scales all damage numbers; include custom option | ⬜ Pending |

#### 12B — Sharing & Presentation

| Task | Status |
|------|--------|
| Screenshot mode: Destiny-style weapon card renderer for social sharing | ⬜ Pending |
| Screenshot mode: multi-select (weapons can have more than one perk per column; only one active at a time) | ⬜ Pending |
| Share button: offer choice between "DIM Wishlist Item" and "Roll Permalink" | ⬜ Pending |

#### 12C — Perk & Annotation System

| Task | Status |
|------|--------|
| Community research annotations: show empirically verified perk values on hover | ⬜ Pending |

#### 12D — External Buffs Panel

| Task | Status |
|------|--------|
| Exotic armor selector in External Buffs panel | ⬜ Pending |
| — Hunter exotics: Foetracer, Knucklehead Radar, Mask of Bakris, Mechaneer's Tricksleeves, Oathkeeper, Sealed Ahamkara Grasps, Triton Vice, The Dragon's Shadow, Lucky Pants, Speedloader Slacks | ⬜ Pending |
| — Warlock exotics: Astrocyte Verse, Eye of Another World, Felwinter's Helm, Ballidorse Wrathweavers, Necrotic Grips, Ophidian Aspect, Mantle of Battle Harmony, Sanguine Alchemy, Wings of Sacred Dawn, Boots of the Assembler, Lunafaction Boots, Rain of Fire | ⬜ Pending |
| — Titan exotics: Eternal Warrior, Icefall Mantle, No Backup Plans, Actium War Rig, Doom Fang Pauldron, Hallowfire Heart, Lion Rampant, The Path of Burning Steps, Peacekeepers, Peregrine Greaves | ⬜ Pending |
| Add class-neutral buffs: Sect of Force, Sect of Insight, Blessing of the Sky, Disruption Break, Judgment, Tractor Cannon, Worm Byproduct, Spark of Frequency, Amplified, Ember of Tempering, Radiant, Weaken, Sever, Whisper of Hedrons, Thread of Ascent | ⬜ Pending |
| Add Hunter buffs: Flow State, On Your Mark, Moebius Quiver, Deadfall | ⬜ Pending |
| Add Warlock buffs: Empowering Rift, Well of Radiance, Heat Rises | ⬜ Pending |
| Add Titan buffs: Rally Barricade, Ward of Dawn, Sentinel Shield | ⬜ Pending |

#### 12E — Weapon Stats Panel Rework

| Task | Status |
|------|--------|
| Show ALL weapon stats in the Weapon Stats panel (e.g. Ammo Generation is currently missing) | ⬜ Pending |
| Make Airborne, Zoom, Ammo Gen, Recoil, Magazine display more compact | ⬜ Pending |
| Add recoil direction pie chart to the Recoil stat (like DIM / D2 Foundry) | ⬜ Pending |

#### 12F — Search Panel Rework (Homepage & Editor)

| Task | Status |
|------|--------|
| Filters in Search Panel function like D2 Foundry | ⬜ Pending |
| Allow perk/trait search: show every weapon with that perk; let user choose which column to filter by | ⬜ Pending |
| Recent searches shown on search focus; hidden when typing begins | ⬜ Pending |

#### 12G — Homepage & Navigation

| Task | Status |
|------|--------|
| Consolidate the three "go to editor" buttons into one: "Browse All Weapons" (no arrow) | ⬜ Pending |

#### 12H — UI / UX Polish

| Task | Status |
|------|--------|
| Improve tooltip GUI styling | ⬜ Pending |
| Retrieve weapon mods and masterworks from the Bungie API | ⬜ Pending |
| Adept/Craftable mutual exclusion: clicking Adept disables Craftable and vice versa (no double-disable bug) | ⬜ Pending |
| Move Weapon Stat row in PvE Masterwork & Mods panel into TTK & Falloff panel (mirrors PvP layout) | ⬜ Pending |
| Clear weapon perks when switching to a different weapon | ⬜ Pending |
| Combine "Armor Mods" and "Masterwork & Mods" panels into one panel | ⬜ Pending |
| Primary weapons show infinite reserves | ⬜ Pending |
| High-Impact Frame Combat Bows: surface Persistence and Velocity stats | ⬜ Pending |
| God Roll panel hidden when weapon has no god roll | ⬜ Pending |
| Add weapon acquisition info (how to obtain each weapon) | ⬜ Pending |
| Fixed-trait columns: if any column contains a perk that wouldn't appear as a fixed trait, show it in its own column as if fixed traits didn't exist | ⬜ Pending |
| Rename "Perk 3" label in Weapon Perks panel to "Origin Trait" | ⬜ Pending |
| When all perks are fixed: hide Effects panel; any perk with activation options can be toggled in the Weapon Perks panel with Clarity info shown | ⬜ Pending |
| Similar Weapons panel: show season number and year (e.g. "Echoes (Season 24, Year 7)") | ⬜ Pending |
| Improve intrinsic bonuses information display | ⬜ Pending |

**Stage 12 progress: 0%**

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
| 12 — Feature Backlog | 0% | Pending |
| **Overall** | **~92%** | |

---

## Checklist (Quick Reference)

### Ongoing
- [ ] Run `python3 build_perk_audit_json.py` after any override additions to `perkAudit.json`
- [ ] Push: `git push` — GitHub Actions handles build + deploy automatically

---

## Next Actions

> These are ordered by priority. Claude should start from the top.

Stage 12 is the active work. All sub-stages (12A–12H) are pending. Suggested starting order:

1. **12H** — UI/UX polish items that are self-contained and high-visibility (fixed-trait column layout, "Origin Trait" label, God Roll panel visibility, Similar Weapons season format, perk clear on weapon switch, adept/craftable mutual exclusion, primary weapon infinite reserves)
2. **12E** — Weapon Stats panel rework (missing stats, compact layout, recoil pie chart)
3. **12F** — Search panel rework (D2 Foundry-style filters, perk search, recent searches)
4. **12D** — External Buffs panel additions (class buffs + exotic armor selector)
5. **12G** — Homepage navigation consolidation
6. **12A** — Combat mechanics (handling breakdown, damage-vs-distance chart, flinch resist, perfect draw window, per-activity PvE scaling)
7. **12B** — Screenshot mode + share options
8. **12C** — Community research annotations

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

*Last updated: 2026-04-14 — Stage 11 complete. PvE damage model accuracy pass sourced from MossyMax's Outgoing Damage Scaling spreadsheet: per-archetype combatant scalars (20 weapon subtypes × 5 enemy tiers, normalised to Elite = 3.0), expanded enemy tiers (Minor / Major·Elite / Miniboss / Boss / Champion), and power-level delta scaling slider (δ −30 to +10 with presets) in both TTKPanel and TTKAndFalloffPanel. Commits 9a7dbe7 + ee21f5f.*
