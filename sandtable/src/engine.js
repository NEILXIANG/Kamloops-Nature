/* Terrain, painting, fire-spread model, worker, camera. Runs inside the same closure as ui.js. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function b64bytes(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
const u16=b=>{const u=b64bytes(b);return new Uint16Array(u.buffer,u.byteOffset,u.length>>1)};
const u8=b=>b64bytes(b);
function unrle(b,n){const a=u16(b),o=new Uint8Array(n);let p=0;for(let i=0;i<a.length;i+=2){o.fill(a[i],p,p+a[i+1]);p+=a[i+1]}return o}
const fmtHa=(ha,l)=>ha>=10000?(ha/100).toFixed(0)+' km²':Math.round(ha).toLocaleString()+(l==='zh'?' 公顷':' ha');

/* ================= i18n ================= */
const T={
zh:{title:'Kamloops 三维风险沙盘',sub:'真实地形、燃料类型、卫星热点、天气预报和官方火场数据，覆盖 Kamloops 周边约 2 小时车程。拖动旋转，滚轮或双指缩放。',
 warn:'演示用途，不是官方预报或警报。真实紧急情况请以 City of Kamloops、TNRD、EmergencyInfoBC 和 BC Wildfire Service 发布的信息为准。',
 tabs:['最新火情','历史回放','山火情景','洪水（城区）','数据与验证'],
 snap:'数据快照（不是实时更新）',bcwsn:'区域内尚未熄灭的山火',firmsn:'近 7 天卫星热点',
 snapnote:(t,n,oc)=>`下载时间：${t}。BC Wildfire Service 列出区域内 ${n} 场尚未宣布熄灭的山火，${oc?`其中 ${oc} 场失控`:'都已控制或已围住，没有失控的'}（见下表）。卫星热点不一定是山火，工厂、秋季计划烧除和堆烧也会被探测到。`,
 fc:'Kamloops 风向预报（Environment Canada）',fcH:['时间','风从','风速','气温','天气'],
 histh:'2015 年以来的大火',histshow:'在地图上显示历史火场',
 rpick:'选择火灾',k23:'校准模型（含初期扑救）',kev:'不扑救（自由燃烧）',rtime:'时间',play:'播放',pause:'暂停',toend:'跳到最后',rsim:'模拟过火面积',rwx:'当时天气',rres:'模型和实际对比',
 rdesc:{ross:'2023 年 7 月 20 日晚雷击，7 月 21 日 13:48 发现，位于 Kamloops 以南。新闻和 BCWS 通报给出了六个时间点的面积（95、210、450、1,800、2,600、4,157 公顷）。这场火和 Jacko Lake 一起用于校准模型。天气来自 Kamloops 机场站，逐时细燃料湿度码。',
  bradley:'2026 年 7 月 31 日人为起火，8 月 1 日在大风下迅速扩大，封闭了 97 号公路，Okanagan Indian Band 保留地约 230 栋房屋受影响。天气来自 Vernon 气象站。',
  jacko:'2026 年 8 月 22 日下午雷击起火，在 Kamloops 城南约 7.5 公里的 Jacko Lake 一带，全部是草地，当晚 7:30 被控制在 44 公顷。18:00 机场站记录 1.1 mm 降雨，逐时细燃料湿度码从 91 降到 68——这解释了傍晚为什么控制得住。'},
 met:{sim:'模拟',real:'实际',at:'时',shape:(p)=>`模拟面积等于最终火场面积时，和官方边界的重合度（Sørensen 指数）：<b>${p}%</b>`,k:(m)=>m.S<1?`系数 K(t) = ${m.K} × (${m.S} + ${(1-m.S).toFixed(3)} e<sup>−t/${m.tau} h</sup>)${m.hold?`，官方控制时刻（起火后 ${m.hold} 小时）后停止`:''}`:`系数 K = ${m.K}，全程不衰减，不停止`,
  rossModel:'校准事件。前三天六个报道时间点里，模拟面积都在实际的 0.5–2 倍之内；8 月 1 日模拟约 1.1 万公顷，实际 4,157，因为模型没有 7 月底的降雨和持续扑救。形状重合度 66%。',
  rossFree:'不扑救：第一天就烧出两万多公顷。这不是预测，只说明在那几天的天气下，没有扑救的上限有多高。',
  bradleyModel:'独立回测，失败：模拟几乎没有扩大。Vernon 站的小时平均风速远低于 8 月 1 日实际 70 km/h 的阵风，起火点所在地又被燃料图标为落叶林。要修正它需要格点风场（设计文档第 4 节 D 步）。',
  bradleyFree:'不扑救仍然太慢：问题在风的输入，不在系数。',
  jackoModel:'校准事件。14:30 模拟 24 公顷（实际 30），17:00 模拟 62（实际 50），19:30 官方控制后停止。两点误差都在 ±50% 以内。',
  jackoFree:'不扑救：19:30 模拟约 550 公顷，实际 44。差距就是 19 名消防员和空中支援的作用。'},
 lessons:'结论：v0.6 模型用逐时细燃料湿度码和一个随时间衰减的速率系数（自由燃烧 ×0.55，约 2 小时内衰减到 9%，代表初期扑救），在 Jacko 2026 和 Rossmoore 2023 的前三天里把面积误差压到 2 倍以内；但它仍然不能预测几周后的面积，也在 Bradley 2026 上失败（风的输入不对）。两场校准火不是独立检验。正式产品应接入加拿大林火管理机构使用的专业模型（如 Prometheus、FireSTARR），我们的价值在于数据整合和清楚的三维展示。',
 rep:{final:'最终'},
 sset:'设置情景',ign:'选择起火点',run:'计算 24 小时蔓延',wind:'风',windOpt:['Environment Canada Kamloops 逐时预报（24 小时）','手动设定','HRDPS 2.5 km 格点预报（起火点处，24 小时，实时获取）'],wdir:'风从哪边吹来',wspd:'风速',
 dry:'干燥程度',dryOpt:['夏季高火险（午后 FFMC 92，凌晨约 86）','一般（FFMC 88 / 82）','较湿（FFMC 82 / 76）'],k:'扑救假设',
 kOpt:['初期扑救（默认）：速率在约 2 小时内衰减到 9%，Jacko 2026 + Rossmoore 2023 校准','不扑救：全程自由燃烧速率（×0.55，上限估计）'],
 shint:'这是情景推演，不是预测。风用 Environment Canada 10 月 22 日中午发布的 Kamloops 预报，整个区域用同一个风；燃料用 BC 省燃料类型图。现在是十月，实际火险很低，干燥程度默认按夏季设定。细燃料湿度码按日值加昼夜曲线逐时变化。默认假设起火约 2 小时后开始扑救；选“不扑救”会得到偏大的结果，但那也不是严格的最坏情况（没有考虑飞火和局地阵风）。2 公里、6 公里只是距离参考圈，不是官方疏散范围。',
 stime:'蔓延时间',sarea:'过火面积',swx:'当时风',towns:'城镇参考点（距模拟火线）',
 floodh:'假设水位的淹没演示（Kamloops 城区）',rise:'假设水面比平时河面高',farea:'模拟淹没面积',fhood:'受影响的社区参考点',
 fhint:'从地图上的河流和湖泊出发，把低于假设水面、并且和水体连通的地面标为淹没。“平时河面”取水体格点高程的中位数，不是水文站读数；没有考虑堤坝、排水和水流速度；地形约 42 米网格，水深只到 0.5 米精度。这是理解地形的演示，不是洪水预报。',hoods:'社区参考点状态（每个社区只取一个点）',
 lookh:'地点查询',lookhint:'点击地图上任意位置，查看那里在当前画面中的状态。',
 foot:'数据来源与时间：地形为 AWS 开放高程瓦片（Terrarium，加拿大部分来自 CDEM）；燃料类型图、历史火场（2015 年起）、2026 年火场和当前火点来自 BC Wildfire Service（DataBC，10 月 22 日下载）；公路、地名、医院来自 BC 道路图、地名库和设施名录（DataBC）；卫星热点来自 NASA FIRMS（VIIRS，10 月 15–22 日）；历史逐时天气（2023、2026 年）和预报（10 月 22 日 12:00 发布）来自 Environment and Climate Change Canada。蔓延模型参考加拿大 FBP 体系的公式做了大幅简化（燃料类型的蔓延速度、逐时细燃料湿度码、风速和坡度影响），扑救用一个随时间衰减的系数近似，不考虑飞火。城镇位置为近似。',
 dirs:['北','东北','东','东南','南','西南','西','西北'],
 hrs:h=>h<1?`${Math.round(h*60)} 分钟`:`${h.toFixed(h<10?1:0)} 小时`,
 hudLive:'区域视图 · Kamloops 周边约 2 小时车程（约 270 × 280 公里）',hudR:'拖动旋转 · 缩放 · 高度放大显示',hudFlood:(r,l)=>`河水上涨 ${r} m · 水位约 ${l.toFixed(0)} m`,
 hudRep:(n,t)=>`${n} · ${t}`,hudScen:(t)=>`情景 · 起火后 ${t}`,armed:'点击地图选择起火点',computing:'正在计算蔓延…',noIgn:'先选择起火点',
 st:{safe:'模拟范围外',none:'未计算',flood:'模拟淹没',watch:'邻近淹没区',hit:'模拟火区内',order:'2 公里参考圈',alert:'6 公里参考圈'},
 point:'地图上的点',elev:e=>`海拔约 ${Math.round(e)} 米`,fuel:'燃料',fuelN:['不可燃（城区、裸地）','水体','草地','北方针叶林 C-2','成熟松林 C-3','幼龄松林 C-4','开阔针叶林 C-7','落叶林','混交林','采伐剩余物','未知'],
 histAt:(nm,y,ha)=>`${y} 年火场：${nm}（${ha}）`,
 lookMsg:{safe:'在这次模拟的范围外。这不代表安全，只说明这个简化模型没有算到这里。',none:'还没有计算情景。',flood:d=>`在假设水位下，这里与河流连通且低于水面，模拟水深约 ${(Math.round(d*2)/2).toFixed(1)} 米（地形精度有限，仅供参考）。`,watch:'在假设水位下，这里靠近模拟淹没区。',hit:'在这次模拟的过火范围内。',order:k=>`离模拟火线约 ${k.toFixed(1)} 公里（2 公里参考圈内）。这不是官方疏散令。`,alert:k=>`离模拟火线约 ${k.toFixed(1)} 公里（6 公里参考圈内）。这不是官方疏散预警。`,far:k=>`离模拟火线约 ${k.toFixed(1)} 公里。`},
 leg:{water:'河流湖泊',hist:'历史火场（越近越红）',h2026:'2026 年火场',firms:'卫星热点（近 7 天）',burn:'模拟燃烧中',burned:'模拟已过火',order:'离火线 2 公里参考圈',alert:'离火线 6 公里参考圈',perim:'官方最终火场边界',flood:'假设水位下的连通淹没（越深越蓝）',fuel:'显示燃料类型'},
 fuelToggle:'显示燃料类型',kmh:'km/h',
 x:{search:'搜索城镇、社区、湖泊、医院，或输入经纬度（如 50.68, -120.34）',notFound:'没有找到这个地点，只能搜当前地图上的标注。',outOfRange:'坐标在当前地图范围之外。',
  topDown:'俯视',threeD:'三维',cancel:'取消',more:'方法与限制',firmsDay:'每日卫星热点数（VIIRS，近 7 天）',
  snap:'数据快照',justNow:'刚刚',hoursAgo:h=>`约 ${h} 小时前`,daysAgo:d=>`约 ${d} 天前`,model:'蔓延模型 v0.6（简化 FBP，逐时 FFMC）',tested:'八方向蔓延测试：通过',seeTrust:'查看数据与验证 →',
  arrive:(h,t)=>`模拟火线到达这里：起火后 ${h}${t?'（约 '+t+'）':''}`,notArrive:'24 小时模拟内，火线没有到达这里。',repArrive:(h,t)=>`模拟火线到达：起火后 ${h}（${t}）`,repNot:'模拟期内火线没有到达这里。',inPer:'这里在官方最终火场边界内。',outPer:'这里在官方最终火场边界外。',
  kind:{official:'官方数据',measured:'实测',forecast:'预报',model:'模型',assumed:'假设'},
  th:['图层','来源','时间','性质'],layersH:'每一层数据从哪里来',
  layers:[['地形','AWS 开放高程瓦片（Terrarium；加拿大部分来自 CDEM）','静态','official'],['燃料类型','BC Wildfire Service，DataBC','2026-10-22 下载','official'],['历史与 2026 年火场边界','BC Wildfire Service，DataBC','2015 年起；2026-10-22 下载','official'],['尚未熄灭的山火','BC Wildfire Service 当前火点','2026-10-22 12:50 快照','official'],['卫星热点','NASA FIRMS，VIIRS','2026-10-15 至 10-22','measured'],['风向预报','Environment Canada，Kamloops 城市预报','2026-10-22 12:00 发布','forecast'],['历史逐时天气','Environment Canada 气象站（Kamloops A、Vernon Auto）','2023、2026 年','measured'],['公路、地名、医院','DataBC 道路图、地名库、设施名录','静态','official'],['天气警报','Environment Canada，OGC API weather-alerts','实时（每 10 分钟刷新）','official'],['风、降水、降雪、气温预报','ECCC HRDPS 2.5 km，GeoMet WCS 格点','实时（每 6 小时一次预报，48 小时）','forecast'],['雷达降水','ECCC 1 km 雷达合成，GeoMet WMS','实时（每 6 分钟）','measured'],['气象站观测','ECCC 自动站 SWOB，OGC API','实时（最近一小时）','measured'],['河流水位与流量','Water Survey of Canada 实时水文站，OGC API','实时（5 分钟一报）','measured'],['Kamloops 城市预报','Environment Canada citypage，OGC API','实时','forecast'],['山火蔓延','简化 FBP 公式 + 随时间衰减的校准系数','—','model'],['洪水淹没','假设水位下的地形连通填充','—','assumed'],['城镇与社区位置','代表点，手工整理','—','assumed']],
  modelH:'蔓延模型卡片',modelRows:[['输入','燃料类型、坡度、逐小时风向风速、逐时细燃料湿度码（Van Wagner 1977 逐时公式）推算的 ISI'],['公式','FBP 各燃料类型的蔓延速度、风的椭圆因子、坡度因子；速率系数 K(t) = 0.55 × (0.093 + 0.907 e^(−t/2 h))'],['分辨率','区域约 420 米网格；回放 25–83 米网格'],['没有考虑','飞火、局地阵风、树冠火、道路阻隔；扑救只用一个衰减系数近似'],['校准','Jacko Lake 2026（14:30 的 30 公顷）和 Rossmoore Lake 2023（前三天五个报道面积）联合拟合三个参数；燃料分组系数试过，三场火分不出来，没有采用']],
  valH:'验证结果',vkind:{pass:'通过',partial:'部分吻合',fail:'偏差大',untested:'未验证'},
  val:(rr,bm,bf,jm)=>[['八方向平坦地形测试','顺风蔓延、轴向与对角距离一致、无风时对称（2026-10-22）','pass'],
   ['Rossmoore Lake 2023（校准事件）',`7 月 23 日：模拟 ${fmtHa(rr.rep_sim[3].sim,'zh')}，实际 1,800 公顷；7 月 24 日：模拟 ${fmtHa(rr.rep_sim[4].sim,'zh')}，实际 2,600；8 月 1 日：模拟 ${fmtHa(rr.rep_sim[5].sim,'zh')}，实际 4,157；形状重合 ${Math.round(rr.sor_eq*100)}%`,'partial'],
   ['Jacko Lake 2026（校准事件）',`14:30 模拟 ${fmtHa(jm.rep_sim[0].sim,'zh')}，实际 30 公顷；17:00 模拟 ${fmtHa(jm.rep_sim[1].sim,'zh')}，实际 50 公顷；误差在 ±50% 内`,'partial'],
   ['Bradley Creek 2026（独立回测）',`8 月 2 日模拟 ${fmtHa(bm.rep_sim[0].sim,'zh')}，实际 2,603 公顷；不扑救也只有 ${fmtHa(bf.rep_sim[0].sim,'zh')}。站点风速没有记录到当天的阵风`,'fail'],
   ['洪水淹没演示','没有和官方洪泛区图对比','untested']],
  concl:'结论：方向可信；前三天的面积在校准过的天气条件下可信到 2 倍以内；几周后的面积和没有可靠风场数据的火不可信。所有结果只用于理解地形和数据，不用于任何决策。',
  linksH:'官方信息入口',links:[['EmergencyInfoBC（疏散令与预警）','https://www.emergencyinfobc.gov.bc.ca/'],['BC Wildfire Service 火情地图','https://wildfiresituation.nrs.gov.bc.ca/map'],['City of Kamloops','https://www.kamloops.ca/'],['Thompson-Nicola Regional District','https://www.tnrd.ca/'],['DriveBC 道路状况','https://www.drivebc.ca/'],['Environment Canada 天气警报','https://weather.gc.ca/']],
  ver:'沙盘版本 v0.6 · 2026-10-26 · 数据处理脚本和测试记录可按需提供'}},
en:{title:'Kamloops Risk Sand Table',sub:'Real terrain, fuel types, satellite hotspots, weather forecasts and official fire perimeters for roughly a two-hour drive around Kamloops. Drag to orbit, scroll or pinch to zoom.',
 warn:'For demonstration only, not an official forecast or alert. In a real emergency, follow City of Kamloops, TNRD, EmergencyInfoBC and BC Wildfire Service.',
 tabs:['Latest fires','Fire replay','Wildfire scenario','Flood (city)','Data & checks'],
 snap:'Data snapshot (not live)',bcwsn:'Fires not yet declared out',firmsn:'Satellite hotspots, last 7 days',
 snapnote:(t,n,oc)=>`Downloaded ${t}. BC Wildfire Service lists ${n} fires in the region that are not yet declared out; ${oc?`${oc} are out of control`:'all are under control or being held, none out of control'} (below). Satellite hotspots are not always wildfires: industry, fall prescribed burns and pile burning also show up.`,
 fc:'Kamloops wind forecast (Environment Canada)',fcH:['Time','From','Speed','Temp','Sky'],
 histh:'Large fires since 2015',histshow:'Show past fire perimeters on the map',
 rpick:'Pick a fire',k23:'Calibrated model (initial attack)',kev:'No suppression (free burn)',rtime:'Time',play:'Play',pause:'Pause',toend:'Jump to end',rsim:'Simulated burned area',rwx:'Weather then',rres:'Model vs reality',
 rdesc:{ross:'Lightning on the evening of 20 July 2023, discovered 21 July at 1:48 p.m., south of Kamloops. News reports and BCWS updates give six sizes over time (95, 210, 450, 1,800, 2,600 and 4,157 ha). Together with Jacko Lake it calibrates the model. Weather from Kamloops Airport with hourly fine-fuel moisture.',
  bradley:'Human-caused start on 31 July 2026. It ran on 1 August in strong wind, closed Highway 97 and affected about 230 homes on Okanagan Indian Band reserve land. Weather from the Vernon station.',
  jacko:'Lightning start on the afternoon of 22 August 2026 near Jacko Lake, about 7.5 km south of downtown Kamloops. All grass; held at 44 ha by 7:30 p.m. The airport recorded 1.1 mm of rain at 6 p.m., dropping the hourly fine-fuel moisture code from 91 to 68, which is why the evening hold was possible.'},
 met:{sim:'Simulated',real:'Reported',at:'at',shape:(p)=>`Overlap with the official perimeter when simulated area equals final area (Sørensen index): <b>${p}%</b>`,k:(m)=>m.S<1?`Coefficient K(t) = ${m.K} × (${m.S} + ${(1-m.S).toFixed(3)} e<sup>−t/${m.tau} h</sup>)${m.hold?`, stopped at the official hold time (${m.hold} h after ignition)`:''}`:`Coefficient K = ${m.K}, no decay, no stop`,
  rossModel:'Calibration event. At the six reported times in the first three days the simulated area stays within 0.5–2× of the reports; on 1 August the model is near 11,000 ha against 4,157, because it has no late-July rain and no sustained suppression. Shape overlap 66%.',
  rossFree:'No suppression: more than 20,000 ha on the first day. Not a forecast; it shows how high the ceiling was in that weather without an attack.',
  bradleyModel:'Independent test, failed: the simulated fire barely grows. The Vernon station hourly mean wind is far below the 70 km/h gusts of 1 August, and the fuel map classes the ignition area as deciduous. Fixing this needs gridded wind (design doc section 4, step D).',
  bradleyFree:'Even without suppression it is far too slow: the problem is the wind input, not the coefficient.',
  jackoModel:'Calibration event. 2:30 p.m. simulated 24 ha (reported 30), 5 p.m. simulated 62 (reported 50), stopped at the official hold at 7:30 p.m. Both within ±50%.',
  jackoFree:'No suppression: about 550 ha by 7:30 p.m. against 44 reported. The gap is what 19 firefighters and air support did.'},
 lessons:'Takeaway: the v0.6 model uses hourly fine-fuel moisture and a time-decaying rate coefficient (free burn ×0.55, decaying to 9% within about 2 h to stand for initial attack). On Jacko 2026 and the first three days of Rossmoore 2023 it keeps area within a factor of 2; it still cannot forecast area weeks later, and it fails on Bradley 2026 because the wind input is wrong. The two calibration fires are not independent tests. A real product should plug in the professional models BC uses (such as Prometheus and FireSTARR); our value is integrating the data and showing it clearly in 3D.',
 rep:{final:'final'},
 sset:'Set up scenario',ign:'Pick ignition',run:'Compute 24 h spread',wind:'Wind',windOpt:['Environment Canada Kamloops hourly forecast (24 h)','Manual','HRDPS 2.5 km grid forecast at the ignition point (24 h, live)'],wdir:'Wind from',wspd:'Wind speed',
 dry:'Dryness',dryOpt:['Summer high danger (FFMC 92 afternoon, about 86 at dawn)','Moderate (FFMC 88 / 82)','Damp (FFMC 82 / 76)'],k:'Suppression assumption',
 kOpt:['Initial attack (default): rate decays to 9% within about 2 h, calibrated on Jacko 2026 + Rossmoore 2023','No suppression: free-burning rate throughout (×0.55, upper estimate)'],
 shint:'A scenario, not a forecast. Wind is the Environment Canada Kamloops forecast issued at noon on 22 October, applied to the whole region; fuel is the BC fuel type map. It is October and actual danger is low, so dryness defaults to summer. Fine-fuel moisture follows a daily value plus a day–night curve. The default assumes an attack starting about 2 h after ignition; the no-suppression option runs high, but is still not a strict worst case (no spotting or local gusts). The 2 km and 6 km rings are distance references, not official evacuation areas.',
 stime:'Time since ignition',sarea:'Burned area',swx:'Wind then',towns:'Town reference points (distance to modelled fire line)',
 floodh:'Assumed water level demo (Kamloops city)',rise:'Assumed water above normal river level',farea:'Modelled flooded area',fhood:'Reference points affected',
 fhint:'Starting from mapped rivers and lakes, ground below the assumed water surface that connects to water is marked flooded. "Normal river level" is the median elevation of water cells, not a gauge reading; dikes, drainage and flow are ignored; terrain is a 42 m grid and depth is shown to 0.5 m. A terrain demo, not a flood forecast.',hoods:'Neighbourhood reference points (one point each)',
 lookh:'Point lookup',lookhint:'Click anywhere on the map to see its status in the current view.',
 foot:'Sources and dates: terrain from AWS open elevation tiles (Terrarium; Canadian coverage from CDEM); fuel types, past perimeters (since 2015), 2026 perimeters and current fires from BC Wildfire Service (DataBC, downloaded 22 Oct); roads, place names and hospitals from BC road atlas, names and facility registries (DataBC); hotspots from NASA FIRMS (VIIRS, 15–22 Oct); hourly weather (2023, 2026) and the forecast (issued 22 Oct 12:00) from Environment and Climate Change Canada. The spread model is a heavy simplification of Canada\'s FBP System equations (fuel-type spread rates, hourly fine-fuel moisture, wind and slope effects); suppression is approximated by a time-decaying coefficient; no spotting. Town positions are approximate.',
 dirs:['N','NE','E','SE','S','SW','W','NW'],
 hrs:h=>h<1?`${Math.round(h*60)} min`:`${h.toFixed(h<10?1:0)} h`,
 hudLive:'Region view · about a 2-hour drive around Kamloops (270 × 280 km)',hudR:'Drag to orbit · zoom · heights exaggerated',hudFlood:(r,l)=>`River +${r} m · level about ${l.toFixed(0)} m`,
 hudRep:(n,t)=>`${n} · ${t}`,hudScen:(t)=>`Scenario · ${t} after ignition`,armed:'Click the map to set ignition',computing:'Computing spread…',noIgn:'Pick an ignition point first',
 st:{safe:'Outside model run',none:'Not computed',flood:'Modelled flooding',watch:'Near modelled flooding',hit:'In modelled burn',order:'2 km reference ring',alert:'6 km reference ring'},
 point:'Point on map',elev:e=>`Elevation about ${Math.round(e)} m`,fuel:'Fuel',fuelN:['Non-fuel (urban, bare)','Water','Grass','Boreal spruce C-2','Mature pine C-3','Immature pine C-4','Open conifer C-7','Deciduous','Mixedwood','Slash','Unknown'],
 histAt:(nm,y,ha)=>`${y} fire: ${nm} (${ha})`,
 lookMsg:{safe:'Outside this model run. This does not mean safe; the simplified model just did not reach here.',none:'No scenario computed yet.',flood:d=>`Under the assumed water level this point connects to the river and lies below it; modelled depth about ${(Math.round(d*2)/2).toFixed(1)} m (limited terrain accuracy).`,watch:'Near the modelled flooding under the assumed level.',hit:'Inside the modelled burn.',order:k=>`About ${k.toFixed(1)} km from the modelled fire line (2 km ring). Not an official evacuation order.`,alert:k=>`About ${k.toFixed(1)} km from the modelled fire line (6 km ring). Not an official evacuation alert.`,far:k=>`About ${k.toFixed(1)} km from the modelled fire line.`},
 leg:{water:'Rivers and lakes',hist:'Past fires (redder = more recent)',h2026:'2026 fires',firms:'Hotspots (7 days)',burn:'Modelled burning',burned:'Modelled burned',order:'2 km from fire line',alert:'6 km from fire line',perim:'Official final perimeter',flood:'Connected flooding at assumed level (deeper = bluer)',fuel:'Show fuel types'},
 fuelToggle:'Show fuel types',kmh:'km/h',
 x:{search:'Search towns, neighbourhoods, lakes, hospitals, or enter lat, lon (e.g. 50.68, -120.34)',notFound:'Not found. Only labels on the current map can be searched.',outOfRange:'Coordinates are outside the current map.',
  topDown:'Top-down',threeD:'3D',cancel:'Cancel',more:'Method and limits',firmsDay:'Satellite hotspots per day (VIIRS, last 7 days)',
  snap:'Data snapshot',justNow:'just now',hoursAgo:h=>`about ${h} h ago`,daysAgo:d=>`about ${d} days ago`,model:'Spread model v0.6 (simplified FBP, hourly FFMC)',tested:'8-direction spread test: passed',seeTrust:'See data & checks →',
  arrive:(h,t)=>`Modelled fire line reaches here ${h} after ignition${t?' (about '+t+')':''}`,notArrive:'The modelled fire line does not reach here within 24 h.',repArrive:(h,t)=>`Modelled arrival: ${h} after ignition (${t})`,repNot:'Not reached within the replay.',inPer:'Inside the official final perimeter.',outPer:'Outside the official final perimeter.',
  kind:{official:'Official',measured:'Measured',forecast:'Forecast',model:'Model',assumed:'Assumed'},
  th:['Layer','Source','Date','Kind'],layersH:'Where each layer comes from',
  layers:[['Terrain','AWS open elevation tiles (Terrarium; Canadian coverage from CDEM)','static','official'],['Fuel types','BC Wildfire Service, DataBC','downloaded 2026-10-22','official'],['Past and 2026 fire perimeters','BC Wildfire Service, DataBC','since 2015; downloaded 2026-10-22','official'],['Fires not yet out','BC Wildfire Service current fires','snapshot 2026-10-22 12:50','official'],['Satellite hotspots','NASA FIRMS, VIIRS','2026-10-15 to 10-22','measured'],['Wind forecast','Environment Canada, Kamloops city forecast','issued 2026-10-22 12:00','forecast'],['Hourly weather history','Environment Canada stations (Kamloops A, Vernon Auto)','2023, 2026','measured'],['Roads, names, hospitals','DataBC road atlas, names and facility registries','static','official'],['Weather alerts','Environment Canada, OGC API weather-alerts','live (refreshed every 10 min)','official'],['Wind, precipitation, snow, temperature forecast','ECCC HRDPS 2.5 km, GeoMet WCS grid','live (6-hourly runs, 48 h)','forecast'],['Radar precipitation','ECCC 1 km radar composite, GeoMet WMS','live (every 6 min)','measured'],['Station observations','ECCC automatic stations (SWOB), OGC API','live (last hour)','measured'],['River level and flow','Water Survey of Canada real-time gauges, OGC API','live (5-min reports)','measured'],['Kamloops city forecast','Environment Canada citypage, OGC API','live','forecast'],['Fire spread','Simplified FBP equations + time-decaying calibrated coefficient','—','model'],['Flooding','Terrain fill at an assumed water level','—','assumed'],['Town and neighbourhood positions','Representative points, hand-placed','—','assumed']],
  modelH:'Spread model card',modelRows:[['Inputs','fuel type, slope, hourly wind, ISI from hourly fine-fuel moisture code (Van Wagner 1977 hourly form)'],['Equations','FBP rate of spread by fuel type, wind ellipse factor, slope factor; rate coefficient K(t) = 0.55 × (0.093 + 0.907 e^(−t/2 h))'],['Resolution','region about 420 m grid; replays 25–83 m'],['Not included','spotting, local gusts, crown fire, road barriers; suppression only as a decay coefficient'],['Calibration','three parameters fitted jointly on Jacko Lake 2026 (30 ha at 2:30 p.m.) and the first three days of Rossmoore Lake 2023 (five reported sizes); per-fuel-group coefficients were tried and are not identifiable from three fires']],
  valH:'Validation',vkind:{pass:'Passed',partial:'Partial',fail:'Large error',untested:'Untested'},
  val:(rr,bm,bf,jm)=>[['8-direction flat-terrain test','downwind spread, equal axial and diagonal reach, symmetric when calm (2026-10-22)','pass'],
   ['Rossmoore Lake 2023 (calibration event)',`23 Jul: simulated ${fmtHa(rr.rep_sim[3].sim,'en')}, reported 1,800 ha; 24 Jul: ${fmtHa(rr.rep_sim[4].sim,'en')} vs 2,600; 1 Aug: ${fmtHa(rr.rep_sim[5].sim,'en')} vs 4,157; shape overlap ${Math.round(rr.sor_eq*100)}%`,'partial'],
   ['Jacko Lake 2026 (calibration event)',`2:30 p.m. simulated ${fmtHa(jm.rep_sim[0].sim,'en')}, reported 30 ha; 5 p.m. simulated ${fmtHa(jm.rep_sim[1].sim,'en')}, reported 50 ha; within ±50%`,'partial'],
   ['Bradley Creek 2026 (independent)',`2 Aug simulated ${fmtHa(bm.rep_sim[0].sim,'en')}, reported 2,603 ha; even with no suppression only ${fmtHa(bf.rep_sim[0].sim,'en')}. The station wind missed the gusts of the day`,'fail'],
   ['Flood demo','not compared with official floodplain maps','untested']],
  concl:'Bottom line: direction is credible; area in the first three days is credible to within a factor of 2 under calibrated weather; area weeks later, and any fire without reliable wind data, is not. Results are for understanding terrain and data only, never for decisions.',
  linksH:'Official sources',links:[['EmergencyInfoBC (orders and alerts)','https://www.emergencyinfobc.gov.bc.ca/'],['BC Wildfire Service map','https://wildfiresituation.nrs.gov.bc.ca/map'],['City of Kamloops','https://www.kamloops.ca/'],['Thompson-Nicola Regional District','https://www.tnrd.ca/'],['DriveBC road conditions','https://www.drivebc.ca/'],['Environment Canada weather alerts','https://weather.gc.ca/']],
  ver:'Sand table v0.6 · 2026-10-26 · processing scripts and test logs available on request'}}};
