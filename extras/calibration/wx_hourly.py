"""Hourly FFMC (Van Wagner 1977 hourly form, as in cffdrs::hffmc) for the three replay fires.
Writes calib/wx_hourly.json: {case: [{t,T,RH,WS,WD,ffmc_d,ffmc_h,rain}, ...]} aligned with the replay hour index.
usage: python3 -I wx_hourly.py <scratch_dir>"""
import sys, os, json, math, datetime as dt, urllib.request
S = sys.argv[1]; F = S + '/fire'

def hourly_obs(path):
    out = {}
    for f in json.load(open(path))['features']:
        q = f['properties']; t = dt.datetime.strptime(q['LOCAL_DATE'], '%Y-%m-%d %H:%M:%S')
        out[t] = dict(T=q['TEMP'], RH=q['RELATIVE_HUMIDITY'], WS=q['WIND_SPEED'], WD=q['WIND_DIRECTION'], P=q.get('PRECIP_AMOUNT'))
    return out

def daily_rain(path):
    if not os.path.exists(path): return {}
    return {p['properties']['LOCAL_DATE'][:10]: (p['properties']['TOTAL_PRECIPITATION'] or 0) for p in json.load(open(path))['features']}

def fetch_daily(climate_id, d0, d1, path):
    if os.path.exists(path): return
    u = (f'https://api.weather.gc.ca/collections/climate-daily/items?f=json&limit=1000&CLIMATE_IDENTIFIER={climate_id}'
         f'&datetime={d0:%Y-%m-%d}T00:00:00Z/{d1:%Y-%m-%d}T23:00:00Z&sortby=LOCAL_DATE')
    try:
        open(path, 'wb').write(urllib.request.urlopen(u, timeout=120).read())
    except Exception as e:
        print('daily fetch failed', climate_id, e)

def hffmc(f0, T, H, W, ro):
    """One hour step. f0 previous hourly FFMC; ro rain (mm) in the hour."""
    mo = 147.2 * (101 - f0) / (59.5 + f0)
    if ro and ro > 0:
        rf = ro
        mr = mo + 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf))
        if mo > 150: mr += 0.0015 * (mo - 150) ** 2 * math.sqrt(rf)
        mo = min(mr, 250)
    ed = 0.942 * H ** 0.679 + 11 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
    if mo > ed:
        ko = 0.424 * (1 - (H / 100) ** 1.7) + 0.0694 * math.sqrt(W) * (1 - (H / 100) ** 8)
        kd = ko * 0.0579 * math.exp(0.0365 * T); m = ed + (mo - ed) * math.exp(-2.303 * kd)
    else:
        ew = 0.618 * H ** 0.753 + 10 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
        if mo < ew:
            k1 = 0.424 * (1 - ((100 - H) / 100) ** 1.7) + 0.0694 * math.sqrt(W) * (1 - ((100 - H) / 100) ** 8)
            kw = k1 * 0.0579 * math.exp(0.0365 * T); m = ew - (ew - mo) * math.exp(-2.303 * kw)
        else: m = mo
    return 59.5 * (250 - m) / (147.2 + m)

def dffmc(f0, T, H, W, ro):  # daily (noon) form, for reference column
    mo = 147.2 * (101 - f0) / (59.5 + f0)
    if ro > 0.5:
        rf = ro - 0.5
        mr = mo + 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf))
        if mo > 150: mr += 0.0015 * (mo - 150) ** 2 * rf ** 0.5
        mo = min(mr, 250)
    ed = 0.942 * H ** 0.679 + 11 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
    if mo > ed:
        ko = 0.424 * (1 - (H / 100) ** 1.7) + 0.0694 * W ** 0.5 * (1 - (H / 100) ** 8); kd = ko * 0.581 * math.exp(0.0365 * T); m = ed + (mo - ed) * 10 ** (-kd)
    else:
        ew = 0.618 * H ** 0.753 + 10 * math.exp((H - 100) / 10) + 0.18 * (21.1 - T) * (1 - math.exp(-0.115 * H))
        if mo < ew:
            k1 = 0.424 * (1 - ((100 - H) / 100) ** 1.7) + 0.0694 * W ** 0.5 * (1 - ((100 - H) / 100) ** 8); kw = k1 * 0.581 * math.exp(0.0365 * T); m = ew - (ew - mo) * 10 ** (-kw)
        else: m = mo
    return 59.5 * (250 - m) / (147.2 + m)

