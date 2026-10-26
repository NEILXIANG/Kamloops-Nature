import asyncio,os,sys
from playwright.async_api import async_playwright
d=os.path.abspath(sys.argv[1]);W=int(sys.argv[2]) if len(sys.argv)>2 else 1280;H=int(sys.argv[3]) if len(sys.argv)>3 else 900
async def main():
    async with async_playwright() as p:
        proxy=os.environ.get('HTTPS_PROXY')
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],proxy={'server':proxy} if proxy else None)
        ctx=await b.new_context(viewport={'width':W,'height':H},ignore_https_errors=True)
        pg=await ctx.new_page();errs=[];fails=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        pg.on('requestfailed',lambda r: fails.append(r.url[:120]+' '+str(r.failure)))
        await pg.goto('file://'+d+'/_preview.html');await pg.wait_for_timeout(5000)
        await pg.evaluate("document.getElementById('tab-wx').click()");await pg.wait_for_timeout(16000)
        await pg.screenshot(path=d+'/v7_wx.png')
        st=await pg.evaluate("({alerts:$('alerts').hidden,st:$('st-txt').textContent,chips:[...document.querySelectorAll('.srcchip')].map(x=>x.textContent),tags:[...document.querySelectorAll('.tag.wind')].slice(0,5).map(x=>x.textContent),tl:$('tl-label').textContent})".replace('$(',"document.getElementById("))
        print('STATE',st)
        await pg.evaluate("const s=document.getElementById('tl');s.value='12';s.dispatchEvent(new Event('input'))");await pg.wait_for_timeout(9000)
        await pg.screenshot(path=d+'/v7_wx_12h.png')
        await pg.evaluate("[...document.querySelectorAll('.fchip')].find(b=>b.dataset.l==='rain').click()");await pg.wait_for_timeout(9000)
        await pg.screenshot(path=d+'/v7_wx_rain.png')
        await pg.evaluate("[...document.querySelectorAll('.fchip')].find(b=>b.dataset.l==='radar').click()");await pg.wait_for_timeout(9000)
        await pg.screenshot(path=d+'/v7_wx_radar.png')
        await pg.evaluate("document.getElementById('b-official').click()");await pg.wait_for_timeout(500)
        await pg.screenshot(path=d+'/v7_official.png')
        await pg.evaluate("document.getElementById('b-official').click();document.getElementById('l-en').click()");await pg.wait_for_timeout(1500)
        await pg.screenshot(path=d+'/v7_wx_en.png')
        print('ERRS',errs[:12]);print('FAILS',fails[:12])
        await b.close()
asyncio.run(main())
