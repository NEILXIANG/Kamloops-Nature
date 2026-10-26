# risk-api — layer proxy (Cloudflare Worker)

DataBC's WFS does not send CORS headers, so the browser cannot read it directly. This Worker pulls five official layers
on a schedule, clips them to the sand-table region, stores one JSON per layer in KV and serves them with ETag + CORS.

| layer | upstream | refresh |
|---|---|---|
| `evac` | EmergencyInfoBC evacuation orders and alerts (EMRG_ORDER_AND_ALERT_AREAS_SP) | cron |
| `fires` | BCWS current fire points, not out (PROT_CURRENT_FIRE_PNTS_SP) | cron |
| `perims` | BCWS current fire perimeters (PROT_CURRENT_FIRE_POLYS_SP) | cron |
| `danger` | BCWS fire danger rating (PROT_DANGER_RATING_SP) | cron |
| `hist` | BCWS historical perimeters since 2025 | cron |
| `firms` | NASA FIRMS VIIRS hotspots, 7 days (needs `FIRMS_MAP_KEY`) | cron |

Schedule: `crons = ["0 0 */2 * *"]` in `wrangler.toml` — every 48 hours, as decided on 2026-10-26. Evacuation orders can
therefore be up to two days old in the app; the app labels the layer with its fetch time and shows "may be stale" past 54 h.
For a 15-minute refresh use `"*/15 * * * *"` (still well inside the free tier: ~600 upstream requests/day).

## Deploy (one time, ~5 minutes)

```bash
npm i -g wrangler && wrangler login
cd worker
wrangler kv namespace create LAYERS        # paste the id into wrangler.toml
wrangler secret put ADMIN_TOKEN            # any long random string, for /v1/refresh
wrangler secret put FIRMS_MAP_KEY          # optional, from https://firms.modaps.eosdis.nasa.gov/api/map_key/
wrangler deploy
curl "https://risk-api.<account>.workers.dev/v1/refresh?token=<ADMIN_TOKEN>"   # first fill
```

Then set `WORKER_BASE` at the top of `src/live.js` to the Worker URL and rebuild.

## Endpoints

- `GET /v1/layers/{evac|fires|perims|danger|hist|firms}` → the layer JSON (`ETag`, `cache-control: max-age=300`)
- `GET /v1/status` → last refresh report
- `GET /v1/refresh?token=…[&layer=…]` → manual refresh (admin)

Every document: `{layer, source, licence, fetched_at, upstream_modified, stale, bbox, count, features}`.
If an upstream fetch fails the previous document is kept with `stale: true`, `error` and `error_at`.
No logs of client IPs are kept; the Worker has no user data.
