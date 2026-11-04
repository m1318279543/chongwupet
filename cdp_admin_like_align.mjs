/** 后台点赞管理：宠物列图片对齐检查 + 截图（诊断用） */
import { spawn, execSync, execFileSync } from 'node:child_process'
import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe', BASE=process.argv[2]||'http://127.0.0.1:82', W=1440,H=950,PORT=9403
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const TOKEN = await (async () => {
  const cap = execSync(`node -e "fetch('${BASE}/dev-api/captchaImage').then(r=>r.json()).then(j=>console.log(JSON.stringify({uuid:j.uuid})))"`).toString().trim()
  const uuid = JSON.parse(cap).uuid
  let code
  if (BASE.includes('47.116.73.25')) {
    code = execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET captcha_codes:${uuid}`], { encoding: 'utf8' })
  } else {
    code = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw','GET',`captcha_codes:${uuid}`], {encoding:'utf8'})
  }
  code = code.replace(/[\\"]/g,'').trim()
  const j = await (await fetch(BASE+'/dev-api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123',code,uuid})})).json()
  if (!j.token) throw new Error('admin 登录失败: ' + JSON.stringify(j).slice(0,120))
  return j.token
})()
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cdp-admlike-'))
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run',`--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'})
for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)break}catch{}await sleep(250)}
let tab; for(const m of ['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok){tab=await r.json();break}}catch{}}
const ws=new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r))
let id=0; const pend=new Map()
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id)}})
const send=(me,pa={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:me,params:pa}))})
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.value}
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
await send('Network.setCookie',{name:'Admin-Token',value:TOKEN,url:BASE+'/',path:'/'})
await send('Page.navigate',{url:BASE+'/admin/like'}); await sleep(3500)
const info = await ev(`(() => {
  const imgs = [...document.querySelectorAll('.ui-pet-cell__img')]
  if (!imgs.length) return null
  const lefts = imgs.map(i => Math.round(i.getBoundingClientRect().left))
  const r0 = imgs[0].closest('tr').getBoundingClientRect()
  const tops = imgs.map(i => +(i.getBoundingClientRect().top - i.closest('tr').getBoundingClientRect().top).toFixed(1))
  return { count: imgs.length, lefts, topOffsets: tops, alignedX: new Set(lefts).size === 1 }
})()`)
console.log('IMG INFO:', JSON.stringify(info))
const s=await send('Page.captureScreenshot',{format:'png'})
fs.writeFileSync('shot-admin-like.png', Buffer.from(s.data,'base64'))
chrome.kill(); process.exit(0)
