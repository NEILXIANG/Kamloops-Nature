"""Region (~1 h drive around Kamloops) assets: DEM, fuel (WMS-rendered classes), historical perimeters,
Rossmoore replay resampled from the 83 m replay run, live layers clipped to region.
usage: python3 -I prep_region.py <scratch_dir>"""
import sys, os, json, math, base64, urllib.request, urllib.parse, io
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import shape, mapping

S = sys.argv[1]; F = S + '/fire'
sys.path.insert(0, '/nonexistent')
G = dict(latN=51.95, latS=49.40, lonW=-122.25, lonE=-118.45, GW=640, GH=640)
TAG = '2h'

def tiles_dem(latN, latS, lonW, lonE, GW, GH, Z=10):
    tx = lambda lon: (lon + 180) / 360 * 2**Z
    ty = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**Z
    x0, x1, y0, y1 = int(tx(lonW)), int(tx(lonE)), int(ty(latN)), int(ty(latS))
    os.makedirs(S + '/demdata/tiles', exist_ok=True)
    rows = []
    for y in range(y0, y1 + 1):
        row = []
        for x in range(x0, x1 + 1):
            p = f'{S}/demdata/tiles/{Z}_{x}_{y}.png'
            if not os.path.exists(p):
                with urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', timeout=40) as r:
                    open(p, 'wb').write(r.read())
            a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
            row.append(a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768)
        rows.append(np.hstack(row))
    mos = np.vstack(rows)
    lats = np.linspace(latN, latS, GH); lons = np.linspace(lonW, lonE, GW)
    PX, PY = np.meshgrid((np.array([tx(l) for l in lons]) - x0) * 256, (np.array([ty(l) for l in lats]) - y0) * 256)
    ix = np.clip(np.floor(PX).astype(int), 0, mos.shape[1] - 2); fx = PX - ix
    iy = np.clip(np.floor(PY).astype(int), 0, mos.shape[0] - 2); fy = PY - iy
    return (mos[iy, ix] * (1 - fx) * (1 - fy) + mos[iy, ix + 1] * fx * (1 - fy) + mos[iy + 1, ix] * (1 - fx) * fy + mos[iy + 1, ix + 1] * fx * fy)

h = tiles_dem(G['latN'], G['latS'], G['lonW'], G['lonE'], G['GW'], G['GH'])
INFO = dict(gw=G['GW'], gh=G['GH'], latN=G['latN'], latS=G['latS'], lonW=G['lonW'], lonE=G['lonE'],
            widthM=round((G['lonE'] - G['lonW']) * 111320 * math.cos(math.radians((G['latN'] + G['latS']) / 2))),
            heightM=round((G['latN'] - G['latS']) * 110574), min=float(h.min()), max=float(h.max()))
print(INFO)

# ---------- fuel via WMS with class-coded style (4x4 tiles of 512 px, then 4x mode downsample) ----------
CLASSES = [  # (class id, list of LIKE patterns or exact)
    (0, ['=N', '*_N']), (1, ['=W', '*_W']), (2, ['*O-1*']), (3, ['*C-2*']), (4, ['*C-3*']), (5, ['*C-4*']),
    (6, ['*C-5*', '*C-6*', '*C-7*']), (7, ['*D-1*']), (8, ['*M-1*', '*M-3*']), (9, ['*S-1*', '*S-2*', '*S-3*'])]
def rule(cid, pats):
    fs = []
    for p in pats:
        if p.startswith('='):
            fs.append(f'<ogc:PropertyIsEqualTo><ogc:PropertyName>FUEL_TYPE_CD</ogc:PropertyName><ogc:Literal>{p[1:]}</ogc:Literal></ogc:PropertyIsEqualTo>')
        else:
            fs.append(f'<ogc:PropertyIsLike wildCard="*" singleChar="." escape="!"><ogc:PropertyName>FUEL_TYPE_CD</ogc:PropertyName><ogc:Literal>{p}</ogc:Literal></ogc:PropertyIsLike>')
    flt = fs[0] if len(fs) == 1 else '<ogc:Or>' + ''.join(fs) + '</ogc:Or>'
    col = '#%02x%02x%02x' % (10 + cid * 20, 0, 0)
    return f'<Rule><ogc:Filter>{flt}</ogc:Filter><PolygonSymbolizer><Fill><CssParameter name="fill">{col}</CssParameter></Fill></PolygonSymbolizer></Rule>'
SLD = ('<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer>'
       '<Name>pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_FUEL_TYPE_SP</Name><UserStyle><FeatureTypeStyle>' + ''.join(rule(c, p) for c, p in CLASSES) +
       '</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>')
