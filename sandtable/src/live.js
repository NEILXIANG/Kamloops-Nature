/* ================= Live open data (browser-direct, CORS-enabled official APIs) =================
   ECCC OGC API  https://api.weather.gc.ca   weather-alerts · citypageweather-realtime · swob-realtime · hydrometric-realtime
   ECCC GeoMet   https://geo.weather.gc.ca/geomet   HRDPS.CONTINENTAL_* (48 h, 2.5 km) · RADAR_1KM_RRAI
   Every value shown carries: source, upstream time, fetch time. Nothing here is a forecast or warning of our own. */
const LV_T={
zh:{mode:'天气风险',sub:'未来 48 小时风、雨、雪 · Environment Canada 官方数据，浏览器直连',
 layers:{wind:'风',rain:'累计降水',snow:'累计降雪',temp:'气温',radar:'雷达'},
 alertsH:'天气警报（Environment Canada）',noAlerts:'区域内当前没有生效的天气警报',alertsN:n=>`${n} 条生效天气警报`,unofficial:'中文为非官方翻译，以英文原文为准',
 cityH:'Kamloops 现在与未来 24 小时',swobH:'气象站实测（最近一小时）',hydroH:'河流水位（Water Survey of Canada）',
 hrdpsH:'HRDPS 2.5 km 预报（城镇点）',radarNote:'雷达为最近一次扫描，不随时间轴变化',
 now:'现在',at:h=>h===0?'现在':`+${h} 小时`,gust:'阵风',rh:'湿度',pcp1:'1 h 降水',snow:'积雪',level:'水位',flow:'流量',chg24:'24 h 变化',
 age:{fresh:'刚刚',min:m=>`${m} 分钟前`,hr:h=>`${h} 小时前`,day:d=>`${d} 天前`},stale:'可能过时',loading:'正在获取…',failed:'无法获取',retry:'重试',
 src:{alerts:'ECCC 天气警报',city:'ECCC 城市预报',swob:'ECCC 气象站',hydro:'WSC 水文站',hrdps:'ECCC HRDPS 2.5 km',radar:'ECCC 雷达'},
 official:'官方实时信息',officialSub:'紧急情况请拨 911。撤离令和预警以下列官方来源为准：',
 links:[['EmergencyInfoBC · 撤离令与预警','https://www.emergencyinfobc.gov.bc.ca/'],['BC Wildfire Service · 火情仪表盘','https://wildfiresituation.nrs.gov.bc.ca/dashboard'],['TNRD · 区域应急','https://www.tnrd.ca/emergency-preparedness/'],['City of Kamloops · 应急信息','https://www.kamloops.ca/safety-emergency-services/emergency-management'],['DriveBC · 道路状况','https://www.drivebc.ca/'],['Environment Canada · 天气警报','https://weather.gc.ca/warnings/index_e.html?prov=bc'],['BC River Forecast Centre · 洪水预警','https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/drought-flooding-dikes-dams/river-forecast-centre']],
 hint:'HRDPS 是加拿大气象局的 2.5 公里高分辨率数值预报，每 6 小时更新，预报到 48 小时。地形上的颜色由浏览器从官方 GeoMet 服务取回的格点数据（WCS GeoTIFF）渲染；降水和降雪是自本次预报起始时刻的累计量（液态当量）；城镇和点击处的数值是同一格点数据的双线性插值。雷达是最近一次扫描的降水强度。气象站是 ECCC 自动站最近一小时观测。所有数据浏览器直连官方接口，页面不经过任何中间服务器。',
 alertName:{'wind warning':'大风警报','snowfall warning':'降雪警报','rainfall warning':'暴雨警报','blizzard warning':'暴风雪警报','freezing rain warning':'冻雨警报','winter storm warning':'冬季风暴警报','extreme cold warning':'极寒警报','heat warning':'高温警报','fog advisory':'大雾提示','special weather statement':'特别天气声明','arctic outflow warning':'北极气流警报','frost advisory':'霜冻提示','severe thunderstorm warning':'强雷暴警报','severe thunderstorm watch':'强雷暴预警','air quality statement':'空气质量声明','snow squall warning':'阵雪警报','freezing drizzle advisory':'冻毛雨提示','weather advisory':'天气提示','dust storm warning':'沙尘暴警报','tornado warning':'龙卷风警报','tornado watch':'龙卷风预警'}},
en:{mode:'Weather risk',sub:'Wind, rain and snow for the next 48 h · Environment Canada, fetched directly by your browser',
 layers:{wind:'Wind',rain:'Precip (accum.)',snow:'Snow (accum.)',temp:'Temp',radar:'Radar'},
 alertsH:'Weather alerts (Environment Canada)',noAlerts:'No weather alerts in effect for the region',alertsN:n=>`${n} weather alert${n>1?'s':''} in effect`,unofficial:'',
 cityH:'Kamloops now and next 24 h',swobH:'Station observations (last hour)',hydroH:'River levels (Water Survey of Canada)',
 hrdpsH:'HRDPS 2.5 km forecast at towns',radarNote:'Radar shows the latest scan; it does not follow the timeline',
 now:'Now',at:h=>h===0?'Now':`+${h} h`,gust:'Gust',rh:'RH',pcp1:'1 h precip',snow:'Snow depth',level:'Level',flow:'Flow',chg24:'24 h change',
 age:{fresh:'just now',min:m=>`${m} min ago`,hr:h=>`${h} h ago`,day:d=>`${d} d ago`},stale:'may be stale',loading:'Loading…',failed:'Unavailable',retry:'Retry',
 src:{alerts:'ECCC alerts',city:'ECCC city forecast',swob:'ECCC stations',hydro:'WSC gauges',hrdps:'ECCC HRDPS',radar:'ECCC radar'},
 official:'Official live information',officialSub:'In an emergency call 911. Evacuation orders and alerts come from these official sources:',
 links:[['EmergencyInfoBC · orders and alerts','https://www.emergencyinfobc.gov.bc.ca/'],['BC Wildfire Service · dashboard','https://wildfiresituation.nrs.gov.bc.ca/dashboard'],['TNRD · regional emergencies','https://www.tnrd.ca/emergency-preparedness/'],['City of Kamloops · emergency information','https://www.kamloops.ca/safety-emergency-services/emergency-management'],['DriveBC · road conditions','https://www.drivebc.ca/'],['Environment Canada · weather alerts','https://weather.gc.ca/warnings/index_e.html?prov=bc'],['BC River Forecast Centre · flood advisories','https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/drought-flooding-dikes-dams/river-forecast-centre']],
 hint:'HRDPS is the Meteorological Service of Canada 2.5 km high-resolution deterministic forecast, updated every 6 h out to 48 h. The colours on the terrain are rendered in your browser from the gridded fields fetched from the official GeoMet service (WCS GeoTIFF); precipitation and snow are accumulations since the start of the run (liquid equivalent); town and click-point values are bilinear interpolations of the same grid. Radar is the latest precipitation-rate scan. Stations are ECCC automatic stations, last hour. Everything is fetched by your browser straight from the official APIs; no intermediate server.',
 alertName:{}}};
