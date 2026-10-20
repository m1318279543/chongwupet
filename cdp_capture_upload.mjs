/**
 * 抓取前端上传/导入请求的真实响应体
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9347
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 10; i++) {
    try {
      code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
    } catch {}
    await sleep(200)
  }
  const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, code, uuid: cap.uuid }) })
  return (await res.json()).token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cap-'))
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--mute-audio','--ignore-certificate-errors','--window-size=1360,1000',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'})
for (let i=0;i<80;i++){ try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok)break}catch{} await sleep(250)}

const token = await login('ry', 'admin123')
let tab
for (const m of ['PUT','GET']){ try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m}); if(r.ok){tab=await r.json();break}}catch{} }
const ws = await new Promise((res,rej)=>{const w=new WebSocket(tab.webSocketDebuggerUrl);w.addEventListener('open',()=>res(w));w.addEventListener('error',rej)})
let id=0; const pend=new Map(); const hits=[]
ws.addEventListener('message', async (ev)=>{
  const m=JSON.parse(ev.data)
  if (m.id && pend.has(m.id)){ pend.get(m.id)(m.result); pend.delete(m.id); return }
  if (m.method==='Network.responseReceived' && /avatar|importData/.test(m.params.response.url)) {
    hits.push({ url: m.params.response.url, status: m.params.response.status, rid: m.params.requestId })
  }
})
const send=(method,params={})=>new Promise(res=>{const mid=++id;pend.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}))})
const evaluate=async(e)=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.value

await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable')
await send('Network.setCookie',{name:'Admin-Token',value:token,domain:'localhost',path:'/'})
await send('Page.navigate',{url:BASE+'/shop/profile'})
await sleep(5000)

const doc = await send('DOM.getDocument',{depth:-1})
const node = await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.avatar-uploader input[type=file]'})
await send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[path.resolve('avatar_test.png')]})
await sleep(3500)

for (const h of hits) {
  try {
    const b = await send('Network.getResponseBody',{requestId:h.rid})
    let body = b.body
    if (b.base64Encoded) body = Buffer.from(body,'base64').toString('utf8').slice(0,300)
    console.log('[' + h.status + '] ' + h.url.split('/dev-api').pop())
    console.log('   body: ' + String(body).slice(0,300))
  } catch(e) { console.log('body 读取失败: ' + e.message) }
}

// 页面上的提示与头像状态
console.log('页面状态: ' + await evaluate(`JSON.stringify({
  hasAvatarImg: !!document.querySelector('.avatar-img'),
  avatarSrc: document.querySelector('.avatar-img')?.getAttribute('src') || '',
  msgs: [...document.querySelectorAll('.el-message')].map(e=>e.innerText.trim())
})`))

chrome.kill(); process.exit(0)