let lang='zh';const L=()=>T[lang];

/* ================= Terrain helper ================= */
const RAMP=[[150,[132,140,120]],[350,[170,164,124]],[600,[164,160,112]],[900,[122,132,90]],[1200,[84,108,74]],[1500,[64,90,64]],[1800,[96,106,92]],[2300,[200,200,196]]];
function ramp(h){if(h<=RAMP[0][0])return RAMP[0][1];for(let k=1;k<RAMP.length;k++){if(h<=RAMP[k][0]){const a=RAMP[k-1],b=RAMP[k],t=(h-a[0])/(b[0]-a[0]);return [a[1][0]+(b[1][0]-a[1][0])*t,a[1][1]+(b[1][1]-a[1][1])*t,a[1][2]+(b[1][2]-a[1][2])*t]}}return RAMP[RAMP.length-1][1]}
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1412);
const camera=new THREE.PerspectiveCamera(42,1,0.5,5000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));$('stage').appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*0.47;

let EXK=1,basemap='sat';const IMG=__IMAGERY__;const SATI={};
function makeTerrain(info,H,opt){
  const GW=info.gw,GH=info.gh,N=GW*GH,cx=info.widthM/(GW-1),cy=info.heightM/(GH-1);
  const unit=opt.unit,ex=opt.ex,base=opt.base??info.min;
  const W=info.widthM/unit,D=info.heightM/unit,yOf=h=>(h-base)/unit*ex;
  const ts=opt.ts||2,TW=GW*ts,TH=GH*ts;
  const hAt=(x,y)=>{const X=Math.max(0,Math.min(GW-1.001,x)),Y=Math.max(0,Math.min(GH-1.001,y)),c=X|0,r=Y|0,fx=X-c,fy=Y-r,i=r*GW+c;return H[i]*(1-fx)*(1-fy)+H[i+1]*fx*(1-fy)+H[i+GW]*(1-fx)*fy+H[i+GW+1]*fx*fy};
  const gs=opt.gs||1,SX=Math.max(1,Math.round((GW-1)/gs)),SY=Math.max(1,Math.round((GH-1)/gs)),VW=SX+1,VH=SY+1;
  const geo=new THREE.PlaneGeometry(W,D,SX,SY);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;for(let r=0;r<VH;r++)for(let c=0;c<VW;c++)pos.setY(r*VW+c,yOf(hAt(c*(GW-1)/SX,r*(GH-1)/SY)));
  const can=document.createElement('canvas');can.width=TW;can.height=TH;const ctx=can.getContext('2d');const img=ctx.createImageData(TW,TH);
  const tex=new THREE.CanvasTexture(can);tex.anisotropy=4;
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex}));
  const g=new THREE.Group();g.add(mesh);
  const skirtMat=new THREE.MeshBasicMaterial({color:0x26302c,side:THREE.DoubleSide});const bot=yOf(info.min)-opt.skirt;
  const mk=(pts)=>{const gg=new THREE.BufferGeometry();const v=[];for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1];v.push(a[0],a[1],a[2],b[0],b[1],b[2],b[0],bot,b[2],a[0],a[1],a[2],b[0],bot,b[2],a[0],bot,a[2])}gg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.add(new THREE.Mesh(gg,skirtMat))};
  const P=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)];
  mk(Array.from({length:VW},(_,c)=>P(c)));mk(Array.from({length:VW},(_,c)=>P((VH-1)*VW+c)));mk(Array.from({length:VH},(_,r)=>P(r*VW)));mk(Array.from({length:VH},(_,r)=>P(r*VW+VW-1)));
  g.visible=false;g.scale.y=EXK;scene.add(g);
  // bake hillshade base
  const baseImg=new Uint8ClampedArray(TW*TH*4);const shadeA=new Float32Array(TW*TH);
  const lx=-0.55,ly=-0.65,lz=0.52,zf=opt.shadeZ||1.6;
  for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){const gx=x/ts,gy=y/ts,h=hAt(gx,gy);const dx=(hAt(gx+.5,gy)-hAt(gx-.5,gy))/cx*zf,dy=(hAt(gx,gy+.5)-hAt(gx,gy-.5))/cy*zf;
    const nl=Math.hypot(dx,dy,1),sh=Math.max(0.35,Math.min(1.25,((-dx*lx)+(-dy*ly)+lz)/nl*1.15+0.25));const col=ramp(h),o=(y*TW+x)*4;shadeA[y*TW+x]=sh;baseImg[o]=col[0]*sh;baseImg[o+1]=col[1]*sh;baseImg[o+2]=col[2]*sh;baseImg[o+3]=255}
  const T_={ex,unit,info,H,GW,GH,N,cx,cy,W,D,yOf,TW,TH,ts,ctx,img,tex,mesh,group:g,baseImg,shadeA,satBase:null,
    world:(r,c)=>new THREE.Vector3(-W/2+c/(GW-1)*W,yOf(H[r*GW+c])*EXK,-D/2+r/(GH-1)*D),
    cellOf:(p)=>{const c=Math.round((p.x+W/2)/W*(GW-1)),r=Math.round((p.z+D/2)/D*(GH-1));return (r<0||c<0||r>=GH||c>=GW)?null:[r,c]},
    rc:(lat,lon)=>[Math.round((info.latN-lat)/(info.latN-info.latS)*(GH-1)),Math.round((lon-info.lonW)/(info.lonE-info.lonW)*(GW-1))],
    begin(){img.data.set(basemap==='sat'&&this.satBase?this.satBase:baseImg)},
    mix(o,c,a){const d=img.data;d[o]=d[o]*(1-a)+c[0]*a;d[o+1]=d[o+1]*(1-a)+c[1]*a;d[o+2]=d[o+2]*(1-a)+c[2]*a},
    end(){ctx.putImageData(img,0,0);if(this.roads)drawRoads(this);tex.needsUpdate=true},
    cam(){const m=Math.max(W,D);camera.position.set(W*0.05,m*(opt.camY||0.72),D*0.5+m*(opt.camZ||0.55));controls.target.set(0,yOf(info.min)+opt.tY,D*0.04);controls.minDistance=m*0.08;controls.maxDistance=m*2.2;camera.far=m*8;camera.updateProjectionMatrix();controls.update()}};
  return T_;
}