const LVT=()=>LV_T[lang];
const EP={ogc:'https://api.weather.gc.ca/collections',wms:'https://geo.weather.gc.ca/geomet'};
/* Official BC layers (DataBC has no CORS) come through the Cloudflare Worker in worker/. Empty = not deployed: the app keeps the built-in snapshot. */
const WORKER_BASE='';
const LBBOX=`${RI.lonW},${RI.latS},${RI.lonE},${RI.latN}`;
const HYDRO=[['08LF023','Thompson River at Kamloops','Thompson 河 · Kamloops'],['08LB064','North Thompson River at McLure','北 Thompson 河 · McLure'],['08LE031','South Thompson River at Chase','南 Thompson 河 · Chase']];
const HR_LAYERS={wind:'HRDPS.CONTINENTAL_WSPD',rain:'HRDPS.CONTINENTAL_PR',snow:'HRDPS.CONTINENTAL_SN',temp:'HRDPS.CONTINENTAL_TT',radar:'RADAR_1KM_RRAI'};
const LIVE={alerts:{},city:{},swob:{},hydro:{},evac:{},fires:{},radarTime:null,run:null,ov:{},fld:{},pending:{},evacMask:null};
let wx={layer:'wind',h:0,ovKey:null,ovData:null,loading:0,play:false};
const nowHour=()=>{const d=new Date();d.setMinutes(0,0,0);return d};
const isoHour=h=>new Date(nowHour().getTime()+h*3600e3).toISOString().replace(/\.\d{3}Z$/,'Z');
const localLabel=h=>{const d=new Date(nowHour().getTime()+h*3600e3);const p=n=>String(n).padStart(2,'0');return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:00`};
function ageOf(ts){const t=LVT().age;if(!ts)return {txt:'—',min:Infinity};const m=Math.max(0,(Date.now()-(typeof ts==='number'?ts:Date.parse(ts)))/6e4);return {min:m,txt:m<1?t.fresh:m<90?t.min(Math.round(m)):m<2880?t.hr(Math.round(m/60)):t.day(Math.round(m/1440))}};
async function getJSON(url,ms){const c=new AbortController();const to=setTimeout(()=>c.abort(),ms||15000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(to)}}
function load(key,fn,after){const s=LIVE[key];if(s.loading)return;s.loading=true;s.err=null;renderLiveBits();
  fn().then(v=>{s.data=v;s.at=Date.now();s.err=null}).catch(e=>{s.err=String(e&&e.message||e)}).finally(()=>{s.loading=false;renderLiveBits();after&&after()})}
/* ---- loaders ---- */
async function fetchAlerts(){const d=await getJSON(`${EP.ogc}/weather-alerts/items?f=json&bbox=${LBBOX}&limit=200`);
  const rank={warning:0,watch:1,advisory:2,statement:3};
  return d.features.map(f=>f.properties).filter(p=>p.status_en!=='ended'&&(!p.expiration_datetime||Date.parse(p.expiration_datetime)>Date.now()))
    .map(p=>({name:p.alert_name_en,type:p.alert_type,colour:p.risk_colour_en,text:(p.alert_text_en||'').trim(),area:p.feature_name_en,pub:p.publication_datetime,exp:p.expiration_datetime,status:p.status_en,url:`https://weather.gc.ca/warnings/index_e.html?prov=bc`}))
    .sort((a,b)=>(rank[a.type]??9)-(rank[b.type]??9)||Date.parse(b.pub)-Date.parse(a.pub))}
