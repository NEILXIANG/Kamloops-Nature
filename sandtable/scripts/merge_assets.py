"""Merge all assets into one JSON for the page. usage: python3 -I merge_assets.py <scratch>"""
import sys, json, base64, numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import shape
S = sys.argv[1]; F = S + '/fire'
R = json.load(open(S + '/region_assets.json')); G = R['info']; GW, GH = G['gw'], G['gh']
def unrle(b):
    a = np.frombuffer(base64.b64decode(b), '<u2'); return np.repeat(a[0::2], a[1::2]).astype(np.uint8)
def rle(a):
    a = a.ravel(); out = []; i = 0; n = len(a)
    while i < n:
        j = i
        while j < n and a[j] == a[i] and j - i < 65535: j += 1
        out += [int(a[i]), j - i]; i = j
    return base64.b64encode(np.array(out, '<u2').tobytes()).decode()
hist = unrle(R['hist']).reshape(GH, GW).copy(); HL = R['histList']
import urllib.request, urllib.parse, os
def wfs(tn, cache):
    p = F + '/' + cache
    if not os.path.exists(p):
        q = urllib.parse.urlencode(dict(service='WFS', version='2.0.0', request='GetFeature', typeName=tn, outputFormat='application/json', srsName='EPSG:4326',
                                        CQL_FILTER=f"BBOX(SHAPE,{G['lonW']},{G['latS']},{G['lonE']},{G['latN']},'EPSG:4326')"))
        open(p, 'wb').write(urllib.request.urlopen('https://openmaps.gov.bc.ca/geo/pub/wfs?' + q, timeout=300).read())
    return json.load(open(p))['features']
pts = {f['properties']['FIRE_NUMBER']: f['properties'] for f in wfs('pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_PNTS_SP', 'cur2026_pts_2h.json')}
CUR = wfs('pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_POLYS_SP', 'cur2026_polys_2h.json')
img = Image.fromarray(hist); d = ImageDraw.Draw(img)
pix = lambda lon, lat: ((lon - G['lonW']) / (G['lonE'] - G['lonW']) * (GW - 1), (G['latN'] - lat) / (G['latN'] - G['latS']) * (GH - 1))
for f in sorted(CUR, key=lambda f: -f['properties']['FIRE_SIZE_HECTARES']):
    p = f['properties']
    if p['FIRE_SIZE_HECTARES'] < 20 or len(HL) >= 254: continue
    g = shape(f['geometry']); c = g.representative_point(); q = pts.get(p['FIRE_NUMBER'], {})
    nm = q.get('INCIDENT_NAME') or ''
    if nm == p['FIRE_NUMBER']: nm = q.get('GEOGRAPHIC_DESCRIPTION') or ''
    HL.append(dict(num=p['FIRE_NUMBER'], y=2026, ha=round(p['FIRE_SIZE_HECTARES'], 1), cause=q.get('FIRE_CAUSE'), name=nm.strip(), lat=round(c.y, 4), lon=round(c.x, 4),
                   ign=q.get('IGNITION_DATE', '')[:10]))
    k = len(HL)
    polys = f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
    for poly in polys:
        ring = [pix(x, y) for x, y in poly[0]]
        if len(ring) > 2: d.polygon(ring, fill=k)
hist = np.asarray(img)
for h in HL:
    h['name'] = (h.get('name') or '').strip().title()
# replays (v0.6 model) are built by calib/rebuild.js -> replays_v2.json (order: jacko, bradley, ross)
reps = json.load(open(S + '/replays_v2.json'))
out = dict(region=dict(info=G, dem=R['dem'], fuel=R['fuel'], hist=rle(hist), histList=HL, live=R['live']), replays=reps)
json.dump(out, open(S + '/all_assets.json', 'w'), separators=(',', ':'))
import os; print('bytes', os.path.getsize(S + '/all_assets.json'), 'hist n', len(HL), [ (h['name'], h['y'], h['ha']) for h in HL if h['y'] == 2026][:12])