function drawRoads(T_){if(!showRoads)return;const ctx=T_.ctx,s=T_.ts/10,big=T_.TW>=900;ctx.lineJoin='round';ctx.lineCap='round';
  const path=r=>{ctx.beginPath();for(let k=0;k<r.p.length;k+=2){const x=r.p[k]*s+T_.ts/2,y=r.p[k+1]*s+T_.ts/2;k?ctx.lineTo(x,y):ctx.moveTo(x,y)}};
  ctx.strokeStyle='rgba(250,246,232,.55)';ctx.lineWidth=big?1:1.3;for(const r of T_.roads)if(r.c==='a'){path(r);ctx.stroke()}
  for(const r of T_.roads)if(r.c==='h'){path(r);ctx.strokeStyle='rgba(30,22,14,.75)';ctx.lineWidth=big?3.6:4.5;ctx.stroke()}
  for(const r of T_.roads)if(r.c==='h'){path(r);ctx.strokeStyle='#F2C14E';ctx.lineWidth=big?1.9:2.6;ctx.stroke()}}
/* ================= fire physics (shared with python prep) ================= */
function fF(ffmc){const m=147.2*(101-ffmc)/(59.5+ffmc);return 91.9*Math.exp(-0.1386*m)*(1+Math.pow(m,5.31)/4.93e7)}
function rsi(cls,isi){const f=(a,b,c)=>a*Math.pow(1-Math.exp(-b*isi),c);
  switch(cls){case 2:return f(250,.035,1.7)*.8;case 3:return f(110,.0282,1.5);case 4:return f(110,.0444,3.0);case 5:return f(110,.0293,1.5);case 6:return f(45,.0305,2.0);
    case 7:return f(30,.0232,1.6)*.2;case 8:return .5*f(110,.0282,1.5)+.5*f(30,.0232,1.6)*.2;case 9:return f(75,.0297,1.3);case 10:return f(250,.035,1.7)*.5;default:return 0}}
