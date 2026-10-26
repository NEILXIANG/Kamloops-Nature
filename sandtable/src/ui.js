/* ================= UI layer (Google Maps style) ================= */
const U={
zh:{modes:['最新火情','历史回放','山火情景','洪水演示','天气风险'],layers:'图层',search:'搜索城镇、社区、湖泊、医院，或经纬度',
 base:'底图',sat:'卫星影像',shade:'地形晕渲',exag:'地形高度',satNote:d=>`Sentinel-2 卫星影像 · ${d}`,wxF:'Kamloops 未来 24 小时（Environment Canada 逐时预报）',wxR:'火灾当时逐小时天气',temp:'气温',wspd:'风速',
 lay:{hist:'历史与 2026 年火场',firms:'卫星热点（近 7 天）',fuel:'燃料类型',roads:'主要公路',labels:'地名标注'},
 home:'回到 Kamloops',view3d:'切换俯视 / 三维',north:'回正北',zin:'放大',zout:'缩小',
 info:'数据与验证',snapAgo:a=>`数据 ${a}`,liveSub:a=>`快照 2026-10-22 12:50 PDT · ${a}`,
 liveFires:'区域内尚未熄灭的山火',liveFc:'Kamloops 风向预报（Environment Canada）',liveHist:'2015 年以来的大火',
 repSub:'模拟和官方记录对比',repPick:'选择火灾',repCmp:'模型和实际对比',repArea:'模拟过火面积',repWx:'当时天气',
 scenSub:'情景推演，不是预测',scenPick:'在地图上点选起火点',scenPicking:'点击地图任意位置…',scenRun:'计算 24 小时蔓延',scenTowns:'城镇参考点（距模拟火线）',
 stale:'设置已修改，地图上仍是上一次的结果。按“计算”更新。',uses:'当前结果使用：',
 floodSub:'假设水位下的地形连通淹没',
 tlScen:(h,t)=>`起火后 ${h}`,tlRep:t=>t,
 plStatus:'当前画面中的状态',plMore:'这些数据从哪里来',close:'关闭',
 elev:'海拔',fuel:'燃料',hist:'历史火场',coords:'坐标',road:'最近公路',
 computing:'正在后台计算蔓延…',cancel:'取消',done:'计算完成',cancelled:'已取消',
 notFound:'没有找到这个地点。只能搜当前地图上的标注。',outOfRange:'坐标在当前地图范围之外。',
 drawerAbout:'这个沙盘把 Kamloops 周边约 2 小时车程范围内的公开数据放在真实三维地形上：官方火场、卫星热点、天气预报、燃料类型，以及一个经过简化和校准的山火蔓延模型。它用于理解地形和数据，不是官方预报或警报。',
 method:'方法与限制',sheetMore:'展开',sheetLess:'收起'},
en:{modes:['Latest fires','Fire replay','Wildfire scenario','Flood demo','Weather risk'],layers:'Layers',search:'Search towns, neighbourhoods, lakes, hospitals, or lat, lon',
 base:'Base map',sat:'Satellite',shade:'Terrain shading',exag:'Terrain height',satNote:d=>`Sentinel-2 imagery · ${d}`,wxF:'Kamloops next 24 h (Environment Canada forecast)',wxR:'Hourly weather during the fire',temp:'Temp',wspd:'Wind',
 lay:{hist:'Past and 2026 fire perimeters',firms:'Satellite hotspots (7 days)',fuel:'Fuel types',roads:'Highways',labels:'Place labels'},
 home:'Back to Kamloops',view3d:'Top-down / 3D',north:'Reset north',zin:'Zoom in',zout:'Zoom out',
 info:'Data & checks',snapAgo:a=>`Data ${a}`,liveSub:a=>`Snapshot 2026-10-22 12:50 PDT · ${a}`,
 liveFires:'Fires in region not yet declared out',liveFc:'Kamloops wind forecast (Environment Canada)',liveHist:'Large fires since 2015',
 repSub:'Model versus official records',repPick:'Choose a fire',repCmp:'Model vs reality',repArea:'Simulated burned area',repWx:'Weather then',
 scenSub:'A scenario, not a forecast',scenPick:'Pick ignition on map',scenPicking:'Click anywhere on the map…',scenRun:'Compute 24 h spread',scenTowns:'Town reference points (distance to modelled fire line)',
 stale:'Settings changed; the map still shows the previous result. Press Compute to update.',uses:'Current result uses: ',
 floodSub:'Connected flooding at an assumed water level',
 tlScen:(h,t)=>`${h} after ignition`,tlRep:t=>t,
 plStatus:'Status in this view',plMore:'Where this data comes from',close:'Close',
 elev:'Elevation',fuel:'Fuel',hist:'Past fire',coords:'Coordinates',road:'Nearest highway',
 computing:'Computing spread in the background…',cancel:'Cancel',done:'Done',cancelled:'Cancelled',
 notFound:'Not found. Only labels on the current map can be searched.',outOfRange:'Coordinates are outside the current map.',
 drawerAbout:'This sand table puts public data for roughly a two-hour drive around Kamloops on real 3D terrain: official fire perimeters, satellite hotspots, weather forecasts, fuel types, and a simplified, calibrated fire-spread model. It is for understanding terrain and data, not an official forecast or alert.',
 method:'Method and limits',sheetMore:'Expand',sheetLess:'Collapse'}};
