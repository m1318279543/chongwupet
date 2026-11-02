/** 验证：首页门店卡片行对齐 + 预约弹窗门店选择 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const W = 1440, H = 900, PORT = 9359
const TOKEN = process.env.SHOP_TOKEN || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-store-'))
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
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
  if (TOKEN) await send('Network.setCookie',{name:'Shop-Token',value:TOKEN,domain:'47.116.73.25',path:'/'})

  // ① 首页门店区
  await send('Page.navigate',{url:'http://47.116.73.25/shop/home'})
  await sleep(5500)
  const scrolled = await evl(`(()=>{const s=document.querySelector('.stores');if(!s)return 'no stores';s.scrollIntoView({block:'center'});return 'ok'})()`)
  console.log('scroll:', scrolled)
  await sleep(1200)
  const rects = await evl(`JSON.stringify([...document.querySelectorAll('.store')].map(c=>{const b=c.querySelector('.store-btn').getBoundingClientRect();return {name:c.querySelector('h4')?.textContent, top:Math.round(b.top), h:Math.round(c.getBoundingClientRect().height)}}))`)
  console.log('卡片按钮位置:', rects)
  const shot1=await send('Page.captureScreenshot',{format:'png'})
  fs.writeFileSync('D:/AI/WorkBuddy/2026-09-21-20-38-15/home-stores.png',Buffer.from(shot1.data,'base64'))
  console.log('saved home-stores.png')

  // ② 预约页弹窗
  await send('Page.navigate',{url:'http://47.116.73.25/shop/appointment'})
  await sleep(5000)
  const clicked = await evl(`(()=>{const b=[...document.querySelectorAll('.svc-item__foot .ui-linkbtn')][0];if(!b)return 'no btn';b.click();return 'clicked'})()`)
  console.log('预约按钮:', clicked)
  await sleep(2000)
  const hasSelect = await evl(`(()=>{const items=[...document.querySelectorAll('.el-dialog .bkd-field label')].map(x=>x.textContent.trim());return JSON.stringify(items)})()`)
  console.log('弹窗字段:', hasSelect)
  const shot2=await send('Page.captureScreenshot',{format:'png'})
  fs.writeFileSync('D:/AI/WorkBuddy/2026-09-21-20-38-15/appt-booking.png',Buffer.from(shot2.data,'base64'))
  console.log('saved appt-booking.png')

  ws.close();chrome.kill();setTimeout(()=>process.exit(0),300)
})().catch(e=>{console.error('FAILED: '+e.message);chrome.kill();process.exit(1)})
