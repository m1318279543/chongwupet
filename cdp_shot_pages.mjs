/** 快速截图指定手机端页面 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844)
const PORT = 9357
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PAGES = (process.argv[5] || '/shop/home').split(',')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-shot-'))
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)return}catch{}await sleep(250)}throw new Error('CDP 未就绪')}
async function newTab(){for(const m of['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok)return await r.json()}catch{}}throw new Error('无法新建标签页')}
const connect=(url)=>new Promise((res,rej)=>{const ws=new WebSocket(url);ws.addEventListener('open',()=>res(ws));ws.addEventListener('error',rej)})

;(async()=>{
  await waitCdp()
  const tab=await newTab()
  const ws=await connect(tab.webSocketDebuggerUrl)
  let id=0;const pending=new Map()
  ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id)}})
  const send=(method,params={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}))})
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:2,mobile:true})
  for(const p of PAGES){
    await send('Page.navigate',{url:BASE+p})
    await sleep(4000)
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
    const name=p.replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'')
    fs.writeFileSync(`shot-m-${name}.png`,Buffer.from(shot.data,'base64'))
    console.log('saved', `shot-m-${name}.png`)
  }
  ws.close();chrome.kill();setTimeout(()=>process.exit(0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
