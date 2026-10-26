/* Kamloops Risk Sand Table — layer proxy.
   Pulls official layers that do not send CORS headers (DataBC WFS, NASA FIRMS), clips them to the sand-table
   region, stores one JSON per layer in KV, and serves them with ETag + CORS.
   The browser only ever reads this cache; it never talks to DataBC directly.
   Contract (every layer): {layer, source, licence, fetched_at, upstream_modified, stale, bbox, features} */

const BBOX = { w: -122.25, s: 49.4, e: -118.45, n: 51.95 };          // lon/lat, same as the region grid
const STALE_AFTER_H = 54;                                             // 48 h cron + slack -> stale flag
const WFS = 'https://openmaps.gov.bc.ca/geo/pub/wfs';
const OGL_BC = 'Open Government Licence – British Columbia';

const LAYERS = {
  evac: { typeName: 'pub:WHSE_HUMAN_CULTURAL_ECONOMIC.EMRG_ORDER_AND_ALERT_AREAS_SP', source: 'EmergencyInfoBC / DataBC', licence: OGL_BC,
          props: ['EVENT_NAME', 'EVENT_TYPE', 'ORDER_ALERT_NAME', 'ORDER_ALERT_STATUS', 'ISSUING_AGENCY', 'DATE_MODIFIED', 'EVENT_START_DATE', 'MULTI_SOURCED_HOMES', 'MULTI_SOURCED_POPULATION'], modified: 'DATE_MODIFIED', precision: 4 },
  fires: { typeName: 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_PNTS_SP', source: 'BC Wildfire Service / DataBC', licence: OGL_BC,
           cql: "FIRE_STATUS<>'Out'", props: ['FIRE_NUMBER', 'FIRE_YEAR', 'INCIDENT_NAME', 'GEOGRAPHIC_DESCRIPTION', 'FIRE_STATUS', 'FIRE_CAUSE', 'CURRENT_SIZE', 'IGNITION_DATE', 'RESPONSE_TYPE_DESC', 'FIRE_URL'], modified: null, precision: 5 },
  perims: { typeName: 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_POLYS_SP', source: 'BC Wildfire Service / DataBC', licence: OGL_BC,
            props: ['FIRE_NUMBER', 'FIRE_YEAR', 'FIRE_SIZE_HECTARES', 'FIRE_STATUS', 'TRACK_DATE', 'LOAD_DATE', 'FIRE_URL'], modified: 'LOAD_DATE', precision: 4 },
  danger: { typeName: 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_DANGER_RATING_SP', source: 'BC Wildfire Service / DataBC', licence: OGL_BC,
            props: ['DANGER_RATING', 'DANGER_RATING_DESC', 'WHEN_CREATED'], modified: 'WHEN_CREATED', precision: 3 },
  hist: { typeName: 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP', source: 'BC Wildfire Service / DataBC', licence: OGL_BC,
          cql: 'FIRE_YEAR>=2025', props: ['FIRE_NUMBER', 'FIRE_YEAR', 'FIRE_SIZE_HECTARES', 'FIRE_CAUSE', 'FIRE_DATE', 'LOAD_DATE'], modified: 'LOAD_DATE', precision: 4 },
};