async function fetchCity(){const d=await getJSON(`${EP.ogc}/citypageweather-realtime/items/bc-45?f=json`);const p=d.properties,cc=p.currentConditions||{};const v=o=>o&&o.value!=null?(o.value.en??o.value):null;
  const hourly=((p.hourlyForecastGroup||{}).hourlyForecasts||[]).map(h=>{const t=new Date(h.timestamp);return {t:`${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:00`,T:(x=>isFinite(+x)?+x:null)(v(h.temperature)),WS:(x=>isFinite(+x)?+x:0)(v((h.wind||{}).speed)),WD:DIRS16[(h.wind||{}).direction&&((h.wind.direction.value||{}).en||h.wind.direction.value)]??null,pop:v(h.lop),cond:(h.condition||{}).en||''}});
  return {upd:(cc.timestamp||{}).en||p.lastUpdated,temp:v(cc.temperature),rh:v(cc.relativeHumidity),ws:v((cc.wind||{}).speed),gust:v((cc.wind||{}).gust),wd:((cc.wind||{}).direction||{}).value&&(cc.wind.direction.value.en||cc.wind.direction.value),cond:(cc.condition||{}).en||'',hourly,warnings:((p.warnings||{}).events||[]).map(e=>e.description&&(e.description.en||e.description))}}
const DIRS16={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
async function fetchSwob(){const t1=new Date(),t0=new Date(t1.getTime()-3*3600e3);const d=await getJSON(`${EP.ogc}/swob-realtime/items?f=json&bbox=${LBBOX}&limit=2000&datetime=${t0.toISOString().slice(0,19)}Z/${t1.toISOString().slice(0,19)}Z`,25000);
  const best={};for(const f of d.features){const p=f.properties,n=p['stn_nam-value'],t=p['date_tm-value'];if(!n)continue;if(!best[n]||t>best[n].t){const g=f.geometry.coordinates;
    best[n]={n,t,lat:g[1],lon:g[0],T:p.air_temp,rh:p.rel_hum,ws:p.avg_wnd_spd_10m_pst10mts??p.avg_wnd_spd_10m_pst1hr,wd:p.avg_wnd_dir_10m_pst10mts??p.avg_wnd_dir_10m_pst1hr,gust:p.max_wnd_spd_10m_pst1hr??p.max_wnd_gst_spd_10m_pst1hr,p1:p.pcpn_amt_pst1hr,snw:p.snw_dpth,km:+hav(50.676,-120.34,g[1],g[0]).toFixed(0)}}}
  return Object.values(best).filter(s=>s.T!=null||s.ws!=null).sort((a,b)=>a.km-b.km)}
function hav(a,b,c,d){const r=Math.PI/180,p1=a*r,p2=c*r,dl=(d-b)*r,dp=p2-p1;return 6371*2*Math.asin(Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2))}
async function fetchHydro(){const t1=new Date(),t0=new Date(t1.getTime()-72*3600e3);const out=[];
  for(const [id,en,zh] of HYDRO){const d=await getJSON(`${EP.ogc}/hydrometric-realtime/items?f=json&STATION_NUMBER=${id}&datetime=${t0.toISOString().slice(0,19)}Z/${t1.toISOString().slice(0,19)}Z&limit=1000`,20000);
    const rows=d.features.map(f=>f.properties).filter(p=>p.LEVEL!=null).sort((a,b)=>Date.parse(a.DATETIME)-Date.parse(b.DATETIME));if(!rows.length){out.push({id,en,zh,empty:true});continue}
    const last=rows[rows.length-1],ago=Date.parse(last.DATETIME)-24*3600e3;let prev=rows[0];for(const r of rows){if(Date.parse(r.DATETIME)<=ago)prev=r;else break}
    out.push({id,en,zh,t:last.DATETIME,level:last.LEVEL,flow:last.DISCHARGE,chg:+(last.LEVEL-prev.LEVEL).toFixed(2),series:rows.filter((_,k)=>k%6===0).map(r=>r.LEVEL)})}
  return out}
async function fetchRadarTime(){const c=new AbortController();const to=setTimeout(()=>c.abort(),15000);try{const r=await fetch(`${EP.wms}?service=WMS&version=1.3.0&request=GetCapabilities&layer=RADAR_1KM_RRAI`,{signal:c.signal});const s=await r.text();const m=s.match(/<Dimension name="time"[^>]*default="([^"]+)"/);return m?m[1]:null}finally{clearTimeout(to)}}
/* ---- Worker-cached official BC layers (evacuation orders, current fires) ---- */
async function fetchLayer(name){if(!WORKER_BASE)throw new Error('worker not deployed');const d=await getJSON(`${WORKER_BASE}/v1/layers/${name}`,20000);return d}
function evacRaster(){const d=LIVE.evac.data;if(!d||!d.features){LIVE.evacMask=null;return}const GW=RI.gw,GH=RI.gh,m=new Uint8Array(GW*GH);const I=RI;
  const inPoly=(ring,x,y)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c};
  for(const f of d.features){const st=String(f.properties.ORDER_ALERT_STATUS||'').toLowerCase();const v=st.includes('order')?2:1;const g=f.geometry;if(!g)continue;const polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
    for(const poly of polys){const ring=poly[0];let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of ring){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
      const [r0,c0]=R.rc(y1,x0),[r1,c1]=R.rc(y0,x1);for(let r=Math.max(0,r0);r<=Math.min(GH-1,r1);r++){const lat=I.latN-r/(GH-1)*(I.latN-I.latS);for(let c=Math.max(0,c0);c<=Math.min(GW-1,c1);c++){const lon=I.lonW+c/(GW-1)*(I.lonE-I.lonW);if(inPoly(ring,lon,lat))m[r*GW+c]=Math.max(m[r*GW+c],v)}}}}
  LIVE.evacMask=m}
