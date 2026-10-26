# D2 Theorycraft bug report, round 2 (data, flows and tooling)

A third read-only pass, after `BUG_REPORT.md` and `CODE_REVIEW.md`. Nothing was fixed. Numbers here start at N so they do not clash with the other reports.

Marked **reproduced** (seen happening, or measured on the real data) or **by reading** (found in the code, not run).

## Data bugs

### N1. The "One For All" buff cannot be switched on from the perk *(reproduced)*
- `src/data/buffs.json` `one_for_all` lists `perkNames: ["One For All", "Enhanced One For All"]`. The actual perks are named `One for All` (lower-case "for"; hashes 859780267 and 4049631843, and `One for All Refit` 4204405033). Matching is by exact name, so in `public/data/perks.json` all three perks have `buffKey: null`. The Effects panel never offers the toggle for them.
- Nothing catches it: `src/lib/buffAudit.test.ts` only checks perks that *do* match a buff name.
- **Fix direction:** correct the name (and decide about the Refit perk), and add a test that every buff `perkNames` entry that is not an "Enhanced ..." name matches at least one real perk. Matching names case-insensitively would stop this whole class of mistake.
- 15 other buffs list `"Enhanced X"` names that exist on no perk (`getBuffKeyForPerk` is skipped for enhanced perks and the base perk is used instead; I checked 401 weapon and perk pairs and the enhanced version gives the same damage as the base). They are dead entries, harmless.

### N2. 28 god-roll entries can never match a weapon, and god rolls are not in the daily refresh *(reproduced)*
- `public/data/god-rolls.json` is looked up by exact name (`src/lib/godRolls.ts` `lookupGodRoll`: `db[weapon.name] ?? db[weapon.baseName]`). 28 of its 747 keys match no weapon:
  - 11 differ only in capitalisation: `Braytech Werewolf` (data: `BrayTech Werewolf`), `Braytech Osprey`, `Just In Case` (`Just in Case`), `Redback-5SI` (`Redback-5si`), `Arsenic Bite-4B`, `Lunulata-4B`, `IKELOS_HC_V1.0.3`, `IKELOS_SMG_V1.0.3` and so on.
  - 17 have a spreadsheet note inside the key, for example `"Prosecutor\nRotN version"`, `"Succession\nBRAVE version"`, `"Chattering Bone\nPantheon version"` (Rite of the Nine, Onslaught and Pantheon variants).
  - **Root cause:** `scripts/refresh-god-rolls.ts` line 105 uses the raw cell text as the key (`cellStr(c[1])`).
  - Those weapons show no god roll, no tier and no meta score.
- 9 perk names in the file do not exist on any perk, for example `Enhanced Heatsink` (High Tyrant, All or Nothing, Voltaic Shade).
- `npm run refresh-god-rolls` is a separate manual script, not part of `refresh-data`. The file was last changed on 2026-08-23, about two months ago, while the rest of the data refreshes daily.
- **Fix direction:** normalise keys in the script (first line only, trimmed; case-insensitive lookup), re-run it, and consider adding it to the daily workflow, or a test that every god-roll key resolves to a weapon.

### N3. Check: `golden_tricorn` stacks start at ×2 *(by reading)*
- Its `stacks` array has counts `2` and `3` (there is no ×1). Probably deliberate (the perk needs two kills), but it is the only buff whose first stack count is not 1, so check that the stack selector indexes correctly.

## Behaviour bugs

### N4. Wishlist import accepts almost anything and then forgets it *(reproduced)*
- A 9.7 MB wishlist is accepted (199,999 entries, about 4 s of frozen UI while it parses), works for the session, then is lost on reload. `WishlistPanel.tsx` stores the whole raw text in localStorage, the browser refuses it (about 5 MB limit) and the `try/catch` swallows the error. There is no message.
- A 3 MB binary file loads "successfully": the panel shows the file name with 0 entries and no error.
- A line like `dimwishlist:item=abc&perks=1,2,3` is accepted as a weapon (hash is not checked to be digits).
- **Fix direction:** warn when saving fails, store the parsed result compactly or the first N MB, reject files with 0 valid lines, and parse in a worker or in chunks.

### N5. Compare snapshots weigh about 24 KB each *(measured)*
- Four snapshots of one weapon took 97 KB of localStorage (`d2tc-compare`). With no cap, roughly 200 snapshots hit the browser quota (extends `CODE_REVIEW.md` item C).

### N6. Tier list store guards only in the UI *(by reading)*
- `src/store/useTierListStore.ts`: `createList(name)` replaces an existing list with the same name (it is `{...lists, [name]: {}}`), and `deleteList` of the last list leaves `pveModeList` pointing at a list that no longer exists. `TierListPanel.tsx` prevents both, but the store itself does not. Low.

## Tooling

### N7. Data build has no timeouts or retries *(by reading)*
- `scripts/build-static-data.ts`: `bungieGet`, `fetchTable` and the Clarity fetch call `fetch(...)` with no `AbortSignal.timeout` and no retry (the screenshot HEAD checks and the sheet fetches do have timeouts). One stalled connection hangs the daily `refresh-data` job until its 20-minute limit.
- `npm run build` runs `prebuild` (`npx tsx scripts/build-static-data.ts`), so a plain local `npm run build` needs `BUNGIE_API_KEY` and the network. CI uses `build:ci`, which has no such hook. This is easy to trip over.
- A failed step calls `process.exit(1)` after earlier steps have already written their files, so a local run can leave a half-updated `public/data`.

### N8. The audit scripts do not find a Linux Playwright Chromium *(reproduced)*
- `scripts/audit-a11y.mjs`, `audit-keyboard.mjs` and `audit-widths.mjs` search fixed Windows, macOS and `/usr/bin` paths and throw "No Chrome or Edge found" otherwise. They need `CHROME_PATH` (for example `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` here). Not documented in the script headers. Low.

## Checked and found fine in this round
- `npm run audit:a11y` (axe, both themes, desktop and phone): no violations. `audit:keyboard`: 16 of 16. `audit:widths`: 36 of 36. All three on the PR branch, which includes the new difficulty and roll-card UI.
- Phone viewport (390 px): weapon page, bottom navigation, Compare tab and More sheet all open and close correctly, no horizontal overflow, no console errors.
- Compare: adding four snapshots, moving, loading and removing them gave no errors.
- Weapon grouping: no group mixes weapon types (one group, `High Albedo`, mixes primary and special ammo variants), no duplicate hashes in any group.
- `pvp-wishlist.json`: all 80 entries resolve to weapons. `localIcons.json`: every local icon path exists.
- Buff database: no non-positive multipliers, stack multipliers never decrease, and PvP stack counts match PvE.