const UI=()=>U[lang];
/* ---- inline icons (Material Design, Apache 2.0) ---- */
const ICO={search:'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
close:'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
layers:'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
local_fire_department:'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
history:'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
science:'M13 11.33L18 18H6l5-6.67V6h2m2.96-2H8.04c-.42 0-.65.48-.39.81L9 6.5v4.17L3.2 18.4c-.49.66-.02 1.6.8 1.6h16c.82 0 1.29-.94.8-1.6L15 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81z',
water:'M21 14c-1.4 0-2.1-.7-2.8-1.4C17.5 11.9 17 11.5 16 11.5s-1.5.4-2.2 1.1c-.7.7-1.4 1.4-2.8 1.4s-2.1-.7-2.8-1.4C7.5 11.9 7 11.5 6 11.5s-1.5.4-2.2 1.1C3.1 13.3 2.4 14 1 14v2c1.4 0 2.1-.7 2.8-1.4.7-.7 1.2-1.1 2.2-1.1s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4s2.1-.7 2.8-1.4c.7-.7 1.2-1.1 2.2-1.1s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4v-2zm0-6c-1.4 0-2.1-.7-2.8-1.4C17.5 5.9 17 5.5 16 5.5s-1.5.4-2.2 1.1C13.1 7.3 12.4 8 11 8s-2.1-.7-2.8-1.4C7.5 5.9 7 5.5 6 5.5s-1.5.4-2.2 1.1C3.1 7.3 2.4 8 1 8v2c1.4 0 2.1-.7 2.8-1.4C4.5 7.9 5 7.5 6 7.5s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4s2.1-.7 2.8-1.4c.7-.7 1.2-1.1 2.2-1.1s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4V8zm0 12c-1.4 0-2.1-.7-2.8-1.4-.7-.7-1.2-1.1-2.2-1.1s-1.5.4-2.2 1.1c-.7.7-1.4 1.4-2.8 1.4s-2.1-.7-2.8-1.4c-.7-.7-1.2-1.1-2.2-1.1s-1.5.4-2.2 1.1C3.1 19.3 2.4 20 1 20v2c1.4 0 2.1-.7 2.8-1.4.7-.7 1.2-1.1 2.2-1.1s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4s2.1-.7 2.8-1.4c.7-.7 1.2-1.1 2.2-1.1s1.5.4 2.2 1.1c.7.7 1.4 1.4 2.8 1.4v-2z',
home:'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
view_in_ar:'M18.25 7.6l-5.5-3.18c-.46-.27-1.04-.27-1.5 0L5.75 7.6c-.46.27-.75.76-.75 1.3v6.35c0 .54.29 1.03.75 1.3l5.5 3.18c.46.27 1.04.27 1.5 0l5.5-3.18c.46-.27.75-.76.75-1.3V8.9c0-.54-.29-1.03-.75-1.3zM7 14.96v-4.62l4 2.32v4.61l-4-2.31zm5-4.03L8 8.61l4-2.31 4 2.31-4 2.32zm1 6.34v-4.61l4-2.32v4.62l-4 2.31zM7 2H3.5C2.67 2 2 2.67 2 3.5V7h2V4h3V2zm10 0h3.5c.83 0 1.5.67 1.5 1.5V7h-2V4h-3V2zM7 22H3.5c-.83 0-1.5-.67-1.5-1.5V17h2v3h3v2zm10 0h3.5c.83 0 1.5-.67 1.5-1.5V17h-2v3h-3v2z',
navigation:'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
add:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',remove:'M19 13H5v-2h14v2z',
info:'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
play_arrow:'M8 5v14l11-7z',pause:'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
expand_more:'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
warning:'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
play_circle:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
open_in_new:'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
air:'M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5zm-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5v2c1.93 0 3.5-1.57 3.5-3.5S20.43 11 18.5 11z',
verified_user:'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
refresh:'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'};
function iconize(root){(root||document).querySelectorAll('.ms').forEach(el=>{const n=el.textContent.trim();if(!n||!ICO[n])return;el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[n]}"/></svg>`;el.dataset.ico=n})}
new MutationObserver(ms=>{let need=false;for(const m of ms){if(m.type==='childList'){for(const n of m.addedNodes){if(n.nodeType===3&&n.parentElement&&n.parentElement.classList.contains('ms')){need=true;break}if(n.nodeType===1&&(n.classList.contains('ms')||n.querySelector('.ms'))){need=true;break}}}if(need)break}if(need)iconize()}).observe($('app'),{childList:true,subtree:true});
iconize();
let showFirms=true,showRoads=true,showLabels=true,sheetFull=false,drawerOpen=false,toastTimer=null,hoverT=0,hoverBack=null;
const isMobile=()=>window.innerWidth<=700;

/* ---- satellite base map ---- */
function attachSat(T_){if(!T_||T_.satBase||!T_.view)return;const im=SATI[T_.view];if(!im||!im.complete||!im.naturalWidth)return;
  const cv=document.createElement('canvas');cv.width=T_.TW;cv.height=T_.TH;const cx=cv.getContext('2d');cx.drawImage(im,0,0,T_.TW,T_.TH);const src=cx.getImageData(0,0,T_.TW,T_.TH).data;
  const out=new Uint8ClampedArray(src.length),sh=T_.shadeA,g=T_===R?1.32:1.12;
  for(let q=0,p=0;q<sh.length;q++,p+=4){const k=g*(0.66+0.34*Math.min(1.15,sh[q]));out[p]=src[p]*k;out[p+1]=src[p+1]*k;out[p+2]=src[p+2]*k;out[p+3]=255}
  T_.satBase=out}
function terrainFor(k){return k==='region'?R:k==='city'?C:((REPS.find(X=>X.rp.id===k)||{}).T)}
for(const k in IMG){const im=new Image();im.onload=()=>{const T_=terrainFor(k);if(T_){attachSat(T_);if(T_===curT&&basemap==='sat')repaint()}};im.src=IMG[k].jpg;SATI[k]=im}
function satDates(k){const sc=(IMG[k]||{}).scenes||[];const ds=[...new Set(sc.map(x=>x.date))].sort();return ds.length?(ds.length>1?ds[0]+' – '+ds[ds.length-1]:ds[0]):''}
function setExag(v){EXK=v;[R,C,...REPS.map(X=>X.T).filter(Boolean)].forEach(t=>t.group.scale.y=EXK);placeMarkers();refreshTags();if(lookCell){const [T_,r,c]=lookCell;if(searchMark.visible)searchMark.userData.b=T_.world(r,c)}}

/* ---- weather mini chart ---- */
function wxChart(list,title,cur){if(!list||!list.length)return '';const W=320,H=104,ml=26,mr=26,mt=14,mb=30,pw=W-ml-mr,ph=H-mt-mb,n=list.length;
  const X=k=>ml+(n===1?pw/2:k*pw/(n-1));const Ts=list.map(w=>w.T),t0=Math.floor(Math.min(...Ts)-1),t1=Math.ceil(Math.max(...Ts)+1);const wmax=Math.max(20,...list.map(w=>w.WS));
  const YT=t=>mt+ph-(t-t0)/(t1-t0)*ph,YW=v=>mt+ph-v/wmax*ph;const bw=Math.max(2,pw/n*0.55);
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`;
  list.forEach((w,k)=>{svg+=`<rect x="${X(k)-bw/2}" y="${YW(w.WS)}" width="${bw}" height="${mt+ph-YW(w.WS)}" rx="1.5" fill="var(--primary)" opacity=".22"/>`});
  svg+=`<path d="${list.map((w,k)=>(k?'L':'M')+X(k).toFixed(1)+','+YT(w.T).toFixed(1)).join('')}" fill="none" stroke="var(--order)" stroke-width="2" stroke-linejoin="round"/>`;
  svg+=`<text class="tk" x="${ml-4}" y="${YT(t1)+3}" text-anchor="end">${t1}°</text><text class="tk" x="${ml-4}" y="${YT(t0)+3}" text-anchor="end">${t0}°</text><text class="tk" x="${W-mr+4}" y="${YW(wmax)+3}">${Math.round(wmax)}</text><text class="tk" x="${W-mr+4}" y="${mt+ph+3}">0</text>`;
  const step=Math.max(1,Math.round(n/8));list.forEach((w,k)=>{if(k%step)return;const x=X(k),ang=((w.WD??0)+180)%360;
    svg+=`<g transform="translate(${x},${H-20}) rotate(${ang})"><line x1="0" y1="4" x2="0" y2="-4" stroke="var(--muted)" stroke-width="1.4"/><path d="M-2.6,-1.4 L0,-4.4 L2.6,-1.4" fill="none" stroke="var(--muted)" stroke-width="1.4"/></g>`;
    svg+=`<text class="tk" x="${x}" y="${H-3}" text-anchor="middle">${esc(String(w.t||'').slice(-5,-3)||'')}</text>`});
  if(cur!=null&&cur>=0&&cur<=n-1)svg+=`<line x1="${X(cur)}" x2="${X(cur)}" y1="${mt-4}" y2="${mt+ph}" stroke="var(--primary)" stroke-width="1.5"/>`;
  svg+='</svg>';const u=UI();
  return `<div class="wxmini"><div class="wxh"><span>${esc(title)}</span><span class="lg"><i style="background:var(--order)"></i>${u.temp} °C <i style="background:var(--primary);opacity:.4"></i>${u.wspd} km/h</span></div><div class="chart">${svg}</div></div>`}
function fcList(){const c=(typeof LIVE!=='undefined')&&LIVE.city&&LIVE.city.data;return c&&c.hourly&&c.hourly.length>=12?c.hourly:AS.region.live.forecast}
function placeWx(){const u=UI();if(mode==='replay'){const X=REPS[repIdx];return wxChart(X.rp.wx,u.wxR+' · '+X.rp.name,Math.min(X.rp.wx.length-1,repT))}
  const fc=fcList().slice(0,24);return wxChart(fc,u.wxF,mode==='scen'&&scen.arr&&scen.windSrc===0?Math.min(23,scen.t):null)}

/* ---- small helpers ---- */
const arrowFor=deg=>`<span class="arrow" style="display:inline-block;transform:rotate(${(deg+180)%360}deg)">↑</span>`;
function dirName(deg){if(deg==null)return '—';return L().dirs[Math.round(((deg%360)+360)%360/45)%8]}
function repHours(X){return X.rp.wx.length}
function defT(X){const r=X.rp.reports;const h=r&&r.length?r[r.length-1].h:repHours(X);return Math.min(repHours(X),Math.round(h*4)/4)}
function repTimeLabel(X,t){const [d,h]=X.rp.t0.split(' ');const base=new Date(d+'T'+h+':00');const dt=new Date(base.getTime()+t*3600e3);const p=n=>String(n).padStart(2,'0');return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`}
function ageText(){const l=L().x;const age=(Date.now()-Date.parse('2026-10-22T12:50:00-07:00'))/3.6e6;return {age,txt:age<1?l.justNow:age<48?l.hoursAgo(Math.round(age)):l.daysAgo(Math.round(age/24)),col:age<6?'#1E8E3E':age<48?'#F9AB00':'#D93025'}}
function toast(msg,btn,fn){clearTimeout(toastTimer);$('toast-txt').textContent=msg;const b=$('toast-btn');if(btn){b.textContent=btn;b.hidden=false;b.onclick=()=>{fn&&fn();$('toast').hidden=true}}else b.hidden=true;$('toast').hidden=false;if(!btn)toastTimer=setTimeout(()=>{$('toast').hidden=true},3500)}
function sec(title,inner,open){return `<details class="sec"${open?' open':''}><summary>${esc(title)}<span class="ms">expand_more</span></summary>${inner}</details>`}
function flyRaw(t,p,dur){fly={from:{t:controls.target.clone(),p:camera.position.clone()},to:{t:t.clone(),p:p.clone()},t0:performance.now(),dur:dur||700}}
function whereParts(T_,r,c){const I=T_.info,la=I.latN-r/(I.gh-1)*(I.latN-I.latS),lo=I.lonW+c/(I.gw-1)*(I.lonE-I.lonW);const kx=111.32*Math.cos(la*Math.PI/180),ky=110.57;
  const cand=T_===C?HOODS.map(h=>({n:h[lang],la:CITY_INFO.latN-h.r/(CITY_INFO.gh-1)*(CITY_INFO.latN-CITY_INFO.latS),lo:CITY_INFO.lonW+h.c/(CITY_INFO.gw-1)*(CITY_INFO.lonE-CITY_INFO.lonW)})):TOWNS.map(t=>({n:t.n,la:t.la,lo:t.lo}));
  let best=null;for(const t of cand){const dx=(lo-t.lo)*kx,dy=(la-t.la)*ky,d=Math.hypot(dx,dy);if(!best||d<best.d)best={n:t.n,d,dx,dy}}
  const hp=POI.hwyPts;let hb=null;for(let k=0;k<hp.length;k+=3){const d=Math.hypot((lo-hp[k+1])*kx,(la-hp[k])*ky);if(!hb||d<hb.d)hb={d,r:POI.routes[hp[k+2]]}}
  const dir=L().dirs[Math.round(((Math.atan2(best.dx,best.dy)*180/Math.PI)+360)%360/45)%8];
  const near=best.d<0.6?(lang==='zh'?best.n:best.n):(lang==='zh'?`${best.n} ${dir}方约 ${best.d.toFixed(1)} 公里`:`${best.d.toFixed(1)} km ${dir} of ${best.n}`);
  const road=hb?(lang==='zh'?`离 ${hb.r} 号公路约 ${hb.d.toFixed(1)} 公里`:`${hb.d.toFixed(1)} km from Hwy ${hb.r}`):'';
  return {near,road,coords:`${la.toFixed(4)}°N ${Math.abs(lo).toFixed(4)}°W`}}

/* ---- mode card ---- */
function card(title,sub,body){$('mc-title').textContent=title;$('mc-sub').textContent=sub||'';$('mc-body').innerHTML=body}
function renderLive(){const l=L(),u=UI(),lv=AS.region.live,a=ageText();
  const oc=lv.bcws.filter(b=>/out of control/i.test(b.status)).length;
  const ST={zh:{'Under Control':'已控制','Being Held':'已围住，不再扩大','Out of Control':'失控'},en:{}};
  const wf=LIVE.fires&&LIVE.fires.data&&LIVE.fires.data.features;const bcwsList=wf?wf.map(f=>{const p=f.properties,[lo_,la]=f.geometry.coordinates;return {name:p.INCIDENT_NAME||p.GEOGRAPHIC_DESCRIPTION,num:p.FIRE_NUMBER,status:p.FIRE_STATUS,ha:p.CURRENT_SIZE,km:+hav(50.676,-120.34,la,lo_).toFixed(1)}}).sort((a,b)=>a.km-b.km):lv.bcws;
  const fires=bcwsList.map(b=>`<li><span class="nm">${esc(b.name||b.num)}<span class="sub">${esc(ST[lang][b.status]||b.status)} · ${fmtHa(b.ha,lang)}</span></span><span class="num">${b.km} km</span></li>`).join('');
  const cnt={};lv.firms.forEach(f=>cnt[f.d]=(cnt[f.d]||0)+1);const days=Object.keys(cnt).sort();let chart='';
  if(days.length){const mx=Math.max(1,...days.map(k=>cnt[k]));const W=320,H=72,bw=(W-36)/days.length;chart=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">`;days.forEach((k,j)=>{const h=(H-30)*cnt[k]/mx,x=28+j*bw;chart+=`<rect x="${x+2}" y="${H-18-h}" width="${Math.max(2,bw-4)}" height="${h}" rx="2" fill="var(--order)" opacity=".85"/><text class="tk" x="${x+bw/2}" y="${H-5}" text-anchor="middle">${k.slice(5)}</text><text class="tk" x="${x+bw/2}" y="${H-21-h}" text-anchor="middle">${cnt[k]}</text>`});chart+=`</svg><p class="hint">${l.x.firmsDay}</p></div>`}
  const fc=fcList().filter((_,k)=>k%3===0).slice(0,8);
  const fct=`<div style="overflow-x:auto"><table class="fc"><tr>${l.fcH.map(h=>`<th>${h}</th>`).join('')}</tr>${fc.map(f=>`<tr><td class="n">${f.t.slice(6)}</td><td>${arrowFor(f.WD??0)} ${esc(dirName(f.WD))}</td><td class="n">${f.WS}</td><td class="n">${f.T}°</td><td>${esc(f.cond)}</td></tr>`).join('')}</table></div>`;
  const top=[...HL].sort((a,b)=>b.y-a.y||b.ha-a.ha).filter(h=>h.ha>=40).slice(0,12);
  const hist=`<ul class="list">${top.map(h=>`<li><span class="nm">${esc(h.name)}<span class="sub">${h.y}${h.ign?' · '+h.ign:''}${h.cause?' · '+esc(h.cause):''}</span></span><span class="num">${fmtHa(h.ha,lang)}</span></li>`).join('')}</ul>`;
  card(u.modes[0],u.liveSub(a.txt),`
   <div class="stats"><div class="stat"><span>${l.bcwsn}</span><b>${lv.bcws.length}</b></div><div class="stat"><span>${l.firmsn}</span><b>${lv.firms.length}</b></div></div>
   <p class="hint">${esc(l.snapnote(lv.fetched,lv.bcws.length,oc))}</p>${chart}
   ${WORKER_BASE?sec(lang==='zh'?'撤离令与预警（EmergencyInfoBC）':'Evacuation orders and alerts (EmergencyInfoBC)',evacHTML(),true):''}
   ${sec(u.liveFires,`<ul class="list">${fires}</ul>`,true)}${sec(u.liveFc,fct)}${sec(u.liveHist,hist)}`)}
function renderReplay(){const l=L(),u=UI(),X=REPS[repIdx],rp=X.rp,run=X.runs[repRun]||X.runs.model,nH=repHours(X);
  const step=rp.curveStep,cv=run.curve;const k=Math.min(cv.length-1,Math.floor(repT/step)),f=(repT/step)-k;const area=k+1<cv.length?cv[k]+(cv[k+1]-cv[k])*f:cv[cv.length-1];
  const w=rp.wx[Math.min(nH-1,Math.floor(repT))];
  const picker=`<select id="r-pick" aria-label="${esc(u.repPick)}">${REPS.map((Y,j)=>`<option value="${j}"${j===repIdx?' selected':''}>${esc(Y.rp.name)}</option>`).join('')}</select>`;
  const seg=`<div class="seg" role="group"><button type="button" id="r-k23" aria-pressed="${repRun==='model'}">${l.k23}</button><button type="button" id="r-kev" aria-pressed="${repRun==='free'}">${l.kev}</button></div>`;
  const m=run.metrics,id=rp.id,key=id+(repRun==='free'?'Free':'Model');
  const rows=(m.rep_sim||[]).map(r=>`<li><span class="nm">${esc(r.label)}</span><span class="num">${l.met.real} ${fmtHa(r.ha,lang)} · ${l.met.sim} ${fmtHa(r.sim,lang)}</span></li>`).join('');
  card(u.modes[1],rp.name,`${picker}${seg}<p class="hint">${esc(l.rdesc[rp.id])}</p>
   <div class="stats"><div class="stat"><span>${u.repArea}</span><b>${fmtHa(area,lang)}</b></div><div class="stat"><span>${u.repWx}</span><b style="font-size:13px">${w?`${arrowFor(w.WD)} ${dirName(w.WD)} ${w.WS} ${l.kmh} · ${w.T}° · RH ${w.RH}%`:'—'}</b></div></div>
   <div class="chart" id="v-chart"></div>
   ${sec(u.repCmp,`<ul class="list">${rows}</ul><p class="hint">${l.met.shape(Math.round(m.sor_eq*100))}</p><p class="hint">${l.met.k(m)}</p><p class="hint">${esc(l.met[key])}</p>`)}
   ${sec(u.method,`<p class="hint">${esc(l.lessons)}</p>`)}`);
  chart(X,run);
  $('r-pick').onchange=e=>{repIdx=Number(e.target.value);const Y=REPS[repIdx];repRun='model';repT=defT(Y);showTerrain(repTerrain(Y));closePlace();placeMarkers();goHomeFor(Y.T);renderReplay();repaint();syncTimeline()};
  $('r-k23').onclick=()=>{repRun='model';renderReplay();repaint()};$('r-kev').onclick=()=>{repRun='free';renderReplay();repaint()}}
function chart(X,run){const l=L(),rp=X.rp,nH=repHours(X),cv=run.curve,step=rp.curveStep;
  const reps=(run.metrics.rep_sim||[]).map(r=>({h:r.h,ha:r.ha,label:r.label}));const fin=rp.metrics.final_ha;
  const ymax=Math.max(fin*1.15,...reps.map(r=>r.ha*1.15),Math.min(Math.max(...cv),fin*4));const W=320,Hh=150,ml=44,mr=8,mt=10,mb=22,pw=W-ml-mr,ph=Hh-mt-mb;
  const X_=h=>ml+h/nH*pw,Y_=a=>mt+ph-Math.min(a,ymax)/ymax*ph;
  let d='',da='';cv.forEach((a,k)=>{const x=X_(k*step),y=Y_(a);d+=(k?'L':'M')+x.toFixed(1)+','+y.toFixed(1)});da=d+`L${X_((cv.length-1)*step).toFixed(1)},${Y_(0)}L${X_(0)},${Y_(0)}Z`;
  const ticks=[0,.5,1].map(f=>ymax*f);const tlab=a=>a>=10000?(a/1000).toFixed(0)+'k':a>=1000?(a/1000).toFixed(1)+'k':Math.round(a);
  const dstep=Math.max(1,Math.ceil(nH/24/5))*24;const xt=rp.id==='jacko'?[0,2,4,6,8,10].filter(h=>h<=nH):Array.from({length:Math.floor(nH/dstep)+1},(_,k)=>k*dstep);
  const xl=h=>rp.id==='jacko'?repTimeLabel(X,h).slice(11):repTimeLabel(X,h).slice(5,10);
  $('v-chart').innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="area chart">
   ${ticks.map(a=>`<line class="ax" x1="${ml}" x2="${W-mr}" y1="${Y_(a)}" y2="${Y_(a)}"/><text class="tk" x="${ml-4}" y="${Y_(a)+3}" text-anchor="end">${tlab(a)}</text>`).join('')}
   ${xt.map(h=>`<text class="tk" x="${X_(h)}" y="${Hh-6}" text-anchor="middle">${xl(h)}</text>`).join('')}
   <path class="simarea" d="${da}"/><path class="simline" d="${d}"/>
   <line class="fin" x1="${ml}" x2="${W-mr}" y1="${Y_(fin)}" y2="${Y_(fin)}"/><text class="rpl" x="${W-mr}" y="${Y_(fin)-4}" text-anchor="end">${l.rep.final} ${fmtHa(fin,lang)}</text>
   ${reps.map(r=>`<circle class="rp" cx="${X_(r.h)}" cy="${Y_(r.ha)}" r="4"/>`).join('')}
   <line class="now" x1="${X_(repT)}" x2="${X_(repT)}" y1="${mt}" y2="${mt+ph}"/>
   <text class="tk" x="${ml+4}" y="${mt+9}">${lang==='zh'?'公顷':'ha'}</text></svg>
   <p class="hint"><span style="color:var(--sim)">━</span> ${l.met.sim} &nbsp; <span style="color:var(--real)">●</span> ${l.met.real}</p>`}
function windStripHTML(){const wx=scen.wx;if(!wx)return '';const W=320,H=58,cur=Math.min(23,Math.floor(scen.t));let s=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="wind">`;
  wx.forEach((w,k)=>{const x=10+k*(W-20)/23,len=6+Math.min(16,w.WS/3.5),ang=(w.WD+180)%360,col=k===cur?'var(--primary)':'var(--muted)';s+=`<g transform="translate(${x},24) rotate(${ang})"><line x1="0" y1="${len/2}" x2="0" y2="${-len/2}" stroke="${col}" stroke-width="${k===cur?2.5:1.6}"/><path d="M-3.5,${-len/2+4.5} L0,${-len/2} L3.5,${-len/2+4.5}" fill="none" stroke="${col}" stroke-width="${k===cur?2.5:1.6}"/></g>`;
    if(k%3===0)s+=`<text class="tk" x="${x}" y="${H-14}" text-anchor="middle">${w.tl?w.tl.slice(0,2):String((13+k)%24).padStart(2,'0')}</text><text class="tk" x="${x}" y="${H-3}" text-anchor="middle">${Math.round(w.WS)}</text>`});
  return s+'</svg></div>'}
function scenSig(){return [scen.ign&&scen.ign.join(','),scen.windSrc,scen.wdir,scen.wspd,scen.dry,scen.k].join('|')}
function scenDesc(){const l=L();return `${l.windOpt[scen.windSrc]}${scen.windSrc===1?' · '+l.dirs[scen.wdir]+' '+scen.wspd+' km/h':''} · ${l.dryOpt[scen.dry]} · ${l.kOpt[scen.k]}`}
function renderScen(){const l=L(),u=UI();const stale=scen.arr&&scen.sig!==scenSig();
  let area='—';if(scen.arr){let n=0;for(let i=0;i<RN;i++)if(scen.arr[i]<=scen.t)n++;area=fmtHa(n*R.cx*R.cy/1e4,lang)}
  const w=scen.wx&&scen.wx[Math.min(scen.wx.length-1,Math.floor(scen.t))];
  const towns=TOWNS.map(t=>({t,s:townStatus(t.i)})).sort((a,b)=>(a.s.km??0)-(b.s.km??0)).map(({t,s})=>`<li><span class="nm">${t.n}${s.km!=null&&isFinite(s.km)?`<span class="sub">${s.km.toFixed(1)} km</span>`:''}</span><span class="pill s-${s.k}">${l.st[s.k]}</span></li>`).join('');
  card(u.modes[2],u.scenSub,`
   <div class="row"><button type="button" class="btn" id="s-ign" aria-pressed="${scen.armed}"><span class="ms">local_fire_department</span>${scen.armed?u.scenPicking:u.scenPick}</button><button type="button" class="btn filled" id="s-run"><span class="ms">play_circle</span>${u.scenRun}</button></div>
   ${stale?`<div class="notice"><span class="ms">warning</span><span>${u.stale}</span></div>`:''}
   <label class="f"><span>${l.wind}</span><select id="s-wind">${l.windOpt.map((o,k)=>`<option value="${k}"${k===scen.windSrc?' selected':''}>${o}</option>`).join('')}</select></label>
   <div id="s-manual" class="card-b" style="padding:0;gap:8px"${scen.windSrc===1?'':' hidden'}><label class="f"><span>${l.wdir}</span><select id="s-wdir">${l.dirs.map((o,k)=>`<option value="${k}"${k===scen.wdir?' selected':''}>${o}</option>`).join('')}</select></label><label class="f"><span>${l.wspd}<b id="v-wspd">${scen.wspd} km/h</b></span><input type="range" id="s-wspd" min="0" max="60" step="5" value="${scen.wspd}"></label></div>
   <label class="f"><span>${l.dry}</span><select id="s-dry">${l.dryOpt.map((o,k)=>`<option value="${k}"${k===scen.dry?' selected':''}>${o}</option>`).join('')}</select></label>
   <label class="f"><span>${l.k}</span><select id="s-k">${l.kOpt.map((o,k)=>`<option value="${k}"${k===scen.k?' selected':''}>${o}</option>`).join('')}</select></label>
   <div class="stats"><div class="stat"><span>${l.sarea}</span><b>${area}</b></div><div class="stat"><span>${l.swx}</span><b style="font-size:13px">${w?`${arrowFor(w.WD)} ${dirName(w.WD)} ${Math.round(w.WS)} ${l.kmh}${w.tl?' · '+w.tl:''}`:'—'}</b></div></div>
   ${windStripHTML()}${scen.arr?`<p class="hint">${u.uses}${esc(scen.desc||'')}</p>`:''}
   ${sec(u.scenTowns,`<ul class="list">${towns}</ul>`)}${sec(u.method,`<p class="hint">${esc(l.shint)}</p>`)}`);
  $('s-ign').onclick=()=>{scen.armed=!scen.armed;renderScen();if(scen.armed)toast(u.scenPicking)};
  $('s-run').onclick=runScen;
  $('s-wind').onchange=e=>{scen.windSrc=Number(e.target.value);renderScen()};
  $('s-wdir').onchange=e=>{scen.wdir=Number(e.target.value);renderScen()};
  $('s-wspd').addEventListener('input',e=>{scen.wspd=Number(e.target.value);$('v-wspd').textContent=scen.wspd+' km/h'});
  $('s-wspd').addEventListener('change',()=>renderScen());
  $('s-dry').onchange=e=>{scen.dry=Number(e.target.value);renderScen()};$('s-k').onchange=e=>{scen.k=Number(e.target.value);renderScen()};
  const w2=w||(scen.windSrc===0?fcList()[0]:scen.windSrc===2&&scen.hrdps?scen.hrdps[0]:{WD:[0,45,90,135,180,225,270,315][scen.wdir],WS:scen.wspd});wind(w2)}
function renderFlood(){const l=L(),u=UI();let n=0;for(let i=0;i<CN;i++)if(flooded[i]&&!isRiver(i))n++;
  let hit=0;const hoods=HOODS.map(h=>{const s=floodStatus(h.i);if(s.k!=='safe')hit++;return `<li><span class="nm">${h[lang]}</span><span class="pill s-${s.k}">${l.st[s.k]}${s.d!=null?' ~'+(Math.round(s.d*2)/2).toFixed(1)+' m':''}</span></li>`}).join('');
  card(u.modes[3],u.floodSub,`
   <label class="f"><span>${l.rise}<b>${rise} m</b></span><input type="range" id="f-rise" min="0" max="15" step="0.5" value="${rise}"></label>
   <div class="stats"><div class="stat"><span>${l.farea}</span><b>${(n*C.cx*C.cy/1e6).toFixed(2)} km²</b></div><div class="stat"><span>${l.fhood}</span><b>${hit} / ${HOODS.length}</b></div></div>
   <ul class="list">${hoods}</ul>${sec(u.method,`<p class="hint">${esc(l.fhint)}</p>`)}`);
  $('f-rise').addEventListener('input',e=>{rise=Number(e.target.value);computeFlood();paintCity();refreshTags();renderFloodLite();renderPlace()})}
function renderFloodLite(){const l=L();let n=0;for(let i=0;i<CN;i++)if(flooded[i]&&!isRiver(i))n++;let hit=0;const items=HOODS.map(h=>{const s=floodStatus(h.i);if(s.k!=='safe')hit++;return `<li><span class="nm">${h[lang]}</span><span class="pill s-${s.k}">${l.st[s.k]}${s.d!=null?' ~'+(Math.round(s.d*2)/2).toFixed(1)+' m':''}</span></li>`}).join('');
  const b=$('mc-body');b.querySelector('label.f b').textContent=rise+' m';b.querySelectorAll('.stat b')[0].textContent=(n*C.cx*C.cy/1e6).toFixed(2)+' km²';b.querySelectorAll('.stat b')[1].textContent=`${hit} / ${HOODS.length}`;b.querySelector('ul.list').innerHTML=items}

/* ---- place card ---- */
function closePlace(){lookCell=null;$('place').hidden=true;searchMark.visible=false}
function renderPlace(){const l=L(),u=UI();if(!lookCell){$('place').hidden=true;return}
  const [T_,r,c]=lookCell,i=r*T_.GW+c,wp=whereParts(T_,r,c);let k='none',msg='',extra=[];
  const kv=[[u.elev,`${Math.round(T_.H[i])} m`],[u.coords,wp.coords]];if(wp.road)kv.push([u.road,wp.road]);
  if(T_===C){const s=floodStatus(i);k=s.k;const m=l.lookMsg[s.k];msg=typeof m==='function'?m(s.d):m}
  else if(T_===R){kv.push([u.fuel,l.fuelN[RF[i]]]);if(mode==='wx'){const I=RI,la=I.latN-r/(I.gh-1)*(I.latN-I.latS),lo=I.lonW+c/(I.gw-1)*(I.lonE-I.lonW),g=wxAt(la,lo);const t=LVT();if(g){kv.push([`HRDPS ${t.at(wx.h)} · ${u.wspd}`,`${dirName(g.wd)} ${Math.round(g.ws)} km/h`]);if(g.tt!=null)kv.push([u.temp,`${Math.round(g.tt)} °C`]);if(g.pr!=null)kv.push([t.layers.rain,`${g.pr.toFixed(1)} mm`]);if(g.sn)kv.push([t.layers.snow,`${g.sn.toFixed(1)} mm`])}}if(RHIST[i]){const h=HL[RHIST[i]-1];kv.push([u.hist,`${h.name} · ${h.y} · ${fmtHa(h.ha,lang)}`])}
    if(mode==='scen'&&scen.arr){const s=townStatus(i);k=s.k;const m=s.k==='safe'?l.lookMsg.far:l.lookMsg[s.k];msg=typeof m==='function'?m(s.km):m;
      const a=scen.arr[i];if(isFinite(a)&&a<=24){const w0=scen.wx&&scen.wx[0]&&scen.wx[0].tl?parseInt(scen.wx[0].tl,10):null;let tl='';if(w0!=null){const hh=(w0+a)%24;tl=`${String(Math.floor(hh)).padStart(2,'0')}:${String(Math.round((hh%1)*60)).padStart(2,'0')}`}extra.push(l.x.arrive(l.hrs(a),tl))}else extra.push(l.x.notArrive)}}
  else{const X=REPS[repIdx];kv.push([u.fuel,l.fuelN[X.fuel[i]]]);const a=(X.runs[repRun]||X.runs.model).arrF[i];if(a<=repT){k='hit';msg=l.lookMsg.hit}if(isFinite(a))extra.push(l.x.repArrive(l.hrs(a),repTimeLabel(X,a)));else extra.push(l.x.repNot);extra.push(X.per[i]?l.x.inPer:l.x.outPer)}
  $('pl-name').textContent=wp.near;$('pl-where').textContent='';
  $('pl-body').innerHTML=`${msg?`<div class="pstat k-${k}"><span class="dot"></span><span>${esc(msg)}</span></div>`:''}${extra.map(x=>`<p class="hint">${esc(x)}</p>`).join('')}<dl class="kv">${kv.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${placeWx()}<div class="row"><button type="button" class="btn" id="pl-more"><span class="ms">info</span>${u.plMore}</button></div>`;
  $('pl-more').onclick=openDrawer;$('place').hidden=false}

/* ---- layers panel ---- */
function renderLayers(){const u=UI();const sw=c=>`<i class="sw" style="background:${c}"></i>`;
  const sk=curT&&curT.view?curT.view:'region';
  $('lpanel').innerHTML=`<div class="lp-h">${u.base}</div><div class="bm" role="group"><button type="button" id="bm-sat" aria-pressed="${basemap==='sat'}"><span class="th" style="background-image:url(${IMG.city.jpg});background-size:240%;background-position:40% 45%"></span>${u.sat}</button><button type="button" id="bm-shade" aria-pressed="${basemap==='shade'}"><span class="th shade"></span>${u.shade}</button></div>
   <p class="lp-note">${esc(u.satNote(satDates(sk)))}</p><div class="lp-sep"></div>
   <label>${sw(`rgb(${histColor(2024).join(',')})`)}<input type="checkbox" id="ly-hist" ${showHist?'checked':''}>${u.lay.hist}</label>
   <label>${sw('rgb(255,60,40)')}<input type="checkbox" id="ly-firms" ${showFirms?'checked':''}>${u.lay.firms}</label>
   <label>${sw('rgb(96,134,72)')}<input type="checkbox" id="ly-fuel" ${showFuel?'checked':''}>${u.lay.fuel}</label>
   <label>${sw('#F9AB00')}<input type="checkbox" id="ly-roads" ${showRoads?'checked':''}>${u.lay.roads}</label>
   <label>${sw('#fff')}<input type="checkbox" id="ly-labels" ${showLabels?'checked':''}>${u.lay.labels}</label>
   <div class="lp-sep"></div><div class="lp-ex"><span>${u.exag}<b id="ex-v">${(curT?curT.ex*EXK:EXK).toFixed(1)}×</b></span><input type="range" id="ly-ex" min="0.5" max="2.5" step="0.1" value="${EXK}" aria-label="${u.exag}"></div>`;
  $('bm-sat').onclick=()=>{basemap='sat';renderLayers();repaint()};$('bm-shade').onclick=()=>{basemap='shade';renderLayers();repaint()};
  $('ly-ex').addEventListener('input',e=>{setExag(Number(e.target.value));$('ex-v').textContent=(curT.ex*EXK).toFixed(1)+'×'});
  $('ly-hist').onchange=e=>{showHist=e.target.checked;repaint()};$('ly-firms').onchange=e=>{showFirms=e.target.checked;repaint()};$('ly-fuel').onchange=e=>{showFuel=e.target.checked;repaint()};
  $('ly-roads').onchange=e=>{showRoads=e.target.checked;repaint()};$('ly-labels').onchange=e=>{showLabels=e.target.checked;refreshTags()}}

/* ---- drawer (data & checks) ---- */
function renderDrawer(){const l=L(),x=l.x,u=UI(),a=ageText();const b=k=>`<span class="badge b-${k}">${x.kind[k]}</span>`;
  const g=(id,run)=>{const X=REPS.find(X=>X.rp.id===id);return X&&X.runs[run]?X.runs[run].metrics:null};
  const rr=g('ross','model'),bm=g('bradley','model'),bf=g('bradley','free'),jm=g('jacko','model');const vals=(rr&&bm&&bf&&jm)?x.val(rr,bm,bf,jm):[];
  $('dr-title').textContent=u.info;
  $('dr-body').innerHTML=`<p>${esc(u.drawerAbout)}</p>
   <div class="row" style="font-size:13px"><span class="dot" style="width:10px;height:10px;border-radius:50%;background:${a.col};display:inline-block"></span>${x.snap}: 2026-10-22 12:50 PDT · ${a.txt} · ${x.model} · ${x.tested}</div>
   <h3>${esc(x.layersH)}</h3><div style="overflow-x:auto"><table class="tr"><tr>${x.th.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${x.layers.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="n">${esc(r[2])}</td><td>${b(r[3])}</td></tr>`).join('')}${(()=>{const r=lang==='zh'?['卫星影像','ESA 哥白尼 Sentinel-2 L2A 真彩色（经 AWS Earth Search），10 m 原始分辨率，压缩后嵌入页面；回放使用火灾前一年的影像',`${satDates('region')}（区域）`,'official']:['Satellite imagery','ESA Copernicus Sentinel-2 L2A true colour (via AWS Earth Search), 10 m native, compressed into the page; replays use imagery from before each fire',`${satDates('region')} (region)`,'official'];return `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="n">${esc(r[2])}</td><td>${b(r[3])}</td></tr>`})()}</table></div>
   <h3>${esc(x.modelH)}</h3><table class="tr">${x.modelRows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>
   <h3>${esc(x.valH)}</h3><ul class="vlist">${vals.map(v=>`<li><span>${esc(v[0])}<span class="sub">${esc(v[1])}</span></span><span class="badge b-${v[2]}">${x.vkind[v[2]]}</span></li>`).join('')}</ul><p><b>${esc(x.concl)}</b></p>
   <h3>${esc(x.linksH)}</h3><ul class="list links">${x.links.map(k=>`<li><span class="nm"><a href="${k[1]}" target="_blank" rel="noopener">${esc(k[0])}</a><span class="sub">${k[1]}</span></span><span class="ms" style="color:var(--muted)">open_in_new</span></li>`).join('')}</ul>
   <p class="hint">${esc(x.ver)}</p><p class="hint">${esc(l.foot)}</p>`}
function openDrawer(){drawerOpen=true;renderDrawer();$('drawer').hidden=false;$('scrim').hidden=false}
function closeDrawer(){drawerOpen=false;$('drawer').hidden=true;$('scrim').hidden=true}

/* ---- timeline ---- */
function syncTimeline(){const u=UI(),l=L(),tl=$('tl'),on=mode==='replay'||mode==='scen'||mode==='wx';$('timeline').hidden=!on;$('app').classList.toggle('has-tl',on);if(!on)return;
  if(mode==='wx'){tl.min='0';tl.max=String(maxHour());tl.step='1';if(wx.h>maxHour())wx.h=maxHour();tl.value=String(wx.h);$('tl-label').innerHTML=`${localLabel(wx.h)}<small>${LVT().at(wx.h)} · HRDPS</small>`;$('tl-icon').textContent=wx.play?'pause':'play_arrow';return}
  if(mode==='replay'){const X=REPS[repIdx],nH=repHours(X);tl.min='0';tl.max=String(nH);tl.step=X.rp.id==='jacko'?'0.25':'1';tl.value=String(repT);$('tl-label').innerHTML=`${repTimeLabel(X,repT)}<small>${esc(X.rp.name)}</small>`;$('tl-icon').textContent=repPlay?'pause':'play_arrow'}
  else{tl.min='0';tl.max='24';tl.step='0.5';tl.value=String(scen.t);const w=scen.wx&&scen.wx[Math.min(23,Math.floor(scen.t))];$('tl-label').innerHTML=`${u.tlScen(l.hrs(scen.t))}<small>${w&&w.tl?w.tl:''}</small>`;$('tl-icon').textContent=scen.play?'pause':'play_arrow'}}
function tlInput(){const v=Number($('tl').value);if(mode==='wx'){wx.h=v;ensureOverlay();paintRegion();refreshTags();renderWx();syncTimeline();return}if(mode==='replay'){repT=v;renderReplay();paintReplay();renderPlace()}else{scen.t=v;updateScenDist();renderScen();paintRegion();refreshTags();renderPlace()}syncTimeline()}
function tlPlay(){if(mode==='wx'){wx.play=!wx.play;if(wx.play&&wx.h>=48)wx.h=0;syncTimeline();return}if(mode==='replay'){repPlay=!repPlay;if(repPlay&&repT>=repHours(REPS[repIdx]))repT=0}else{if(!scen.arr)return;scen.play=!scen.play;if(scen.play&&scen.t>=24)scen.t=0}syncTimeline()}

/* ---- status chip + scale ---- */
function renderStatus(){const u=UI(),a=ageText();if(mode==='wx'&&typeof LIVE!=='undefined'){const al=LIVE.alerts,ag=ageOf(al.at);$('st-dot').style.background=al.err?'#D93025':ag.min<=30?'#1E8E3E':'#F9AB00';$('st-txt').textContent=(lang==='zh'?'实时 · ':'Live · ')+(al.loading?LVT().loading:al.err?LVT().failed:ag.txt);return}$('st-dot').style.background=a.col;$('st-txt').textContent=u.snapAgo(a.txt)}
function wind(w){const el=$('windrose');if(!w){el.hidden=true;return}el.hidden=false;windNow=w;$('wr-txt').textContent=Math.round(w.WS)+' km/h'}
let windNow=null;

/* ---- scenario compute ---- */
const DRY=[92,88,82],KS=[{k:0.55,s:0.093,tau:2},{k:0.55,s:1,tau:2}];const DIURNAL=6; // hourly FFMC = daily value minus up to 6 points at 04:00 (interior BC summer, Kamloops A 2023 hourly record)
const ffH=(fd,hr)=>fF(fd-DIURNAL*(1-Math.cos(2*Math.PI*(hr-16)/24))/2);
function scenWeather(){const out=[];const fd=DRY[scen.dry];
  if(scen.windSrc===0){const fc=fcList();for(let k=0;k<24;k++){const f=fc[Math.min(fc.length-1,k)];const hr=parseInt(f.t.slice(6,8),10),day=hr>=9&&hr<21;out.push({WS:f.WS,WD:f.WD??270,day,isi:0.208*Math.exp(0.05039*f.WS)*ffH(fd,hr),tl:f.t.slice(6)})}}
  else if(scen.windSrc===2&&scen.hrdps){for(let k=0;k<24;k++){const f=scen.hrdps[k];const hr=f.hr,day=hr>=9&&hr<21;out.push({WS:f.WS,WD:f.WD,day,isi:0.208*Math.exp(0.05039*f.WS)*ffH(fd,hr),tl:f.tl})}}
  else{const WD=[0,45,90,135,180,225,270,315][scen.wdir];for(let k=0;k<24;k++){const hr=(13+k)%24,day=hr>=9&&hr<21;out.push({WS:scen.wspd,WD,day,isi:0.208*Math.exp(0.05039*scen.wspd)*ffH(fd,hr)})}}
  return out}
function updateScenDist(){if(scen.arr)chamfer(RI.gw,RI.gh,i=>scen.arr[i]<=scen.t,scen.dist)}
function finishScen(arr){scen.arr=arr;scen.wx=scen.pendWx;scen.sig=scen.pendSig;scen.desc=scen.pendDesc;scen.t=24;updateScenDist();$('progress').hidden=true;$('toast').hidden=true;if(mode==='scen'){renderScen();repaint();syncTimeline();renderPlace()}}
function cancelScen(){scen.job=(scen.job||0)+1;if(worker){worker.terminate();worker=makeWorker()}$('progress').hidden=true;toast(UI().cancelled)}
function runScen(){if(!scen.ign){scen.armed=true;renderScen();toast(UI().scenPicking);return}scen.armed=false;
  if(scen.windSrc===2&&!scen.hrdps){$('progress').hidden=false;toast(LVT().loading);hrdpsScenWind(scen.ign,list=>{if(!list){toast(LVT().failed);$('progress').hidden=true;return}scen.hrdps=list;scen.hrdpsIgn=scen.ign.join(',');runScen()});return}
  if(scen.windSrc===2&&scen.hrdpsIgn!==scen.ign.join(',')){scen.hrdps=null;runScen();return}
  scen.job=(scen.job||0)+1;const id=scen.job;scen.pendWx=scenWeather();scen.pendSig=scenSig();scen.pendDesc=scenDesc();
  $('progress').hidden=false;toast(UI().computing,UI().cancel,cancelScen);
  if(worker&&workerOK)worker.postMessage({id,GW:RI.gw,GH:RI.gh,cx:R.cx,cy:R.cy,H:RH,fuel:RF,ign:scen.ign,hours:scen.pendWx,K:KS[scen.k]});
  else setTimeout(()=>{if(id!==scen.job)return;finishScen(spread(R,RF,scen.ign,scen.pendWx,KS[scen.k]))},30)}

/* ---- search ---- */
function searchIndex(){const out=[];const add=(name,T_,r,c)=>out.push({name,T_,r,c});
  if(mode==='flood'){HOODS.forEach(h=>add(lang==='zh'?h.zh+' / '+h.en:h.en,C,h.r,h.c));(POI.city.labels||[]).forEach(l=>{if(l.t!=='hwy')add(l.zh&&lang==='zh'?l.zh+' / '+l.n:l.n,C,l.r,l.c)})}
  else if(mode==='replay'){const X=REPS[repIdx],T_=repTerrain(X);((POI[X.rp.id]||{}).labels||[]).forEach(l=>{if(l.t!=='hwy')add(l.n,T_,l.r,l.c)})}
  else{TOWNS.forEach(t=>add(t.n,R,t.r,t.c));(POI.region.labels||[]).forEach(l=>{if(l.t!=='hwy')add(l.zh&&lang==='zh'?l.zh+' / '+l.n:l.n,R,l.r,l.c)})}
  return out}
function doSearch(){const q=$('q').value.trim();if(!q)return;const u=UI();const m=q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);let hit=null;
  if(m){let la=+m[1],lo=+m[2];if(Math.abs(la)>Math.abs(lo)){[la,lo]=[lo,la]}if(lo>0)lo=-lo;const I=curT.info;if(la<I.latS||la>I.latN||lo<I.lonW||lo>I.lonE){toast(u.outOfRange);return}const [r,c]=curT.rc(la,lo);hit={T_:curT,r,c}}
  else{const idx=searchIndex(),ql=q.toLowerCase();hit=idx.find(x=>x.name.toLowerCase()===ql)||idx.find(x=>x.name.toLowerCase().includes(ql))}
  if(!hit){toast(u.notFound);return}goTo(hit)}
function goTo(h){const p=h.T_.world(h.r,h.c);const d=Math.min(Math.max(h.T_.W,h.T_.D)*0.22,camera.position.distanceTo(controls.target));flyTo(p,d,topDown);lookCell=[h.T_,h.r,h.c];renderPlace();
  searchMark.userData.b=p;searchMark.visible=true;if(isMobile())setSheet(false)}
function goHomeFor(T_){const p=T_===R?R.world(...R.rc(50.676,-120.34)):new THREE.Vector3(0,T_.yOf(T_.info.min),0);const d=T_===R?R.W*0.22:Math.max(T_.W,T_.D)*0.9;flyTo(p,d,topDown)}

/* ---- orchestration ---- */
function repaint(){if(mode==='flood')paintCity();else if(mode==='replay')paintReplay();else paintRegion();refreshTags();renderPlace()}
function renderMode(){if(mode==='live')renderLive();else if(mode==='replay')renderReplay();else if(mode==='scen')renderScen();else if(mode==='wx')renderWx();else renderFlood();syncTimeline()}
function setMode(m){const prev=mode;mode=m;$('q').value='';repPlay=false;scen.play=false;scen.armed=false;wx.play=false;closePlace();
  ['live','replay','scen','flood','wx'].forEach(k=>$('tab-'+k).setAttribute('aria-pressed',String(k===m)));
  $('windrose').hidden=!(m==='live'||m==='scen');
  if(m==='flood')showTerrain(C);else if(m==='replay')showTerrain(repTerrain(REPS[repIdx]));else showTerrain(R);
  if(prev!==m){if(m==='flood'||m==='replay'||(prev==='flood'||prev==='replay'))goHomeFor(curT)}
  placeMarkers();renderLayers();if(m==='live')wind(fcList()[0]);renderMode();repaint();fillDatalist();
  if(m==='scen'&&scen.ign){const p=R.world(scen.ign[0],scen.ign[1]);if(p.distanceTo(controls.target)>R.W*0.1)flyTo(p,Math.min(camera.position.distanceTo(controls.target),R.W*0.22),topDown)}
  if(m==='wx')enterWx();
  if(m==='scen'&&!scen.arr&&scen.ign)runScen()}
function fillDatalist(){$('q-list').innerHTML=searchIndex().map(x=>`<option value="${esc(x.name)}">`).join('')}
function applyLang(){const u=UI();document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  ['live','replay','scen','flood','wx'].forEach((k,j)=>$('tab-'+k).querySelector('.t').textContent=u.modes[j]);renderOfficial();renderAlertsBanner();
  $('b-layers').querySelector('.t').textContent=u.layers;$('q').placeholder=u.search;
  $('b-home').title=u.home;$('b-view').title=u.view3d;$('b-north').title=u.north;$('b-zin').title=u.zin;$('b-zout').title=u.zout;$('b-info').title=u.info;$('dr-close').title=u.close;$('pl-close').title=u.close;
  $('l-zh').setAttribute('aria-pressed',String(lang==='zh'));$('l-en').setAttribute('aria-pressed',String(lang==='en'));
  renderStatus();renderLayers();renderMode();repaint();fillDatalist();if(drawerOpen)renderDrawer()}
function setSheet(full){sheetFull=full;$('app').classList.toggle('full',full&&isMobile());document.documentElement.style.setProperty('--sheet',isMobile()?(full?'72%':'38%'):'0px')}

/* ---- events ---- */
['live','replay','scen','flood','wx'].forEach(k=>$('tab-'+k).onclick=()=>setMode(k));
$('l-zh').onclick=()=>{lang='zh';applyLang()};$('l-en').onclick=()=>{lang='en';applyLang()};
$('q').addEventListener('change',doSearch);$('q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSearch()}});
$('q-clear').onclick=()=>{$('q').value='';closePlace()};
$('pl-close').onclick=closePlace;
$('b-layers').onclick=()=>{const open=$('lpanel').hidden;$('lpanel').hidden=!open;$('b-layers').setAttribute('aria-expanded',String(open))};
document.addEventListener('pointerdown',e=>{if(!$('lpanel').hidden&&!$('layers').contains(e.target)){$('lpanel').hidden=true;$('b-layers').setAttribute('aria-expanded','false')}});
$('b-home').onclick=()=>goHomeFor(curT);
$('b-view').onclick=()=>{topDown=!topDown;$('b-view').setAttribute('aria-pressed',String(topDown));flyTo(controls.target,camera.position.distanceTo(controls.target),topDown)};
$('b-north').onclick=()=>{const off=camera.position.clone().sub(controls.target);const r=off.length(),pol=Math.acos(Math.max(-1,Math.min(1,off.y/r)));flyRaw(controls.target,controls.target.clone().add(new THREE.Vector3(0,Math.cos(pol)*r,Math.sin(pol)*r)))};
$('b-zin').onclick=()=>{const off=camera.position.clone().sub(controls.target);if(off.length()*0.6<controls.minDistance)return;flyRaw(controls.target,controls.target.clone().add(off.multiplyScalar(0.6)),400)};
$('b-zout').onclick=()=>{const off=camera.position.clone().sub(controls.target);if(off.length()/0.6>controls.maxDistance)return;flyRaw(controls.target,controls.target.clone().add(off.multiplyScalar(1/0.6)),400)};
$('tl').addEventListener('input',tlInput);$('tl-play').onclick=tlPlay;
$('b-info').onclick=openDrawer;$('dr-close').onclick=closeDrawer;$('scrim').onclick=closeDrawer;
$('handle').onclick=()=>setSheet(!sheetFull);
window.addEventListener('resize',()=>{setSheet(sheetFull);resize()});
const ray=new THREE.Raycaster(),mv=new THREE.Vector2();let downAt=null;
function pick(e){const rect=renderer.domElement.getBoundingClientRect();mv.x=(e.clientX-rect.left)/rect.width*2-1;mv.y=-(e.clientY-rect.top)/rect.height*2+1;ray.setFromCamera(mv,camera);const hit=ray.intersectObject(curT.mesh)[0];return hit?curT.cellOf(hit.point):null}
renderer.domElement.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY]});
renderer.domElement.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const rc=pick(e);if(!rc)return;
  if(mode==='scen'&&scen.armed){scen.armed=false;scen.ign=rc;placeMarkers();runScen();renderScen();return}
  lookCell=[curT,rc[0],rc[1]];searchMark.visible=false;renderPlace()});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!curT)return;const now=performance.now();if(now-hoverT<120)return;hoverT=now;const rc=pick(e);const el=$('st-coords');if(!rc){el.hidden=true;return}
  const I=curT.info,la=I.latN-rc[0]/(I.gh-1)*(I.latN-I.latS),lo=I.lonW+rc[1]/(I.gw-1)*(I.lonE-I.lonW);el.textContent=`${la.toFixed(4)}°N ${Math.abs(lo).toFixed(4)}°W · ${Math.round(curT.H[rc[0]*curT.GW+rc[1]])} m`;el.hidden=false;clearTimeout(hoverBack);hoverBack=setTimeout(()=>{el.hidden=true},2500)});

/* ---- loop ---- */
const bez=(()=>{const x1=.2,y1=0,x2=0,y2=1;const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;const sx=t=>((ax*t+bx)*t+cx)*t,sy=t=>((ay*t+by)*t+cy)*t;return x=>{let t=x;for(let i=0;i<6;i++){const d=(3*ax*t+2*bx)*t+cx;if(Math.abs(d)<1e-6)break;t-=(sx(t)-x)/d}return sy(Math.max(0,Math.min(1,t)))}})();
function resize(){const w=$('app').clientWidth,h=$('app').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<0.8?60:42;camera.updateProjectionMatrix()}
resize();
const v3=new THREE.Vector3();let last=performance.now(),acc=0;
function frame(now){const dt=Math.min(100,now-last);last=now;
  if(mode==='replay'&&repPlay){const X=REPS[repIdx],nH=repHours(X);acc+=dt;if(acc>60){acc=0;repT=Math.min(nH,repT+(X.rp.id==='jacko'?0.05:nH/240));if(repT>=nH)repPlay=false;renderReplay();paintReplay();renderPlace();syncTimeline()}}
  if(mode==='wx'&&wx.play){acc+=dt;if(acc>700&&!wx.loading){acc=0;wx.h=Math.min(maxHour(),wx.h+1);if(wx.h>=maxHour())wx.play=false;ensureOverlay();paintRegion();refreshTags();renderWx();syncTimeline()}}
  if(mode==='scen'&&scen.play){acc+=dt;if(acc>80){acc=0;scen.t=Math.min(24,scen.t+0.25);if(scen.t>=24)scen.play=false;updateScenDist();renderScen();paintRegion();refreshTags();renderPlace();syncTimeline()}}
  if(fly){const k=Math.min(1,(now-fly.t0)/fly.dur),e=bez(k);controls.target.lerpVectors(fly.from.t,fly.to.t,e);camera.position.lerpVectors(fly.from.p,fly.to.p,e);if(k>=1)fly=null}
  {const dist=camera.position.distanceTo(controls.target);if(ignMark.visible&&ignMark.userData.b){const s=Math.max(0.25,dist/55);ignMark.scale.set(s,s,s);const b=ignMark.userData.b;ignMark.position.set(b.x,b.y+2.2*s,b.z)}if(searchMark.visible&&searchMark.userData.b){const s=Math.max(0.2,dist/70);searchMark.scale.set(s,s,s);const b=searchMark.userData.b;searchMark.position.set(b.x,b.y+0.3*s,b.z)}}
  controls.update();renderer.render(scene,camera);frameN++;
  const az=controls.getAzimuthalAngle()*180/Math.PI;$('cmp-arrow').style.transform=`rotate(${az}deg)`;if(windNow)$('wr-arrow').setAttribute('transform',`rotate(${((windNow.WD+180)%360)+az} 28 28)`);
  if(frameN%10===0&&curT){const a=controls.target.clone().project(camera),b2=controls.target.clone().add(new THREE.Vector3(1,0,0)).project(camera);const pxPerKm=Math.hypot(b2.x-a.x,b2.y-a.y)*$('app').clientWidth/2/(curT.unit/1000);
    if(isFinite(pxPerKm)&&pxPerKm>0){const km=[0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200].filter(k=>k*pxPerKm<=90).pop()||0.01;$('scale-i').style.width=Math.round(km*pxPerKm)+'px';$('scale-t').textContent=km<1?Math.round(km*1000)+' m':km+' km'}}
  const w=$('app').clientWidth,h=$('app').clientHeight;const placed=[];
  for(const t of tagPool){if(!t.pos||t.el.style.display==='none')continue;if(!showLabels){t.el.classList.add('hidden');continue}v3.copy(t.pos);v3.y+=Math.max(curT.W,curT.D)/180;v3.project(camera);let vis=v3.z<1&&Math.abs(v3.x)<1.02&&Math.abs(v3.y)<1.02;
    if(vis){const x=(v3.x+1)/2*w,y=(1-v3.y)/2*h;if(!t.w){t.w=t.el.offsetWidth||60;t.h=t.el.offsetHeight||18}const cen=t.el.classList.contains('hwy')||t.el.classList.contains('lake');
      const r={x0:x-t.w/2-2,x1:x+t.w/2+2,y0:cen?y-t.h/2-1:y-t.h-1,y1:cen?y+t.h/2+1:y+1};for(const q of placed)if(r.x0<q.x1&&r.x1>q.x0&&r.y0<q.y1&&r.y1>q.y0){vis=false;break}
      if(vis){placed.push(r);t.el.style.left=x+'px';t.el.style.top=y+'px'}}
    t.el.classList.toggle('hidden',!vis)}
  requestAnimationFrame(frame)}