function evacMaskAt(i){return LIVE.evacMask?LIVE.evacMask[i]:0}
function evacHTML(){const t=LVT(),d=LIVE.evac;if(!WORKER_BASE)return '';const l=lang==='zh';if(!d.data)return `<p class="hint">${d.err?(l?'官方撤离层不可达（Worker）':'Official evacuation layer unreachable (Worker)')+' · '+esc(d.err):t.loading}</p>`;
  const fs=d.data.features||[];const ago=ageOf(d.data.fetched_at).txt;if(!fs.length)return `<p class="hint ok">${l?'区域内没有生效的撤离令或预警':'No evacuation orders or alerts in the region'} · ${ago}</p>`;
  return `<ul class="alist">${fs.map(f=>{const p=f.properties,ord=/order/i.test(p.ORDER_ALERT_STATUS||'');return `<li class="${ord?'al-warning':'al-watch'}"><div class="al-h"><b>${esc(p.ORDER_ALERT_STATUS||'')}</b><span class="al-area">${esc(p.ISSUING_AGENCY||'')}</span></div><p>${esc(p.EVENT_NAME||p.ORDER_ALERT_NAME||'')}${p.MULTI_SOURCED_HOMES?` · ${p.MULTI_SOURCED_HOMES} ${l?'户':'homes'}`:''}</p><div class="al-f"><span>${esc(String(p.DATE_MODIFIED||'').slice(0,16))}</span><a href="https://www.emergencyinfobc.gov.bc.ca/" target="_blank" rel="noopener">EmergencyInfoBC</a></div></li>`}).join('')}</ul><p class="hint">${l?'来源 EmergencyInfoBC / DataBC，经 Worker 缓存':'Source EmergencyInfoBC / DataBC via Worker cache'} · ${ago}${d.data.stale?' · '+t.stale:''}</p>`}
/* ---- GeoMet WCS fields (HRDPS 2.5 km, float32 GeoTIFF clipped to the region; ~26 KB each) ---- */
const FIELDS={ws:'HRDPS.CONTINENTAL_WSPD',wd:'HRDPS.CONTINENTAL_WD',pr:'HRDPS.CONTINENTAL_PR',sn:'HRDPS.CONTINENTAL_SN',tt:'HRDPS.CONTINENTAL_TT'};
function parseTiff(buf){const dv=new DataView(buf),le=dv.getUint16(0,true)===0x4949;const u16=o=>dv.getUint16(o,le),u32=o=>dv.getUint32(o,le);let ifd=u32(4);const n=u16(ifd);const tag={};
  for(let k=0;k<n;k++){const o=ifd+2+k*12,t=u16(o),ty=u16(o+2),cnt=u32(o+4);const sz=ty===3?2:ty===4?4:ty===12?8:1;const off=cnt*sz<=4?o+8:u32(o+8);const vals=[];for(let i=0;i<cnt;i++)vals.push(ty===3?u16(off+i*2):ty===4?u32(off+i*4):dv.getFloat64(off+i*8,le));tag[t]=vals}
  const W=tag[256][0],H=tag[257][0],sf=(tag[339]||[1])[0],bps=(tag[258]||[32])[0];if((tag[259]||[1])[0]!==1||sf!==3||bps!==32)throw new Error('tiff: unsupported layout');
  const a=new Float32Array(W*H);let p=0;const offs=tag[273],cnts=tag[279];for(let i=0;i<offs.length;i++){const m=cnts[i]>>2;for(let j=0;j<m;j++)a[p++]=dv.getFloat32(offs[i]+j*4,le)}
  const sc=tag[33550]||[1,1],tp=tag[33922]||[0,0,0,0,0,0];return {W,H,a,x0:tp[3],y0:tp[4],dx:sc[0],dy:sc[1]}}
async function fetchField(code,h){const url=`${EP.wms}?service=WCS&version=2.0.1&request=GetCoverage&coverageid=${FIELDS[code]}&subset=lat(${RI.latS},${RI.latN})&subset=lon(${RI.lonW},${RI.lonE})&format=image/tiff&time=${isoHour(h)}`;
  const c=new AbortController();const to=setTimeout(()=>c.abort(),25000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);const ct=r.headers.get('content-type')||'';if(!/tiff/.test(ct))throw new Error('no coverage for this hour');const f=parseTiff(await r.arrayBuffer());f.at=Date.now();f.time=isoHour(h);return f}finally{clearTimeout(to)}}
const fldKey=(code,h)=>`${code}|${h}`;
function fieldAt(f,lat,lon){if(!f)return null;const x=(lon-f.x0)/f.dx-.5,y=(f.y0-lat)/f.dy-.5;const c=Math.max(0,Math.min(f.W-1.001,x)),r=Math.max(0,Math.min(f.H-1.001,y));const c0=c|0,r0=r|0,fx=c-c0,fy=r-r0,i=r0*f.W+c0;
  return f.a[i]*(1-fx)*(1-fy)+f.a[i+1]*fx*(1-fy)+f.a[i+f.W]*(1-fx)*fy+f.a[i+f.W+1]*fx*fy}
