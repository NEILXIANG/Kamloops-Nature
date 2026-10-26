"""Curated landmarks + roads per view. usage: python3 -I prep_poi.py <scratch>"""
import sys, json, math, urllib.request, urllib.parse, os
from shapely.geometry import LineString, MultiLineString, box
from shapely.ops import linemerge
S = sys.argv[1]; P = S + '/fire/poi'
A = json.load(open(S + '/all_assets.json'))
VIEWS = {'city': json.load(open(S + '/demdata/dem.json')), 'region': A['region']['info']}
for r in A['replays']: VIEWS[r['id']] = r['info']
hwy = json.load(open(P + '/hwy2h.json'))['features']; art = json.load(open(P + '/art.json'))['features']
B = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
pp = P + '/post.json'
if not os.path.exists(pp):
    q = urllib.parse.urlencode(dict(service='WFS', version='2.0.0', request='GetFeature', typeName='pub:WHSE_IMAGERY_AND_BASE_MAPS.GSR_SCHOOLS_POSTSECONDARY_SVW', outputFormat='application/json', srsName='EPSG:4326',
                                    CQL_FILTER="BBOX(SHAPE,-120.46,50.635,-120.23,50.725,'EPSG:4326')"))
    open(pp, 'wb').write(urllib.request.urlopen(B + '?' + q, timeout=120).read())
post = [(f['properties'].get('OCCUPANT_NAME'), f['properties']['LATITUDE'], f['properties']['LONGITUDE']) for f in json.load(open(pp))['features']]
tru = [p for p in post if p[0] and ('Thompson Rivers' in p[0] or 'Kamloops Campus' in p[0])]
print('TRU', tru[:2])

def to_grid(I, lon, lat):
    return ((lon - I['lonW']) / (I['lonE'] - I['lonW']) * (I['gw'] - 1), (I['latN'] - lat) / (I['latN'] - I['latS']) * (I['gh'] - 1))
def inview(I, lat, lon, m=0.0):
    return I['latS'] + m <= lat <= I['latN'] - m and I['lonW'] + m <= lon <= I['lonE'] - m
def routes_of(f):
    r = f['properties'].get('HIGHWAY_ROUTE_NUMBER') or ''
    return [x for x in r.split('+') if x]

def roads_for(I, feats, cls, tol_cells):
    bb = box(I['lonW'], I['latS'], I['lonE'], I['latN'])
    lines = []
    for f in feats:
        g = f['geometry']; parts = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
        for c in parts:
            if len(c) > 1: lines.append(LineString([p[:2] for p in c]))
    out = []
    if not lines: return out
    inter = MultiLineString(lines).intersection(bb)
    if inter.is_empty: return out
    if inter.geom_type == 'LineString': geoms = [inter]
    else:
        parts = [g for g in getattr(inter, 'geoms', []) if g.geom_type == 'LineString']
        merged = linemerge(parts) if parts else None
        if merged is None or merged.is_empty: return out
        geoms = merged.geoms if hasattr(merged, 'geoms') else [merged]
    degcell = (I['lonE'] - I['lonW']) / (I['gw'] - 1)
    for g in geoms:
        if g.geom_type != 'LineString': continue
        g = g.simplify(degcell * tol_cells)
        pts = [to_grid(I, x, y) for x, y in g.coords]
        flat = []
        for x, y in pts: flat += [round(x * 10), round(y * 10)]
        if len(flat) >= 4: out.append(dict(c=cls, p=flat))
    return out

def shields(I, n_per):
    by = {}
    for f in hwy:
        for r in routes_of(f):
            g = f['geometry']; parts = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
            for c in parts:
                for x, y in c:
                    if inview(I, y, x, (I['latN'] - I['latS']) * 0.06): by.setdefault(r, []).append((x, y))
    out = []
    for r, pts in by.items():
        if len(pts) < 3: continue
        # order along principal axis
        mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
        sxx = sum((p[0] - mx) ** 2 for p in pts); syy = sum((p[1] - my) ** 2 for p in pts); sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
        ang = 0.5 * math.atan2(2 * sxy, sxx - syy); ux, uy = math.cos(ang), math.sin(ang)
        pts.sort(key=lambda p: (p[0] - mx) * ux + (p[1] - my) * uy)
        fr = [0.5] if n_per == 1 else [0.25, 0.75]
        if n_per > 1 and len(pts) < 40: fr = [0.5]
        for q in fr:
            x, y = pts[int(q * (len(pts) - 1))]
            gx, gy = to_grid(I, x, y); out.append(dict(t='hwy', n=r, r=round(gy), c=round(gx)))
    return out

