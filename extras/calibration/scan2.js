const {C,evalCase,kvec}=require('./lib.js');
// grass K fit on Jacko (2.5h, 5h) ; then decid K on Bradley 52h with grass fixed; then Rossmoore suppression factor S on K-vector
const j=C.jacko;function fitG(){let lo=.05,hi=1;for(let i=0;i<16;i++){const m=Math.sqrt(lo*hi);const r=evalCase(j,kvec({grass:m,conifer:m,decid:m}),'hourly',false);const e=Math.log(r[0].sim/30)+Math.log(r[1].sim/50);if(e>0)hi=m;else lo=m}return Math.sqrt(lo*hi)}
const Kg=fitG();console.log('Kgrass',Kg,evalCase(j,kvec({grass:Kg,conifer:Kg,decid:Kg}),'hourly',false).map(r=>r.sim.toFixed(1)));
const b=C.bradley;function fitD(){let lo=.01,hi=20;for(let i=0;i<16;i++){const m=Math.sqrt(lo*hi);const r=evalCase(b,kvec({grass:Kg,conifer:Kg,decid:m}),'hourly',false);if(r[0].sim>2603)hi=m;else lo=m}return Math.sqrt(lo*hi)}
const Kd=fitD();console.log('Kdecid',Kd,evalCase(b,kvec({grass:Kg,conifer:Kg,decid:Kd}),'hourly',false).map(r=>r.sim.toFixed(0)));
// Bradley with decid = grass (no fuel fudge): how far off?
console.log('bradley decid=grass',evalCase(b,kvec({grass:Kg,conifer:Kg,decid:Kg}),'hourly',false).map(r=>r.sim.toFixed(0)));
const r=C.ross;function fitS(){let lo=.01,hi=1;for(let i=0;i<16;i++){const m=Math.sqrt(lo*hi);const x=evalCase(r,kvec({grass:Kg*m,conifer:Kg*m,decid:Kg*m}),'hourly',false);if(x[0].sim>1800)hi=m;else lo=m}return Math.sqrt(lo*hi)}
const S=fitS();console.log('Ross S',S,'K eff',Kg*S,evalCase(r,kvec({grass:Kg*S,conifer:Kg*S,decid:Kg*S}),'hourly',false).map(x=>x.sim.toFixed(0)));