function lbr(cls,ws){if(cls===2||cls===10)return ws>=1?1.1*Math.pow(ws,.464):1;return 1+8.729*Math.pow(1-Math.exp(-.030*ws),2.155)}
class Heap{constructor(n){this.k=new Float64Array(n);this.v=new Int32Array(n);this.n=0}
  push(k,v){if(this.n>=this.k.length){const k2=new Float64Array(this.k.length*2),v2=new Int32Array(this.k.length*2);k2.set(this.k);v2.set(this.v);this.k=k2;this.v=v2}
    let i=this.n++;while(i>0){const p=(i-1)>>1;if(this.k[p]<=k)break;this.k[i]=this.k[p];this.v[i]=this.v[p];i=p}this.k[i]=k;this.v[i]=v}
  pop(){const rk=this.k[0],rv=this.v[0];const k=this.k[--this.n],v=this.v[this.n];let i=0;for(;;){let c=2*i+1;if(c>=this.n)break;if(c+1<this.n&&this.k[c+1]<this.k[c])c++;if(this.k[c]>=k)break;this.k[i]=this.k[c];this.v[i]=this.v[c];i=c}this.k[i]=k;this.v[i]=v;this.popK=rk;return rv}}
function spread(T,fuel,ign,hours,K,hold){ // hours: [{WS,WD(from deg),isi,day}]; K: number or {k,s,tau} -> K(t)=k*(s+(1-s)*exp(-t/tau)); hold: hour after which spread stops
  const {GW,GH,N,cx,cy,H}=T;const NB=[];for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){if(!dr&&!dc)continue;const g=(a,b)=>b?g(b,a%b):a;if(g(Math.abs(dr),Math.abs(dc))===1)NB.push([dr,dc,Math.hypot(dc*cx,dr*cy)])}
  const KO=typeof K==='object'?K:{k:K,s:1,tau:1};const nH=hours.length,RT=new Float64Array(nH*11),LB=new Float64Array(nH*11),UX=new Float64Array(nH),UY=new Float64Array(nH),KT=new Float64Array(nH);const stop=Math.min(nH,hold??Infinity);
  for(let k=0;k<nH;k++)KT[k]=KO.k*(KO.s+(1-KO.s)*Math.exp(-(k+.5)/KO.tau));
  hours.forEach((w,k)=>{for(let c=0;c<11;c++){RT[k*11+c]=rsi(c,w.isi);LB[k*11+c]=lbr(c,w.WS*(w.day?1:.6))}const th=((w.WD+180)%360)*Math.PI/180;UX[k]=Math.sin(th);UY[k]=Math.cos(th)});
  const arr=new Float64Array(N).fill(Infinity);const s=ign[0]*GW+ign[1];arr[s]=0;const hp=new Heap(1<<16);hp.push(0,s);
  while(hp.n){const i=hp.pop(),t=hp.popK;if(t>arr[i]||t>=stop)continue;const r=(i/GW)|0,c=i-r*GW,hk=Math.min(nH-1,t|0),ux=UX[hk],uy=UY[hk];const fi=fuel[i];
    for(const [dr,dc,dist] of NB){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=GH||cc>=GW)continue;const j=rr*GW+cc,cj=fuel[j];if(cj<2)continue;if(fi<2&&i!==s)continue;
      const ci=fi<2?cj:fi;const rosH=.5*(RT[hk*11+ci]+RT[hk*11+cj])*KT[hk];if(rosH<=0)continue;const lb=.5*(LB[hk*11+ci]+LB[hk*11+cj]),e=Math.sqrt(Math.max(0,1-1/(lb*lb)));
      const cos=(dc*cx*ux+(-dr*cy)*uy)/dist;let ros=rosH*(1-e)/(1-e*cos);const tp=(H[j]-H[i])/dist;ros*=tp>0?Math.exp(3.533*Math.pow(Math.min(tp,.7),1.2)):Math.exp(-1.5*Math.min(-tp,.7));
      const tj=t+dist/ros/60;if(tj<arr[j]&&tj<stop){arr[j]=tj;hp.push(tj,j)}}}
  return arr;
}
function chamfer(GW,GH,src,D){for(let i=0;i<GW*GH;i++)D[i]=src(i)?0:1e9;
  for(let r=0;r<GH;r++)for(let c=0;c<GW;c++){const i=r*GW+c;let v=D[i];if(c>0)v=Math.min(v,D[i-1]+3);if(r>0){v=Math.min(v,D[i-GW]+3);if(c>0)v=Math.min(v,D[i-GW-1]+4);if(c<GW-1)v=Math.min(v,D[i-GW+1]+4)}D[i]=v}
  for(let r=GH-1;r>=0;r--)for(let c=GW-1;c>=0;c--){const i=r*GW+c;let v=D[i];if(c<GW-1)v=Math.min(v,D[i+1]+3);if(r<GH-1){v=Math.min(v,D[i+GW]+3);if(c<GW-1)v=Math.min(v,D[i+GW+1]+4);if(c>0)v=Math.min(v,D[i+GW-1]+4)}D[i]=v}}

