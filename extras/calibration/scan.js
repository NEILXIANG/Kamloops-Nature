const {C,evalCase}=require('./lib.js');
for(const K of [0.03,0.06,0.1,0.15,0.2,0.3,0.5]){const o={};for(const k in C){o[k]=evalCase(C[k],K,'hourly',false).map(r=>Math.round(r.sim))}console.log('K',K,JSON.stringify(o))}