function dirAt(f,lat,lon){if(!f)return null;const x=(lon-f.x0)/f.dx-.5,y=(f.y0-lat)/f.dy-.5;const c=Math.round(Math.max(0,Math.min(f.W-1,x))),r=Math.round(Math.max(0,Math.min(f.H-1,y)));return f.a[r*f.W+c]}
function getField(code,h){return LIVE.fld[fldKey(code,h)]}
function ensureFields(h,codes,cb){const need=(codes||Object.keys(FIELDS)).filter(c=>{const k=fldKey(c,h);return !LIVE.fld[k]&&!LIVE.pending[k]});if(!need.length){cb&&cb();return}
  need.forEach(c=>{const k=fldKey(c,h);LIVE.pending[k]=true;wx.loading++;renderLiveBits();
    fetchField(c,h).then(f=>{LIVE.fld[k]=f}).catch(e=>{LIVE.fld[k]={err:String(e&&e.message||e),at:Date.now()}}).finally(()=>{delete LIVE.pending[k];wx.loading--;if(mode==='wx'&&h===wx.h){renderOverlay();paintRegion();refreshTags();renderWx();renderPlace()}cb&&cb()})})}
/* colour ramps (value -> rgb + alpha). Wind in km/h, precip/snow mm, temp °C */
const RAMPS={
 wind:{stops:[[0,[255,255,255,0]],[10,[120,200,255,.25]],[20,[0,150,255,.45]],[30,[255,214,0,.6]],[45,[255,120,0,.75]],[60,[220,20,60,.85]],[90,[120,0,80,.9]]],unit:'km/h',fmt:v=>Math.round(v)},
 rain:{stops:[[0,[255,255,255,0]],[0.2,[190,220,255,.3]],[2,[110,170,255,.5]],[10,[20,100,230,.65]],[25,[60,20,200,.78]],[50,[150,0,120,.9]]],unit:'mm',fmt:v=>v<10?v.toFixed(1):Math.round(v)},
 snow:{stops:[[0,[255,255,255,0]],[0.2,[230,225,255,.3]],[2,[180,160,255,.5]],[10,[120,70,230,.7]],[25,[80,20,180,.85]]],unit:'mm',fmt:v=>v<10?v.toFixed(1):Math.round(v)},
 temp:{stops:[[-30,[90,0,160,.7]],[-15,[40,80,220,.6]],[0,[120,200,255,.5]],[10,[255,255,160,.4]],[20,[255,170,0,.55]],[30,[230,40,0,.7]],[40,[120,0,0,.8]]],unit:'°C',fmt:v=>Math.round(v)}};
