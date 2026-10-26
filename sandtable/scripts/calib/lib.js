/* Joint calibration of fuel-group spread coefficients on three fires, with hourly FFMC.
   usage: node calib.js <scratch_dir> [--write]  */
const fs=require('fs');const S=process.argv[2]||'..';const WRITE=process.argv.includes('--write');
const b64=(b)=>Buffer.from(b,'base64');
const u16=b=>{const u=b64(b);return new Uint16Array(u.buffer,u.byteOffset,u.length>>1)};
const u8=b=>new Uint8Array(b64(b));
/* ---- physics (identical to engine.js) ---- */
function fF(ffmc){const m=147.2*(101-ffmc)/(59.5+ffmc);return 91.9*Math.exp(-0.1386*m)*(1+Math.pow(m,5.31)/4.93e7)}
function rsi(cls,isi){const f=(a,b,c)=>a*Math.pow(1-Math.exp(-b*isi),c);
  switch(cls){case 2:return f(250,.035,1.7)*.8;case 3:return f(110,.0282,1.5);case 4:return f(110,.0444,3.0);case 5:return f(110,.0293,1.5);case 6:return f(45,.0305,2.0);
    case 7:return f(30,.0232,1.6)*.2;case 8:return .5*f(110,.0282,1.5)+.5*f(30,.0232,1.6)*.2;case 9:return f(75,.0297,1.3);case 10:return f(250,.035,1.7)*.5;default:return 0}}
function lbr(cls,ws){if(cls===2||cls===10)return ws>=1?1.1*Math.pow(ws,.464):1;return 1+8.729*Math.pow(1-Math.exp(-.030*ws),2.155)}
class Heap{constructor(n){this.k=new Float64Array(n);this.v=new Int32Array(n);this.n=0}
  push(k,v){if(this.n>=this.k.length){const k2=new Float64Array(this.k.length*2),v2=new Int32Array(this.k.length*2);k2.set(this.k);v2.set(this.v);this.k=k2;this.v=v2}
    let i=this.n++;while(i>0){const p=(i-1)>>1;if(this.k[p]<=k)break;this.k[i]=this.k[p];this.v[i]=this.v[p];i=p}this.k[i]=k;this.v[i]=v}
  pop(){const rk=this.k[0],rv=this.v[0];const k=this.k[--this.n],v=this.v[this.n];let i=0;for(;;){let c=2*i+1;if(c>=this.n)break;if(c+1<this.n&&this.k[c+1]<this.k[c])c++;if(this.k[c]>=k)break;this.k[i]=this.k[c];this.v[i]=this.v[c];i=c}this.k[i]=k;this.v[i]=v;this.popK=rk;return rv}}
/* K: number or array[11] of per-class multipliers; until: stop hour; hold: hour after which spread stops (suppression), Infinity = none */
function spread(T,fuel,ign,hours,K,until,hold){
  const {GW,GH,N,cx,cy,H}=T;const NB=[];for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){if(!dr&&!dc)continue;const g=(a,b)=>b?g(b,a%b):a;if(g(Math.abs(dr),Math.abs(dc))===1)NB.push([dr,dc,Math.hypot(dc*cx,dr*cy)])}
  const KO=typeof K==='object'&&!Array.isArray(K)?K:{k:K,s:1,tau:24};const KV=Array.isArray(K)?K:new Array(11).fill(1);const KT=new Float64Array(hours.length);for(let k=0;k<hours.length;k++)KT[k]=Array.isArray(K)?1:KO.k*(KO.s+(1-KO.s)*Math.exp(-(k+.5)/KO.tau));const nH=hours.length,RT=new Float64Array(nH*11),LB=new Float64Array(nH*11),UX=new Float64Array(nH),UY=new Float64Array(nH);
  hours.forEach((w,k)=>{for(let c=0;c<11;c++){RT[k*11+c]=rsi(c,w.isi)*KV[c];LB[k*11+c]=lbr(c,w.WS*(w.day?1:.6))}const th=((w.WD+180)%360)*Math.PI/180;UX[k]=Math.sin(th);UY[k]=Math.cos(th)});
  const stop=Math.min(until??nH,hold??Infinity);
  const arr=new Float64Array(N).fill(Infinity);const s=ign[0]*GW+ign[1];arr[s]=0;const hp=new Heap(1<<16);hp.push(0,s);
  while(hp.n){const i=hp.pop(),t=hp.popK;if(t>arr[i]||t>=stop)continue;const r=(i/GW)|0,c=i-r*GW,hk=Math.min(nH-1,t|0),ux=UX[hk],uy=UY[hk];const fi=fuel[i];
    for(const [dr,dc,dist] of NB){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=GH||cc>=GW)continue;const j=rr*GW+cc,cj=fuel[j];if(cj<2)continue;if(fi<2&&i!==s)continue;
      const ci=fi<2?cj:fi;const rosH=.5*(RT[hk*11+ci]+RT[hk*11+cj])*KT[hk];if(rosH<=0)continue;const lb=.5*(LB[hk*11+ci]+LB[hk*11+cj]),e=Math.sqrt(Math.max(0,1-1/(lb*lb)));
      const cos=(dc*cx*ux+(-dr*cy)*uy)/dist;let ros=rosH*(1-e)/(1-e*cos);const tp=(H[j]-H[i])/dist;ros*=tp>0?Math.exp(3.533*Math.pow(Math.min(tp,.7),1.2)):Math.exp(-1.5*Math.min(-tp,.7));
      const tj=t+dist/ros/60;if(tj<arr[j]&&tj<stop){arr[j]=tj;hp.push(tj,j)}}}
  return arr;
}
/* ---- load cases ---- */
const FA=JSON.parse(fs.readFileSync(S+'/fire_assets.json'));const R2=JSON.parse(fs.readFileSync(S+'/replay2026.json'));const WXH=JSON.parse(fs.readFileSync(__dirname+'/wx_hourly.json'));
function mk(id,rp,reports,finalHa,holdH){const info=rp.info,N=info.gw*info.gh,H=new Float32Array(N),a=u16(rp.dem);for(let i=0;i<N;i++)H[i]=a[i]/10;
  const cx=info.widthM/(info.gw-1),cy=info.heightM/(info.gh-1);
  return {id,T:{GW:info.gw,GH:info.gh,N,cx,cy,H},fuel:u8(rp.fuel),per:u8(rp.perim),ign:rp.ign,reports,finalHa,cellHa:cx*cy/1e4,wxD:(id==='ross'?rp.wx.slice(21):rp.wx),wxH:WXH[id],hold:holdH}}