/* ================= background worker for the spread model ================= */
let worker=null,workerOK=false;
function makeWorker(){try{const src=`${Heap.toString()};${rsi.toString()};${lbr.toString()};${spread.toString()};onmessage=e=>{const d=e.data;const T={GW:d.GW,GH:d.GH,N:d.GW*d.GH,cx:d.cx,cy:d.cy,H:d.H};const arr=spread(T,d.fuel,d.ign,d.hours,d.K,d.hold);postMessage({id:d.id,arr},[arr.buffer])}`;
  const w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));w.onmessage=e=>{const {id,arr}=e.data;if(id!==scen.job)return;finishScen(arr)};w.onerror=()=>{workerOK=false};workerOK=true;return w}catch(e){workerOK=false;return null}}
worker=makeWorker();
/* ================= camera flights ================= */
let fly=null,topDown=false,frameN=0;
function flyTo(target,dist,td){const from={t:controls.target.clone(),p:camera.position.clone()};const d=dist||camera.position.distanceTo(controls.target);
  let dir;if(td)dir=new THREE.Vector3(0,1,0.0005);else{dir=camera.position.clone().sub(controls.target);if(dir.length()<1e-6||dir.y/dir.length()>0.95)dir=new THREE.Vector3(0,0.68,0.73)}dir.normalize();
  fly={from,to:{t:target.clone(),p:target.clone().add(dir.multiplyScalar(d))},t0:performance.now(),dur:900}}
