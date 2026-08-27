import puppeteer from 'puppeteer-core'
const W=Number(process.env.W||1440), H=Number(process.env.H||900)
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome-stable', headless:'new',
  args:['--use-gl=angle','--no-sandbox',`--window-size=${W+20},${H}`] })
const p = await b.newPage()
await p.setViewport({ width:W, height:H, isMobile:W<500, hasTouch:W<500 })
await p.goto(`http://localhost:${process.env.PORT||5173}/`, { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout:40000 }).catch(()=>{})
await new Promise(r=>setTimeout(r,5000))
for (const [n,f] of Object.entries(JSON.parse(process.env.MARKS||'{}'))) {
  await p.evaluate((f)=>window.scrollTo(0,(document.body.scrollHeight-innerHeight)*f), f)
  await new Promise(r=>setTimeout(r,2200))
  await p.screenshot({ path:`/tmp/s-${process.env.TAG||'d'}-${n}.png` })
}
await b.close(); console.log('ok')
