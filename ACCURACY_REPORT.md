# D2 Theorycraft accuracy report: do the numbers match the game?

The earlier reports asked whether the code is consistent. This one asks whether the calculator's *numbers* are right. Nothing was fixed.

**Method:** d2foundry's `oracle_engine` (the open-source Destiny 2 damage engine this site already credits) was used as an independent reference. Its data file `build_resources/weapon_formulas.json` has per-weapon-type and per-frame formulas for reload, handling, range falloff, magazine, damage and enemy damage scalars, and its perk code has the perk numbers. I ran our code against it for every weapon type.

**Caveat:** oracle_engine's data looks like it dates from roughly 2024 (its perk files are "year 1" to "year 7"). Where we differ, it is possible that *we* are the newer and correct one. The findings below say which differences are certain (they follow from how the game works, or from the perk's own description text) and which need an in-game check.

## What matches (good news)

| Area | Result |
|---|---|
| Reload time formulas, all 16 weapon types | Match at stats 0 to 100. Biggest difference 0.8 % (Combat Bow at 100, from our deliberate 85 clamp). |
| Handling (ready, stow, ADS) formulas, all types | Match. |
| PvP damage per shot, per frame (66 frames compared) | 49 of 66 within 3 %; the rest are in the list below. |
| Perk numbers: Rampage ×1.1/1.21/1.331, Kill Clip +25 %, Frenzy +15 %, Adrenaline Junkie and Swashbuckler +6.7 % per stack, Surrounded +40 % (swords +35 %), Killing Tally | Match oracle_engine and Clarity. |

## Differences

### X1. The falloff model is invented, and it is wrong for several weapon types *(reproduced, certain for part of it)*
`src/lib/damageMath.ts` and `src/components/ui/TTKAndFalloffPanel.tsx` build the "Damage Falloff" and "TTK vs distance" charts from a single falloff start, a made-up end and a made-up floor:
- **End:** the damage reaches its floor at `maxDist = 2 × (ADS start)` (`TTKAndFalloffPanel.tsx` line 127). oracle_engine has a separate end formula per type, and the end is 1.3× to 2.8× the start depending on type (hand cannon about 1.5×, auto rifle 2.3×, shotgun 2.8×, machine gun 1.3×).
- **Floor:** `getFalloffFloor` (`damageMath.ts` line 47) returns 0.5 for every weapon type except Linear Fusion Rifle (0.85, hardcoded, no source). oracle_engine's per-type floors:

  | Type | Ours | Oracle |
  |---|---|---|
  | Shotgun | 0.5 | 0.001 (damage falls to almost nothing) |
  | Hand Cannon, Glaive | 0.5 | 0.33 |
  | Trace Rifle | 0.5 | 0.4 |
  | Fusion Rifle | 0.5 | 0.45 |
  | Sniper Rifle, Combat Bow, Linear Fusion, Rocket, Grenade Launcher | 0.5 (LFR 0.85) | 0.999, which means **no damage falloff** |

- **Certain, whatever the data age:** snipers, bows and linear fusion rifles do not lose damage with distance in the game. The TTK tab nevertheless shows a "Damage Falloff" section with a start and end for them. Measured in the app: 1000 Yard Stare (sniper) hip 66.4 m / ADS 241.9 m; A Good Shout (bow) 20.0 / 37.1 m; Boomslang-4fr (LFR) 60.6 / 138.4 m. Their TTK-vs-distance curves therefore get worse with range when they should be flat.
- **Likely wrong:** shotguns (floor 0.5 against about 0). TTK at range is much too optimistic for them.
- **Falloff start distances** (hip, at Range 0 / 50 / 100) are close for most types but not all. Machine gun: ours 15 / 24 / 38 m, oracle 28.5 / 29.6 / 30.7 m. Shotgun: 4.5 / 7.5 / 12 against 3.8 / 5.2 / 6.7 m. Scout at Range 0: 20 against 30 m. Hand cannon: 13.9 / 21.7 / 29.5 against 16 / 20.5 / 25 m. These might be a patch difference (our start curves come from huwugo and rockstarmatt's measurements), so they need an in-game check.
- **Fix direction:** take the end and the floor per weapon type (with "no falloff" for the five types above) and hide the falloff section for those types. Verify the start curves for machine guns and shotguns in game first.

### X2. Enemy damage scalars disagree with oracle_engine by up to 2.3× *(reproduced, which one is right is unknown)*
`src/data/combatantScalars.json` (MossyMax's sheet) against oracle_engine's `combatant_scalars`:

| Type | Minor (ours / oracle) | Elite | Boss |
|---|---|---|---|
| Pulse Rifle | 4.56 / 2.00 | 3.0 / 1.42 | 1.98 / 1.0 |
| Scout Rifle | 4.33 / 1.9 | 3.0 / 1.3 | 1.96 / 1.3 |
| Sniper Rifle | 4.37 / 2.5 | 3.0 / 1.55 | 1.33 / 1.2 |
| Auto Rifle | 3.54 / 1.79 | 3.0 / 1.63 | 1.80 / 1.15 |
| Rocket Launcher | 3.6 / **6.0** | 3.0 / **5.0** | 2.82 / **4.7** |
| Glaive | 4.5 / 4.5 | 3.0 / 3.0 | 3.0 / 3.0 |

Ours are higher for almost every type and lower for rockets. Oracle is the older data, and the game's PvE damage has been reworked since, so ours may well be right. But these numbers set every PvE TTK and DPS figure, and our file carries no date or source link (`credits.ts` says "no public link on file"). **Needs one in-game test** (for example shots to kill a Minor with a known weapon), then a date and provenance note in the data.

### X3. Firing Line is a precision-only perk but our buff boosts all damage *(reproduced, certain)*
`src/data/buffs.json` `firing_line` is `multiplier: 1.2` with the description "+20% precision damage". Both Clarity ("20% increased Precision Damage") and oracle_engine (crit scale 1.2, nothing for body shots) agree it is precision only. The calculator applies it to body shots too, so TTK and DPS for body shots come out about 20 % too high when it is on.
- **Fix:** `multiplier: 1`, `critMultiplier: 1.2` (the same shape `catalyst_whispered_breathing` already uses). I scanned the other 93 buffs for this mistake: no other buff has it (the remaining "precision" mentions are triggers, not restrictions).

### X4. A few frames have PvP damage that differs more than patch drift would explain *(reproduced)*
Ours / oracle for body damage per shot:
- Fusion Rifle Aggressive 28.8 / 54.0 (ratio 0.53). Probably a per-bolt against per-trigger difference or a recent patch, but worth a look.
- Combat Bow Wish-Ender 1.21, LeMonarque 1.09; Hand Cannon Lightweight 1.12; Sidearm Forerunner 0.89; Auto Rifle High-Impact 0.92.
Most are within the size of normal balance patches, so only the Aggressive fusion rifle looks suspicious.

## Not compared
- ADS range multiplier: `adsMultiplier()` in `src/lib/math.ts` uses a calibrated `(zoom + 7) / 14` with special cases for sidearms and fusion rifles, where oracle_engine uses a per-type function. Not compared.
- Magazine and ammo reserve formulas.
- Exotic effects I added myself in this session (Tempest Cascade, Nightsworn Sight, On Black Wings, The Right Choice) have no independent source other than Clarity text.
