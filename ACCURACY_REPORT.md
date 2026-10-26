# D2 Theorycraft accuracy report: do the numbers match the game?

The report itself changed no code. This is the corrected second version: the first version overstated what the evidence showed, and every claim below was re-checked against the code and data.

## Fix status

Fixed on `claude/dazzling-thompson-ci58yr`, one commit per item: **X3** (Firing Line), the **difficulty correction** (Raid & Dungeon and Master removed), and, partly, **X2b** (Aggressive Fusion Rifle only). Everything else is **waiting on your in-game measurements or decisions**: X1 (falloff), X2 and X2c (PvE scaling per weapon type), the rest of X2b (other frames), X4, the exotic PvE factors, and whether to add the Legendary Campaign curve. `npx tsc --noEmit`, `npm run lint` and `npx vitest run` pass.

**Method:** d2foundry's `oracle_engine` (open source, already credited on this site) was used as an *independent reference*, not as ground truth. Its data file `build_resources/weapon_formulas.json` and its perk code were compared with ours. Its data looks about a year old (the perk files are "year 1" to "year 7"), and it only *outputs* falloff start, end and floor numbers; the code that applies them to damage is not in that repository. Where we differ, the difference is a question to settle in game, not proof that we are wrong.

## Confirmed matches (re-verified with counts)

| Area | Evidence |
|---|---|
| Reload time, all 16 weapon types (grenade launchers split into special and heavy) | 170 comparisons (stats 0, 5, 10, 25, 40, 50, 60, 75, 90, 100). Largest difference 0.77 %, Combat Bow at stat 90 to 100 (our deliberate 85 clamp). Everything else within 0.2 %. |
| Handling ready, stow and ADS, all 16 types | 510 comparisons. Largest difference 0.3 % (rounding to milliseconds). |
| Perk numbers: Rampage 1.1 / 1.21 / 1.331, Kill Clip +25 %, Frenzy +15 %, Adrenaline Junkie and Swashbuckler +6.7 % per stack, Surrounded +40 % (swords +35 %), Killing Tally +10 % per stack (PvP half) | Read in oracle's perk code and compared with `src/data/buffs.json`. Only these seven perks were checked. |
| PvP body damage per projectile, by frame | 66 frames matched by name; 49 are within 3 %. |

## Claims from the first version that I am retracting

1. **"Snipers, bows and linear fusion rifles do not lose damage with distance" was wrong to call certain.** The only support was oracle_engine's data, which gives them a placeholder falloff start of 999 m. That shows how oracle models them, not how the game behaves. The project owner states that snipers and linear fusion rifles do have damage falloff through the Range stat, and our own data (`archetypes.json`, measured by huwugo and rockstarmatt) also gives them Range curves. I have no evidence that the falloff chart for those types is wrong, so I am not reporting it as a bug.
2. **"The game's PvE damage has been reworked since" was memory, not evidence.** Removed.
3. **"Shotguns lose almost all damage at range; oracle floor 0.001" was presented as a defect in ours.** The 0.001 is in oracle's data, but I could not confirm what the floor number means when applied (the applying code is not in that repository). Reported below only as an open difference.
4. **"No other buff has the Firing Line mistake"** was too strong: my scan only looked at buffs whose description mentions precision, headshots or crits.
5. **"Fusion Aggressive PvP damage is suspicious (0.53×)"** was a misreading; see X4.
6. The earlier chat summary said "wrong weapon types" and "invented end distance" with confidence. Both overstated the evidence, as above.

## Open differences (cannot be settled from the repo; each needs an in-game check)

### X1. How our falloff model compares with oracle's *(facts reproduced, which is right is unknown)*

