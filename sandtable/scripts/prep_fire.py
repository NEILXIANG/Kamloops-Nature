"""Prepare v2 assets: replay terrain, fuel rasters, Rossmoore perimeter, 2023 weather -> FFMC/ISI,
Dijkstra arrival times with calibration, plus live snapshot (FIRMS, BCWS current fires, ECCC forecast).
usage: python3 -I prep_fire.py <scratch_dir>"""
import sys, os, io, json, math, base64, heapq, csv, datetime as dt, urllib.request, urllib.parse
import numpy as np
from PIL import Image, ImageDraw
import xml.etree.ElementTree as ET

S = sys.argv[1]; F = S + '/fire'

def tiles_dem(latN, latS, lonW, lonE, GW, GH, Z=13):
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

def info(latN, latS, lonW, lonE, GW, GH, h):
    return dict(gw=GW, gh=GH, latN=latN, latS=latS, lonW=lonW, lonE=lonE,
                widthM=round((lonE - lonW) * 111320 * math.cos(math.radians((latN + latS) / 2))),
                heightM=round((latN - latS) * 110574), min=float(h.min()), max=float(h.max()))

b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()

# ---------- grids ----------
CITY = dict(latN=50.725, latS=50.635, lonW=-120.46, lonE=-120.23, GW=384, GH=240)
REP = dict(latN=50.725, latS=50.355, lonW=-120.53, lonE=-120.23, GW=256, GH=496)
h_city = np.load(S + '/demdata/dem.npy')
h_rep = tiles_dem(REP['latN'], REP['latS'], REP['lonW'], REP['lonE'], REP['GW'], REP['GH'])

# ---------- fuel ----------
FCLS = {'N': 0, 'W': 1, 'O-1a/b': 2, 'C-2': 3, 'C-3': 4, 'C-4': 5, 'C-5': 6, 'C-6': 6, 'C-7': 6, 'D-1/2': 7, 'M-1/2': 8, 'S-1': 9, 'S-2': 9, 'S-3': 9}
feats = []
for i in (0, 1):
    feats += json.load(open(f'{F}/fuel_p{i}.json'))['features']
def raster_polys(G, features, valfn, fill=255):
    sc = 4  # supersample then mode-downsample
    W, H = G['GW'] * sc, G['GH'] * sc
    img = Image.new('L', (W, H), fill); d = ImageDraw.Draw(img)
    def pix(lon, lat):
        return ((lon - G['lonW']) / (G['lonE'] - G['lonW']) * (G['GW'] - 1) * sc + sc / 2,
                (G['latN'] - lat) / (G['latN'] - G['latS']) * (G['GH'] - 1) * sc + sc / 2)
    for f in features:
        v = valfn(f)
        if v is None: continue
        g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            ring = [pix(x, y) for x, y in poly[0]]
            if len(ring) > 2: d.polygon(ring, fill=v)
            for hole in poly[1:]:
                pass
    a = np.asarray(img).reshape(G['GH'], sc, G['GW'], sc).transpose(0, 2, 1, 3).reshape(G['GH'], G['GW'], sc * sc)
    out = np.zeros((G['GH'], G['GW']), np.uint8)
    for r in range(G['GH']):
        for c in range(G['GW']):
            vals, cnt = np.unique(a[r, c], return_counts=True); out[r, c] = vals[np.argmax(cnt)]
    return out
def fuelval(f):
    cd = f['properties']['FUEL_TYPE_CD']; cd = cd.split('_', 1)[1] if '_' in cd else cd
    return FCLS.get(cd, 10)
def fuelval_pre(f):  # replay: post-2023-burn 'Bxx_N' polygons were forest before the fire -> C-7 (dominant local forest type)
    cd = f['properties']['FUEL_TYPE_CD']
    if cd.startswith('B') and cd.endswith('_N'): return 6
    return fuelval(f)
fuel_city = raster_polys(CITY, feats, fuelval); fuel_rep = raster_polys(REP, feats, fuelval_pre)
fuel_city[fuel_city == 255] = 10; fuel_rep[fuel_rep == 255] = 10
print('fuel city', np.bincount(fuel_city.ravel(), minlength=11)); print('fuel rep', np.bincount(fuel_rep.ravel(), minlength=11))