NT, TP = 5, 512
big = np.full((NT * TP, NT * TP), 10, np.uint8)
os.makedirs(F + '/wms2h', exist_ok=True)
dlat = (G['latN'] - G['latS']) / NT; dlon = (G['lonE'] - G['lonW']) / NT
# pixel centres of the output grid span [lonW, lonE]; render each tile so that the full mosaic spans half a pixel beyond
for ty_ in range(NT):
    for tx_ in range(NT):
        p = f'{F}/wms2h/fuel_{ty_}_{tx_}.png'
        if not os.path.exists(p):
            n = G['latN'] - ty_ * dlat; s_ = n - dlat; w = G['lonW'] + tx_ * dlon; e = w + dlon
            q = urllib.parse.urlencode({'service': 'WMS', 'version': '1.3.0', 'request': 'GetMap', 'layers': 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_FUEL_TYPE_SP',
                                        'crs': 'EPSG:4326', 'bbox': f'{s_},{w},{n},{e}', 'width': TP, 'height': TP, 'format': 'image/png', 'transparent': 'true',
                                        'format_options': 'antialias:none', 'SLD_BODY': SLD})
            req = urllib.request.Request('https://openmaps.gov.bc.ca/geo/pub/wms', data=q.encode(), method='POST')
            with urllib.request.urlopen(req, timeout=180) as r:
                open(p, 'wb').write(r.read())
        a = np.asarray(Image.open(p).convert('RGBA'))
        cls = np.full((TP, TP), 10, np.uint8)
        for cid, _ in CLASSES:
            m = (a[..., 3] > 0) & (np.abs(a[..., 0].astype(int) - (10 + cid * 20)) <= 3)
            cls[m] = cid
        big[ty_ * TP:(ty_ + 1) * TP, tx_ * TP:(tx_ + 1) * TP] = cls
        print('tile', ty_, tx_, np.bincount(cls.ravel(), minlength=11))
blk = big.reshape(G['GH'], 4, G['GW'], 4).transpose(0, 2, 1, 3).reshape(G['GH'], G['GW'], 16)  # 2560/640 = 4
fuel = np.zeros((G['GH'], G['GW']), np.uint8)
cnt = np.stack([(blk == k).sum(-1) for k in range(11)], -1)
cnt[..., 10] = cnt[..., 10] * 0  # prefer any mapped class over "unmapped"
fuel = np.argmax(cnt, -1).astype(np.uint8)
fuel[(blk == 10).all(-1)] = 10
print('fuel region', np.bincount(fuel.ravel(), minlength=11))

def rle(a):
    a = a.ravel(); out = []; i = 0; n = len(a)
    while i < n:
        j = i
        while j < n and a[j] == a[i] and j - i < 65535: j += 1
        out += [int(a[i]), j - i]; i = j
    return base64.b64encode(np.array(out, '<u2').tobytes()).decode()

# ---------- historical perimeters ----------
q = urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'typeName': 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP',
                            'outputFormat': 'application/json', 'srsName': 'EPSG:4326', 'propertyName': 'FIRE_NUMBER,FIRE_YEAR,FIRE_SIZE_HECTARES,FIRE_CAUSE,SHAPE',
                            'CQL_FILTER': f"FIRE_YEAR>=2015 AND FIRE_SIZE_HECTARES>=500 AND BBOX(SHAPE,{G['lonW']},{G['latS']},{G['lonE']},{G['latN']},'EPSG:4326')"})
p = F + '/hist_region2h.json'
if not os.path.exists(p):
    open(p, 'wb').write(urllib.request.urlopen('https://openmaps.gov.bc.ca/geo/pub/wfs?' + q, timeout=300).read())
hist = json.load(open(p))['features']
inc_q = lambda nums: urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'typeName': 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_INCIDENTS_SP',
                            'outputFormat': 'application/json', 'srsName': 'EPSG:4326', 'propertyName': 'FIRE_NUMBER,FIRE_YEAR,INCIDENT_NAME,FIRE_TYPE',
                            'CQL_FILTER': "FIRE_YEAR>=2015 AND FIRE_TYPE='Fire' AND FIRE_NUMBER IN (" + ','.join(f"'{n}'" for n in nums) + ")"})
nums = sorted({f['properties']['FIRE_NUMBER'] for f in hist})
names = {}
pi = F + '/hist_names2h.json'
if not os.path.exists(pi):
    open(pi, 'wb').write(urllib.request.urlopen('https://openmaps.gov.bc.ca/geo/pub/wfs?' + inc_q(nums), timeout=300).read())
for f in json.load(open(pi))['features']:
    pr = f['properties']; names[(pr['FIRE_NUMBER'], pr['FIRE_YEAR'])] = pr['INCIDENT_NAME']
hist.sort(key=lambda f: -f['properties']['FIRE_SIZE_HECTARES'])
HL = []
img = Image.new('L', (G['GW'], G['GH']), 0); d = ImageDraw.Draw(img)
def pix(lon, lat):
    return ((lon - G['lonW']) / (G['lonE'] - G['lonW']) * (G['GW'] - 1), (G['latN'] - lat) / (G['latN'] - G['latS']) * (G['GH'] - 1))
