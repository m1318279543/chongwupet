/** 手机端登录并量测登录态页面图片尺寸 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 390, H = 844
const PORT = 9359
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PAGES = (process.argv[3] || '/shop/favorite,/shop/appointment,/shop/order,/shop/match').split(',')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-login-'))
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

  // 直接调 API 登录拿 token（跳过验证码：后端 captchaEnabled 关闭？尝试 captchaImage）
  const cap = { }
  let token
  if (false) {
    console.log('需要验证码，尝试 ry/123456 带码…无法取码则失败')
    process.exit(2)
  } else {
    const r = { token: fs.readFileSync('.rytoken','utf8').trim() }
    token = r.token
    console.log('login token:', token ? 'OK' : JSON.stringify(r))
  }
  if (!token) process.exit(2)
  await send('Network.enable')
  await send('Network.setCookie', { name:'Shop-Token', value:token, url:BASE+'/', path:'/' })

  for(const p of PAGES){
    await send('Page.navigate',{url:BASE+p})
    await sleep(4500)
    await evaluate(`window.scrollTo(0, document.body.scrollHeight)`)
    await sleep(1500)
    const r = await evaluate(`(() => {
      const vh = innerHeight
      const out = []
      document.querySelectorAll('img').forEach(img => {
        const r = img.getBoundingClientRect()
        if (r.width < 20 || r.height < 20) return
        out.push({ w: Math.round(r.width), h: Math.round(r.height), vhPct: Math.round(r.height/vh*100), cls: (img.className||'').slice(0,30) })
      })
      return JSON.stringify({ path: location.pathname, vh, imgs: out.slice(0,10) })
    })()`)
    const o = JSON.parse(r || '{}')
    console.log('== ' + p + '  path=' + o.path + '  vh=' + o.vh)
    for (const i of (o.imgs||[])) console.log('   ', JSON.stringify(i))
  }
  ws.close();chrome.kill();setTimeout(()=>process.exit(0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