const C={
 ross:mk('ross',FA.rep,[{h:5,ha:95,w:1},{h:20,ha:210,w:1},{h:27.5,ha:450,w:1},{h:45,ha:1800,w:1},{h:74,ha:2600,w:1},{h:267,ha:4157,w:.5}],11413.3,Infinity),
 bradley:mk('bradley',R2[0],[{h:52,ha:2603,w:1},{h:94,ha:2900,w:0}],2569.2,94),
 jacko:mk('jacko',R2[1],[{h:2.5,ha:30,w:1},{h:5,ha:50,w:1},{h:7.5,ha:44,w:0}],44.3,7.5)};
const isDay=t=>{const h=+t.slice(6,8);return h>=9&&h<21};
const hoursOf=(c,mode)=>mode==='daily'?c.wxD.map(w=>({WS:w.WS,WD:w.WD,isi:w.isi,day:isDay(w.t)})):c.wxH.map(w=>({WS:w.WS,WD:w.WD,isi:0.208*Math.exp(0.05039*w.WS)*fF(w.ffmc_h),day:isDay(w.t)}));
function fuelShare(c){const n=new Array(11).fill(0);let tot=0;for(let i=0;i<c.T.N;i++)if(c.per[i]){n[c.fuel[i]]++;tot++}return n.map(x=>+(x/tot).toFixed(3))}
for(const k in C)console.log(k,'fuel share inside perimeter [0..10]',fuelShare(C[k]).join(' '));
/* ---- evaluation ---- */
function areaAt(arr,h,cellHa){let n=0;for(let i=0;i<arr.length;i++)if(arr[i]<=h)n++;return n*cellHa}
function sorEq(c,arr){const fin=Array.from(arr).filter(Number.isFinite).sort((a,b)=>a-b);const nEq=Math.round(c.finalHa/c.cellHa);const hEq=fin.length?fin[Math.min(nEq,fin.length-1)]:0;
  let inter=0,sim=0,per=0;for(let i=0;i<arr.length;i++){const s=arr[i]<=hEq,p=!!c.per[i];if(s)sim++;if(p)per++;if(s&&p)inter++}return {hEq,sor:2*inter/(sim+per)}}
const GROUP={grass:[2,10],conifer:[3,4,5,6,9],decid:[7]};
function kvec(p){const v=new Array(11).fill(0);for(const i of GROUP.grass)v[i]=p.grass;for(const i of GROUP.conifer)v[i]=p.conifer;for(const i of GROUP.decid)v[i]=p.decid;v[8]=.5*(p.conifer+p.decid);return v}
function evalCase(c,K,mode,withHold){const hrs=hoursOf(c,mode);const last=Math.max(...c.reports.map(r=>r.h))+1;const arr=spread(c.T,c.fuel,c.ign,hrs,K,last,withHold?c.hold:Infinity);
  return c.reports.map(r=>({...r,sim:areaAt(arr,r.h,c.cellHa)}))}
function loss(p,mode){let L=0;for(const k in C){const c=C[k];for(const r of evalCase(c,kvec(p),mode,false)){if(!r.w)continue;const e=Math.log((r.sim+0.5)/r.ha);L+=r.w*e*e}}return L}

module.exports={C,spread,evalCase,kvec,loss,areaAt,sorEq,hoursOf,fF};