def lab(I, t, n, lat, lon, zh=None):
    if not inview(I, lat, lon): return None
    gx, gy = to_grid(I, lon, lat); d = dict(t=t, n=n, r=round(gy), c=round(gx))
    if zh: d['zh'] = zh
    return d

HOSP = [('Royal Inland Hospital', '皇家内陆医院', 50.671418, -120.334025), ('Kelowna General Hospital', 'Kelowna 总医院', 49.873281, -119.491273),
        ('Vernon Jubilee Hospital', 'Vernon Jubilee 医院', 50.256925, -119.273751), ('Shuswap Lake General Hospital', 'Shuswap Lake 医院', 50.704586, -119.274422)]
LAKES_REGION = [('Kamloops Lake', 50.74654, -120.67055), ('Shuswap Lake', 50.95, -119.169444), ('Adams Lake', 51.169444, -119.573611),
                ('Nicola Lake', 50.173611, -120.518056), ('Okanagan Lake', 49.95, -119.52)]
VIEW_LABELS = {
    'region': [('lake',) + l for l in LAKES_REGION],
    'city': [('poi', 'TRU', tru[0][1], tru[0][2], '汤普森河大学 TRU') if tru else None],
    'jacko': [('lake', 'Jacko Lake', 50.611111, -120.42), ('place', '↑ Kamloops 市中心约 7 km', 50.631, -120.37, None)],
    'ross': [('town', 'Kamloops', 50.676, -120.34), ('place', 'Aberdeen', 50.638474, -120.361037), ('place', 'Knutsford', 50.622958, -120.305045),
             ('place', 'Lac Le Jeune', 50.477778, -120.497222), ('lake', 'Ross Moore Lake', 50.465833, -120.421944), ('lake', 'Stump Lake', 50.37, -120.371389),
             ('lake', 'Jacko Lake', 50.611111, -120.42)],
    'bradley': [('town', 'Vernon', 50.267, -119.272), ('lake', 'Okanagan Lake', 50.255, -119.37), ('place', 'Okanagan 1 保留地 / IR 1', 50.349845, -119.317865),
                ('place', 'Bradley Creek', 50.306667, -119.375833), ('lake', 'Swan Lake', 50.32, -119.262)],
}
out = {}
for v, I in VIEWS.items():
    hw = roads_for(I, hwy, 'h', 0.6 if v == 'region' else 0.4)
    ar = roads_for(I, art, 'a', 0.4) if v != 'region' else []
    labels = []
    for L in VIEW_LABELS.get(v, []):
        if not L: continue
        t, n, la, lo = L[0], L[1], L[2], L[3]; zh = L[4] if len(L) > 4 else None
        d = lab(I, t, n, la, lo, zh)
        if d: labels.append(d)
    for en, zh, la, lo in HOSP:
        if v in ('region', 'city'):
            d = lab(I, 'hosp', en, la, lo, zh)
            if d: labels.append(d)
    labels += shields(I, 2 if v == 'region' else 1)
    out[v] = dict(roads=hw + ar, labels=labels)
    print(v, 'roads', len(hw), len(ar), 'labels', [(l['t'], l['n']) for l in labels])
# region highway vertices for nearest-road lookup (lat/lon, route)
RI = VIEWS['region']; hv = []; routes = []
for f in hwy:
    rs = '/'.join(routes_of(f))
    if not rs: continue
    if rs not in routes: routes.append(rs)
    k = routes.index(rs); g = f['geometry']; parts = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
    for c in parts:
        for x, y in c[::2]:
            hv += [round(y, 4), round(x, 4), k]
out['hwyPts'] = hv; out['routes'] = routes
json.dump(out, open(S + '/poi.json', 'w'), separators=(',', ':'))
print('poi bytes', os.path.getsize(S + '/poi.json'))