# ---------- perimeter + ignition ----------
hist = json.load(open(F + '/hist.json'))['features']
ross = [f for f in hist if f['properties']['FIRE_NUMBER'] == 'K22024'][0]
perim = raster_polys(REP, [ross], lambda f: 1, fill=0)
IGN = (50.4484, -120.4009)
ign_rc = (int(round((REP['latN'] - IGN[0]) / (REP['latN'] - REP['latS']) * (REP['GH'] - 1))), int(round((IGN[1] - REP['lonW']) / (REP['lonE'] - REP['lonW']) * (REP['GW'] - 1))))

# ---------- weather 2023 -> FFMC (daily) -> hourly ISI ----------
hw = json.load(open(F + '/wx2023.json'))['features']; dw = json.load(open(F + '/wxd2023.json'))['features']
rain = {p['properties']['LOCAL_DATE'][:10]: (p['properties']['TOTAL_PRECIPITATION'] or 0) for p in dw}
hourly = {}
for f in hw:
    p = f['properties']; t = dt.datetime.strptime(p['LOCAL_DATE'], '%Y-%m-%d %H:%M:%S')
    hourly[t] = dict(T=p['TEMP'], RH=p['RELATIVE_HUMIDITY'], WS=p['WIND_SPEED'], WD=p['WIND_DIRECTION'])
def ffmc_next(f0, T, H, W, ro):
    mo = 147.2 * (101 - f0) / (59.5 + f0)
    if ro > 0.5:
        rf = ro - 0.5
        if mo > 150: mo = mo + 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf)) + 0.0015 * (mo - 150) ** 2 * rf ** 0.5
        else: mo = mo + 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf))
        mo = min(mo, 250)
    ed = 0.942 * H ** 0.679 + 11 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
    if mo > ed:
        ko = 0.424 * (1 - (H / 100) ** 1.7) + 0.0694 * W ** 0.5 * (1 - (H / 100) ** 8); kd = ko * 0.581 * math.exp(0.0365 * T); m = ed + (mo - ed) * 10 ** (-kd)
    else:
        ew = 0.618 * H ** 0.753 + 10 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
        if mo < ew:
            k1 = 0.424 * (1 - ((100 - H) / 100) ** 1.7) + 0.0694 * W ** 0.5 * (1 - ((100 - H) / 100) ** 8); kw = k1 * 0.581 * math.exp(0.0365 * T); m = ew - (ew - mo) * 10 ** (-kw)
        else: m = mo
    return 59.5 * (250 - m) / (147.2 + m)
def fF(ffmc):
    m = 147.2 * (101 - ffmc) / (59.5 + ffmc); return 91.9 * math.exp(-0.1386 * m) * (1 + m ** 5.31 / 4.93e7)
ffmc = {}; f0 = 85.0; d = dt.date(2023, 7, 1)
while d <= dt.date(2023, 9, 30):
    n = hourly.get(dt.datetime(d.year, d.month, d.day, 12))
    if n and n['T'] is not None and n['RH'] is not None:
        f0 = ffmc_next(f0, n['T'], n['RH'], n['WS'] or 0, rain.get(d.isoformat(), 0))
    ffmc[d] = f0; d += dt.timedelta(days=1)
