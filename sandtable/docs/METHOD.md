# Method and limits

This document describes what the sand table computes, how it was calibrated, and where it is wrong. The same material is shown inside the app under **Data & checks**.

## 1. Grids

| View | Extent | Grid | Cell | Source |
|---|---|---|---|---|
| Region (latest fires, scenario) | 49.40–51.95 °N, 122.25–118.45 °W (268 × 282 km) | 640 × 640 | ~420 m | AWS Terrarium z11 |
| City (flood) | Kamloops, 16 × 10 km | 384 × 240 | ~42 m lon / 41 m lat | Terrarium z13 |
| Replay: Rossmoore Lake 2023 | 21 × 41 km | 256 × 496 | ~83 m | Terrarium |
| Replay: Bradley Creek 2026 | 21 × 20 km | 280 × 260 | ~76 m | Terrarium |
| Replay: Jacko Lake 2026 | 5 × 5 km | 200 × 192 | ~25 m | Terrarium |

All grids are lat/lon-regular (equirectangular); cell sizes in metres are computed from the extent.

## 2. Fuel types

BC Wildfire Service fuel-type raster (DataBC `WHSE_LAND_AND_NATURAL_RESOURCE.PROT_FUEL_TYPE_SP`) rendered through WMS with a custom SLD and sampled per cell into 11 classes:

`0 non-fuel · 1 water · 2 grass (O-1) · 3 C-2 · 4 C-3 · 5 C-4 · 6 C-7 · 7 deciduous (D-1) · 8 mixedwood (M-1/2) · 9 slash (S) · 10 unknown`

Cells inside the 2023 Rossmoore perimeter are reported by BCWS as non-fuel after the fire; for the 2023 replay they are back-filled with the pre-fire class (C-7).

## 3. Spread model (v0.6)

A deliberately small subset of the Canadian Forest Fire Behaviour Prediction (FBP) System, solved as an arrival-time problem.

**Weather per hour** `{WS, WD, isi}`:

- Hourly fine fuel moisture code (FFMC) by the Van Wagner (1977) hourly form, as in `cffdrs::hffmc`, stepped from hourly station temperature, relative humidity, wind and rain, spun up from 20 days before ignition. Where a station reports no hourly rain, the daily total is applied at the hour of the largest RH rise that day.
- `m = 147.2 (101 − FFMC) / (59.5 + FFMC)`, `f(F) = 91.9 e^(−0.1386 m) (1 + m^5.31 / 4.93e7)`, `ISI = 0.208 · e^(0.05039 · WS) · f(F)`.
- The former fixed night factor (×0.35, 21:00–09:00) is gone: the diurnal FFMC cycle produces the night slowdown itself (a 92 → 86 overnight drop is ≈ ×0.42 on ISI).
- Scenario mode has no hourly RH, so it uses a cosine diurnal curve: daily preset at 16:00, up to 6 points lower at 04:00 (the amplitude seen in the Kamloops A 2023 hourly record).

**Rate of spread** per fuel class (FBP form `RSI = a (1 − e^(−b ISI))^c`, m/min): unchanged from v0.5 (table below).

| Class | a, b, c | Note |
|---|---|---|
| Grass | 250, 0.035, 1.7 × 0.8 | O-1 with 80 % curing |
| C-2 | 110, 0.0282, 1.5 | |
| C-3 | 110, 0.0444, 3.0 | |
| C-4 | 110, 0.0293, 1.5 | |
| C-7 | 45, 0.0305, 2.0 | |
| Deciduous | 30, 0.0232, 1.6 × 0.2 | summer, leafed |
| Mixedwood | mean of C-2 and deciduous | |
| Slash | 75, 0.0297, 1.3 | |
| Unknown | grass × 0.5 | |

**Direction**: wind length-to-breadth ratio `LB = 1 + 8.729 (1 − e^(−0.030 WS))^2.155` (grass: `1.1 WS^0.464`), night wind × 0.6; eccentricity `e = √(1 − 1/LB²)`; spread in direction θ from the downwind axis `ROS(θ) = ROS_head (1 − e) / (1 − e cos θ)`.

**Slope**: `× e^(3.533 tanφ^1.2)` uphill (capped at tan φ = 0.7), `× e^(−1.5 tanφ)` downhill.

**Rate coefficient** `K(t) = K0 · (S + (1 − S) e^(−t/τ))`, t = hours since ignition. `K0` is the free-burning multiplier on the FBP head rate; the decay to `S` stands for the effect of initial attack, which every fire in the calibration set received within hours. Fitted values: **K0 = 0.55, S = 0.093, τ = 2 h**. The "no suppression" option uses `S = 1` (constant K0) and is an upper estimate, not a worst case.

**Hold**: in replay mode, spread stops at the hour BCWS reported the fire as held or being held (Jacko 19:30; Bradley 4 Aug). Scenario mode never holds.

**Solver**: Dijkstra over a 16-neighbour stencil (knight moves included, cell-to-cell distance in metres), travel time = distance / ROS evaluated at the arrival hour of the source cell, `Float64` arrival times. Runs in a Web Worker; 640 × 640 region solves in about one second on a laptop.

