"""Generic replay builder for 2026 fires (Bradley Creek, Jacko Lake) using the K calibrated on Rossmoore 2023.
usage: python3 -I prep_replay.py <scratch_dir>"""
import sys, os, json, math, base64, heapq, datetime as dt, urllib.request, urllib.parse
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import shape

S = sys.argv[1]; F = S + '/fire'
K = json.load(open(S + '/fire_assets.json'))['rep']['metrics']['K']
B = 'https://openmaps.gov.bc.ca/geo/pub/wfs'

def wfs(params, cache):
    p = F + '/' + cache
    if not os.path.exists(p):
        q = urllib.parse.urlencode(dict(service='WFS', version='2.0.0', request='GetFeature', outputFormat='application/json', srsName='EPSG:4326', **params))
        open(p, 'wb').write(urllib.request.urlopen(B + '?' + q, timeout=300).read())
    return json.load(open(p))['features']

def tiles_dem(latN, latS, lonW, lonE, GW, GH, Z):
    tx = lambda lon: (lon + 180) / 360 * 2**Z
    ty = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**Z
    x0, x1, y0, y1 = int(tx(lonW)), int(tx(lonE)), int(ty(latN)), int(ty(latS))
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

FCLS = {'N': 0, 'W': 1, 'O-1a/b': 2, 'C-2': 3, 'C-3': 4, 'C-4': 5, 'C-5': 6, 'C-6': 6, 'C-7': 6, 'D-1/2': 7, 'M-1/2': 8, 'S-1': 9, 'S-2': 9, 'S-3': 9}
def fuelval_pre(f):
    cd = f['properties']['FUEL_TYPE_CD']
    if cd.startswith('B') and cd.endswith('_N'): return 6
    cd = cd.split('_', 1)[1] if '_' in cd else cd
    return FCLS.get(cd, 10)
def raster(G, feats, valfn, fill):
    sc = 3; W, H = G['GW'] * sc, G['GH'] * sc
    img = Image.new('L', (W, H), fill); d = ImageDraw.Draw(img)
    pix = lambda lon, lat: ((lon - G['lonW']) / (G['lonE'] - G['lonW']) * (G['GW'] - 1) * sc + sc / 2, (G['latN'] - lat) / (G['latN'] - G['latS']) * (G['GH'] - 1) * sc + sc / 2)
    for f in feats:
        v = valfn(f); g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            ring = [pix(x, y) for x, y in poly[0]]
            if len(ring) > 2: d.polygon(ring, fill=v)
    a = np.asarray(img).reshape(G['GH'], sc, G['GW'], sc).transpose(0, 2, 1, 3).reshape(G['GH'], G['GW'], sc * sc)
    out = np.zeros((G['GH'], G['GW']), np.uint8)
    for r in range(G['GH']):
        for c in range(G['GW']):
            vals, cnt = np.unique(a[r, c], return_counts=True); out[r, c] = vals[np.argmax(cnt)]
    return out

def weather(climate_id, t0, t1):
    p = f'{F}/wx_{climate_id}_{t0:%Y%m%d}.json'
    if not os.path.exists(p):
        u = (f'https://api.weather.gc.ca/collections/climate-hourly/items?f=json&limit=10000&CLIMATE_IDENTIFIER={climate_id}'
             f'&datetime={(t0 - dt.timedelta(days=21)):%Y-%m-%dT00:00:00Z}/{t1:%Y-%m-%dT23:00:00Z}&sortby=UTC_DATE')
        open(p, 'wb').write(urllib.request.urlopen(u, timeout=300).read())
    hourly = {}
    for f in json.load(open(p))['features']:
        q = f['properties']; t = dt.datetime.strptime(q['LOCAL_DATE'], '%Y-%m-%d %H:%M:%S')
        hourly[t] = dict(T=q['TEMP'], RH=q['RELATIVE_HUMIDITY'], WS=q['WIND_SPEED'], WD=q['WIND_DIRECTION'], P=q.get('PRECIP_AMOUNT'))
    return hourly

def ffmc_next(f0, T, H, W, ro):
    mo = 147.2 * (101 - f0) / (59.5 + f0)
    if ro > 0.5:
        rf = ro - 0.5
        mo = mo + 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf)) + (0.0015 * (mo - 150) ** 2 * rf ** 0.5 if mo > 150 else 0)
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
def rsi(cls, isi):
    f = lambda a, b, c: a * (1 - math.exp(-b * isi)) ** c
    return {2: f(250, .035, 1.7) * .8, 3: f(110, .0282, 1.5), 4: f(110, .0444, 3.0), 5: f(110, .0293, 1.5), 6: f(45, .0305, 2.0), 7: f(30, .0232, 1.6) * .2,
            8: .5 * f(110, .0282, 1.5) + .5 * f(30, .0232, 1.6) * .2, 9: f(75, .0297, 1.3), 10: f(250, .035, 1.7) * .5}.get(cls, 0.0)
