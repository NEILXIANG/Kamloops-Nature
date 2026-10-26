import asyncio
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/ae08b3d9-2d3e-5b69-afa5-917fade5c242/scratchpad/numi'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':390,'height':780}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('con:'+m.text) if m.type=='error' else None)
        await pg.goto('file://'+D+'/numi.html'); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=D+'/s1_start.png')
        await pg.evaluate("document.getElementById('t-start').click()"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=D+'/s2_board.png')
        # pick piece 1, place somewhere
        await pg.evaluate("document.querySelectorAll('.piece')[0].click()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=D+'/s3_sel.png')
        state=await pg.evaluate("""(() => {
          const pieces = [...document.querySelectorAll('.piece')].map(p => ({n: p.dataset.n, sel: p.classList.contains('sel')}));
          const legal = document.querySelectorAll('.cell.legal').length;
          return {pieces, legal};
        })()""")
        print('state',state)
        # play a few random moves
        for turn in range(30):
            res=await pg.evaluate("""(() => {
              const ps = [...document.querySelectorAll('.piece')];
              let pi=-1;
              for(let i=0;i<ps.length;i++) if(ps[i].dataset.n && !ps[i].classList.contains('used') && !ps[i].classList.contains('dead')) { pi=i; break; }
              if(pi<0) return {done:true};
              ps[pi].click();
              const legal=[...document.querySelectorAll('.cell.legal')];
              if(!legal.length) return {dead:true, pi, n:ps[pi].dataset.n};
              legal[Math.random()*legal.length|0].click();
              return {placed:true, pi};
            })()""")
            await pg.wait_for_timeout(650)
            if await pg.evaluate("document.getElementById('over').classList.contains('on')"):
                print('game over at turn',turn,'score=',await pg.evaluate("document.getElementById('score').textContent"))
                break
        await pg.screenshot(path=D+'/s4_mid.png')
        if await pg.evaluate("document.getElementById('over').classList.contains('on')"):
            await pg.screenshot(path=D+'/s5_over.png')
        print('errs:',errs[:5])
        # desktop too
        pg2=await b.new_page(viewport={'width':1280,'height':820})
        await pg2.goto('file://'+D+'/numi.html'); await pg2.wait_for_timeout(1800)
        await pg2.screenshot(path=D+'/s6_desktop.png')
        await pg2.evaluate("document.getElementById('t-start').click()"); await pg2.wait_for_timeout(400)
        await pg2.screenshot(path=D+'/s7_desktop.png')
        await b.close()
asyncio.run(main())
