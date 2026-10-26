const {C,evalCase,spread,hoursOf,areaAt,sorEq}=require('./lib.js');
const j=C.jacko,r=C.ross,b=C.bradley;const TAU=24;
function bis(f,lo,hi){for(let i=0;i<18;i++){const m=Math.sqrt(lo*hi);if(f(m)>0)hi=m;else lo=m}return Math.sqrt(lo*hi)}
const K0=bis(m=>evalCase(j,{k:m,s:1,tau:TAU},'hourly',false)[0].sim-30,.05,2);
console.log('K0',K0.toFixed(4),'jacko',evalCase(j,{k:K0,s:1,tau:TAU},'hourly',false).map(x=>x.sim.toFixed(1)),'hold',evalCase(j,{k:K0,s:1,tau:TAU},'hourly',true).map(x=>x.sim.toFixed(1)));
const S=bis(m=>evalCase(r,{k:K0,s:m,tau:TAU},'hourly',false)[0].sim-1800,.005,1);
console.log('S',S.toFixed(4),'ross',evalCase(r,{k:K0,s:S,tau:TAU},'hourly',false).map(x=>x.sim.toFixed(0)));
console.log('bradley free',evalCase(b,{k:K0,s:1,tau:TAU},'hourly',false).map(x=>x.sim.toFixed(0)),'with S',evalCase(b,{k:K0,s:S,tau:TAU},'hourly',false).map(x=>x.sim.toFixed(0)));
// Sorensen for ross full run
const hrs=hoursOf(r,'hourly');const arr=spread(r.T,r.fuel,r.ign,hrs,{k:K0,s:S,tau:TAU},hrs.length,Infinity);console.log('ross sorEq',sorEq(r,arr),'end',areaAt(arr,hrs.length,r.cellHa).toFixed(0));
const hb=hoursOf(b,'hourly');const ab=spread(b.T,b.fuel,b.ign,hb,{k:K0,s:S,tau:TAU},hb.length,Infinity);console.log('bradley sorEq',sorEq(b,ab));
const hj=hoursOf(j,'hourly');const aj=spread(j.T,j.fuel,j.ign,hj,{k:K0,s:1,tau:TAU},hj.length,Infinity);console.log('jacko sorEq',sorEq(j,aj));
require('fs').writeFileSync('fit2.json',JSON.stringify({K0,S,TAU}));