/* ================= colours ================= */
const FUELC=[[150,150,150],[52,104,176],[222,198,120],[40,80,52],[52,98,60],[70,114,66],[96,134,72],[150,190,100],[118,156,86],[160,118,88],[200,200,200]];
const C_WATER=[46,98,168],C_BURN=[255,112,30],C_BURNED=[34,28,26],C_ORDER=[214,40,40],C_ALERT=[240,160,30],C_PERIM=[255,255,255],C_FIRMS=[255,60,40];

/* ================= REGION ================= */
const RI=AS.region.info,RN=RI.gw*RI.gh;
const RH=new Float32Array(RN);{const a=u16(AS.region.dem);for(let i=0;i<RN;i++)RH[i]=a[i]/10}
const RF=unrle(AS.region.fuel,RN),RHIST=unrle(AS.region.hist,RN),HL=AS.region.histList;
HL.forEach(h=>{h.name=(h.name||'').replace(/\bFsr\b/,'FSR').trim()||h.num});
const R=makeTerrain(RI,RH,{unit:1000,ex:4,ts:2,gs:2,skirt:3,tY:0.6,camY:0.62,camZ:0.5,shadeZ:2.2});R.roads=POI.region.roads;R.view='region';
const TOWNS=[['Kamloops',50.6758,-120.3394],['Kelowna',49.8881,-119.4956],['Vernon',50.2658,-119.2717],['Salmon Arm',50.7014,-119.2781],['Merritt',50.1125,-120.7883],['Princeton',49.4590,-120.5090],
 ['Lillooet',50.6939,-121.9336],['Lytton',50.2311,-121.5814],['Cache Creek',50.8119,-121.3233],['Ashcroft',50.7214,-121.2836],['Clinton',51.0917,-121.5867],['100 Mile House',51.6428,-121.2956],['Clearwater',51.6456,-120.0325],
 ['Barriere',51.1797,-120.1236],['Chase',50.8192,-119.6861],['Sicamous',50.8361,-118.98],['Logan Lake',50.4944,-120.8133],['Sun Peaks',50.882,-119.886],['Savona',50.7530,-120.8427],['Armstrong',50.4483,-119.1967]]
 .map(([n,la,lo])=>{const [r,c]=R.rc(la,lo);return {n,la,lo,r,c,i:r*RI.gw+c}});