def lbr(cls, ws):
    if cls in (2, 10): return 1.1 * ws ** 0.464 if ws >= 1 else 1.0
    return 1.0 + 8.729 * (1 - math.exp(-0.030 * ws)) ** 2.155

def build(case):
    G = case['grid']; GW, GH = G['GW'], G['GH']
    h = tiles_dem(G['latN'], G['latS'], G['lonW'], G['lonE'], GW, GH, case['Z'])
    info = dict(gw=GW, gh=GH, latN=G['latN'], latS=G['latS'], lonW=G['lonW'], lonE=G['lonE'],
                widthM=round((G['lonE'] - G['lonW']) * 111320 * math.cos(math.radians((G['latN'] + G['latS']) / 2))), heightM=round((G['latN'] - G['latS']) * 110574),
                min=float(h.min()), max=float(h.max()))
    fuelf = wfs(dict(typeName='pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_FUEL_TYPE_SP', propertyName='FUEL_TYPE_CD,SHAPE', count=20000,
                     BBOX=f"{G['latS']},{G['lonW']},{G['latN']},{G['lonE']},urn:ogc:def:crs:EPSG::4326"), f"fuel_{case['id']}.json")
    fuel = raster(G, fuelf, fuelval_pre, 255); fuel[fuel == 255] = 10
    perf = wfs(dict(typeName='pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_POLYS_SP', CQL_FILTER=f"FIRE_NUMBER='{case['num']}' AND FIRE_YEAR=2026"), f"per_{case['id']}.json")
    per = raster(G, perf, lambda f: 1, 0)
    inside = fuel[per == 1]; print(case['id'], 'fuel inside perimeter', np.bincount(inside, minlength=11))
    ign = case['ign']; ign_rc = (int(round((G['latN'] - ign[0]) / (G['latN'] - G['latS']) * (GH - 1))), int(round((ign[1] - G['lonW']) / (G['lonE'] - G['lonW']) * (GW - 1))))
    T0 = case['t0']; T1 = T0 + dt.timedelta(hours=case['hours'])
    hw = weather(case['station'], T0, T1)
    # daily FFMC from noon obs; rain = sum of hourly precip if present else 0
    f0 = 85.0; d = (T0 - dt.timedelta(days=21)).date(); ff = {}
    while d <= T1.date():
        n = hw.get(dt.datetime(d.year, d.month, d.day, 12)) or hw.get(dt.datetime(d.year, d.month, d.day, 13))
        rain = sum((hw.get(dt.datetime(d.year, d.month, d.day, k)) or {}).get('P') or 0 for k in range(24))
        if n and n['T'] is not None and n['RH'] is not None: f0 = ffmc_next(f0, n['T'], n['RH'], n['WS'] or 0, rain)
        ff[d] = f0; d += dt.timedelta(days=1)
    WX = []; last = dict(T=25, RH=30, WS=5, WD=27)
    for k in range(case['hours']):
        t = T0 + dt.timedelta(hours=k); o = hw.get(t) or {}
        rec = {kk: (o.get(kk) if o.get(kk) is not None else last[kk]) for kk in last}; last = rec
        night = 0.35 if (t.hour >= 21 or t.hour < 9) else 1.0
        WX.append(dict(t=t.strftime('%m-%d %H:00'), T=rec['T'], RH=rec['RH'], WS=rec['WS'], WD=(rec['WD'] or 0) * 10, ffmc=round(ff[t.date()], 1),
                       isi=round(0.208 * math.exp(0.05039 * rec['WS']) * fF(ff[t.date()]) * night, 2)))
    HOURS = len(WX)
    cx = info['widthM'] / (GW - 1); cy = info['heightM'] / (GH - 1); cell_ha = cx * cy / 1e4
    NB = [(dr, dc) for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if (dr or dc) and math.gcd(abs(dr), abs(dc)) == 1]
    RT = np.array([[rsi(c, w['isi']) for c in range(11)] for w in WX]); LBT = np.array([[lbr(c, w['WS'] * (1 if 9 <= int(w['t'][6:8]) < 21 else .6)) for c in range(11)] for w in WX])
    sd = [math.radians((w['WD'] + 180) % 360) for w in WX]
    fl = fuel.ravel(); hh = h.ravel()
    def sim(Kf, until):
      arr = np.full(GW * GH, np.inf); s = ign_rc[0] * GW + ign_rc[1]; arr[s] = 0; pq = [(0.0, s)]
      while pq:
        t, i = heapq.heappop(pq)
        if t > arr[i] or t >= until: continue
        r, c = divmod(i, GW); hk = min(int(t), HOURS - 1); ux, uy = math.sin(sd[hk]), math.cos(sd[hk])
        for dr, dc in NB:
            rr, cc = r + dr, c + dc
            if rr < 0 or cc < 0 or rr >= GH or cc >= GW: continue
            j = rr * GW + cc; cj = fl[j]
            if cj in (0, 1) or (fl[i] in (0, 1) and i != s): continue
            dx, dy = dc * cx, -dr * cy; dist = math.hypot(dx, dy); cos = (dx * ux + dy * uy) / dist
            ci = fl[i] if fl[i] not in (0, 1) else cj
            ros_h = .5 * (RT[hk, ci] + RT[hk, cj]) * Kf
            if ros_h <= 0: continue
            LB = .5 * (LBT[hk, ci] + LBT[hk, cj]); e = math.sqrt(max(0.0, 1 - 1 / (LB * LB)))
            ros = ros_h * (1 - e) / (1 - e * cos); tp = (hh[j] - hh[i]) / dist
            ros *= math.exp(3.533 * min(tp, .7) ** 1.2) if tp > 0 else math.exp(-1.5 * min(-tp, .7))
            tj = t + dist / ros / 60.0
            if tj < arr[j]: arr[j] = tj; heapq.heappush(pq, (tj, j))
      return arr
    pm = per.ravel().astype(bool)
    reps0 = [dict(h=(rt - T0).total_seconds() / 3600, ha=ha) for rt, ha, lb in case['reports']]
    def eval_arr(arr):
        fine = np.sort(arr[np.isfinite(arr)]); area = lambda hr: float(np.searchsorted(fine, hr, side='right') * cell_ha)
        return fine, area
    # event-calibrated K: match first report
    lo, hi = K * 0.5, K * 400
    for it in range(18):
        mid = math.sqrt(lo * hi); a = eval_arr(sim(mid, reps0[0]['h'] + 0.5))[1](reps0[0]['h'])
        if a > reps0[0]['ha']: hi = mid
        else: lo = mid
    K_ev = math.sqrt(lo * hi); print(case['id'], 'K_event', K_ev, 'ratio', K_ev / K)
    arr_ev = sim(K_ev, HOURS)
    arr = sim(K, HOURS)
    perim_ha = float(pm.sum() * cell_ha); n_eq = int(round(perim_ha / cell_ha))
    sor = lambda m: float(2 * (m & pm).sum() / (m.sum() + pm.sum()))
    reps = [dict(h=(rt - T0).total_seconds() / 3600, ha=ha, label=lb) for rt, ha, lb in case['reports']]
    step = case['curveStep']
    def pack(arr, Kf):
        fine, area = eval_arr(arr); h_eq = float(fine[min(n_eq, len(fine) - 1)]) if len(fine) else 0
        m = dict(K=Kf, h_eq=h_eq, sor_eq=sor(arr <= h_eq), end=area(HOURS), rep_sim=[dict(label=r['label'], ha=r['ha'], sim=area(r['h']), h=r['h']) for r in reps])
        curve = [round(area(x), 1) for x in np.arange(0, HOURS + 1e-9, step)]
        enc_ = base64.b64encode(np.where(np.isfinite(arr), np.minimum(arr * case['tscale'], 65534), 65535).astype('<u2').tobytes()).decode()
        print(case['id'], json.dumps(m, ensure_ascii=False))
        return dict(metrics=m, curve=curve, arr=enc_)
    runs = dict(k2023=pack(arr, K), event=pack(arr_ev, K_ev))
    metrics = dict(perim_ha=perim_ha, final_ha=case['final_ha'])
    enc = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
    return dict(id=case['id'], name=case['name'], info=info, dem=enc(np.clip(np.round(h * 10), 0, 65535).astype('<u2')), fuel=enc(fuel), perim=enc(per), runs=runs,
                tscale=case['tscale'], ign=list(ign_rc), t0=T0.strftime('%Y-%m-%d %H:00'), wx=WX, metrics=metrics, reports=reps, curveStep=step,
                station=case['stationName'])

