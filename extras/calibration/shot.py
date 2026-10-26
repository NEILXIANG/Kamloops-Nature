import asyncio,os,sys
from playwright.async_api import async_playwright
d=os.path.abspath(sys.argv[1])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg=await b.new_page(viewport={'width':1280,'height':900});errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file://'+d+'/_preview.html');await pg.wait_for_timeout(6000)
        async def click(sel): await pg.evaluate(f"document.querySelector('{sel}').click()");await pg.wait_for_timeout(700)
        await click('#tab-replay')
        await pg.wait_for_timeout(1500);await pg.screenshot(path=d+'/v6_replay_jacko.png')
        await pg.evaluate("document.getElementById('r-kev').click()");await pg.wait_for_timeout(800);await pg.screenshot(path=d+'/v6_replay_jacko_free.png')
        await pg.evaluate("const s=document.getElementById('r-pick');s.value='2';s.dispatchEvent(new Event('change'))");await pg.wait_for_timeout(2500);await pg.screenshot(path=d+'/v6_replay_ross.png')
        await click('#b-info');await pg.wait_for_timeout(800);await pg.evaluate("document.getElementById('dr-body').scrollTop=600");await pg.wait_for_timeout(300);await pg.screenshot(path=d+'/v6_drawer.png')
        print('ERRS',errs)
        await b.close()
asyncio.run(main())