CASES = dict(
    ross=dict(hourly=F + '/wx2023.json', daily=F + '/wxd2023.json', t0=dt.datetime(2023, 7, 21, 13), hours=995, cid='1163781'),
    bradley=dict(hourly=F + '/wx_1128582_20260731.json', daily=None, t0=dt.datetime(2026, 7, 31, 14), hours=288, cid='1128582'),
    jacko=dict(hourly=F + '/wx_1163781_20260822.json', daily=F + '/wxd2026_kam.json', t0=dt.datetime(2026, 8, 22, 12), hours=10, cid='1163781'),
)
fetch_daily('1163781', dt.date(2026, 7, 25), dt.date(2026, 8, 25), F + '/wxd2026_kam.json')

out = {}
for cid, c in CASES.items():
    hw = hourly_obs(c['hourly']); rain = daily_rain(c['daily']) if c['daily'] else {}
    has_hourly_p = any(v['P'] is not None for v in hw.values())
    t0, hours = c['t0'], c['hours']
    start = t0 - dt.timedelta(days=20)
    # no hourly precip: place the daily total at the hour with the largest RH rise that day (rain timing proxy), else noon
    rain_hour = {}
    for dstr, mm in rain.items():
        if not mm: continue
        d = dt.date.fromisoformat(dstr); best, bh = -1, 12
        for k in range(1, 24):
            a = hw.get(dt.datetime(d.year, d.month, d.day, k - 1)); b = hw.get(dt.datetime(d.year, d.month, d.day, k))
            if a and b and a['RH'] is not None and b['RH'] is not None and b['RH'] - a['RH'] > best: best, bh = b['RH'] - a['RH'], k
        rain_hour[dstr] = bh
    # spin-up hourly from 85 at start
    fh = 85.0; fd = 85.0; last = dict(T=20, RH=50, WS=5, WD=27)
    rows = []
    t = start
    while t < t0 + dt.timedelta(hours=hours):
        o = hw.get(t) or {}
        rec = {k: (o.get(k) if o.get(k) is not None else last[k]) for k in last}; last = rec
        if has_hourly_p: ro = o.get('P') or 0
        else: ro = rain.get(t.date().isoformat(), 0) if t.hour == rain_hour.get(t.date().isoformat(), 12) else 0
        fh = hffmc(fh, rec['T'], rec['RH'], rec['WS'], ro)
        if t.hour == 12:
            fd = dffmc(fd, rec['T'], rec['RH'], rec['WS'], rain.get(t.date().isoformat(), 0) if not has_hourly_p else sum((hw.get(t.replace(hour=k)) or {}).get('P') or 0 for k in range(24)))
        if t >= t0:
            rows.append(dict(t=t.strftime('%m-%d %H:00'), T=rec['T'], RH=rec['RH'], WS=rec['WS'], WD=(rec['WD'] or 0) * 10, ffmc_d=round(fd, 1), ffmc_h=round(fh, 1), rain=ro))
        t += dt.timedelta(hours=1)
    out[cid] = rows
    hs = [r['ffmc_h'] for r in rows]; ds = [r['ffmc_d'] for r in rows]
    print(cid, len(rows), 'ffmc_h min/max', min(hs), max(hs), 'ffmc_d', min(ds), max(ds), 'hourly precip' if has_hourly_p else 'daily rain')
json.dump(out, open(os.path.dirname(os.path.abspath(__file__)) + '/wx_hourly.json', 'w'))
