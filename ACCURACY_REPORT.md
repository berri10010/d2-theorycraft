# D2 Theorycraft accuracy report: do the numbers match the game?

Nothing was fixed. This is the corrected second version: the first version overstated what the evidence showed, and every claim below was re-checked against the code and data.

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
First version only compared the scalars. The right comparison is the final PvE body damage per projectile: ours (`bodyDamage × combatantScalars`) against oracle (`pve_damage × combat scalar`), for the 65 frames both sides have:

| Enemy tier | median ours / oracle | range | within ±10 % |
|---|---|---|---|
| Minor | 1.66 | 0.56 to 2.79 | 5 of 65 |
| Major / Elite | 1.58 | 0.52 to 2.74 | 4 of 65 |
| Boss | 1.30 | 0.44 to 2.42 | 19 of 65 |

By type (Minor, median): Scout 2.31, Pulse 2.15, Auto 1.99, Sidearm 1.87, Combat Bow 1.85, Sniper 1.68, SMG 1.67, Trace 1.59, Linear Fusion 1.35, Fusion 1.31, Hand Cannon 1.16, Shotgun 1.14, Glaive 1.12, Machine Gun 1.07.

The scalars file (`src/data/combatantScalars.json`, MossyMax's sheet) has no date or source link on file (`src/data/credits.ts` says "No public link on file"). The gap could be that oracle's data is older, that the two use different baselines (the site normalises its power-delta curve to 1.0 at delta 0), or an error in one of them. **One in-game test (shots to kill a Minor with a known weapon) would settle which is right.** Until then, treat absolute PvE TTK and DPS as unverified, and relative comparisons between weapons as more trustworthy than the totals.

### X2b. Frames have their own PvE scalars; our model has one per weapon type *(structure confirmed, numbers may be outdated)*
The project owner points out that frames have different scalars, and that oracle_engine is right about that even if its numbers are old. Its data agrees, in two ways, and our model cannot express either:
- **PvE base damage differs per frame.** oracle gives every frame a `pve_damage` next to its PvP `damage`. The PvE / PvP ratio varies inside a type: 14 of 107 frames differ by more than 10 % from their type's median ratio. Legendary examples: Hand Cannon Precision 0.85×, Pulse Rifle Heavy Burst 0.79×, High-Impact 1.18×, Aggressive 1.16×, Scout Rifle Aggressive 1.32× and Lightweight 0.86×. (The extreme ones are exotics: Choir of One 3.7×, Rocket-Assisted sidearm 2.6×.)
- **Some frames use their own enemy scalars.** For example Fusion Rifle Aggressive Frame uses minor 3.14 / elite 2.93 against the type's 2.73 / 2.55 (+15 %); Grand Overture, Xenophage, Cerberus+1, Vex Mythoclast, Arbalest, Revision Zero, Wardcliff Coil, Eyes of Tomorrow, Anarchy and Parasite do too.
- **Our model:** `src/lib/damageMath.ts` line 339 and `src/lib/dpsCalc.ts` line 75 use `typeScalar(tier) × pveMultiplier(entry)`. The type scalar is the same for every legendary frame of a type (`combatantScalars.json`, "normalised to Major/Elite = 3.0"), and `pveMultiplier` is only filled in for the 13 exotics in `src/data/compendium.ts`. So a hand cannon Precision frame and a hand cannon Aggressive frame get the same PvE-over-PvP conversion.
- **What to do:** treat this as a model gap. The structure to add is a per-frame (and per-tier) PvE factor, like the one exotics already have. The values must come from a current source, because oracle's figures may be out of date. Until then, expect PvE numbers to be off by roughly 10 to 30 % for the frames listed above, relative to other frames of the same type.

## Confirmed bug (reproduced, with two independent sources)

### X3. Firing Line is precision-only, but our buff boosts all damage
- `src/data/buffs.json` `firing_line` is `multiplier: 1.2` with the description "+20% precision damage when within 15m of two or more allies".
- Clarity's text: "Being within 15 meters of 2 allies grants 20% increased Precision Damage". oracle_engine's code: `crit_scale: 1.2`, no change to body damage.
- Effect: with the buff on, body-shot damage, TTK and DPS are overstated by 20 %.
- **Fix:** `multiplier: 1`, `critMultiplier: 1.2` (the shape `catalyst_whispered_breathing` already uses).
- Scan scope: the other 93 buffs were checked only if their description mentions precision, headshots or crits and they have no crit multiplier; none besides Firing Line is a precision-only restriction (the other four hits use a precision hit as a trigger).

## Differences that need a look, but are probably not errors

### X4. Fusion Rifle, Aggressive frame: different bolt structure *(reproduced)*
Ours is 28.8 damage per bolt with 4 pellets × 3 bursts (345.8 per trigger); oracle is 54.0 per bolt with 7 bolts (377.9 per trigger). The per-trigger totals differ by 8.5 %, and the bolt structure differs, which may be a game patch or may be our data. Per-bolt numbers agree for the other fusion frames I compared (for example Adaptive 46.3 against 46.3). Other frames about 8 % or more apart: Combat Bow Wish-Ender (ours 21 % higher), Hand Cannon Lightweight (+12 %), Sidearm Forerunner (−11 %), Auto Rifle High-Impact (−8 %). These look like balance changes but are unexplained.

## Not compared
- The ADS multiplier. We use `(zoom + 7) / 14` with special cases; oracle uses fixed per-type values (hand cannon 1.5, auto rifle 1.6, pulse 1.7, SMG 1.4, sidearm 1.2).
- Magazine and reserve formulas.
- Perks other than the seven listed above.
- The exotic effects added in this session (Tempest Cascade, Nightsworn Sight, On Black Wings, The Right Choice) have no independent source other than Clarity text.
