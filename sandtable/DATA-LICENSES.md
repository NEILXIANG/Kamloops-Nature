# Data licences and attributions

The MIT licence covers the code in this repository. The processed data snapshots in `data/` are derived from the following sources and remain subject to their own terms.

- **Elevation** — AWS Terrain Tiles (Terrarium encoding), Canadian coverage from Natural Resources Canada CDEM. Contains information licensed under the Open Government Licence – Canada. Full attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- **Fuel types, fire perimeters (current and historical since 2015), current fire points, road atlas, geographic names, hospitals and schools** — Province of British Columbia, via DataBC WFS/WMS (`openmaps.gov.bc.ca`). Open Government Licence – British Columbia: https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc. Fire data are published by the BC Wildfire Service.
- **Satellite hotspots** — NASA Fire Information for Resource Management System (FIRMS), VIIRS 375 m active fire product. Courtesy of NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- **Weather** — Environment and Climate Change Canada: hourly and daily climate observations (Kamloops A, Vernon Auto) and the Kamloops city-page forecast, via MSC GeoMet / Datamart. Licence: https://eccc-msc.github.io/open-data/licence/readme_en/
- **Satellite imagery** — Copernicus Sentinel-2 Level-2A true-colour images, accessed through Earth Search (Element 84) on AWS. "Contains modified Copernicus Sentinel data 2022–2026." Terms: https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice
- **Three.js** (r128, MIT) is loaded from a CDN at runtime. Icon paths follow Google's Material Design icons (Apache 2.0).

Snapshot dates are recorded inside `data/all_assets.json` (`region.live.fetched`) and `data/imagery.json` (per-scene dates), and are shown in the app under **Data & checks**.