## 4. Calibration and validation

**Timeline correction.** v0.5 calibrated Rossmoore Lake on "1 800 ha on 24 July" with ignition on 20 July 16:00. Contemporary reporting (CFJC, Global, Armchair Mayor, BCWS updates) gives: lightning 20 July, discovered 21 July 13:48, 95 ha at 18:00 on 21 July, 210 ha on the morning of 22 July, 450 ha at 16:30 on 22 July, 1 800 ha at about 09:00 on 23 July, 2 600 ha on 24 July, 4 157 ha on 1 August. v0.6 uses 21 July 13:00 as the start of spread and all six points.

**Fitting**: `K0`, `S`, `τ` fitted jointly on Jacko Lake 2026 (14:30 report) and Rossmoore Lake 2023 (first 74 h), minimising the sum of squared log area errors, by grid search then coordinate bisection (`calib/fit3.js`). Bradley Creek 2026 is excluded from the fit because the Vernon Auto hourly record does not contain the 70 km/h gusts of 1 August; it is reported as a failed validation.

| Fire | Run | Reported vs. simulated (ha) | Sørensen at equal area | Verdict |
|---|---|---|---|---|
| Rossmoore Lake 2023 (11 413 ha final) | model | 21 Jul 18:00: 95 / 76 · 22 Jul 09:00: 210 / 426 · 22 Jul 16:30: 450 / 588 · 23 Jul 10:00: 1 800 / 1 275 · 24 Jul 15:00: 2 600 / 2 699 · 1 Aug: 4 157 / 11 185 | 0.66 | first 3 days within ×2; weeks later too large (sustained suppression not modelled); calibration event |
| Rossmoore Lake 2023 | free (S = 1) | 21 Jul 18:00: 95 / 547 · 22 Jul 09:00: 210 / 16 311 | 0.43 | upper estimate only |
| Jacko Lake 2026 (44 ha, held 19:30) | model, hold 7.5 h | 14:30: 30 / 24 · 17:00: 50 / 62 · 19:30: 44 / 78 | 0.08 | area within ×2; shape poor on a 25 m grid (official perimeter is a thin wind-driven strip); calibration event |
| Jacko Lake 2026 | free | 14:30: 30 / 78 · 17:00: 50 / 316 | 0.07 | upper estimate only |
| Bradley Creek 2026 (2 569 ha final) | model | 2 Aug: 2 603 / 12 · 4 Aug: 2 900 / 16 | 0.01 | fail — wind input wrong (station missed the gusts); ignition cell is deciduous in the fuel map |
| Bradley Creek 2026 | free | 2 Aug: 2 603 / 395 · 4 Aug: 2 900 / 16 674 | 0.27 | fail |

**What was tried and rejected (2026-10-26)**, all with hourly FFMC and the corrected Rossmoore timeline (`calib/calib.js`):

- *Separate coefficients per fuel group* (grass / conifer / deciduous). Not identifiable: the Rossmoore perimeter is 59 % grass by the BCWS fuel map, so grass is fitted by both fires and the conifer and deciduous coefficients run to 0 or to absurd values. Sum of squared log errors 8.3 vs 1.1 for `K(t)`.
- *FBP grass curing* (70 % for Rossmoore in late July, 100 % for Jacko in late August) with one constant K. Fits the 43 h Rossmoore point but makes the first hours of both fires 3–6× too slow; adding curing on top of `K(t)` makes the fit worse (2.3 vs 1.1). The data do not support a curing difference between the two fires, so curing stays at the constant 80 %.
- *Single constant K with hourly FFMC* (no decay): early hours 3–7× too slow, later days too fast on both fires — the pattern the decay term removes.

**Conclusion** (also shown in the app): direction is credible; area in the first three days is credible to within a factor of 2 under calibrated station weather; area weeks later, and any fire without a reliable wind record, is not. The two calibration fires are not independent tests. A fourth fire with a daily perimeter record is reserved as a blind test (see the design document, phase P5).

**Solver test** (`scripts/acc.py`): on flat, uniform fuel with constant wind, arrival-time isochrones in all 8 directions match the analytic ellipse to within the stencil's angular error.

## 5. Flood demo

Connected filling on the city grid: every water cell of the Thompson rivers (fuel class 1) is a seed at `level = median river elevation + rise`; four-connected cells lower than `level` flood. Depth shown is `level − ground`. No hydraulics, no levees, no flow, no gauge datum — it is a terrain-connectivity exercise.

## 6. Known gaps

- No spotting, crown-fire transition, or local wind fields (one station or forecast point for the whole grid). Suppression is only the empirical decay term above.
- Fuel raster is provincial scale; roads and water are not barriers in the solver.
- Terrain cell size (420 m) in the region view smooths slopes; the replays use finer grids.
- Data are snapshots (see the status chip); the app does not refresh (live layers are planned, see the design document).
- Satellite imagery is a cloud-free mosaic from several dates; the region mosaic is ~200 m/pixel.