const round = (n, p) => Math.round(n * 10 ** p) / 10 ** p;
function roundGeom(g, p) {
  if (!g) return g;
  const walk = c => (typeof c[0] === 'number') ? [round(c[0], p), round(c[1], p)] : c.map(walk);
  return { type: g.type, coordinates: walk(g.coordinates) };
}
async function fetchWfs(def) {
  const q = new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'GetFeature', typeName: def.typeName, outputFormat: 'application/json', srsName: 'EPSG:4326', count: '5000' });
  const bboxCql = `BBOX(SHAPE,${BBOX.w},${BBOX.s},${BBOX.e},${BBOX.n},'EPSG:4326')`;
  q.set('CQL_FILTER', def.cql ? `${def.cql} AND ${bboxCql}` : bboxCql);
  const r = await fetch(`${WFS}?${q}`, { cf: { cacheTtl: 0 }, headers: { 'user-agent': 'kamloops-risk-sandtable/0.7 (+github)' } });
  if (!r.ok) throw new Error(`DataBC ${def.typeName} HTTP ${r.status}`);
  const j = await r.json();
  let modified = null;
  const features = (j.features || []).map(f => {
    const p = {}; for (const k of def.props) if (f.properties[k] !== undefined) p[k] = f.properties[k];
    if (def.modified && f.properties[def.modified] && (!modified || f.properties[def.modified] > modified)) modified = f.properties[def.modified];
    return { type: 'Feature', geometry: roundGeom(f.geometry, def.precision), properties: p };
  });
  return { features, modified };
}
async function fetchFirms(env) {
  if (!env.FIRMS_MAP_KEY) throw new Error('FIRMS_MAP_KEY secret not set');
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${BBOX.w},${BBOX.s},${BBOX.e},${BBOX.n}/7`;
  const r = await fetch(url); if (!r.ok) throw new Error(`FIRMS HTTP ${r.status}`);
  const lines = (await r.text()).trim().split('\n'); const h = lines.shift().split(',');
  const col = n => h.indexOf(n); let modified = null;
  const features = lines.map(l => { const c = l.split(','); const d = `${c[col('acq_date')]}T${c[col('acq_time')].padStart(4, '0').replace(/(\d\d)(\d\d)/, '$1:$2')}:00Z`; if (!modified || d > modified) modified = d;
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [+c[col('longitude')], +c[col('latitude')]] }, properties: { acq: d, frp: +c[col('frp')], confidence: c[col('confidence')], daynight: c[col('daynight')] } }; });
  return { features, modified };
}
function pack(name, def, got, prev) {
  const now = new Date().toISOString();
  return { layer: name, source: def ? def.source : 'NASA FIRMS (VIIRS SNPP NRT)', licence: def ? def.licence : 'NASA open data', fetched_at: now, upstream_modified: got.modified,
    stale: false, bbox: [BBOX.w, BBOX.s, BBOX.e, BBOX.n], count: got.features.length, features: got.features, previous_fetched_at: prev ? prev.fetched_at : null };
}
async function refresh(env, only) {
  const report = {};
  for (const name of Object.keys(LAYERS).concat(['firms'])) {
    if (only && only !== name) continue;
    const prev = await env.LAYERS.get(name, 'json');
    try {
      const got = name === 'firms' ? await fetchFirms(env) : await fetchWfs(LAYERS[name]);
      const doc = pack(name, LAYERS[name], got, prev);
      await env.LAYERS.put(name, JSON.stringify(doc), { metadata: { fetched_at: doc.fetched_at, count: doc.count } });
      report[name] = { ok: true, count: doc.count };
    } catch (e) {
      // keep the previous value, mark it stale, remember the error
      if (prev) { prev.stale = true; prev.error = String(e.message || e); prev.error_at = new Date().toISOString(); await env.LAYERS.put(name, JSON.stringify(prev)); }
      report[name] = { ok: false, error: String(e.message || e) };
    }
  }
  await env.LAYERS.put('_status', JSON.stringify({ at: new Date().toISOString(), report }));
  return report;
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'if-none-match', 'access-control-expose-headers': 'etag' };
async function etagOf(s) { const h = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)); return '"' + [...new Uint8Array(h)].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join('') + '"'; }

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(refresh(env)); },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/v1/status') { const s = await env.LAYERS.get('_status'); return new Response(s || '{}', { headers: { ...CORS, 'content-type': 'application/json' } }); }
    // manual refresh: GET /v1/refresh?token=<ADMIN_TOKEN>[&layer=evac]  (set with `wrangler secret put ADMIN_TOKEN`)
    if (url.pathname === '/v1/refresh') {
      if (!env.ADMIN_TOKEN || url.searchParams.get('token') !== env.ADMIN_TOKEN) return new Response('forbidden', { status: 403, headers: CORS });
      const report = await refresh(env, url.searchParams.get('layer')); return new Response(JSON.stringify(report), { headers: { ...CORS, 'content-type': 'application/json' } });
    }
    const m = url.pathname.match(/^\/v1\/layers\/([a-z]+)$/);
    if (!m) return new Response('not found', { status: 404, headers: CORS });
    const raw = await env.LAYERS.get(m[1]);
    if (!raw) return new Response(JSON.stringify({ layer: m[1], error: 'not fetched yet' }), { status: 404, headers: { ...CORS, 'content-type': 'application/json' } });
    const doc = JSON.parse(raw);
    doc.stale = doc.stale || (Date.now() - Date.parse(doc.fetched_at)) > STALE_AFTER_H * 3600e3;
    const body = JSON.stringify(doc); const etag = await etagOf(body);
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ...CORS, etag } });
    return new Response(body, { headers: { ...CORS, etag, 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } });
  },
};
