# Kamloops-Nature

Open-data projects about the land, weather and natural hazards around Kamloops, British Columbia.

## Kamloops 3D Risk Sand Table → [`sandtable/`](sandtable/)

A single-page 3D terrain viewer for the region within about a two-hour drive of Kamloops, built on public data only:

- **Latest fires** – BC Wildfire Service fires and perimeters, NASA FIRMS hotspots, past fires since 2015
- **Fire replay** – three real fires (Rossmoore Lake 2023, Bradley Creek 2026, Jacko Lake 2026) replayed against the official records
- **Wildfire scenario** – a simplified, calibrated FBP spread model (v0.6: hourly FFMC, time-decaying coefficient)
- **Flood demo** – terrain-connected flooding of Kamloops at an assumed river level
- **Weather risk** – live Environment Canada data: alerts, 48 h HRDPS 2.5 km wind / rain / snow / temperature, radar, stations, river gauges

Satellite imagery is Sentinel-2. The page also links the official sources (EmergencyInfoBC, BCWS, TNRD, DriveBC, ECCC).
**It is a demonstration, not an official forecast or alert.**

- Build: `cd sandtable && python3 build.py` → `dist/kamloops-risk.html`
- Method, calibration and known limits: [`sandtable/docs/METHOD.md`](sandtable/docs/METHOD.md)
- Optional Cloudflare Worker for BC layers without CORS: [`sandtable/worker/`](sandtable/worker/)

## Other folders

| Folder | Contents |
|---|---|
| `extras/calibration/` | spread-model calibration scripts and fit results |
| `extras/numi/` | NUMI, a small Sudoku × Tetris puzzle prototype |
| `extras/*.mp4` | English demo video of the sand table |

## Data licences

Data from BC (Open Government Licence – BC), Environment and Climate Change Canada and Water Survey of Canada (Open Government Licence – Canada), NASA FIRMS, ESA Copernicus Sentinel-2 and AWS Terrain Tiles. See [`sandtable/DATA-LICENSES.md`](sandtable/DATA-LICENSES.md).

## 中文简介

Kamloops 周边约两小时车程的三维风险沙盘：真实地形和卫星影像上叠加官方山火、天气、河流数据，含历史火灾回放、简化山火蔓延推演、洪水演示和实时天气风险（大风、降雨、降雪）。仅用于理解地形和数据，不是官方预报或警报；紧急情况以 EmergencyInfoBC 和 BC Wildfire Service 为准。

Author: Neil Xiang
