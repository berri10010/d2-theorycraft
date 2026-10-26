# D2 Theorycraft code review: more bugs, performance, dead code, code quality

A second read-only pass, after `BUG_REPORT.md`. Nothing was fixed. Item numbers here start at A so they do not clash with the first report.

Each item says whether it was **measured / reproduced** or found **by reading**.

## New bugs

### A. The roll card can hang on "Drawing the card…" forever (new code in PR #2)
- **By reading:** `src/lib/rollCard.ts` `loadCardImage` uses `fetch` with no timeout or abort. `loadCardImages` waits for all of them (`Promise.all`), up to about 24 requests (every perk option, plus art and icons). One hung Bungie request keeps the dialog on "Drawing the card…" and the Save and Copy buttons stay disabled.
- **Fix direction:** an `AbortController` timeout per image (say 8 s). A failed image already draws as a blank, so this only needs the timeout.

### B. Every visit to the editor downloads and unpacks all weapon data again
- **By reading:** `src/store/useWeaponDb.ts` `fetchWeapons` has no "already loaded" check, and `src/app/editor/page.tsx` calls it in an effect on every mount. Navigating editor → credits → editor refetches the 5.4 MB `weapons.json` plus the three smaller files, and sets `isLoading: true` again, so the editor flashes its loading state. Concurrent calls are not de-duplicated either.
- **Fix direction:** return early when `weapons.length > 0` or a fetch is in flight; keep the promise in a module variable.

### C. Compare snapshots grow without limit and go stale
- **By reading:** `src/store/useCompareStore.ts`
  - `addSnapshot` has no cap, and every snapshot stores the whole unpacked weapon object (about 22 KB each on average in the unpacked data). About 200 snapshots is the 5 MB localStorage quota.
  - The weapon is a copy taken at that moment, so after the daily data refresh the comparison shows old perks and numbers with no indication.
- **Fix direction:** cap the count, store the weapon hash plus the roll and look the weapon up again on load.

### D. Share-link previews print the `mw` text from the link
- **By reading:** `src/lib/sharePreview.ts` puts `params.get('mw')` straight into the description (HTML-escaped, so no injection, but unbounded and not checked against the weapon). A crafted `?w=<real hash>&mw=<any text>` shows that text in Discord and similar previews under the site's name. Low severity.
- **Also:** old `/?w=...` links (the homepage redirector) get no preview at all, because the Worker only handles `/editor`.

## Performance

### E. Heavy first load on the editor *(measured, production build, no compression)*
- The editor downloads about 7.9 MB of JSON before it is usable: `weapons.json` 5.4 MB, `clarity.json` 849 KB, `pride.json` 574 KB, `perks.json` 464 KB, plus a 400 KB page chunk. Cloudflare will compress it on the wire, but it still has to be parsed.
- Main thread: first heading at about 2.0 s and network idle at 4.6 s on this machine. 7 long tasks (1.3 s total, worst 422 ms). With the CPU slowed 4× (a mid-range phone): 13 long tasks, 3.3 s total, worst 816 ms, first heading at 4.6 s.
- In Node the parse takes about 150 ms and `unpackWeapons` 34 ms, so most of the browser cost is JSON parsing and the first render of a 1,207-row list, not the unpack.
- **Fix direction:** load a small weapon index first (name, hash, type, ammo, element, icon) and fetch full weapon details only for the selected weapon; parse the big files in a Web Worker; load `clarity.json` and `pride.json` only when a panel that needs them opens.

### F. The homepage downloads all of `weapons.json` just to show a few cards
- **By reading:** `src/app/page.tsx` (about line 529) fetches the full 5.4 MB file and groups it to show featured weapons and search. It does not use `useWeaponDb`, so the editor then downloads it again. It also fetches `god-rolls.json` itself instead of the existing `useGodRolls` hook (`src/lib/useGodRolls.ts`).
- On the legacy-redirect path (`/?w=...`) the homepage starts these downloads and then redirects to the editor anyway.
- **Fix direction:** a small prebuilt `weapons-index.json` for the homepage and the editor's sidebar; use the hook.

### G. Every click re-renders far more than it needs to *(measured)*
- **By reading:** nine components call `useWeaponStore()` with no selector, so they re-render on *any* store change: `editor/page.tsx` (the 868-line root), `SearchSidebar`, `MasterworkPanel`, `ArmorModPanel`, `GodRollPanel`, `SimilarWeaponsPanel`, `SubclassVerbPanel`, `WishlistPanel`, `ComparisonGrid`.
- **Measured:** selecting a perk takes 37–69 ms to reach two painted frames on this machine, and 160–490 ms with the CPU slowed 4×. The first click after load was the slowest.
- `getCalculatedStats()` runs in about 7 places per change, and each call walks every perk of every column to pre-seed stat names (`useWeaponStore.ts` about line 548), which is also the source of the pseudo-stat leak in `BUG_REPORT.md` item 15.
- **Fix direction:** `useShallow` selectors like the newer panels already use; compute the calculated stats once (a selector or memoized store value) and share it.

