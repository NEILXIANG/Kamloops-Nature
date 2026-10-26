const {C,spread,evalCase,kvec,loss,areaAt,sorEq,hoursOf}=require('./lib.js');const fs=require('fs');const WRITE=process.argv.includes('--write');
/* ---- fit: each group's coefficient is identified mostly by one fire; coordinate descent in log space ---- */
function fit(mode){let p={grass:.2,conifer:.06,decid:.06};let best=loss(p,mode);
  for(let round=0;round<6;round++){for(const g of ['grass','conifer','decid']){let lo=p[g]/8,hi=p[g]*8;for(let it=0;it<14;it++){const m1=Math.exp(Math.log(lo)*2/3+Math.log(hi)/3),m2=Math.exp(Math.log(lo)/3+Math.log(hi)*2/3);
      const l1=loss({...p,[g]:m1},mode),l2=loss({...p,[g]:m2},mode);if(l1<l2)hi=m2;else lo=m1}p[g]=Math.sqrt(lo*hi);best=loss(p,mode)}
    console.log(mode,'round',round,JSON.stringify(p),'loss',best.toFixed(4))}
  return p}
const MODE=process.argv.includes('--daily')?'daily':'hourly';
const p=fit(MODE);
const out={mode:MODE,K:p,KV:kvec(p),cases:{}};
for(const k in C){const c=C[k];const hrs=hoursOf(c,MODE);const nH=hrs.length;
  const arrFree=spread(c.T,c.fuel,c.ign,hrs,kvec(p),nH,Infinity);const arrHold=spread(c.T,c.fuel,c.ign,hrs,kvec(p),nH,c.hold);
  const rep=c.reports.map(r=>({label:r.h,ha:r.ha,sim:+areaAt(arrFree,r.h,c.cellHa).toFixed(1),simHold:+areaAt(arrHold,r.h,c.cellHa).toFixed(1)}));
  const se=sorEq(c,arrFree);out.cases[k]={reports:rep,sorEq:+se.sor.toFixed(3),hEq:+se.hEq.toFixed(1),end:+areaAt(arrFree,nH,c.cellHa).toFixed(0),endHold:+areaAt(arrHold,nH,c.cellHa).toFixed(0)};
  console.log(k,JSON.stringify(out.cases[k]))}
if(WRITE)fs.writeFileSync(__dirname+`/fit_${MODE}.json`,JSON.stringify(out,null,1));