function rampColor(R_,v){const st=R_.stops;if(v<=st[0][0])return st[0][1];for(let k=1;k<st.length;k++){if(v<=st[k][0]){const [a,ca]=st[k-1],[b,cb]=st[k],t=(v-a)/(b-a);return [ca[0]+(cb[0]-ca[0])*t,ca[1]+(cb[1]-ca[1])*t,ca[2]+(cb[2]-ca[2])*t,ca[3]+(cb[3]-ca[3])*t]}}return st[st.length-1][1]}
function legendHTML(layer){const t=LVT();if(layer==='radar')return `<div class="legend radar"><span class="lg-t">${t.layers.radar}</span><img class="lg-img" alt="mm/h" src="${EP.wms}?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=RADAR_1KM_RRAI&format=image/png&sld_version=1.1.0"></div>`;const R_=RAMPS[layer];const st=R_.stops;
  const g=st.map(([v,c],k)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${Math.max(.15,c[3])}) ${k/(st.length-1)*100}%`).join(',');
  return `<div class="legend"><span class="lg-t">${t.layers[layer]}</span><span class="lg-bar" style="background:linear-gradient(90deg,${g})"></span><span class="lg-l">${st.filter((_,k)=>k%2===0||k===st.length-1).map(([v])=>v).join(' · ')} ${R_.unit}</span></div>`}
const layerField={wind:'ws',rain:'pr',snow:'sn',temp:'tt'};
function renderOverlay(){const T_=R;if(wx.layer==='radar'){const o=LIVE.ov.radar;wx.ovData=o&&o.data||null;wx.ovKey='radar';return}
  const code=layerField[wx.layer],f=getField(code,wx.h);if(!f||f.err){wx.ovData=null;wx.ovKey=null;return}const ramp=RAMPS[wx.layer];const sc=code==='ws'?3.6:1;
  const out=new Uint8ClampedArray(T_.TW*T_.TH*4);const I=RI;for(let y=0;y<T_.TH;y++){const lat=I.latN-(y+.5)/T_.TH*(I.latN-I.latS);for(let x=0;x<T_.TW;x++){const lon=I.lonW+(x+.5)/T_.TW*(I.lonE-I.lonW);const v=fieldAt(f,lat,lon)*sc;const c=rampColor(ramp,v);const o=(y*T_.TW+x)*4;out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];out[o+3]=c[3]*255}}
  wx.ovData=out;wx.ovKey=`${wx.layer}|${wx.h}`}
function wxOverlay(){return mode==='wx'?wx.ovData:null}
/* radar: official GetMap PNG, draped as drawn by the service */
async function fetchRadar(){const T_=R;const url=`${EP.wms}?service=WMS&version=1.3.0&request=GetMap&layers=RADAR_1KM_RRAI&crs=EPSG:4326&bbox=${RI.latS},${RI.lonW},${RI.latN},${RI.lonE}&width=${T_.TW}&height=${T_.TH}&format=image/png&transparent=true`;
  const c=new AbortController();const to=setTimeout(()=>c.abort(),25000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);const bm=await createImageBitmap(await r.blob());const cv=document.createElement('canvas');cv.width=T_.TW;cv.height=T_.TH;const cx=cv.getContext('2d');cx.drawImage(bm,0,0,T_.TW,T_.TH);return {data:cx.getImageData(0,0,T_.TW,T_.TH).data,at:Date.now()}}finally{clearTimeout(to)}}
function ensureRadar(){if(LIVE.ov.radar&&Date.now()-LIVE.ov.radar.at<6*60e3||LIVE.pending.radar)return;LIVE.pending.radar=true;wx.loading++;renderLiveBits();
  Promise.all([fetchRadar(),fetchRadarTime().catch(()=>null)]).then(([v,t])=>{LIVE.ov.radar=v;LIVE.radarTime=t}).catch(e=>{LIVE.ov.radar={err:String(e),data:null,at:Date.now()}}).finally(()=>{delete LIVE.pending.radar;wx.loading--;if(mode==='wx'){renderOverlay();paintRegion();renderWx()}})}
function ensureOverlay(){if(wx.layer==='radar')ensureRadar();else ensureFields(wx.h);renderOverlay()}
/* HRDPS run metadata: reference time + valid range (bounds the timeline) */
async function fetchRunInfo(){const c=new AbortController();const to=setTimeout(()=>c.abort(),15000);try{const r=await fetch(`${EP.wms}?service=WMS&version=1.3.0&request=GetCapabilities&layer=HRDPS.CONTINENTAL_WSPD`,{signal:c.signal});const s=await r.text();
  const t=s.match(/<Dimension name="time"[^>]*>([^<]*)/),rt=s.match(/<Dimension name="reference_time"[^>]*default="([^"]+)"/);if(!t)return null;const [t0,t1]=t[1].split('/');return {start:t0,end:t1,ref:rt?rt[1]:null,at:Date.now()}}finally{clearTimeout(to)}}
function maxHour(){const ri=LIVE.run;if(!ri)return 48;return Math.max(1,Math.min(48,Math.floor((Date.parse(ri.end)-nowHour().getTime())/3.6e6)))}
/* point values */
function wxAt(lat,lon,h){h=h??wx.h;const ws=getField('ws',h),wd=getField('wd',h),pr=getField('pr',h),sn=getField('sn',h),tt=getField('tt',h);const ok=f=>f&&!f.err;
  if(!ok(ws))return null;return {ws:fieldAt(ws,lat,lon)*3.6,wd:ok(wd)?dirAt(wd,lat,lon):null,pr:ok(pr)?fieldAt(pr,lat,lon):null,sn:ok(sn)?fieldAt(sn,lat,lon):null,tt:ok(tt)?fieldAt(tt,lat,lon):null}}
function townWx(t){return wxAt(t.la,t.lo)}
function gridArrows(){const out=[];if(wx.layer!=='wind')return out;const ws=getField('ws',wx.h),wd=getField('wd',wx.h);if(!ws||ws.err||!wd||wd.err)return out;const I=RI,n=8;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const lat=I.latN-(r+.5)/n*(I.latN-I.latS),lon=I.lonW+(c+.5)/n*(I.lonE-I.lonW);if(TOWNS.some(t=>Math.abs(t.la-lat)<0.12&&Math.abs(t.lo-lon)<0.2))continue;const [rr,cc]=R.rc(lat,lon);if(RF[rr*I.gw+cc]===1)continue;
    out.push({pos:R.world(rr,cc),name:'',kind:'warr',arrow:{deg:dirAt(wd,lat,lon),ws:fieldAt(ws,lat,lon)*3.6}})}return out}
/* scenario: HRDPS wind at the ignition point for the next 24 h */
function hrdpsScenWind(ign,cb){const I=RI,lat=I.latN-ign[0]/(I.gh-1)*(I.latN-I.latS),lon=I.lonW+ign[1]/(I.gw-1)*(I.lonE-I.lonW);const hs=[];for(let h=0;h<24;h++)hs.push(h);let left=hs.length;const done=()=>{if(--left)return;const out=[];for(const h of hs){const ws=getField('ws',h),wd=getField('wd',h);if(!ws||ws.err||!wd||wd.err){cb(null);return}const d=new Date(nowHour().getTime()+h*3600e3);out.push({WS:fieldAt(ws,lat,lon)*3.6,WD:dirAt(wd,lat,lon),tl:`${String(d.getHours()).padStart(2,'0')}:00`,hr:d.getHours()})}cb(out)};
  hs.forEach(h=>ensureFields(h,['ws','wd'],done))}
/* ---- render ---- */
function srcChip(key,ts,staleMin,extra){const t=LVT(),s=LIVE[key]||{};const a=ageOf(ts);const col=s.err?'#D93025':a.min<=staleMin?'#1E8E3E':'#F9AB00';const lab=s.loading?t.loading:s.err?t.failed:a.txt+(a.min>staleMin?' · '+t.stale:'');
  return `<button type="button" class="srcchip" data-src="${key}" title="${esc((s.err||'')+(extra||''))}"><i style="background:${col}"></i>${t.src[key]} · ${lab}</button>`}
function alertZh(name){const m=LVT().alertName||{};return m[String(name||'').toLowerCase()]||null}
function renderAlertsBanner(){const el=$('alerts');const t=LVT();const a=(LIVE.alerts.data||[]);if(!a.length){el.hidden=true;return}
  const top=a[0];const nm=lang==='zh'?(alertZh(top.name)||top.name):top.name;el.hidden=false;el.className='alerts '+(top.type==='warning'?'warn':'adv');
  el.innerHTML=`<span class="ms">warning</span><span class="t"><b>${t.alertsN(a.length)}</b> · ${esc(nm)} · ${esc(top.area)}</span><span class="ms">open_in_new</span>`;el.onclick=()=>{setMode('wx');setTimeout(()=>{const d=$('mc-body').querySelector('details[data-sec=alerts]');if(d){d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'})}},50)}}
function alertsHTML(){const t=LVT();const a=LIVE.alerts.data;if(!a)return `<p class="hint">${LIVE.alerts.err?t.failed+' · '+esc(LIVE.alerts.err):t.loading}</p>`;if(!a.length)return `<p class="hint ok">${t.noAlerts}</p>`;
  return `<ul class="alist">${a.map(x=>`<li class="al-${x.type}"><div class="al-h"><b>${esc(x.name)}</b>${lang==='zh'&&alertZh(x.name)?` <span class="sub">${esc(alertZh(x.name))}</span>`:''}<span class="al-area">${esc(x.area)}</span></div><p>${esc(x.text).replace(/\n+/g,'<br>')}</p><div class="al-f"><span>${esc(x.status)} · ${ageOf(x.pub).txt}</span><a href="${x.url}" target="_blank" rel="noopener">weather.gc.ca</a></div></li>`).join('')}</ul>${lang==='zh'?`<p class="hint">${t.unofficial}</p>`:''}`}
function cityHTML(){const t=LVT(),u=UI(),c=LIVE.city.data;if(!c)return `<p class="hint">${LIVE.city.err?t.failed:t.loading}</p>`;
  const cur=`<div class="stats"><div class="stat"><span>${t.now} · ${esc(c.cond)}</span><b>${c.temp!=null?c.temp+'°':'—'}</b></div><div class="stat"><span>${u.wspd}${c.gust?` · ${t.gust} ${c.gust}`:''}</span><b style="font-size:15px">${c.ws!=null?`${arrowFor(DIRS16[c.wd]??0)} ${esc(c.wd||'')} ${c.ws} km/h`:'—'}</b></div></div>`;
  return cur+wxChart(c.hourly.slice(0,24),u.wxF.replace('10 月 22 日','').replace('(issued 22 Oct 12:00)',''),null)}
function swobHTML(){const t=LVT(),s=LIVE.swob.data;if(!s)return `<p class="hint">${LIVE.swob.err?t.failed:t.loading}</p>`;if(!s.length)return `<p class="hint">—</p>`;
  return `<ul class="list">${s.slice(0,14).map(x=>`<li><span class="nm">${esc(x.n)}<span class="sub">${x.T!=null?x.T+'° · ':''}${t.rh} ${x.rh??'—'}%${x.p1?` · ${t.pcp1} ${x.p1} mm`:''}${x.snw?` · ${t.snow} ${x.snw} cm`:''} · ${ageOf(x.t).txt}</span></span><span class="num">${x.ws!=null?`${arrowFor(x.wd??0)} ${Math.round(x.ws)}${x.gust?`<small>/${Math.round(x.gust)}</small>`:''} km/h`:'—'}</span></li>`).join('')}</ul>`}
function hydroHTML(){const t=LVT(),h=LIVE.hydro.data;if(!h)return `<p class="hint">${LIVE.hydro.err?t.failed:t.loading}</p>`;
  return `<ul class="list">${h.map(x=>{if(x.empty)return `<li><span class="nm">${esc(lang==='zh'?x.zh:x.en)}<span class="sub">—</span></span></li>`;const sp=spark(x.series);const up=x.chg>0.05,dn=x.chg<-0.05;
    return `<li><span class="nm">${esc(lang==='zh'?x.zh:x.en)}<span class="sub">${t.flow} ${x.flow!=null?Math.round(x.flow)+' m³/s':'—'} · ${t.chg24} <span style="color:${up?'var(--order)':dn?'var(--safe)':'inherit'}">${x.chg>0?'+':''}${x.chg} m</span> · ${ageOf(x.t).txt}</span></span><span class="num">${sp}<b>${x.level.toFixed(2)} m</b></span></li>`}).join('')}</ul>`}
function spark(a){if(!a||a.length<2)return '';const mn=Math.min(...a),mx=Math.max(...a),W=64,H=20;const d=a.map((v,k)=>`${k?'L':'M'}${(k/(a.length-1)*W).toFixed(1)},${(H-2-(mx>mn?(v-mn)/(mx-mn):0.5)*(H-4)).toFixed(1)}`).join('');return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="var(--primary)" stroke-width="1.5"/></svg>`}
function townsHTML(){const t=LVT(),l=L();const rows=TOWNS.map(tn=>({tn,g:townWx(tn)})).filter(x=>x.g).sort((a,b)=>(b.g.ws||0)-(a.g.ws||0));if(!rows.length)return `<p class="hint">${wx.loading>0?t.loading:t.failed}</p>`;
  const ref=LIVE.run&&LIVE.run.ref;return `<ul class="list">${rows.slice(0,12).map(({tn,g})=>`<li><span class="nm">${tn.n}<span class="sub">${g.tt!=null?Math.round(g.tt)+'° · ':''}${t.layers.rain} ${g.pr!=null?g.pr.toFixed(1):'—'} mm${g.sn?` · ${t.layers.snow} ${g.sn.toFixed(1)} mm`:''}</span></span><span class="num">${g.ws!=null?`${arrowFor(g.wd??0)} ${dirName(g.wd)} ${Math.round(g.ws)} km/h`:'—'}</span></li>`).join('')}</ul>${ref?`<p class="hint">HRDPS run ${esc(ref.replace('T',' ').replace(':00Z',' UTC'))} · ${t.at(wx.h)} · ${localLabel(wx.h)}</p>`:''}`}