## Dead code

### H. A whole unused subsystem (about 2,150 lines)
- `src/components/weapon/DamageProfilePanel.tsx` (243 lines) is not imported anywhere. It is the only user of `src/lib/weaponSystemAdapter.ts` (406 lines), which is the only user of the `weapon-system/` folder (1,508 lines of source and tests, its own `package.json`, its own lock file, jest and ts-jest dev dependencies, 292 KB). `tsconfig.json` has a path alias and an `exclude` just for it. The last real change to the panel was a styling commit.
- **Fix direction:** delete the three, and the `weapon-system` alias and `exclude` in `tsconfig.json`. Check with me first if the module is meant to come back.
- Also checked: `graphify-out/` (24 KB of tool output) is committed; it looks like generated output rather than source.

### I. Smaller dead code
- Never used anywhere: `RESILIENCE_HP` (`src/lib/archetypes.ts`), `BungieManifestResponse`, `BungieCollectibleDefinition`, `BungieStatDefinition` (`src/lib/bungie/bungieTypes.ts`), `WEAPON_STAT_SHEET_URL` (`src/lib/weaponStatSheet.ts`).
- About 80 more exports (mostly types and constants) are only used inside their own file. The count is harmless, but `export` can be dropped.
- Unused variables and imports from `tsc --noUnusedLocals`: listed in `BUG_REPORT.md` item 19.
- Several exports exist only for tests (`buffApplies`, `statBasis`, `parseSaxTab`, `splitNotes`, `gradeFor`); fine, just worth knowing.

## Code quality

### J. The same tables are copied several times
- `AMMO_LABELS = { 1: 'Primary', 2: 'Special', 3: 'Heavy' }` exists in `weaponFilters.ts` (exported but unused by the others), `WeaponHeader.tsx`, `page.tsx`, and as `AMMO_NUM_TO_STR` in `AmmoPanel.tsx`; `weaponStatSheet.ts` has the reverse map.
- Element colour maps (arc/solar/void/stasis/strand) are rebuilt in `WeaponHeader`, `SubclassVerbPanel`, `SimilarWeaponsPanel`, `app/page.tsx` and `WeaponListItem`.
- `lerp` is copied in `hooks/useAnimatedPath.ts` and `hooks/useAnimatedValue.ts`; `clamp` is local in `statCalc.ts` and `weaponSystemAdapter.ts`; `interpolate` exists in `chartMath.ts` and, from this session's difficulty work, in `plDelta.ts` (a different table shape, but near-identical code). `src/lib/math.ts` already exists for shared helpers.
- Several panels also repeat the same "stat tile" and "chip" markup.

### K. Very large files that do too much
- `src/lib/bungie/parser.ts` 1,160 lines, `app/admin/page.dev.tsx` 962 (dev only), `app/editor/page.tsx` 868 (share handling, URL sync, god-roll apply, header, dialogs and layout in one component with about 25 pieces of state and effects), `store/useWeaponStore.ts` 808 (persistence, roll memory, stat calculation, damage maths and buffs in one store).
- The URL read/write logic in `editor/page.tsx` is the part most worth pulling out; bugs 1, 2, 6, 7 and 12 in the first report all live there.

### L. No lint
- No ESLint config exists and CI runs none, yet the code has 19 `eslint-disable` comments for a rule (`react-hooks/exhaustive-deps`) that is never checked. Many effects and memos intentionally omit dependencies, and nothing verifies they do so safely.
- **Fix direction:** add `eslint-config-next` with the hooks rule, fix or justify what it flags, and run it in `ci.yml`.

### M. Comments and data that disagree with the code
- `useWeaponStore.ts` `loadWeapon` says saved choices are overlaid; they are not (first report, item 5).
- `src/lib/wishlistParser.ts` calls negative item IDs "exclusion lists"; in DIM the common `-69420` is the "any weapon" wildcard.
- `weaponStats.json` `Shotgun_s_Heavy Burst` has rpm 72 against a shot delay of 19 frames.

## What looked good
- Only one `any` in the whole of `src` (in `parser.ts`), no `@ts-ignore`, no TODO or FIXME left behind, and no leftover debug logging.
- Event listeners are added and removed in balance in all 9 files that use them, and the timers I checked are cleaned up.
- The production build is clean, `tsc` strict passes, 368 tests pass, and the Worker's link-preview code escapes its output and restricts the weapon hash to digits.
