# D2 Theorycraft bug report

Found by a read-only bug hunt on branch `claude/dazzling-thompson-ci58yr` (the code of PR #2). Nothing was fixed.

How it was checked:
- Every one of the 2,208 weapons was run through the calculation code (stats, perks, buffs, DPS, TTK, roll card).
- 170 weapons (all types, exotics included) were loaded in the real app with every data tab opened. No console errors, failed requests or NaN text appeared.
- 32 random-click runs (about 45 clicks each) were done on desktop and phone sizes.
- 21 hand-made share links were opened, and `next build`, `tsc`, `tsc --noUnusedLocals`, `validate-data` and `data-health` were run.

Each finding says whether it was **reproduced** (seen happening) or **by reading** (found in the code, not run).

## High

### 1. A stale or invalid share link gives a black page that says only "No weapons found."
- **Reproduced:** open `/editor?w=999` (or `?w=abc`). There is no sidebar and no editor, only the text "No weapons found." on a black page, with no explanation or way back.
- **Why:** `src/app/editor/page.tsx`
  - the auto-load effect (about line 188) returns early whenever `searchParams.get('w')` is set;
  - the restore effect (about line 213) returns when `weapons.find(...)` finds nothing.
  - So nothing ever loads a weapon.
- **Impact:** any shared link to a weapon whose hash later disappears (reissued or removed weapon) breaks the whole editor.
- **Fix direction:** if the hash is unknown, fall back to the default-weapon path, and show a small "that weapon was not found" notice.

### 2. `?ws=abc` puts NaN into the weapons stat, and it is saved
- **Reproduced:** open `/editor?w=3658188704&ws=abc`. The TTK panel shows "NaN/200 · +NaN%", "TTK NaNs", "Shots NaN". localStorage then holds `weaponsStat: null`.
- **Why:** `page.tsx` calls `setWeaponsStat(Number(wsParam))`. In `src/store/useWeaponStore.ts`, `setWeaponsStat` is `Math.max(0, Math.min(200, stat))`, which returns NaN for NaN. `setWeaponTier(NaN)` also stores NaN (reproduced in a unit test). `setSurgeStacks(9)` is accepted too.
- **Fix direction:** validate in the store setters (`Number.isFinite`, clamp, integer), not only at the call site.

### 3. DIM wishlist lines with `#notes:` never match
- **Reproduced:** `dimwishlist:item=100&perks=1,2,3#notes:Great for PvE` parses to perks `["1","2","3#notes:Great for PvE"]`, so `isWishlistMatch` is false. With `&tags=pvp#notes:hi` the tag becomes `pvp#notes:hi`.
- **Why:** `src/lib/wishlistParser.ts` passes the whole payload to `URLSearchParams`, so the `#notes:` suffix stays glued to the last value. Real DIM files (voltron.txt and similar) use `#notes:` heavily.
- **Impact:** in the Wishlist panel and god-roll matching, a large share of real entries silently never match.
- **Related:** `item=-69420` (DIM's "any weapon" wildcard) is skipped as an "exclusion list". That comment looks wrong, since -69420 is the wildcard for perk-only matches.
- **Fix direction:** cut the line at the first `#` before parsing, and keep the notes text separately if wanted.

### 4. The DPS panel ignores damage buffs
- **Reproduced:** with Well of Radiance active, the TTK panel shows ×1.25, but the DPS panel's Body 64.5 and Crit 115.7 are identical to before. (The DPS rows themselves were not read in that check, but they come from the same damage-per-trigger numbers.)
- **Why:** `calcDps` (`src/lib/dpsCalc.ts`) takes `WeaponEffects` (crit, shot delay, charge) but no damage multiplier, and `src/components/weapon/DpsPanel.tsx` never reads `getDamageMultiplier()`. Perks, surges, subclass buffs and exotic damage toggles therefore never change DPS.
- **Impact:** the Effects panel says buffs apply, and the DPS tab quietly disagrees with the TTK tab.
- **Fix direction:** pass the PvE or PvP multiplier into `calcDps` and apply it to the damage per trigger.

## Medium

### 5. The saved per-weapon roll is never restored
- **Reproduced (store test):** pick perks and a masterwork on A, load B, load A again, and the result is `selectedPerks: {}`, `masterworkStat: null`.
- **Why:** `loadWeapon` in `useWeaponStore.ts` (about lines 374-425) captures the old roll into `weaponRolls`, but when loading it only restores `saved.activeModId`. It sets `selectedPerks: fixedPerks` and `masterworkStat: null`, even though the comment says "saved user choices overlay on top".
- **Also:** `weaponRolls` is persisted (the `partialize` list) and grows without limit, and none of it is ever read back.
- **Fix direction:** overlay `saved.selectedPerks`, `masterworkStat`, `isCrafted`, `isEnhanced`, `armorMods`, `activeEffects` and `catalystActive` onto the defaults. Also cap or prune `weaponRolls`.

### 6. Permalinks drop non-standard masterworks
- **Reproduced:** `/editor?w=3621336854&mw=Draw%20Time` (a bow). The masterwork is not applied, and the address bar is rewritten without `mw`. `mw=Stability` is kept.
- **Why:** the restore effect only accepts values in `MASTERWORK_STATS`, which has 7 names (Impact, Range, Stability, Handling, Reload, Aim Assistance, Magazine). Bows, fusions, glaives, swords and grenade launchers use Draw Time, Charge Time, Accuracy, Blast Radius, Velocity, Swing Speed and so on. `buildRollParams` writes those names into the link, so Share produces links that cannot be loaded back.
- **Fix direction:** validate against `activeWeapon.masterworkOptions` instead of the fixed list.

### 7. `?b=` accepts unknown buff keys, and saves them
- **Reproduced:** `?w=3658188704&b=nope` leaves `activeBuffs: ["nope"]` in localStorage, and it stays on every later visit. The UI hides it, but it is counted in the active-buff list.
- **Fix direction:** keep only keys that exist in `BUFF_DATABASE`.

### 8. Copy roll link and Copy DIM entry throw when the clipboard is unavailable
- **Reproduced:** the stress test saw an uncaught `Failed to execute 'writeText' on 'Clipboard': Write permission denied`.
- **Why:** `page.tsx` (about lines 344 and 354) calls `navigator.clipboard.writeText(...).then(...)` with no `.catch`. On a non-secure page or in some embedded browsers `navigator.clipboard` is undefined, which is a synchronous TypeError.
- **Impact:** an unhandled error, with no feedback to the user, and the menu stays open.
- **Fix direction:** try/catch with a fallback, for example select-and-copy, or show the text so it can be copied by hand. `RollCardDialog` already handles this for images.

### 9. Pressing keyboard shortcuts inside a dropdown triggers them
- **Reproduced:** focus the Difficulty select on the DPS tab and press `2`. The page switches PvE to PvP. Pressing `c` opens Compare.
- **Why:** `src/hooks/useKeyboardShortcuts.ts` only treats `input` and `textarea` as typing. Add `select` to the check. This also hits the existing Enemy Type select.
- **Impact:** a keyboard user cannot type-ahead in a select without the site changing mode.

### 10. Sustained DPS can come out higher than optimal DPS
- **Reproduced:** about 138 weapons, for example A Sudden Death (sustained 354, optimal 338).
- **Why:** `dpsCalc.ts` computes the magazine time as `(magSize - 1) * timePerShot`, plus the reload. When the reload is shorter than one shot delay (shotguns and similar), the cycle is shorter than `magSize * timePerShot`, which is impossible because the next shot cannot come before the shot delay passes.
- **Fix direction:** the cycle time should be at least `magSize * timePerShot`, for example `Math.max(magDuration + reload, magSize * timePerShot)`.

### 11. Heat weapons have no DPS or TTK at all
- **Reproduced:** 17 Season 28 heat weapons (Voltaic Shade, Zealous Ideal, Uncivil Discourse, Bitter End, Vikala SMG4, Modified B-7 Pistol, M-17 "Fast Talker", Compact Defender, All or Nothing, High Tyrant, Conspiracy Honed and others) return `null` from `calcDps`. The DPS tab says "No timing data available for this archetype".
- **Why:** their frames are Balanced Heat Weapon and Dynamic Heat Weapon, with no Magazine stat (they use Heat Generated and Cooling Efficiency), and no timing rows. This is a feature gap, not a crash.

### 12. Permalinks do not carry all of the state
- **By reading:** `src/lib/shareRoll.ts` writes the weapon, perks, mode, masterwork, weapons stat, buff keys, tier and catalyst. It leaves out buff stack levels, toggled perk effects (`activeEffects`), the weapon mod, armor mods, and the new enemy tier, difficulty and power delta. A shared link shows the receiver different TTK and DPS numbers from the sender's.

## Low

### 13. Saved personal rolls can crash the panel
- **By reading:** `src/components/weapon/WishlistPanel.tsx`
  - `save` and `remove` call `localStorage.setItem` inside a `setRolls` updater with no try/catch. It throws when storage is full or blocked (private mode), and a throw in an updater breaks the render.
  - The load does `setRolls(JSON.parse(raw) as PersonalRoll[])` with no check. If the saved value is not an array, the next `prev.filter` throws.

### 14. Service worker caches error responses, and can respond with undefined
- **By reading:** `public/sw.js`. The network-first handler stores any response, including 404 and 500, with no `res.ok` check. The offline fallback `caches.match(request)` can return `undefined` into `respondWith`, which is a TypeError. If one data file loads fresh and another comes from an older cache, the app can see inconsistent files (weapons newer than perks).

### 15. Pseudo-stats leak into calculated stats
- **Reproduced:** `getCalculatedStats()` returns keys that are not stats across about 1,500 weapon and perk states, for example `Move Speed`, `Ready/Stow`, `Varies by subclass`, `Guard stats`, `Accuracy/Cone`, all with value 0. `scripts/validate-data.ts` already warns about them ("modifier will be silently ignored at runtime"). They are not shown in the UI today.

### 16. Subclass verb panel numbers are rough guesses
- **By reading:** `src/data/subclassVerbs.ts`
  - Damage comes from `impactToDamage` (`200 + impact * 58`), not from the real stat rows.
  - Some figures are hardcoded: "~35% of bullet damage" for Volatile is printed regardless of `VOLATILE_MULT`.
  - `rps`, `baseImpact` and `bulletsToProc` are computed or passed in and never used (TypeScript `noUnusedLocals` reports them).

### 17. Persisted store values are not validated on load
- **By reading:** a stale or tampered `enemyTier` leaves the select blank. An unknown `difficulty` makes `getPlDeltaMultiplier` read `TABLES[difficulty]` as undefined and throw. Unknown `activeBuffs` entries are kept (see 7).

### 18. A duplicate React key warning appeared once and could not be reproduced
- During a random-click run on 21% Delirium (desktop): "Encountered two children with the same key". Four more runs with different random seeds did not show it. The weapon data has no duplicate perk or mod names or hashes in any column, so the source is likely in a list keyed by a non-unique label (the Tier List or Similar Weapons rows are the first places to look).

### 19. Data and tooling odds and ends
- `scripts/validate-data.ts` warns: `archetypes.json` has no entries for subtype 23 (Grenade Launcher), and the five unrecognised stat names in 15.
- `weaponStats.json` row `Shotgun_s_Heavy Burst` has rpm 72 but a shot delay of 19 frames (≈95 rpm). All other non-burst rows agree within 15%.
- No ESLint config exists, yet the code is full of `// eslint-disable-next-line react-hooks/exhaustive-deps`. CI runs no lint step, so those comments protect nothing.
- Unused code reported by `tsc --noUnusedLocals --noUnusedParameters`: `StatCurveNode` (ComparisonGrid), `activeColor` (BuffToggle), `ARCHETYPE_LABELS` (DamageProfilePanel), `colName` (TierListPanel), `motion` import (WeaponHeader), and `VariantLabel` and `SeasonInfo` (parser.ts).

## Checked and found fine
- The production build (`next build`) passes with no warnings, and `tsc`, `vitest` (368 tests) and `validate-data` pass.
- 170 weapons loaded in the browser: no console errors, no failed requests, no NaN or undefined text, no horizontal overflow at 1400, 768, 390 and 320 px wide (home and editor).
- All 2,208 weapons: no non-finite stats, DPS or TTK in any perk, buff or masterwork combination, apart from items 2 and 10 above. The weapon data has no duplicate perk columns, perk hashes or icons missing.
- The malformed-link run (21 links): no crashes except items 1, 2 and 7. XSS-style input in `name=` is ignored, and search accepts special characters (`(`, `[`, `\`, `.*`, emoji) without errors.
- The roll card dialog passes axe-core (WCAG A/AA) and its keyboard handling.
