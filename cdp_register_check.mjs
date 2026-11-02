/** 验证注册表单 UI：首页 → 登录 → 注册账号 → 截图 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const W = 1440, H = 900, PORT = 9361
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-reg-'))
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
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})

  await send('Page.navigate',{url:'http://47.116.73.25/shop/home'})
  await sleep(5000)

  // 点顶栏「登录」
  console.log('登录按钮:', await evl(`(()=>{const b=[...document.querySelectorAll('header button, header a')].find(x=>x.textContent.trim()==='登录');if(!b)return 'not found';b.click();return 'clicked'})()`))
  await sleep(1500)

  // 点「注册账号」
  console.log('注册链接:', await evl(`(()=>{const b=[...document.querySelectorAll('.auth-foot .foot-link')].find(x=>x.textContent.includes('注册'));if(!b)return 'not found';b.click();return 'clicked'})()`))
  await sleep(1200)

  const fields = await evl(`JSON.stringify([...document.querySelectorAll('.el-dialog .el-form-item')].map(x=>({ph:(x.querySelector('input')||{}).placeholder, label:x.textContent.trim().slice(0,20)})))`)
  console.log('注册表单字段:', fields)
  const title = await evl(`document.querySelector('.el-dialog__title')?.textContent`)
  console.log('弹窗标题:', title)

  const shot=await send('Page.captureScreenshot',{format:'png'})
  fs.writeFileSync('D:/AI/WorkBuddy/2026-09-21-20-38-15/register-form.png',Buffer.from(shot.data,'base64'))
  console.log('saved register-form.png')
  ws.close();chrome.kill();setTimeout(()=>process.exit(0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
