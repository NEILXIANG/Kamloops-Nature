import sys, asyncio
from playwright.async_api import async_playwright
import os
d=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','dist'))
mobile='mobile' in sys.argv
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        vp={'width':390,'height':780} if mobile else {'width':1280,'height':820}
        pg=await b.new_page(viewport=vp); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await pg.goto('file://'+d+'/_preview.html'); await pg.wait_for_timeout(6000)
        async def click(sel): await pg.evaluate(f"document.querySelector('{sel}').click()"); await pg.wait_for_timeout(600)
        async def txt(sel): return (await pg.evaluate(f"(document.querySelector('{sel}')||{{innerText:'<none>'}}).innerText")).strip()[:160]
        sfx='_m' if mobile else ''
        print('LIVE title:',await txt('#mc-title'),'|',await txt('#mc-sub'))
        print('status:',await txt('#status'))
        print('fires in card:',await pg.evaluate("document.querySelectorAll('#mc-body .list li').length"))
        await pg.screenshot(path=f'{d}/s3_live{sfx}.png')
        # search
        await pg.fill('#q','Merritt'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1200)
        print('place:',await txt('#pl-name'),'| hidden=',await pg.evaluate("document.getElementById('place').hidden"))
        await pg.screenshot(path=f'{d}/s3_search{sfx}.png')
        await click('#pl-close')
        # layers
        await click('#b-layers'); print('lpanel hidden=',await pg.evaluate("document.getElementById('lpanel').hidden"))
        await pg.screenshot(path=f'{d}/s3_layers{sfx}.png'); await click('#b-layers')
        # scenario
        await click('#tab-scen'); await pg.wait_for_timeout(500)
        print('SCEN:',await txt('#mc-title'),'| timeline hidden=',await pg.evaluate("document.getElementById('timeline').hidden"))
        for i in range(40):
            if await pg.evaluate("document.getElementById('progress').hidden"): break
            await pg.wait_for_timeout(500)
        print('scen done after',i*0.5,'s; area:',await pg.evaluate("document.querySelectorAll('#mc-body .stat b')[0].innerText"),'| tl:',await txt('#tl-label'))
        await pg.screenshot(path=f'{d}/s3_scen{sfx}.png')
        await pg.evaluate("const t=document.getElementById('tl');t.value='6';t.dispatchEvent(new Event('input'))"); await pg.wait_for_timeout(600)
        print('scen t=6 area:',await pg.evaluate("document.querySelectorAll('#mc-body .stat b')[0].innerText"),'| tl:',await txt('#tl-label'))
        # click map to look
        await pg.mouse.move(640,400); await pg.mouse.down(); await pg.mouse.up(); await pg.wait_for_timeout(700)
        print('place after click:',await txt('#pl-name'),'|',(await txt('#pl-body'))[:100].replace('\n',' / '))
        await pg.screenshot(path=f'{d}/s3_scen_place{sfx}.png')
        # replay
        await click('#tab-replay'); await pg.wait_for_timeout(1500)
        print('REPLAY:',await txt('#mc-title'),'|',await txt('#mc-sub'),'| tl:',await txt('#tl-label'))
        await pg.screenshot(path=f'{d}/s3_replay{sfx}.png')
        await pg.evaluate("const s=document.getElementById('r-pick');s.value='2';s.dispatchEvent(new Event('change'))"); await pg.wait_for_timeout(1500)
        print('REPLAY 3rd:',await txt('#mc-sub'),'| tl:',await txt('#tl-label'))
        await click('#tl-play'); await pg.wait_for_timeout(1500); print('play icon:',await txt('#tl-icon'),'tl:',await txt('#tl-label')); await click('#tl-play')
        await pg.screenshot(path=f'{d}/s3_replay2{sfx}.png')
        # flood
        await click('#tab-flood'); await pg.wait_for_timeout(1200)
        print('FLOOD:',await txt('#mc-title'),'| stats:',await pg.evaluate("[...document.querySelectorAll('#mc-body .stat b')].map(b=>b.innerText).join(' / ')"))
        await pg.evaluate("const t=document.getElementById('f-rise');t.value='12';t.dispatchEvent(new Event('input'))"); await pg.wait_for_timeout(600)
        print('flood 12m:',await pg.evaluate("[...document.querySelectorAll('#mc-body .stat b')].map(b=>b.innerText).join(' / ')"))
        await pg.screenshot(path=f'{d}/s3_flood{sfx}.png')
        # drawer
        await click('#b-info'); print('drawer hidden=',await pg.evaluate("document.getElementById('drawer').hidden"),'| h3s:',await pg.evaluate("document.querySelectorAll('#dr-body h3').length"))
        await pg.screenshot(path=f'{d}/s3_drawer{sfx}.png'); await click('#dr-close')
        # english
        await click('#l-en'); await click('#tab-live'); await pg.wait_for_timeout(800)
        print('EN:',await txt('#mc-title'),'|',await txt('#tab-scen'),'|',await txt('#status'))
        await click('#b-view'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f'{d}/s3_en_top{sfx}.png')
        if mobile:
            await click('#handle'); await pg.wait_for_timeout(500); await pg.screenshot(path=f'{d}/s3_sheet_m.png')
        print('ERRS',errs[:5]); await b.close()
asyncio.run(main())
