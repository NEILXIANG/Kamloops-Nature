import asyncio,sys
from playwright.async_api import async_playwright
import os
d=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','dist'))
JS="""()=>{const ids=['.searchbox','.lang','#layers','#chips','#place','#modecard','#windrose','.rail','#timeline','#status','#lpanel'];const out=[];const R={};
for(const s of ids){const e=document.querySelector(s);if(!e||e.hidden||e.offsetParent===null&&getComputedStyle(e).position!=='absolute')continue;const r=e.getBoundingClientRect();if(r.width===0)continue;R[s]=r}
const k=Object.keys(R);for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){const a=R[k[i]],b=R[k[j]];const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>2&&oy>2)out.push(k[i]+' x '+k[j]+' '+Math.round(ox)+'x'+Math.round(oy))}
return out}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        for vw,vh in [(1280,820),(1000,640),(820,700)]:
            pg=await b.new_page(viewport={'width':vw,'height':vh})
            await pg.goto('file://'+d+'/_preview.html'); await pg.wait_for_timeout(4000)
            for m in ['live','scen','replay','flood']:
                await pg.evaluate(f"document.getElementById('tab-{m}').click()"); await pg.wait_for_timeout(1500)
                await pg.mouse.move(vw*0.6,vh*0.5); await pg.wait_for_timeout(300)
                if m=='scen': await pg.evaluate("document.querySelector('#stage canvas').dispatchEvent(new PointerEvent('pointerdown',{clientX:%d,clientY:%d,bubbles:true}));document.querySelector('#stage canvas').dispatchEvent(new PointerEvent('pointerup',{clientX:%d,clientY:%d,bubbles:true}))"%(vw*0.6,vh*0.5,vw*0.6,vh*0.5)); await pg.wait_for_timeout(500)
                r=await pg.evaluate(JS); print(vw,vh,m,r, await pg.evaluate("JSON.stringify(document.querySelector('#status').getBoundingClientRect())+[...document.querySelector('#status').children].map(e=>Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)+':'+e.innerText.replace(String.fromCharCode(10),' '))"))
                if vw==1000 and m=='scen': await pg.screenshot(path=f'{d}/s3_1000_scen.png')
                if vw==390 and vh==660 and m=='replay': await pg.screenshot(path=f'{d}/s3_390_replay.png')
            await pg.evaluate("document.getElementById('b-layers').click()"); await pg.wait_for_timeout(300); print(vw,vh,'layers',await pg.evaluate(JS))
            await pg.close()
        await b.close()
asyncio.run(main())
