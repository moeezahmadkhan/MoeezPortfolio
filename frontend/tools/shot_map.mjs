import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome-stable', headless:'new', args:['--use-gl=angle','--use-angle=swiftshader','--window-size=2200,1375'] })
const p = await b.newPage(); await p.setViewport({width:2200,height:1375})
await p.goto('http://localhost:5176/',{waitUntil:'domcontentloaded'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
await p.waitForFunction(()=>!document.querySelector('.preloader'),{timeout:30000}); await sleep(1000)
for(let i=0;i<6;i++){const g=await p.evaluate(()=>{const e=document.querySelector('.intro');if(e){e.click();return false}return true});if(g)break;await sleep(500)}
await sleep(1200)
await p.evaluate(()=>{const m=document.body.scrollHeight-window.innerHeight;window.scrollTo(0,Math.round(0.84*m))})
await sleep(4000)
// burst over time to catch the walker mid-table
for(let i=0;i<5;i++){ await p.screenshot({path:`.shots/map_t${i}.png`}); await sleep(1400) }
await b.close()