for k, f in enumerate(hist[:200]):
    pr = f['properties']; g = shape(f['geometry'])
    c = g.representative_point()
    HL.append(dict(num=pr['FIRE_NUMBER'], y=pr['FIRE_YEAR'], ha=round(pr['FIRE_SIZE_HECTARES']), cause=pr['FIRE_CAUSE'],
                   name=names.get((pr['FIRE_NUMBER'], pr['FIRE_YEAR'])) or '', lat=round(c.y, 4), lon=round(c.x, 4)))
for k in range(len(HL) - 1, -1, -1):  # draw small first? draw large first so smaller recent ones stay visible on top
    pass
for k, f in enumerate(hist[:200]):
    g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        ring = [pix(x, y) for x, y in poly[0]]
        if len(ring) > 2: d.polygon(ring, fill=k + 1)
histid = np.asarray(img).astype(np.uint8)
print('hist fires', len(HL), HL[:6])

# ---------- Rossmoore replay resampled from 83 m run ----------
A = json.load(open(S + '/fire_assets.json'))['rep']; RI = A['info']
arr = np.frombuffer(base64.b64decode(A['arr']), '<u2').reshape(RI['gh'], RI['gw'])
per = np.frombuffer(base64.b64decode(A['perim']), np.uint8).reshape(RI['gh'], RI['gw'])
rr, cc = np.meshgrid(np.arange(RI['gh']), np.arange(RI['gw']), indexing='ij')
lat = RI['latN'] - rr / (RI['gh'] - 1) * (RI['latN'] - RI['latS']); lon = RI['lonW'] + cc / (RI['gw'] - 1) * (RI['lonE'] - RI['lonW'])
R = np.round((G['latN'] - lat) / (G['latN'] - G['latS']) * (G['GH'] - 1)).astype(int); C = np.round((lon - G['lonW']) / (G['lonE'] - G['lonW']) * (G['GW'] - 1)).astype(int)
rarr = np.full((G['GH'], G['GW']), 65535, np.uint16); rper = np.zeros((G['GH'], G['GW']), np.uint8)
np.minimum.at(rarr, (R.ravel(), C.ravel()), arr.ravel()); np.maximum.at(rper, (R.ravel(), C.ravel()), per.ravel())
ys, xs = np.where((rarr < 65535) | (rper > 0)); r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
# area per replay cell (ha) for the area curve is computed from the fine grid
cell_ha = (RI['widthM'] / (RI['gw'] - 1)) * (RI['heightM'] / (RI['gh'] - 1)) / 1e4
fine = np.sort(arr[arr < 65535].astype(np.float64)) / 10
nH = len(A['wx'])
curve = [round(float(np.searchsorted(fine, hh, side='right') * cell_ha)) for hh in range(0, nH + 1, 6)]
ign_lat, ign_lon = 50.4484, -120.4009
ign_rc = [int(round((G['latN'] - ign_lat) / (G['latN'] - G['latS']) * (G['GH'] - 1))), int(round((ign_lon - G['lonW']) / (G['lonE'] - G['lonW']) * (G['GW'] - 1)))]

live = json.load(open(S + '/fire_assets.json'))['live']
inbox = lambda la, lo: G['latS'] <= la <= G['latN'] and G['lonW'] <= lo <= G['lonE']
import csv
firms = []
for row in csv.DictReader(open(F + '/firms_ca.csv')):
    la, lo_ = float(row['latitude']), float(row['longitude'])
    if inbox(la, lo_): firms.append(dict(lat=la, lon=lo_, d=row['acq_date'], frp=float(row['frp'])))
bcws = [x for x in live['bcws'] if inbox(x['lat'], x['lon'])]

out = dict(info=INFO, dem=base64.b64encode(np.clip(np.round(h * 10), 0, 65535).astype('<u2').tobytes()).decode(),
           fuel=rle(fuel), hist=rle(histid), histList=HL,
           replay=dict(r0=int(r0), c0=int(c0), h=int(r1 - r0), w=int(c1 - c0), arr=base64.b64encode(np.ascontiguousarray(rarr[r0:r1, c0:c1]).astype('<u2').tobytes()).decode(),
                       per=base64.b64encode(np.ascontiguousarray(rper[r0:r1, c0:c1]).tobytes()).decode(), ign=ign_rc, t0=A['t0'], wx=A['wx'], metrics=A['metrics'],
                       reports=A['reports'], curve=curve, curveStep=6),
           live=dict(fetched=live['fetched'], firms=firms, firms_bc=live['firms_n'], bcws=bcws, bcws_all=live['bcws'][:8], forecast=live['forecast']))
json.dump(out, open(S + '/region_assets.json', 'w'))
print('region assets', os.path.getsize(S + '/region_assets.json'), 'firms in box', len(firms), 'bcws in box', len(bcws))