CASES = [
    dict(id='bradley', name='Bradley Creek 2026', num='K41351', ign=(50.306533, -119.412783), t0=dt.datetime(2026, 7, 31, 14), hours=24 * 12,
         grid=dict(latN=50.40, latS=50.22, lonW=-119.56, lonE=-119.26, GW=280, GH=260), Z=13, station='1128582', stationName='VERNON AUTO',
         reports=[(dt.datetime(2026, 8, 2, 18), 2603, '2026-08-02'), (dt.datetime(2026, 8, 4, 12), 2900, '2026-08-04')], final_ha=2569.2, curveStep=3, tscale=10),
    dict(id='jacko', name='Jacko Lake 2026', num='K21750', ign=(50.612817, -120.392783), t0=dt.datetime(2026, 8, 22, 12), hours=10,
         grid=dict(latN=50.635, latS=50.592, lonW=-120.43, lonE=-120.36, GW=200, GH=192), Z=14, station='1163781', stationName='KAMLOOPS A',
         reports=[(dt.datetime(2026, 8, 22, 14, 30), 30, '14:30'), (dt.datetime(2026, 8, 22, 17), 50, '17:00'), (dt.datetime(2026, 8, 22, 19, 30), 44, '19:30 held')],
         final_ha=44.3, curveStep=0.25, tscale=600),
]
out = [build(c) for c in CASES]
json.dump(out, open(S + '/replay2026.json', 'w'))
print('bytes', os.path.getsize(S + '/replay2026.json'))
