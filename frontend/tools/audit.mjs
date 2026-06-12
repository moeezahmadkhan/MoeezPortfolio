import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run(label, port, vp, chapters) {
  const b = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', `--window-size=${vp.width+20},${vp.height}`],
  })
  const p = await b.newPage()
  await p.setViewport(vp)
  const errs = []
  p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)) })
  p.on('pageerror', e => errs.push('PAGEERR '+e.message.slice(0,120)))
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 30000 })
  await sleep(1200)
  for (let i=0;i<8;i++){ const gone = await p.evaluate(()=>{const el=document.querySelector('.intro'); if(el){el.click();return false} return true}); if(gone)break; await sleep(500) }
  await sleep(1200)
  // measure live fractions
  await p.evaluate(()=>window.scrollTo(0,0)); await sleep(400)
  const meas = await p.evaluate(()=>{
    const ids=['wizard','spells','conjuring','grimoire','pact','tracker','map','chronicles','owlpost']
    const max=document.documentElement.scrollHeight-window.innerHeight
    return ids.map(id=>{const el=document.getElementById(id); if(!el)return{id,missing:true}; const r=el.getBoundingClientRect(); const top=r.top+window.scrollY; return {id, topFrac:+(top/max).toFixed(3), hVH:+(r.height/window.innerHeight).toFixed(2)}})
  })
  console.log(`\n### ${label} fractions:`)
  meas.forEach(m=>console.log(`  ${m.id}: top=${m.topFrac} h=${m.hVH}vh`))
  for (const [name,f] of chapters) {
    await p.evaluate(ff=>{const max=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo(0,Math.round(ff*max))}, f)
    await sleep(3000)
    await p.screenshot({ path: `.shots/audit/${label}_${name}.png` })
  }
  console.log(`${label} ERRORS:`, JSON.stringify(errs.slice(0,6)))
  await b.close()
}

const DESK = [['hero',0.0],['about',0.092],['spells',0.20],['conjuring',0.40],['grimoire',0.486],['pact',0.58],['tracker',0.70],['map',0.83],['chronicles',0.937],['owlpost',1.0]]
const MOB = [['hero',0.0],['about',0.141],['spells',0.256],['conjuring',0.375],['grimoire',0.501],['pact',0.619],['tracker',0.706],['map',0.799],['chronicles',0.898],['owlpost',0.987]]

await run('desk', 5173, {width:1440,height:900,deviceScaleFactor:1}, DESK)
await run('mob', 5173, {width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}, MOB)
console.log('\nDONE')
