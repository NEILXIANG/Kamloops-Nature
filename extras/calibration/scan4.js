const {C,evalCase,spread,hoursOf,areaAt,sorEq}=require('./lib.js');
const j=C.jacko,r=C.ross,b=C.bradley;
for(const K of [0.1,0.15,0.2,0.3,0.4]){console.log('K',K,'jacko',evalCase(j,{k:K,s:1,tau:24},'hourly',false).map(x=>x.sim.toFixed(0)).join(' '),'ross',evalCase(r,{k:K,s:1,tau:24},'hourly',false).map(x=>x.sim.toFixed(0)).join(' '),'bradley',evalCase(b,{k:K,s:1,tau:24},'hourly',false).map(x=>x.sim.toFixed(0)).join(' '))}
console.log('targets jacko 30 50 44 | ross 95 210 450 1800 2600 4157 | bradley 2603 2900');
