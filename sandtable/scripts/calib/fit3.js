const {C,evalCase,spread,hoursOf,areaAt,sorEq}=require('./lib.js');const fs=require('fs');
const j=C.jacko,r=C.ross,b=C.bradley;
const jr=[{h:2.5,ha:30,w:1}];const rr=r.reports.filter(x=>x.h<=74);
function lossP(p){let L=0;const sj=evalCase({...j,reports:jr},p,'hourly',false);for(const x of sj){const e=Math.log((x.sim+.5)/x.ha);L+=e*e}
  const sr=evalCase({...r,reports:rr},p,'hourly',false);for(const x of sr){const e=Math.log((x.sim+.5)/x.ha);L+=e*e}return L}
let best=null;const t0=Date.now();
for(const k of [0.15,0.2,0.25,0.3,0.4,0.5,0.7])for(const s of [0.03,0.05,0.08,0.12,0.18,0.27,0.4])for(const tau of [2,4,8,16,32,64]){const L=lossP({k,s,tau});if(!best||L<best.L)best={k,s,tau,L}}
console.log('grid best',best,(Date.now()-t0)/1e3,'s');
// refine: coordinate bisection in log space
let p={k:best.k,s:best.s,tau:best.tau};for(let rd=0;rd<3;rd++)for(const g of ['k','s','tau']){let lo=p[g]/1.6,hi=p[g]*1.6;for(let i=0;i<10;i++){const m1=Math.exp(Math.log(lo)*2/3+Math.log(hi)/3),m2=Math.exp(Math.log(lo)/3+Math.log(hi)*2/3);if(lossP({...p,[g]:m1})<lossP({...p,[g]:m2}))hi=m2;else lo=m1}p[g]=Math.sqrt(lo*hi)}
console.log('refined',p,'loss',lossP(p));
const show=(c,p,hold)=>evalCase(c,p,'hourly',hold).map(x=>`${x.h}h:${x.sim.toFixed(0)}/${x.ha}`).join(' ');
console.log('jacko',show(j,p,false));console.log('ross',show(r,p,false));console.log('bradley',show(b,p,false));
for(const [nm,c] of [['ross',r],['bradley',b],['jacko',j]]){const hrs=hoursOf(c,'hourly');const a=spread(c.T,c.fuel,c.ign,hrs,p,hrs.length,Infinity);const se=sorEq(c,a);console.log(nm,'sorEq',se.sor.toFixed(3),'hEq',se.hEq.toFixed(1),'end',areaAt(a,hrs.length,c.cellHa).toFixed(0))}
fs.writeFileSync('fit3.json',JSON.stringify(p));