T0 = dt.datetime(2023, 7, 20, 16)  # assumed ignition time (lightning, afternoon), local time
HOURS = int((dt.datetime(2023, 9, 1, 0) - T0).total_seconds() // 3600)
WX = []
last = dict(T=25, RH=30, WS=5, WD=27)
for k in range(HOURS):
    t = T0 + dt.timedelta(hours=k); o = hourly.get(t) or {}
    rec = {kk: (o.get(kk) if o.get(kk) is not None else last[kk]) for kk in last}; last = rec
    day_ffmc = ffmc[t.date()]
    night = 0.35 if (t.hour >= 21 or t.hour < 9) else 1.0
    isi = 0.208 * math.exp(0.05039 * rec['WS']) * fF(day_ffmc) * night
    WX.append(dict(t=t.strftime('%m-%d %H:00'), T=rec['T'], RH=rec['RH'], WS=rec['WS'], WD=rec['WD'] * 10, ffmc=round(day_ffmc, 1), isi=round(isi, 2), wsRaw=rec['WS']))

# ---------- spread (FBP-style rate of spread) ----------
def rsi(cls, isi):
    def f(a, b, c): return a * (1 - math.exp(-b * isi)) ** c
    if cls == 2: return f(250, 0.035, 1.7) * 0.80   # O-1b standing grass, curing ~90% -> CF 0.8
    if cls == 3: return f(110, 0.0282, 1.5)
    if cls == 4: return f(110, 0.0444, 3.0)
    if cls == 5: return f(110, 0.0293, 1.5)
    if cls == 6: return f(45, 0.0305, 2.0)
    if cls == 7: return f(30, 0.0232, 1.6) * 0.2      # leafed deciduous
    if cls == 8: return 0.5 * f(110, 0.0282, 1.5) + 0.5 * f(30, 0.0232, 1.6) * 0.2
    if cls == 9: return f(75, 0.0297, 1.3)
    if cls == 10: return f(250, 0.035, 1.7) * 0.5
    return 0.0
def lb_ratio(cls, ws):
    if cls == 2 or cls == 10: return 1.1 * ws ** 0.464 if ws >= 1 else 1.0
    return 1.0 + 8.729 * (1 - math.exp(-0.030 * ws)) ** 2.155
GW, GH = REP['GW'], REP['GH']
INF = REP_INFO = info(REP['latN'], REP['latS'], REP['lonW'], REP['lonE'], GW, GH, h_rep)
cx = INF['widthM'] / (GW - 1); cy = INF['heightM'] / (GH - 1)
NB = [(dr, dc) for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if (dr or dc) and math.gcd(abs(dr), abs(dc)) == 1]
# precompute ROS table per hour per class
RT = np.zeros((HOURS, 11)); LBT = np.zeros((HOURS, 11))
for k, w in enumerate(WX):
    for cls in range(11):
        RT[k, cls] = rsi(cls, w['isi']); LBT[k, cls] = lb_ratio(cls, w['WS'] * (1 if (9 <= int(w['t'][6:8]) < 21) else 0.6))
spread_dir = [((w['WD'] + 180) % 360) for w in WX]  # wind FROM -> fire spreads TOWARD
def simulate(kfac, until_h=HOURS):
    arr = np.full(GH * GW, np.inf); r0, c0 = ign_rc; s = r0 * GW + c0; arr[s] = 0; pq = [(0.0, s)]
    fl = fuel_rep.ravel(); hh = h_rep.ravel()
    while pq:
        t, i = heapq.heappop(pq)
        if t > arr[i] or t >= until_h: continue
        r, c = divmod(i, GW); hk = min(int(t), HOURS - 1); th = math.radians(spread_dir[hk]); ux, uy = math.sin(th), math.cos(th)  # east, north (dy = -dr*cy is north-positive)
        for dr, dc in NB:
            rr, cc = r + dr, c + dc
            if rr < 0 or cc < 0 or rr >= GH or cc >= GW: continue
            j = rr * GW + cc; cj = fl[j]
            if cj in (0, 1) or fl[i] in (0, 1) and i != s: continue
            dx, dy = dc * cx, -dr * cy; dist = math.hypot(dx, dy)
            cos = (dx * ux + dy * uy) / dist
            ci = fl[i] if fl[i] not in (0, 1) else cj
            ros_h = 0.5 * (RT[hk, ci] + RT[hk, cj]) * kfac
            if ros_h <= 0: continue
            LB = 0.5 * (LBT[hk, ci] + LBT[hk, cj]); e = math.sqrt(max(0.0, 1 - 1 / (LB * LB)))
            ros = ros_h * (1 - e) / (1 - e * cos)
            tanp = (hh[j] - hh[i]) / dist
            sf = math.exp(3.533 * min(tanp, 0.7) ** 1.2) if tanp > 0 else math.exp(-1.5 * min(-tanp, 0.7))
            ros *= sf  # m/min
            tj = t + dist / ros / 60.0
            if tj < arr[j]: arr[j] = tj; heapq.heappush(pq, (tj, j))
    return arr
cell_ha = cx * cy / 1e4
def area_at(arr, hour): return float((arr <= hour).sum() * cell_ha)
h_jul24 = (dt.datetime(2023, 7, 24, 16) - T0).total_seconds() / 3600
h_aug1 = (dt.datetime(2023, 8, 1, 16) - T0).total_seconds() / 3600
lo, hi = 0.02, 3.0
for it in range(16):
    mid = math.sqrt(lo * hi); a = area_at(simulate(mid, until_h=h_jul24 + 1), h_jul24)
    print(f'k={mid:.4f} area_jul24={a:.0f} ha')
    if a > 1800: hi = mid
    else: lo = mid
K = math.sqrt(lo * hi)
arr = simulate(K)
pm = perim.ravel().astype(bool)
def sorensen(mask):
    return 2 * (mask & pm).sum() / (mask.sum() + pm.sum())
# hour at which simulated area equals final reported area
final_ha = ross['properties']['FIRE_SIZE_HECTARES']
hours_sorted = np.sort(arr[np.isfinite(arr)]); n_final = int(round(final_ha / cell_ha))
h_eq = float(hours_sorted[min(n_final, len(hours_sorted) - 1)])
metrics = dict(K=K, jul24=area_at(arr, h_jul24), aug1=area_at(arr, h_aug1), end=area_at(arr, HOURS), final_ha=final_ha,
               perim_ha=float(pm.sum() * cell_ha), h_eq=h_eq, sor_eq=float(sorensen(arr <= h_eq)), sor_aug1=float(sorensen(arr <= h_aug1)),
               sor_end=float(sorensen(arr <= HOURS)), h_jul24=h_jul24, h_aug1=h_aug1)
print(metrics)
arr_h = np.where(np.isfinite(arr), np.minimum(arr * 10, 65534), 65535).astype('<u2')  # tenths of hour

# ---------- live snapshot ----------
KAM = (50.676, -120.34)
def hav(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1]); dp = p2 - p1
    return 6371 * 2 * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))