- **Status:** **Waiting on user measurement.** Nothing changed: the falloff end (`adsFalloffStart * 2.0`), the 0.5 and 0.85 floors and the falloff section for every weapon type are as they were. Needed: in-game damage at a few distances for a hand cannon, a shotgun and a machine gun.
Facts, verified:
- **Falloff end.** `src/components/ui/TTKAndFalloffPanel.tsx` line 127 sets `maxDist = adsFalloffStart * 2.0`, and both the hip and ADS damage curves are drawn to that same end. No source for the 2.0 is cited. oracle's data gives each type its own end formula, and each mode (hip and ADS) has its own start and end. At Range 50, oracle's end is 1.29× its start for machine guns, 1.49× for hand cannons, 1.59× scouts, 1.70× SMGs, 1.81× sidearms and trace rifles, 2.03× pulse rifles, 2.27× glaives, 2.35× auto rifles, 2.40× fusion rifles and 2.77× shotguns. Our ADS curve ends at 2.0× its start, and our hip curve ends at about 3× its start (hip start × 2 × the ADS multiplier, for example 21.7 m to 65.1 m for a hand cannon at Range 50 with Zoom 14).
- **Floor.** `getFalloffFloor` (`src/lib/damageMath.ts` line 47) returns 0.5 for every type except Linear Fusion Rifle, 0.85. No source is cited in the code or in `plan.md`. oracle's floors: shotgun 0.001, hand cannon and glaive 0.33, trace rifle 0.4, fusion rifle 0.45, auto, pulse, scout, SMG, sidearm and machine gun 0.5, and 0.999 for sniper, bow, linear fusion, rocket and grenade launcher.
- **Start distances** (hip, at Range 0 / 50 / 100; ours first, from `archetypes.json`; oracle from `weapon_formulas.json`):

  | Type | Ours | Oracle |
  |---|---|---|
  | Auto Rifle | 13.0 / 18.0 / 23.0 | 10.8 / 17.0 / 23.2 |
  | Hand Cannon | 13.9 / 21.7 / 29.5 | 16.0 / 20.5 / 25.0 |
  | Pulse Rifle | 13.5 / 19.6 / 25.7 | 16.0 / 19.8 / 23.5 |
  | Sidearm | 9.0 / 13.6 / 18.3 | 11.0 / 13.0 / 15.0 |
  | SMG | 9.5 / 13.5 / 17.5 | 10.3 / 13.6 / 16.8 |
  | Scout Rifle | 20.0 / 35.2 / 50.4 | 30.2 / 38.1 / 45.9 |
  | Fusion Rifle | 8.0 / 12.5 / 17.0 | 10.7 / 12.8 / 14.8 |
  | Shotgun | 4.5 / 7.5 / 12.0 | 3.8 / 5.2 / 6.7 |
  | Machine Gun | 15.0 / 24.0 / 38.0 | 28.5 / 29.6 / 30.7 |
  | Trace Rifle | 11.0 / 19.0 / 30.0 | 14.8 / 19.8 / 24.9 |
  | Glaive | 13.5 / 19.0 / 24.5 (the shared default curve) | 15.0 / 17.7 / 20.5 |

  Sniper, bow, linear fusion, rocket and grenade launcher: oracle has no start (placeholder 999 m); ours has curves for sniper, bow and LFR (for example sniper 40 / 65 / 100 m), the default placeholder curve for rocket, and no Range curve for grenade launchers.
- Differences of more than about 20 % at some Range values: machine gun, shotgun, scout, trace rifle and hand cannon at the ends of the range. Auto rifle, pulse, SMG, sidearm and fusion are close.

What this does not tell us: whether our start curves (measured data) or oracle's (older formulas) are right, what the end and floor really are in the current game, or whether sniper, bow, LFR, rocket and grenade launcher falloff should be shown. **A short in-game test of damage at a few distances for one hand cannon, one shotgun and one machine gun would settle most of this.**

### X2. Enemy damage: our PvE numbers are about 1.7× oracle's on a typical weapon *(measured, which is right is unknown)*

- **Status:** **Waiting on user measurement.** Nothing changed. It depends on X2c: the in-game shots-to-kill test there settles this too.
First version only compared the scalars. The right comparison is the final PvE body damage per projectile: ours (`bodyDamage × combatantScalars`) against oracle (`pve_damage × combat scalar`), for the 65 frames both sides have:

| Enemy tier | median ours / oracle | range | within ±10 % |
|---|---|---|---|
| Minor | 1.66 | 0.56 to 2.79 | 5 of 65 |
| Major / Elite | 1.58 | 0.52 to 2.74 | 4 of 65 |
| Boss | 1.30 | 0.44 to 2.42 | 19 of 65 |

By type (Minor, median): Scout 2.31, Pulse 2.15, Auto 1.99, Sidearm 1.87, Combat Bow 1.85, Sniper 1.68, SMG 1.67, Trace 1.59, Linear Fusion 1.35, Fusion 1.31, Hand Cannon 1.16, Shotgun 1.14, Glaive 1.12, Machine Gun 1.07.