/* ================= CITY ================= */
const CN=CITY_INFO.gw*CITY_INFO.gh,CH=new Float32Array(CN);{const a=u16(CITY_DEM);for(let i=0;i<CN;i++)CH[i]=a[i]/10}
const CWAT=u8(CITY_FUEL);let RIVER;{const a=[];for(let i=0;i<CN;i++)if(CWAT[i]===1)a.push(CH[i]);a.sort((x,y)=>x-y);RIVER=a.length?a[a.length>>1]:337}
const C=makeTerrain(CITY_INFO,CH,{unit:100,ex:2,ts:2,skirt:3,base:RIVER,tY:4,camY:0.62,camZ:0.62,shadeZ:2.2});C.roads=POI.city.roads;C.view='city';
const HOODS=[['市中心','Downtown',50.677,-120.335],['北岸','North Shore',50.692,-120.356],['McArthur 岛','McArthur Island',50.696,-120.375],['Brocklehurst','Brocklehurst',50.705,-120.40],['机场','Airport',50.702,-120.444],
 ['Valleyview','Valleyview',50.678,-120.29],['Juniper Ridge','Juniper Ridge',50.665,-120.29],['Batchelor Heights','Batchelor Heights',50.715,-120.37],['Sahali','Sahali',50.658,-120.345],['Aberdeen','Aberdeen',50.655,-120.40]]
 .map(([zh,en,la,lo])=>{const [r,c]=C.rc(la,lo);return {zh,en,r,c,i:r*CITY_INFO.gw+c}});
const water=new THREE.Mesh(new THREE.PlaneGeometry(C.W,C.D,1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x3d8fe0,transparent:true,opacity:0.55,depthWrite:false}));
const mcan=document.createElement('canvas');mcan.width=CITY_INFO.gw;mcan.height=CITY_INFO.gh;const mctx=mcan.getContext('2d'),mimg=mctx.createImageData(mcan.width,mcan.height);const malpha=new THREE.CanvasTexture(mcan);water.material.alphaMap=malpha;C.group.add(water);
let rise=8,level=RIVER+8;const flooded=new Uint8Array(CN);const isRiver=i=>CWAT[i]===1;
function computeFlood(){level=RIVER+rise;flooded.fill(0);const GW=CITY_INFO.gw,GH=CITY_INFO.gh,q=new Int32Array(CN);let a=0,b=0;
  for(let i=0;i<CN;i++)if(isRiver(i)&&CH[i]<=level){flooded[i]=1;q[b++]=i}
  while(a<b){const i=q[a++],r=(i/GW)|0,c=i-r*GW;for(const j of [c>0?i-1:-1,c<GW-1?i+1:-1,r>0?i-GW:-1,r<GH-1?i+GW:-1])if(j>=0&&!flooded[j]&&CH[j]<=level){flooded[j]=1;q[b++]=j}}}
function floodStatus(i){const GW=CITY_INFO.gw,GH=CITY_INFO.gh;if(flooded[i])return {k:'flood',d:level-CH[i]};const r=(i/GW)|0,c=i-r*GW;
  for(let dr=-7;dr<=7;dr++)for(let dc=-7;dc<=7;dc++){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=GH||cc>=GW)continue;const j=rr*GW+cc;if(flooded[j]&&!isRiver(j)&&CH[i]-level<3)return {k:'watch'}}return {k:'safe'}}
function paintCity(){const T_=C;T_.begin();const GW=CITY_INFO.gw;for(let y=0;y<T_.TH;y++)for(let x=0;x<T_.TW;x++){const i=(y>>1)*GW+(x>>1);if(flooded[i]){const d=level-CH[i],o=(y*T_.TW+x)*4;if(isRiver(i)&&rise<0.6)T_.mix(o,C_WATER,.85);else T_.mix(o,[30+Math.max(0,60-d*8),110+Math.max(0,70-d*9),220],.82)}}T_.end();
  for(let i=0;i<CN;i++){const v=flooded[i]?255:0;mimg.data[i*4]=mimg.data[i*4+1]=mimg.data[i*4+2]=v;mimg.data[i*4+3]=255}mctx.putImageData(mimg,0,0);malpha.needsUpdate=true;water.position.y=C.yOf(level)+0.02}

/* ================= REPLAYS ================= */
const REPS=AS.replays.map(rp=>{const info=rp.info,N=info.gw*info.gh;const H=new Float32Array(N);const a=u16(rp.dem);for(let i=0;i<N;i++)H[i]=a[i]/10;
  return {rp,info,N,H,fuel:u8(rp.fuel),per:u8(rp.perim),runs:Object.fromEntries(Object.entries(rp.runs).map(([k,v])=>{const ar=u16(v.arr);const f=new Float32Array(N);for(let i=0;i<N;i++)f[i]=ar[i]===65535?Infinity:ar[i]/rp.tscale;return [k,{...v,arrF:f}]})),T:null,edge:null}});
function repTerrain(X){if(!X.T){const w=X.info.widthM;X.T=makeTerrain(X.info,X.H,{unit:w/160,ex:w<8000?1.3:2.2,ts:2,gs:X.N>100000?2:1,skirt:2,tY:0.6,camY:0.66,camZ:0.55,shadeZ:2.0});X.T.roads=(POI[X.rp.id]||{}).roads||[];X.T.view=X.rp.id;
  const GW=X.info.gw,GH=X.info.gh,e=new Uint8Array(X.N);for(let r=0;r<GH;r++)for(let c=0;c<GW;c++){const i=r*GW+c;if(!X.per[i])continue;if(r===0||c===0||r===GH-1||c===GW-1||!X.per[i-1]||!X.per[i+1]||!X.per[i-GW]||!X.per[i+GW])e[i]=1}X.edge=e}return X.T}

