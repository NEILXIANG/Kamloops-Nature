/* Rebuild replay assets with the v0.6 model: hourly FFMC, K(t)=K0(S+(1-S)e^(-t/tau)), hold at official control time.
   writes <scratch>/replays_v2.json  (array: jacko, bradley, ross) */
const {C,spread,hoursOf,areaAt,sorEq,fF}=require('./lib.js');const fs=require('fs');const S=process.argv[2]||'..';
const P=JSON.parse(fs.readFileSync(__dirname+'/fit3.json'));const K0=+P.k.toFixed(3),SS=+P.s.toFixed(3),TAU=+P.tau.toFixed(1);
const FA=JSON.parse(fs.readFileSync(S+'/fire_assets.json'));const R2=JSON.parse(fs.readFileSync(S+'/replay2026.json'));
const META={
 jacko:{src:R2[1],name:'Jacko Lake 2026',t0:'2026-08-22 12:00',tscale:600,curveStep:0.25,hold:7.5,reports:[{h:2.5,ha:30,label:'14:30'},{h:5,ha:50,label:'17:00'},{h:7.5,ha:44,label:'19:30 held'}],station:'KAMLOOPS A'},
 bradley:{src:R2[0],name:'Bradley Creek 2026',t0:'2026-07-31 14:00',tscale:10,curveStep:3,hold:94,reports:[{h:52,ha:2603,label:'2026-08-02'},{h:94,ha:2900,label:'2026-08-04'}],station:'VERNON AUTO'},
 ross:{src:FA.rep,name:'Rossmoore Lake 2023',t0:'2023-07-21 13:00',tscale:10,curveStep:6,hold:Infinity,reports:[{h:5,ha:95,label:'07-21 18:00'},{h:20,ha:210,label:'07-22 09:00'},{h:27.5,ha:450,label:'07-22 16:30'},{h:45,ha:1800,label:'07-23 10:00'},{h:74,ha:2600,label:'07-24 15:00'},{h:267,ha:4157,label:'08-01'}],station:'KAMLOOPS A'}};
const enc=(arr,ts)=>{const o=new Uint16Array(arr.length);for(let i=0;i<arr.length;i++)o[i]=Number.isFinite(arr[i])?Math.min(65534,Math.round(arr[i]*ts)):65535;return Buffer.from(o.buffer).toString('base64')};
const out=[];
for(const id of ['jacko','bradley','ross']){const c=C[id],m=META[id];const hrs=hoursOf(c,'hourly');const nH=hrs.length;
  const wx=c.wxH.map((w,k)=>({t:w.t,T:w.T,RH:w.RH,WS:w.WS,WD:w.WD,ffmc:w.ffmc_h,isi:+hrs[k].isi.toFixed(2),rain:w.rain||0}));
  const pack=(arr,K,hold)=>{const se=sorEq(c,arr);const rep=m.reports.map(r=>({label:r.label,ha:r.ha,h:r.h,sim:+areaAt(arr,r.h,c.cellHa).toFixed(1)}));
    const curve=[];for(let x=0;x<=nH+1e-9;x+=m.curveStep)curve.push(+areaAt(arr,x,c.cellHa).toFixed(1));
    return {metrics:{K:K.k,S:K.s,tau:K.tau,hold:Number.isFinite(hold)?hold:null,h_eq:+se.hEq.toFixed(1),sor_eq:+se.sor.toFixed(3),end:+areaAt(arr,nH,c.cellHa).toFixed(0),rep_sim:rep},curve,arr:enc(arr,m.tscale)}};
  const Km={k:K0,s:SS,tau:TAU},Kf={k:K0,s:1,tau:TAU};
  const runs={model:pack(spread(c.T,c.fuel,c.ign,hrs,Km,nH,m.hold),Km,m.hold),free:pack(spread(c.T,c.fuel,c.ign,hrs,Kf,nH,Infinity),Kf,Infinity)};
  console.log(id,JSON.stringify({model:runs.model.metrics,free:{end:runs.free.metrics.end,sor:runs.free.metrics.sor_eq,rep:runs.free.metrics.rep_sim.map(r=>r.sim)}}));
  out.push({id,name:m.name,info:m.src.info,dem:m.src.dem,fuel:m.src.fuel,perim:m.src.perim,runs,tscale:m.tscale,ign:m.src.ign,t0:m.t0,wx,
    metrics:{perim_ha:+(Array.from(c.per).reduce((a,b)=>a+b,0)*c.cellHa).toFixed(1),final_ha:c.finalHa},reports:m.reports,curveStep:m.curveStep,station:m.station,hold:Number.isFinite(m.hold)?m.hold:null});}
fs.writeFileSync(S+'/replays_v2.json',JSON.stringify(out));fs.writeFileSync(__dirname+'/model_params.json',JSON.stringify({K0,S:SS,tau:TAU}));
console.log('params',K0,SS,TAU,'bytes',fs.statSync(S+'/replays_v2.json').size);