firms = []
for row in csv.DictReader(open(F + '/firms_ca.csv')):
    la, lo_ = float(row['latitude']), float(row['longitude'])
    if 48 < la < 60.1 and -139.1 < lo_ < -114:  # BC-ish
        firms.append(dict(lat=la, lon=lo_, d=row['acq_date'], frp=float(row['frp']), km=round(hav(KAM, (la, lo_)), 1)))
firms.sort(key=lambda x: x['km'])
B = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
q = urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'typeName': 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_PNTS_SP', 'outputFormat': 'application/json', 'srsName': 'EPSG:4326',
                            'CQL_FILTER': "FIRE_STATUS<>'Out' AND BBOX(SHAPE,-122.6,49.3,-118.0,52.0,'EPSG:4326')"})
cur = json.load(urllib.request.urlopen(B + '?' + q, timeout=90))['features']
bcws = []
for f in cur:
    p = f['properties']; lo_, la = f['geometry']['coordinates'][:2]
    bcws.append(dict(name=p.get('INCIDENT_NAME') or p.get('GEOGRAPHIC_DESCRIPTION'), status=p.get('FIRE_STATUS'), ha=p.get('CURRENT_SIZE'), km=round(hav(KAM, (la, lo_)), 1), lat=la, lon=lo_, num=p.get('FIRE_NUMBER')))
bcws.sort(key=lambda x: x['km'])
r = ET.parse(F + '/kam_fc.xml').getroot()
DIRS = {'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5, 'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5, 'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5, 'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5}
fc = []
for hf in r.find('hourlyForecastGroup').findall('hourlyForecast'):
    w = hf.find('wind'); sp = w.find('speed').text; dr = w.find('direction').text
    utc = dt.datetime.strptime(hf.attrib['dateTimeUTC'], '%Y%m%d%H%M'); loc = utc - dt.timedelta(hours=7)
    fc.append(dict(t=loc.strftime('%m-%d %H:00'), T=float(hf.find('temperature').text), WS=float(sp) if sp and sp.replace('.', '').isdigit() else 0.0,
                   WD=DIRS.get(dr, None), dir=dr, cond=hf.find('condition').text, pop=int(hf.find('lop').text or 0)))
live = dict(fetched='2026-10-22 12:00 PDT', firms_n=len(firms), firms=firms[:200], firms_near=firms[:5], bcws=bcws[:30], forecast=fc)
print('firms BC', len(firms), firms[:3]); print('bcws', len(bcws), bcws[:5]); print('fc', fc[:3])

out = dict(
    city=dict(fuel=b64(fuel_city.astype(np.uint8))),
    rep=dict(info=REP_INFO, dem=b64(np.clip(np.round(h_rep * 10), 0, 65535).astype('<u2')), fuel=b64(fuel_rep.astype(np.uint8)),
             perim=b64(perim.astype(np.uint8)), arr=b64(arr_h), ign=list(ign_rc), t0=T0.strftime('%Y-%m-%d %H:00'),
             wx=[{k: v for k, v in w.items() if k != 'wsRaw'} for w in WX], metrics=metrics,
             reports=[dict(h=h_jul24, ha=1800, label='2023-07-24'), dict(h=h_aug1, ha=4157, label='2023-08-01'), dict(h=None, ha=final_ha, label='final')]),
    live=live)
json.dump(out, open(S + '/fire_assets.json', 'w'))
print('assets bytes', os.path.getsize(S + '/fire_assets.json'))
