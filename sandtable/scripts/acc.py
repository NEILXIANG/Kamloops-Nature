import sys, asyncio
from playwright.async_api import async_playwright
d=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg=await b.new_page(viewport={'width':1200,'height':800}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file://'+d+'/_preview.html'); await pg.wait_for_timeout(5000)
        res=await pg.evaluate("""()=>{const {spread}=window.__t;const GW=121,GH=121,N=GW*GH;
          const T={GW,GH,N,cx:100,cy:100,H:new Float32Array(N)};const fuel=new Uint8Array(N).fill(2);const out=[];
          for(const WD of [0,45,90,135,180,225,270,315,null]){const hrs=Array.from({length:6},()=>({WS:WD==null?0:30,WD:WD??0,day:true,isi:0.208*Math.exp(0.05039*(WD==null?0:30))*27}));
            const a=spread(T,fuel,[60,60],hrs,0.05);let sx=0,sy=0,n=0,maxN=0,maxS=0,maxE=0,maxW=0;
            for(let r=0;r<GH;r++)for(let c=0;c<GW;c++){const t=a[r*GW+c];if(t<=6){sx+=c-60;sy+=r-60;n++;maxN=Math.max(maxN,60-r);maxS=Math.max(maxS,r-60);maxE=Math.max(maxE,c-60);maxW=Math.max(maxW,60-c)}}
            out.push({windFrom:WD,cells:n,centroidEast:+(sx/n).toFixed(1),centroidSouth:+(sy/n).toFixed(1),reachN:maxN,reachS:maxS,reachE:maxE,reachW:maxW})}
          return out}""")
        for r in res: print(r)
        print('ERRS',errs); await b.close()
asyncio.run(main())