The scalars file (`src/data/combatantScalars.json`, MossyMax's sheet) has no date or source link on file (`src/data/credits.ts` says "No public link on file"). The gap could be that oracle's data is older, that the two use different baselines (the site normalises its power-delta curve to 1.0 at delta 0), or an error in one of them. **One in-game test (shots to kill a Minor with a known weapon) would settle which is right.** Until then, treat absolute PvE TTK and DPS as unverified, and relative comparisons between weapons as more trustworthy than the totals.

### X2b. Per-frame PvE scalars: the two sources disagree, and our file has neither *(checked against both sources)*

- **Status:** **Partly fixed** in 56056b6, Aggressive Fusion Rifle only: x1.151 PvE damage against Elite and x1.149 against Minor, through the existing `pveTierMult` mechanism, so TTK and DPS both use it (tests cover both). Every other frame row in the sheet (Cerberus +1, Revision Zero, Bastion, Vex Mythoclast, New Land Beyond, Lorentz Driver and so on), the sub-family PvE bonuses and oracle's other per-frame differences are **waiting on your decision and in-game checks**.
The project owner says frames have different scalars and that oracle_engine is right about that even if its numbers are old.
- **oracle_engine (about 2024):** every frame has its own `pve_damage`; 14 of 107 frames differ by more than 10 % from their type's median PvE / PvP ratio (Hand Cannon Precision 0.85×, Pulse Heavy Burst 0.79×, High-Impact 1.18×, Aggressive 1.16×, Scout Aggressive 1.32× and Lightweight 0.86×), and some frames use their own enemy scalars.
- **MossyMax's current "Weapon Combatant Scaling" tab (the source of our file; its sheet dates from 2025-02-20 and says "LOTS OF THIS IS PRETTY OUTDATED"):** its own text says "Every weapon archetype has a different scaling, but the scaling is consistent across frames within an archetype, e.g. precision scouts will scale the same as high impact scouts. Most exotics also behave like their frame." But the tab does have separate rows for individual frames and exotics: **Aggressive Fusion Rifle (minor 4.08 / elite 3.81 against the Fusion Rifle's 3.55 / 3.31, about +15 %, the same +15 % oracle shows)**, Cerberus +1, Revision Zero, Bastion, Vex Mythoclast (and its LFR mode), New Land Beyond, Lorentz Driver, Arbalest, Rocket Sidearm, Two-Tailed Fox, Wardcliff Coil, Eyes of Tomorrow, Xenophage and Grand Overture. The sheet's own text also lists "PvE damage bonus" values per sub-family (pellet shotguns 1.107×, Dead Man's Tale 1.2×) that apply to all damage.
- **Our file:** `src/data/combatantScalars.json` has one row per weapon *type* (15 types) and none of those frame or exotic rows. So the Aggressive Fusion Rifle +15 % and the other listed frames are missing, and nothing models the sub-family bonuses. `pveMultiplier` (`weaponStats.ts`) is filled in only for the 13 exotics in `compendium.ts`.
- The per-frame PvE/PvP differences in oracle_engine's file could be outdated; MossyMax's 2025 text says archetype scaling is consistent across frames. I cannot tell from here which frames differ in the current game. The Aggressive Fusion Rifle row is the one case where both sources agree.

### X2c. Our scalar file is the source tab with each type's Elite value removed *(verified, 15 of 15 types)*

- **Status:** **Waiting on user measurement.** `combatantScalars.json` is unchanged. A standalone script, `scripts/elite-scalar-compare.ts` (run with `npx tsx scripts/elite-scalar-compare.ts`; not in CI, not wired into the app), prints our PvE damage against an Elite per shot next to what the source tab's own Elite value would give, with shots to kill, for one reference frame per type. Needed: shots to kill a known Elite with a pulse rifle and with a hand cannon.
`combatantScalars.json` is exactly MossyMax's "Weapon Combatant Scaling" numbers (vehicle, boss, champion, miniboss, elite, minor) **divided by that type's Elite value and multiplied by 3.0**: all 15 types match to within 0.004. That is what `plan.md` means by "normalised to Major/Elite = 3.0". The effect is that every type gets the same absolute PvE damage against an Elite (PvP × 3.0), while the sheet's Elite values differ a lot by type:

| Type | Source tab Elite value | Our file |
|---|---|---|
| Pulse Rifle | 1.70 | 3.0 |
| Auto Rifle | 1.78 | 3.0 |
| Scout Rifle | 1.85 | 3.0 |
| Linear Fusion | 1.93 | 3.0 |
| SMG | 1.99 | 3.0 |
| Bow | 2.03 | 3.0 |
| Trace Rifle | 2.04 | 3.0 |
| Sidearm | 2.15 | 3.0 |
| Machine Gun | 2.83 | 3.0 |
| Shotgun | 2.88 | 3.0 |
| Glaive | 3.00 | 3.0 |
| Hand Cannon | 3.08 | 3.0 |
| Fusion Rifle | 3.31 | 3.0 |
| Sniper Rifle | 3.43 | 3.0 |
| Rocket Launcher | 5.00 | 3.0 |

- **Why this might be fine:** the sheet's PvE damage is a product of several factors (PvE bonus, recommended-power multiplier, delta, combatant scalar), and the CSV export lost the header rows, so I cannot tell whether another factor already cancels the per-type difference. The original author may have normalised on purpose.
- **Why it might not be:** the gap between our PvE numbers and oracle_engine's at Elite tracks this table. Our numbers are about 2.3× oracle's for scouts, 2.0× for pulse rifles and 1.85× for auto rifles (the types with the lowest Elite values), and about 1.1× for glaives, shotguns and machine guns (Elite near 3.0). Correlation between "our gap" and "3.0 / source Elite" across 14 types: r = 0.61. That is moderate evidence, not proof, and part of the gap is data age (for example oracle's sniper Elite is 1.55 against 3.43 in the sheet).
- If the per-type Elite value should be kept, our PvE results would be too high for pulse, auto, scout, SMG, bow, trace, sidearm and LFR (by up to 1.76×) and too low for sniper (0.87×) and rockets (0.6×).
- **Needs one in-game measurement or a question to MossyMax.** The measurement: shots to kill a known Elite with a pulse rifle and with a hand cannon. If both match PvP × 3.0, the normalisation is right.

## Confirmed bug (reproduced, with two independent sources)

### X3. Firing Line is precision-only, but our buff boosts all damage

- **Status:** **Fixed** in a410d65. `firing_line` is now `multiplier: 1` with `critMultiplier: 1.2`, so body shots are untouched and precision hits are 1.2x in both the TTK and DPS maths. The audit test that pinned the old 1.2 now checks the corrected shape.
- `src/data/buffs.json` `firing_line` is `multiplier: 1.2` with the description "+20% precision damage when within 15m of two or more allies".
- Clarity's text: "Being within 15 meters of 2 allies grants 20% increased Precision Damage". oracle_engine's code: `crit_scale: 1.2`, no change to body damage.
- Effect: with the buff on, body-shot damage, TTK and DPS are overstated by 20 %.
- **Fix:** `multiplier: 1`, `critMultiplier: 1.2` (the shape `catalyst_whispered_breathing` already uses).
- Scan scope: the other 93 buffs were checked only if their description mentions precision, headshots or crits and they have no crit multiplier; none besides Firing Line is a precision-only restriction (the other four hits use a precision hit as a trigger).

## Differences that need a look, but are probably not errors

### X4. Fusion Rifle, Aggressive frame: different bolt structure *(reproduced)*

- **Status:** **Waiting on user measurement.** Nothing changed; it is a balance-change-or-data question, not a clear bug.
Ours is 28.8 damage per bolt with 4 pellets × 3 bursts (345.8 per trigger); oracle is 54.0 per bolt with 7 bolts (377.9 per trigger). The per-trigger totals differ by 8.5 %, and the bolt structure differs, which may be a game patch or may be our data. Per-bolt numbers agree for the other fusion frames I compared (for example Adaptive 46.3 against 46.3). Other frames about 8 % or more apart: Combat Bow Wish-Ender (ours 21 % higher), Hand Cannon Lightweight (+12 %), Sidearm Forerunner (−11 %), Auto Rifle High-Impact (−8 %). These look like balance changes but are unexplained.

## Correction to a feature I added: the Raid & Dungeon and Master difficulty curves are outdated *(verified)*

- **Status:** **Fixed** in 4a1edef. The Raid & Dungeon and Master options are removed (both Difficulty selects, `DIFFICULTY_OPTIONS`, the `Difficulty` type, the store field, `difficultyCurves.json` and its credit); `getPlDeltaMultiplier(delta)` and `fmtPlDelta(delta)` take one argument; an old saved `difficulty` is ignored on load. The enemy tier and power delta controls stay, and the Standard curve matches the compendium (-30 = 0.446, -50 = 0.144; a test pins it). The "Legendary Campaign" curve is **not added: waiting on your decision**. `plan.md` is updated.
The difficulty selector in PR #2 uses Raid & Dungeon and Master tables copied from oracle_engine (`src/data/difficultyCurves.json`). They are the **old** tables:
- MossyMax's sheet prints the identical numbers (Normal / RAD / Master at -30: 0.591 / 0.563 / 0.535; at -50: 0.500 / 0.495 / 0.490) under the heading **"OUTDATED, SEE PL DELTA TAB"**.
- The sheet's current "PL Delta and Activity Scaling" tab has only two curves, **"EoF Standard"** (the one our site already uses) and **"Legendary Campaign"**. No Raid or Master curve.
- The Destiny Data Compendium front page gives the current numbers: -30 delta = 0.446× outgoing damage, -50 = 0.144×. Our Standard curve gives 0.446 and 0.143 (matches). The Raid and Master options give 0.563 / 0.535 at -30 and 0.495 / 0.490 at -50, which is up to 3.4× too generous.
- So choosing Raid & Dungeon or Master changes PvE numbers away from the current, correct curve. **Recommended: remove those two options** (`DIFFICULTY_OPTIONS` in `src/lib/plDelta.ts`, the selectors in `TTKAndFalloffPanel.tsx` and `DpsPanel.tsx`, `src/data/difficultyCurves.json`, the store field and tests), or replace them with the sheet's real second curve, "Legendary Campaign". Measured from the tab: it is identical to Standard at -50 and below, and lower from -49 up to 0. Normalised the way the site does (delta 0 of Standard = 1.0), Standard / Legendary Campaign is 1.000 / 0.850 at delta 0, 0.802 / 0.687 at -10, 0.617 / 0.534 at -20, 0.446 / 0.393 at -30 and 0.288 / 0.263 at -40 (Legendary Campaign is 0.85× Standard at level, rising to 1.0× at -50). The tab covers deltas -100 to 0 only.
- The sheet's "Activity Types and Levels" tab has per-activity recommended power and deltas, but for the previous game version (power 1900 to 2060). The only current-system row is "EoF Firing Range" at power 10. So named activity presets for today's game still have no source.
- I also should not have written "No per-activity list exists" as a limitation earlier without finding this sheet; the old activity list does exist, it just does not describe the current game.

## Open question on the exotic PvE factors *(source note)*

- **Status:** **Waiting on user measurement.** The 11 factors and the two rocket rows are unchanged. This depends on X2c; ask again once that is settled.
The compendium's front page says its PvE damage values are "scaled to Elite Combatants in the Shooting Range, 0 Weapons, and Normal Difficulty Delta (0)". `src/data/compendium.ts` derives each exotic's factor as `PvE / (PvP × the type's Minor scalar)`. If the figures really are Elite-scaled, the divisor should be the Elite value and the factors change:

| Exotic | Current factor | If Elite-scaled |
|---|---|---|
| Arbalest | 1.39 | 1.47 |
| Bastion | 1.36 | 1.45 |
| Buried Bloodline | 1.75 | 1.96 (outside the 1.0 to 1.8 band the author used to accept a factor) |
| Crimson | 1.21 | 1.24 |
| Euphony | 1.41 | 1.49 |
| Final Warning | 1.40 | 1.57 |
| Ice Breaker | 1.27 | 1.85 (outside the band) |
| Lorentz Driver | 1.21 | 1.28 |
| Malfeasance | 1.56 | 1.60 |
| New Land Beyond | 1.43 | 2.09 (outside the band) |
| The Last Word | 1.33 | 1.36 |

The Wardcliff Coil and Eyes of Tomorrow rows use the rocket Minor scalar (3.6) the same way. I could not tell from the compendium alone which tier its numbers use; this ties directly to X2c, because the right divisor depends on how Elite is defined.

## Not compared
- The ADS multiplier. We use `(zoom + 7) / 14` with special cases; oracle uses fixed per-type values (hand cannon 1.5, auto rifle 1.6, pulse 1.7, SMG 1.4, sidearm 1.2).
- Magazine and reserve formulas.
- Perks other than the seven listed above.
- The exotic effects added in this session (Tempest Cascade, Nightsworn Sight, On Black Wings, The Right Choice) have no independent source other than Clarity text.