function renderWxTowns(){const el=$('mc-body')&&$('mc-body').querySelector('[data-towns]');if(el)el.innerHTML=townsHTML()}
function renderWx(){const t=LVT(),u=UI();const chips=['wind','rain','snow','temp','radar'].map(k=>`<button type="button" class="fchip" data-l="${k}" aria-pressed="${wx.layer===k}">${t.layers[k]}</button>`).join('');
  const fl=wx.layer==='radar'?LIVE.ov.radar:getField(layerField[wx.layer],wx.h);const ovState=wx.loading>0?t.loading:fl&&fl.err?t.failed+' · '+esc(fl.err):'';const hrAt=wx.layer==='radar'?(LIVE.ov.radar&&LIVE.ov.radar.at):(fl&&fl.at);
  card(t.mode,t.sub,`
   <div class="srcrow">${srcChip('alerts',LIVE.alerts.at,30)}${srcChip(wx.layer==='radar'?'radar':'hrdps',hrAt,420,LIVE.run&&LIVE.run.ref?' run '+LIVE.run.ref:'')}${srcChip('swob',LIVE.swob.at,90)}${srcChip('hydro',LIVE.hydro.at,120)}${srcChip('city',LIVE.city.at,90)}</div>
   <div class="fchips" role="group">${chips}</div>${legendHTML(wx.layer)}
   ${ovState?`<p class="hint">${ovState}</p>`:''}${wx.layer==='radar'?`<p class="hint">${t.radarNote}${LIVE.radarTime?' · '+esc(LIVE.radarTime.replace('T',' ').replace('Z',' UTC')):''}</p>`:''}
   <details class="sec" data-sec="alerts" ${(LIVE.alerts.data||[]).length?'open':''}><summary>${t.alertsH}<span class="ms">expand_more</span></summary>${alertsHTML()}</details>
   ${sec(t.hrdpsH,`<div data-towns>${townsHTML()}</div>`,true)}
   ${sec(t.cityH,cityHTML())}
   ${sec(t.swobH,swobHTML())}
   ${sec(t.hydroH,hydroHTML())}
   ${sec(u.method,`<p class="hint">${esc(t.hint)}</p>`)}`);
  $('mc-body').querySelectorAll('.fchip').forEach(b=>b.onclick=()=>{wx.layer=b.dataset.l;ensureOverlay();renderWx();paintRegion();refreshTags();syncTimeline()});
  $('mc-body').querySelectorAll('.srcchip').forEach(b=>b.onclick=()=>{const k=b.dataset.src;if(k==='hrdps'){for(const c in FIELDS)delete LIVE.fld[fldKey(c,wx.h)];ensureOverlay()}else if(k==='radar'){delete LIVE.ov.radar;ensureRadar()}else refreshLive(k)})}