/* ================= state ================= */
let mode='live',showHist=true,showFuel=false,repIdx=0,repRun='model',repT=0,repPlay=false;
let scen={ign:null,arr:null,wx:null,t:24,armed:false,play:false,dist:new Float32Array(RN),windSrc:0,wdir:7,wspd:25,dry:0,k:0};
let lookCell=null;
const markers=new THREE.Group();scene.add(markers);
const cone=(col)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(1,3,12),new THREE.MeshBasicMaterial({color:col}));m.rotation.x=Math.PI;return m};
const ignMark=cone(0xff6a2a);markers.add(ignMark);ignMark.visible=false;
const searchMark=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.18,10,40),new THREE.MeshBasicMaterial({color:0x62AED3}));searchMark.rotation.x=Math.PI/2;searchMark.visible=false;markers.add(searchMark);

/* ================= painting ================= */
function histColor(y){const t=Math.max(0,Math.min(1,(y-2015)/11));return [140+t*115,90-t*40,70-t*40]}
function paintRegion(){const T_=R,GW=RI.gw,ts=T_.ts;T_.begin();const d=T_.img.data;
  const zoneOn=mode==='scen'&&scen.arr;const tt=scen.t;const ov=(typeof wxOverlay==='function')?wxOverlay():null;
  for(let y=0;y<T_.TH;y++)for(let x=0;x<T_.TW;x++){const i=((y/ts)|0)*GW+((x/ts)|0),o=(y*T_.TW+x)*4,f=RF[i];
    if(f===1){T_.mix(o,C_WATER,basemap==='sat'&&T_.satBase?.3:.85);if(ov){const a=ov[o+3]/255*.55;if(a>0)T_.mix(o,[ov[o],ov[o+1],ov[o+2]],a)}continue}
    if(ov){const a=ov[o+3]/255*.62;if(a>0)T_.mix(o,[ov[o],ov[o+1],ov[o+2]],a);continue}
    if(showFuel)T_.mix(o,FUELC[f],.5);
    if(mode!=='wx'){const ev=evacMaskAt(i);if(ev)T_.mix(o,ev===2?C_ORDER:C_ALERT,.45)}
    if(mode==='live'&&showHist&&RHIST[i]){const h=HL[RHIST[i]-1];T_.mix(o,histColor(h.y),h.y===2026?.62:.42)}
    if(zoneOn){const a=scen.arr[i];if(a<=tt){T_.mix(o,tt-a<2?C_BURN:C_BURNED,tt-a<2?.95:.8)}else{const km=scen.dist[i]/3*T_.cx/1000;if(km<2)T_.mix(o,C_ORDER,.33);else if(km<6)T_.mix(o,C_ALERT,.22)}}}
  if(mode==='live'&&showFirms){for(const p of AS.region.live.firms){const [r,c]=R.rc(p.lat,p.lon);const cxp=c*ts,cyp=r*ts;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){if(dx*dx+dy*dy>9)continue;const X=cxp+dx,Y=cyp+dy;if(X<0||Y<0||X>=T_.TW||Y>=T_.TH)continue;T_.mix((Y*T_.TW+X)*4,C_FIRMS,1)}}}
  T_.end()}
function paintReplay(){const X=REPS[repIdx],T_=repTerrain(X),GW=X.info.gw,ts=T_.ts,run=X.runs[repRun]||X.runs.k2023,arr=run.arrF;const t=repT,recent=X.rp.id==='jacko'?0.25:3;
  T_.begin();for(let y=0;y<T_.TH;y++)for(let x=0;x<T_.TW;x++){const i=((y/ts)|0)*GW+((x/ts)|0),o=(y*T_.TW+x)*4,f=X.fuel[i];
    if(f===1){T_.mix(o,C_WATER,basemap==='sat'&&T_.satBase?.3:.85);continue}if(showFuel)T_.mix(o,FUELC[f],.5);
    const a=arr[i];if(a<=t)T_.mix(o,t-a<recent?C_BURN:C_BURNED,t-a<recent?.95:.78);
    if(X.edge[i])T_.mix(o,C_PERIM,.9)}
  T_.end()}

/* ================= views ================= */
let curT=null;
function showTerrain(T_){[R,C,...REPS.map(x=>x.T).filter(Boolean)].forEach(t=>t.group.visible=(t===T_));attachSat(T_);if(curT!==T_){curT=T_;T_.cam();placeMarkers()}}
function placeMarkers(){ignMark.visible=false;const T_=curT;const s=Math.max(T_.W,T_.D)/110;ignMark.scale.set(s,s,s);
  if(mode==='replay'){const X=REPS[repIdx];const p=T_.world(X.rp.ign[0],X.rp.ign[1]);ignMark.position.set(p.x,p.y+2.2*s,p.z);ignMark.userData.b=p;ignMark.visible=true}
  if(mode==='scen'&&scen.ign){const p=T_.world(scen.ign[0],scen.ign[1]);ignMark.position.set(p.x,p.y+2.2*s,p.z);ignMark.userData.b=p;ignMark.visible=true}}
const tagPool=[];const PRI={town:5,hwy:4,hosp:3,poi:3,place:2,lake:1,warr:0};
function tags(list){list=list.slice().sort((a,b)=>(PRI[b.kind||'town']||0)-(PRI[a.kind||'town']||0));
  while(tagPool.length<list.length){const el=document.createElement('div');el.className='tag';el.innerHTML='<i></i><span></span>';$('labels').appendChild(el);tagPool.push({el,dot:el.querySelector('i'),txt:el.querySelector('span')})}
  tagPool.forEach((t,k)=>{const it=list[k];t.el.style.display=it?'':'none';if(it){t.pos=it.pos;t.el.className='tag '+(it.kind||'town')+(it.arrow?' wind':'');
    if(it.arrow){t.dot.className='wa';t.dot.style.background='';t.dot.innerHTML=`<svg viewBox="0 0 24 24" style="transform:rotate(${((it.arrow.deg??0)+180)%360}deg)"><path d="M12 2L6 14h4v8h4v-8h4z"/></svg>`;t.txt.textContent=`${it.name} ${Math.round(it.arrow.ws)}`}
    else{if(t.dot.className){t.dot.className='';t.dot.innerHTML=''}t.txt.textContent=it.name;t.dot.style.background=(it.kind||'town')==='town'?(it.color||'#5FAF77'):''}t.w=0}else t.pos=null})}
function viewLabels(view,T_){const P=POI[view];if(!P)return [];return P.labels.map(l=>({kind:l.t,name:l.t==='hwy'?l.n:(lang==='zh'&&l.zh?l.zh:l.n),pos:T_.world(Math.max(0,Math.min(T_.GH-1,l.r)),Math.max(0,Math.min(T_.GW-1,l.c)))}))}
const STC={none:'#9AA6A0',safe:'#9AA6A0',flood:'#5AA2EA',watch:'#E6AB3F',hit:'#E25555',order:'#E25555',alert:'#E6AB3F'};
function townStatus(i){if(!scen.arr)return {k:'none'};if(scen.arr[i]<=scen.t)return {k:'hit'};const km=scen.dist[i]/3*R.cx/1000;return km<2?{k:'order',km}:km<6?{k:'alert',km}:{k:'safe',km}}
function refreshTags(){if(mode==='flood')tags(HOODS.map(h=>({pos:C.world(h.r,h.c),name:h[lang],color:STC[floodStatus(h.i).k]})).concat(viewLabels('city',C)));
  else if(mode==='live')tags(TOWNS.map(t=>({pos:R.world(t.r,t.c),name:t.n})).concat(viewLabels('region',R)));
  else if(mode==='scen')tags(TOWNS.map(t=>({pos:R.world(t.r,t.c),name:t.n,color:STC[townStatus(t.i).k]})).concat(viewLabels('region',R)));
  else if(mode==='wx')tags(TOWNS.map(t=>{const g=townWx(t);return {pos:R.world(t.r,t.c),name:t.n,arrow:g&&g.ws!=null?{deg:g.wd,ws:g.ws}:null}}).concat(gridArrows()).concat(viewLabels('region',R).filter(l=>l.kind==='hwy'||l.kind==='lake')));
  else{const X=REPS[repIdx];tags(viewLabels(X.rp.id,repTerrain(X)))}}
