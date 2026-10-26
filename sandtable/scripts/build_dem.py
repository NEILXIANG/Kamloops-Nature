"""Fetch Terrarium elevation tiles around Kamloops, mosaic, crop, resample, export JSON stats + base64 uint16 (decimetres)."""
import io, math, sys, json, base64, os, urllib.request
import numpy as np
from PIL import Image

OUT = sys.argv[1]
Z = 13
LAT_N, LAT_S = 50.725, 50.635
LON_W, LON_E = -120.46, -120.23
GW, GH = 384, 240  # output grid


def tx(lon): return (lon + 180) / 360 * 2**Z
def ty(lat): return (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**Z

x0, x1 = int(tx(LON_W)), int(tx(LON_E))
y0, y1 = int(ty(LAT_N)), int(ty(LAT_S))
os.makedirs(OUT + '/tiles', exist_ok=True)
rows = []
for y in range(y0, y1 + 1):
    row = []
    for x in range(x0, x1 + 1):
        p = f'{OUT}/tiles/{Z}_{x}_{y}.png'
        if not os.path.exists(p):
            url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
            with urllib.request.urlopen(url, timeout=30) as r:
                open(p, 'wb').write(r.read())
        a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
        row.append(a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768)
    rows.append(np.hstack(row))
mos = np.vstack(rows)  # pixel grid in global pixel coords starting x0*256, y0*256

# sample output grid in lat/lon (equirectangular so x/y are metres-proportional)
lats = np.linspace(LAT_N, LAT_S, GH)
lons = np.linspace(LON_W, LON_E, GW)
px = (np.array([tx(l) for l in lons]) - x0) * 256
py = (np.array([ty(l) for l in lats]) - y0) * 256
PX, PY = np.meshgrid(px, py)
# bilinear
ix = np.clip(np.floor(PX).astype(int), 0, mos.shape[1] - 2); fx = PX - ix
iy = np.clip(np.floor(PY).astype(int), 0, mos.shape[0] - 2); fy = PY - iy
h = (mos[iy, ix] * (1 - fx) * (1 - fy) + mos[iy, ix + 1] * fx * (1 - fy)
     + mos[iy + 1, ix] * (1 - fx) * fy + mos[iy + 1, ix + 1] * fx * fy)

width_m = (LON_E - LON_W) * 111320 * math.cos(math.radians((LAT_N + LAT_S) / 2))
height_m = (LAT_N - LAT_S) * 110574
dm = np.clip(np.round(h * 10), 0, 65535).astype('<u2')
info = dict(gw=GW, gh=GH, latN=LAT_N, latS=LAT_S, lonW=LON_W, lonE=LON_E,
            widthM=round(width_m), heightM=round(height_m),
            min=float(h.min()), max=float(h.max()), p1=float(np.percentile(h, 1)), p5=float(np.percentile(h, 5)))
open(OUT + '/dem.json', 'w').write(json.dumps(info))
open(OUT + '/dem.b64', 'w').write(base64.b64encode(dm.tobytes()).decode())
np.save(OUT + '/dem.npy', h)
print(info)
# sample known spots
def at(lat, lon):
    r = int(round((LAT_N - lat) / (LAT_N - LAT_S) * (GH - 1))); c = int(round((lon - LON_W) / (LON_E - LON_W) * (GW - 1)))
    return round(float(h[r, c]), 1)
for n, la, lo in [('downtown', 50.6745, -120.3273), ('riverside park', 50.6795, -120.329), ('north shore', 50.689, -120.352),
                  ('mcarthur island', 50.691, -120.336), ('sahali', 50.655, -120.345), ('aberdeen', 50.651, -120.405),
                  ('valleyview', 50.672, -120.265), ('brocklehurst', 50.703, -120.385), ('airport', 50.702, -120.444),
                  ('TRU', 50.671, -120.364), ('RIH hospital', 50.669, -120.333), ('river confluence', 50.684, -120.320)]:
    print(n, at(la, lo))
