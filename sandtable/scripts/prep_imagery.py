"""Build Sentinel-2 true-colour mosaics (Copernicus open data via Earth Search / AWS COGs)
for each terrain in the sand table. Output: imagery.json {key:{jpg:dataURL,w,h,scenes:[...]}}"""
import json, urllib.request, io, base64, sys, time
import numpy as np, rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from PIL import Image
d=sys.argv[1]  # work dir holding all_assets.json, demdata/ ; writes imagery.json
only=sys.argv[2:]
AS=json.load(open(d+'/all_assets.json')); CI=json.load(open(d+'/demdata/dem.json'))
targets={'region':(AS['region']['info'],2),'city':(CI,2)}
for r in AS['replays']: targets[r['id']]=(r['info'],2)

def stac(bbox,dt,cc):
    q={"collections":["sentinel-2-l2a"],"bbox":bbox,"datetime":dt,"query":{"eo:cloud_cover":{"lt":cc}},"limit":400}
    req=urllib.request.Request("https://earth-search.aws.element84.com/v1/search",data=json.dumps(q).encode(),headers={"Content-Type":"application/json"})
    return json.load(urllib.request.urlopen(req,timeout=90))['features']

ITEMRANK={}
def mosaic(info,ts,items,quality):
    W,H=info['gw']*ts,info['gh']*ts
    west,east,south,north=info['lonW'],info['lonE'],info['latS'],info['latN']
    tr=from_bounds(west,south,east,north,W,H)
    out=np.zeros((3,H,W),np.uint8); filled=np.zeros((H,W),bool); used=[]
    # scenes intersecting bbox, best (lowest cloud) first
    cand=[]
    for it in items:
        b=it['bbox']
        if b[2]<west or b[0]>east or b[3]<south or b[1]>north: continue
        cand.append(it)
    cand.sort(key=lambda it:(ITEMRANK[it['id']],it['properties']['eo:cloud_cover']))
    seen=set()
    for it in cand:
        if filled.all(): break
        if it['id'] in seen: continue
        seen.add(it['id'])
        href=it['assets']['visual']['href']
        try:
            with rasterio.open(href) as src:
                # pick an overview level close to the output resolution to cut network reads
                    import math
                    deg_px=(east-west)/W; m_px=deg_px*111320*math.cos(math.radians((north+south)/2))
                    f=max(1,int(m_px/10/1.5)); ovs=src.overviews(1); lvl=None
                    for k,o in enumerate(ovs):
                        if o<=f: lvl=k
                    src2=rasterio.open(href,overview_level=lvl) if lvl is not None else src
                    with WarpedVRT(src2,crs='EPSG:4326',transform=tr,width=W,height=H,resampling=Resampling.bilinear) as v:
                        a=v.read()
        except Exception as e:
            print('  skip',it['id'],e); continue
        valid=(a.sum(0)>0)&~filled
        # crude cloud/snow mask: very bright neutral pixels are likely cloud; keep (can't do better without SCL) but skip pure white
        if valid.sum()==0: continue
        for k in range(3): out[k][valid]=a[k][valid]
        filled|=valid; used.append({'id':it['id'],'date':it['properties']['datetime'][:10],'cc':round(it['properties']['eo:cloud_cover'],2)})
        print('  +',it['id'],'cc',it['properties']['eo:cloud_cover'],'cover',round(filled.mean()*100,1),'%')
    img=Image.fromarray(np.moveaxis(out,0,-1))
    # gentle contrast lift (Sentinel TCI is a bit flat)
    arr=np.asarray(img).astype(np.float32); arr=np.clip((arr-8)*1.12,0,255); img=Image.fromarray(arr.astype(np.uint8))
    bio=io.BytesIO(); img.save(bio,'JPEG',quality=quality,optimize=True,progressive=False)
    print('  ->',W,H,len(bio.getvalue())//1024,'KB',round(filled.mean()*100,1),'% filled')
    return {'jpg':'data:image/jpeg;base64,'+base64.b64encode(bio.getvalue()).decode(),'w':W,'h':H,'scenes':used,'fill':round(float(filled.mean()),4)}

bbox=[-122.3,49.35,-118.4,52.0]
items=stac(bbox,"2026-08-15T00:00:00Z/2026-10-10T00:00:00Z",6)
print('2026 scenes',len(items))
items25=stac(bbox,"2025-07-15T00:00:00Z/2025-09-20T00:00:00Z",6)
print('2025 scenes',len(items25))
items22=stac([-120.6,50.3,-120.2,50.8],"2022-07-10T00:00:00Z/2022-09-10T00:00:00Z",6)
print('2022 scenes',len(items22))
# per-target preference: current views prefer latest 2026 imagery; replays prefer imagery from BEFORE the fire
PREF={'region':[items,items25],'city':[items,items25],'jacko':[items25,items],'bradley':[items25,items],'ross':[items22,items25]}
res={}
for key,(info,ts) in targets.items():
    if only and key not in only: continue
    print(key)
    ITEMRANK={}
    for k,grp in enumerate(PREF[key]):
        for it in grp: ITEMRANK.setdefault(it['id'],k)
    allit=[it for grp in PREF[key] for it in grp]
    res[key]=mosaic(info,ts,allit,78 if key=='region' else 82)
import os
prev=json.load(open(d+'/imagery.json')) if os.path.exists(d+'/imagery.json') else {}
prev.update(res);json.dump(prev,open(d+'/imagery.json','w'))
print('total',sum(len(v['jpg']) for v in res.values())//1024,'KB')
