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
**Stack:** Next.js static export → GitHub → Vercel. No SSR, no API routes. All Bungie API calls are client-side.  
**Workspace (local):** `C:\Users\husse\Documents\d2-theorycraft`

The site is a Destiny 2 weapon theorycrafting tool. Users can browse weapon perks, simulate god rolls, and inspect damage/TTK calculations. The ongoing work has three tracks:

1. **Perk Audit** — verify and correct the stat/activation data for all 415 weapon perks in `src/data/perkAudit.json` using the live Clarity community database as ground truth.
2. **UI Enhancements** — surface the corrected perk data in the EffectsPanel and other components (TTA badges, stat modifier display, comparison grid).
3. **Weapon System Module** — a standalone TypeScript architecture (`weapon-system/`) implementing a component-based heterogeneous stat system. Built and committed; integration into the main site is pending.

---

## Implementation by Stages

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
| VERIFIED_OVERRIDES — Tier 2 cleanup (29 artifact entries with wrong auto-parsed stats) | ⬜ Pending |
| VERIFIED_OVERRIDES — Remaining 52 Unknown TTA entries (41 artifacts + 11 real perks) | ⬜ Pending |
| Tier 4 (107 fully empty entries) — already empty, verify none are real perks needing data | ⬜ Pending |

**Stage 1 progress: 65%**

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
| **Uncommitted changes** in `ComparisonGrid.tsx`, `TTKAndFalloffPanel.tsx`, `RollEditor.tsx` — review and commit | ⬜ Pending |
| Stat modifier display in EffectsPanel (show +X Handling etc. from perkAudit) | ⬜ Pending |
| Enhanced perk tooltip: show Clarity notes + source badge | ⬜ Pending |

**Stage 2 progress: 55%**

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
| Write unit tests for each strategy and WeaponFactory validation paths | ⬜ Pending |
| Integration: wire `weapon-system` damage output into the site's TTK calculator | ⬜ Pending |
| Document extension pattern (adding weapon type #6 end-to-end example) | ⬜ Pending |

**Stage 3 progress: 65%**

---

### Stage 4 — Perk Audit Cleanup (detail of Stage 1 pending work)
Clear artifact entries and fix the 11 real perks that still have wrong data.

| Task | Status |
|------|--------|
| Add overrides for 28 Tier 2 artifact entries (clear wrong auto-parsed stats) | ⬜ Pending |
| Add proper entry for `Accelerated Heatsink` (Tier 2 — only real perk in that tier) | ⬜ Pending |
| Add overrides for 41 Unknown-TTA artifact entries | ⬜ Pending |
| Fix 11 real Unknown-TTA perks: Bolt Scavenger, Charged Bolts, Detonator Beam, Energy Transfer, Explosive Bolts, Frame of Reference (parent), Rapid-Fire Frame, Spread Shot, Spring-Auger Bolts | ⬜ Pending |
| Regenerate `perkAudit.json` after all overrides added | ⬜ Pending |
| Verify: Unknown TTA count drops to ~0 | ⬜ Pending |

**Stage 4 progress: 0%** *(blocked on adding overrides to `build_perk_audit_json.py`)*

---

## Overall Progress

| Stage | Progress | Notes |
|-------|----------|-------|
| 1 — Data Pipeline | 65% | Audit cleanup (Stage 4) is the open gap |
| 2 — UI Enhancements | 55% | 3 components have uncommitted changes |
| 3 — Weapon System Module | 65% | Tests + site integration pending |
| 4 — Perk Audit Cleanup | 0% | Self-contained; see `claude_perk_audit_prompt_v2.txt` |
| **Overall** | **~47%** | |

---

## Checklist (Quick Reference)

### Must do before next deploy
- [ ] Review + commit `ComparisonGrid.tsx`, `TTKAndFalloffPanel.tsx`, `RollEditor.tsx`
- [ ] Run `python3 build_perk_audit_json.py` after any override additions
- [ ] Push: `git push` from `C:\Users\husse\Documents\d2-theorycraft`

### Perk audit cleanup (Stage 4)
- [ ] Add 28 Tier 2 artifact overrides to `build_perk_audit_json.py` VERIFIED dict
- [ ] Add `Accelerated Heatsink` proper entry
- [ ] Add 41 Unknown-TTA artifact overrides
- [ ] Fix 11 real Unknown-TTA perks (Bolt Scavenger, Charged Bolts, Detonator Beam, Energy Transfer, Explosive Bolts, Frame of Reference, Rapid-Fire Frame, Spread Shot, Spring-Auger Bolts)

### Weapon system (Stage 3)
- [ ] Write tests: `weapon-system/src/__tests__/`
- [ ] Integrate `weapon-system` damage output into TTK calculator

### UI (Stage 2)
- [ ] Stat modifier pills in EffectsPanel
- [ ] Clarity notes tooltip

---

## Next Actions

> These are ordered by priority. Claude should start from the top.

1. **Review the 3 uncommitted component changes** (`ComparisonGrid.tsx`, `TTKAndFalloffPanel.tsx`, `RollEditor.tsx`) — diff each one, understand what changed, commit if clean or flag issues.

2. **Stage 4 perk audit cleanup** — open `build_perk_audit_json.py`, add all artifact overrides and the 11 real-perk fixes per the spec in `claude_perk_audit_prompt_v2.txt`, then regenerate `perkAudit.json`.

3. **Commit + push** the updated `perkAudit.json` so Vercel deploys it.

4. **Weapon system tests** — write tests for `WeaponFactory` validation (invalid stats throw `StatValidationError`) and each `DamageStrategy.compute()` (known input → known output). Save to `weapon-system/src/__tests__/`.

5. **Stat modifier pills in EffectsPanel** — for conditional perks that have `statModifiers` in perkAudit, render small grey pills (e.g. `+100 Reload Speed`) alongside the TTA badge.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `src/data/perkAudit.json` | Per-perk audit data (generated — do not hand-edit) |
| `src/data/buffs.json` | Damage multiplier definitions per buff key |
| `src/types/weapon.ts` | TypeScript interfaces including `PerkActivation` |
| `src/lib/bungie/parser.ts` | Bungie manifest parser — merges perkAudit on top |
| `src/components/weapon/EffectsPanel.tsx` | Conditional perk display + TTA badges |
| `build_perk_audit_json.py` | Generates perkAudit.json from Clarity + VERIFIED dict |
| `weapon-system/src/` | Standalone weapon stat architecture module |
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
git push   # Vercel auto-deploys on push to main
```

**Valid `ttaCategory` values:**  
`Instant-Always` | `State-Based` | `Kill-Proc` | `Reload-Proc` | `Melee-Proc` | `Shot-Proc` | `Wind-Up` | `Orb-Proc` | `Ability-Proc` | `Ammo-Proc` | `Conditional State`

---

*Last updated: 2026-04-11 — Session completed weapon-system module (committed `8215a4c`), perk audit Tier 1 + Tier 3 overrides. Stage 4 cleanup and 3 uncommitted components are the immediate next actions.*
