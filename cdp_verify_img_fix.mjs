/** 验证手机端图片缩小修复：尺寸量测 + 截图 + 溢出检查 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 390, H = 844
const PORT = 9361
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = (fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken','utf8').trim() : '')
const PAGES = [['detail','/shop/pet/1'],['food','/shop/food'],['home','/shop/home']]

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-v-'))
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)return}catch{}await sleep(250)}throw new Error('CDP 未就绪')}
async function newTab(){for(const m of['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok)return await r.json()}catch{}}throw new Error('tab fail')}
const connect=(url)=>new Promise((res,rej)=>{const ws=new WebSocket(url);ws.addEventListener('open',()=>res(ws));ws.addEventListener('error',rej)})

;(async()=>{
  await waitCdp()
  const tab=await newTab()
  const ws=await connect(tab.webSocketDebuggerUrl)
  let id=0;const pending=new Map()
  ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id)}})
  const send=(method,params={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}))})
  const evaluate=async(expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});return r.result?.value}
  await send('Page.enable');await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:2,mobile:true})
  if (TOKEN) { await send('Network.enable'); await send('Network.setCookie',{name:'Shop-Token',value:TOKEN,url:BASE+'/',path:'/'}) }

  let pass=0, fail=0
  const check=(name,cond,detail)=>{ console.log((cond?'PASS':'FAIL')+'  '+name+'  '+detail); cond?pass++:fail++ }

  for(const [name,p] of PAGES){
    await send('Page.navigate',{url:BASE+p})
    await sleep(4500)
    await evaluate(`window.scrollTo(0, document.body.scrollHeight)`); await sleep(1200)
    await evaluate(`window.scrollTo(0, 0)`); await sleep(400)
    const r = await evaluate(`(() => {
      const vw = document.documentElement.clientWidth, vh = innerHeight
      const imgs = []
      document.querySelectorAll('img').forEach(img=>{
        const rc = img.getBoundingClientRect()
        if (rc.width<20||rc.height<20) return
        imgs.push({w:Math.round(rc.width),h:Math.round(rc.height),vhPct:Math.round(rc.height/vh*100),cls:(img.className||'').slice(0,24)})
      })
      return JSON.stringify({path:location.pathname,vw,scrollW:document.documentElement.scrollWidth,vh,imgs:imgs.slice(0,8)})
    })()`)
    const o = JSON.parse(r||'{}')
    console.log(`\n== ${name} (${p})  path=${o.path} vw=${o.vw} scrollW=${o.scrollW} vh=${o.vh}`)
    for (const i of o.imgs) console.log('    img', JSON.stringify(i))
    check(`${name} 无横向溢出`, o.scrollW <= o.vw + 1, `scrollW=${o.scrollW} vw=${o.vw}`)
    const big = o.imgs.filter(i => i.vhPct > 40)
    check(`${name} 无超过 40% 屏高的图`, big.length === 0, big.length ? JSON.stringify(big) : '最大 ' + Math.max(0,...o.imgs.map(i=>i.vhPct)) + '%vh')
    const shot = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
    fs.writeFileSync(`fix-m-${name}.png`, Buffer.from(shot.data,'base64'))
  }
  // food/home 两列断言
  await send('Page.navigate',{url:BASE+'/shop/food'}); await sleep(4200)
  const cols = await evaluate(`(() => {
    const g = document.querySelector('.grid')
    return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0
  })()`)
  check('food 手机端两列', cols === 2, `cols=${cols}`)
  await send('Page.navigate',{url:BASE+'/shop/home'}); await sleep(4200)
  const hcols = await evaluate(`(() => {
    const gs = [...document.querySelectorAll('.grid')].map(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length)
    return gs.join(',')
  })()`)
  check('home 宠物楼层两列', hcols.split(',').every(c=>c==='2'), `cols=${hcols}`)
  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
  ws.close();chrome.kill();setTimeout(()=>process.exit(fail?1:0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
