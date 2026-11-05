/** 种子数据视觉验收：宠物评论 / 我的订单 / 数据看板 */
import { spawn, execSync, execFileSync } from 'node:child_process'
import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe', BASE=process.argv[2]||'http://127.0.0.1:82', W=1360,H=1000,PORT=9405
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function tok(user, pwd){
  const cap = await (await fetch(BASE + '/dev-api/captchaImage')).json()
  const uuid = cap.uuid
  let code
  if (BASE.includes('47.116.73.25')) code = execFileSync('python',['deploy/ssh_run.py',`redis-cli --no-raw GET captcha_codes:${uuid}`],{encoding:'utf8'})
  else code = execFileSync('D:/Redis/redis-cli.exe',['--no-raw','GET',`captcha_codes:${uuid}`],{encoding:'utf8'})
  code = code.replace(/[\\"]/g,'').trim()
  const j = await (await fetch(BASE + '/dev-api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:user, password:pwd, code, uuid }) })).json()
  if (!j.token) throw new Error('login fail ' + user + ': ' + JSON.stringify(j).slice(0,120))
  return j.token
}
const SHOP=await tok('ry','admin123'); const ADMIN=await tok('admin','admin123')
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cdp-seed-'))
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--mute-audio',`--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'})
for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)break}catch{}await sleep(250)}
let tab; for(const m of ['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok){tab=await r.json();break}}catch{}}
const ws=new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r))
let id=0; const pend=new Map()
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id)}})
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}))})
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.value}
const shot=async n=>{const s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(n,Buffer.from(s.data,'base64'));console.log('📷',n)}
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})

// 1) 宠物详情评论
await send('Network.setCookie',{name:'Shop-Token',value:SHOP,url:BASE+'/',path:'/'})
await send('Page.navigate',{url:BASE+'/shop/pet/1'})
for(let i=0;i<40;i++){ if(await ev('!!document.querySelector(".pet-social .list .cmt")')) break; await sleep(500) }
await sleep(800)
console.log('评论数:', await ev(`document.querySelector('.comment-area .cnt')?.innerText || ''`),
            '| 首屏条目:', await ev(`document.querySelectorAll('.pet-social .list .cmt').length`))
await ev(`document.querySelector('.pet-social .comment-area')?.scrollIntoView({block:'start'}); window.scrollBy(0,-90); true`)
await sleep(500); await shot('shot-seed-comments.png')

// 2) 我的订单
await send('Page.navigate',{url:BASE+'/shop/order'})
for(let i=0;i<40;i++){ if(await ev('!!document.querySelector(".tabs, .filter-row, .order")')) break; await sleep(500) }
await sleep(1500)
console.log('URL:', await ev('location.href'), '| tabs:', await ev(`document.querySelector('.tabs, .filter, .ui-tabs')?.innerText?.replace(/\\n/g,' ') || ''`))
console.log('订单数:', await ev(`document.querySelectorAll('.order').length`))
await shot('shot-seed-orders.png')

// 3) 数据看板
await send('Network.setCookie',{name:'Admin-Token',value:ADMIN,url:BASE+'/',path:'/'})
await send('Page.navigate',{url:BASE+'/admin/dashboard'})
for(let i=0;i<50;i++){ if(await ev('document.body.innerText.includes("营业额")')) break; await sleep(500) }
await sleep(2000)
console.log('看板 KPI:', await ev(`document.body.innerText.slice(0,120).replace(/\\n/g,' / ')`))
await shot('shot-seed-dashboard.png')
chrome.kill(); process.exit(0)
