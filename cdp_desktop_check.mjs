/** 桌面端回归：确认大屏布局不受手机端媒体查询影响 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9362
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = (fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken','utf8').trim() : '')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-d-'))
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
  const evaluate=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.value}
  await send('Page.enable');await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
  if (TOKEN) { await send('Network.enable'); await send('Network.setCookie',{name:'Shop-Token',value:TOKEN,url:BASE+'/',path:'/'}) }
  let pass=0,fail=0
  const check=(n,c,d)=>{console.log((c?'PASS':'FAIL')+'  '+n+'  '+d);c?pass++:fail++}

  // detail 页：大图应恢复 380x320
  await send('Page.navigate',{url:BASE+'/shop/pet/1'}); await sleep(4500)
  let o = JSON.parse(await evaluate(`(()=>{const img=document.querySelector('.big-photo');const rc=img?img.getBoundingClientRect():{width:0,height:0};return JSON.stringify({w:Math.round(rc.width),h:Math.round(rc.height),sw:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth})})()`))
  check('detail 桌面大图 380x320', o.w>=370&&o.w<=390&&o.h>=310&&o.h<=330, `${o.w}x${o.h}`)
  check('detail 桌面无溢出', o.sw<=o.vw+1, `sw=${o.sw}`)

  // food 页：多列
  await send('Page.navigate',{url:BASE+'/shop/food'}); await sleep(4200)
  let cols = await evaluate(`getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length`)
  check('food 桌面多列(>=3)', Number(cols)>=3, `cols=${cols}`)

  // home 楼层多列
  await send('Page.navigate',{url:BASE+'/shop/home'}); await sleep(4200)
  cols = await evaluate(`[...document.querySelectorAll('.grid')].map(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length).join(',')`)
  check('home 楼层桌面多列(>=3)', cols.split(',').every(c=>Number(c)>=3), `cols=${cols}`)
  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
  ws.close();chrome.kill();setTimeout(()=>process.exit(fail?1:0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
