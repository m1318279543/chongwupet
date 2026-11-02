/** 验证门店员工抽屉：打开 /admin/store → 点首行"员工" → 截图 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const W = 1920, H = 900, PORT = 9358
const TOKEN = fs.readFileSync('D:/AI/WorkBuddy/2026-09-21-20-38-15/.rytoken_remote', 'utf8').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-staff-'))
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
  const evl=async(expr)=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});return r.result?.value}
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
  await send('Network.setCookie',{name:'Admin-Token',value:TOKEN,domain:'47.116.73.25',path:'/'})
  await send('Page.navigate',{url:'http://47.116.73.25:8083/admin/store'})
  await sleep(5000)
  console.log('URL:', await evl('location.pathname'))
  const clicked = await evl(`(()=>{
    const btns=[...document.querySelectorAll('.el-table__body-wrapper .el-button')]
    const b=btns.find(x=>x.textContent.includes('员工'))
    if(!b) return '未找到员工按钮, 按钮=' + btns.length
    b.click(); return 'clicked'
  })()`)
  console.log('点击结果:', clicked)
  await sleep(2500)
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
  fs.writeFileSync('D:/AI/WorkBuddy/2026-09-21-20-38-15/staff-drawer-cdp.png',Buffer.from(shot.data,'base64'))
  console.log('saved staff-drawer-cdp.png')
  ws.close();chrome.kill();setTimeout(()=>process.exit(0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
