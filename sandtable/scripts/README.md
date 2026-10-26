# Data pipeline

Every script takes a work directory as its first argument and caches raw downloads under `<work>/fire/`. Run them in this order (see the top-level README for the exact commands):

1. `build_dem.py <work>/demdata` — Kamloops city DEM from Terrarium z13 tiles → `dem.json`, `dem.b64`, `dem.npy`
2. `prep_fire.py <work>` — fuel-type raster (WMS + SLD), historical perimeters, Rossmoore Lake 2023 hourly weather and calibration, current fires and FIRMS hotspots → `fire_assets.json`
3. `prep_replay.py <work>` — Bradley Creek and Jacko Lake 2026: DEM, fuel, perimeters, weather, model runs with the 2023 coefficient and a per-event fit → `replay2026.json`
4. `prep_region.py <work>` — two-hour-drive region: DEM, fuel, history, live fires → `region_assets.json`
5. `merge_assets.py <work>` — merges the above and the Environment Canada forecast → `all_assets.json`
6. `prep_poi.py <work>` — towns, highway shields, lakes, hospitals for each view → `poi.json`
7. `prep_imagery.py <work> [view ...]` — Sentinel-2 mosaics per view via the Earth Search STAC API → `imagery.json`
8. `acc.py` — eight-direction flat-terrain test of the spread solver (no arguments)

The city fuel mask `city_fuel.b64` is written by `prep_fire.py`.