function renderLiveBits(){if(mode==='wx')renderWx();renderAlertsBanner();renderStatus()}
function refreshLive(which){const all=!which;if(WORKER_BASE&&(all||which==='evac'))load('evac',()=>fetchLayer('evac'),()=>{evacRaster();if(mode==='live'||mode==='scen'){paintRegion();renderMode()}});if(WORKER_BASE&&(all||which==='fires'))load('fires',()=>fetchLayer('fires'),()=>{if(mode==='live')renderMode()});if(all||which==='alerts')load('alerts',fetchAlerts);if(all||which==='city')load('city',fetchCity);if(all||which==='swob')load('swob',fetchSwob);if(all||which==='hydro')load('hydro',fetchHydro);
  if(all&&!LIVE.radarTime)fetchRadarTime().then(v=>{LIVE.radarTime=v}).catch(()=>{})}
function enterWx(){{const p=R.world(...R.rc(50.676,-120.34));if(camera.position.distanceTo(controls.target)<R.W*0.5)flyTo(p,R.W*0.95,topDown)}if(!LIVE.run)fetchRunInfo().then(v=>{LIVE.run=v;if(mode==='wx'){syncTimeline();renderWx()}}).catch(()=>{});ensureOverlay();refreshLive()}
/* ---- official information popover ---- */
function renderOfficial(){const t=LVT();$('opanel').innerHTML=`<div class="lp-h">${t.official}</div><p class="lp-note">${esc(t.officialSub)}</p>${t.links.map(([n,u])=>`<a class="olink" href="${u}" target="_blank" rel="noopener"><span>${esc(n)}</span><span class="ms">open_in_new</span></a>`).join('')}`;$('b-official').querySelector('.t').textContent=t.official}
$('b-official').onclick=()=>{const open=$('opanel').hidden;$('opanel').hidden=!open;$('b-official').setAttribute('aria-expanded',String(open))};
document.addEventListener('pointerdown',e=>{if(!$('opanel').hidden&&!$('official').contains(e.target)){$('opanel').hidden=true;$('b-official').setAttribute('aria-expanded','false')}});
/* periodic refresh while the page is open (alerts every 10 min, rest every 30 min) */
setInterval(()=>{if(document.hidden)return;load('alerts',fetchAlerts)},10*60e3);
setInterval(()=>{if(document.hidden)return;refreshLive('city');refreshLive('swob');refreshLive('hydro')},30*60e3);
