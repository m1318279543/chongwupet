import { spawn } from 'node:child_process'
import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE=process.argv[2]||'http://127.0.0.1:82'; const PORT=9398
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cdp-drag-'))
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--mute-audio','--window-size=1920,1080',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'})
for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch{}await sleep(250)}
const tab=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json()
const ws=await new Promise((res,rej)=>{const w=new WebSocket(tab.webSocketDebuggerUrl);w.addEventListener('open',()=>res(w));w.addEventListener('error',rej)})
let id=0;const pend=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))})
const evalJs=async(ex)=>{const r=await send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true});return r.result?.result?.value}
await send('Page.enable');await send('Runtime.enable')
await send('Page.navigate',{url:BASE+'/shop/display'});await sleep(9000)
let pass=0,fail=0;const ck=(n,c,d='')=>{console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+d+']':''));c?pass++:fail++}
const pt=await evalJs(`(()=>{const c=document.querySelector('.ring-card');const r=c.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`)
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pt.x,y:pt.y,button:'left',clickCount:1})
for(let i=1;i<=8;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pt.x+i*25,y:pt.y,button:'left',buttons:1});await sleep(30)}
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pt.x+200,y:pt.y,button:'left',clickCount:1})
await sleep(1200)
const drag=await evalJs(`document.querySelector('.orbit').style.getPropertyValue('--drag')`)
ck('拖动后视角偏移 70°', Math.abs(parseFloat(drag)-70)<2, drag)
ck('拖动不触发跳转', (await evalJs('location.pathname'))==='/shop/display', await evalJs('location.pathname'))
// 鼠标移出舞台后自动旋转继续（悬停暂停是设计行为）
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:300})
await sleep(600)
const a1=await evalJs(`getComputedStyle(document.querySelector('.ring-outer')).animationPlayState`)
ck('移出后自动旋转继续', a1==='running', a1)
// 再单击一次：应跳转（环在转，重新取最靠舞台中心的可见卡片）
const pt2=await evalJs(`(()=>{
  const scene=document.querySelector('.scene').getBoundingClientRect()
  const cx=scene.left+scene.width/2, cy=scene.top+scene.height/2
  let best=null, bestD=1e9
  document.querySelectorAll('.ring-card').forEach(c=>{
    const r=c.getBoundingClientRect()
    if (r.width<30) return
    const x=r.left+r.width/2, y=r.top+r.height/2
    if (x<scene.left+10||x>scene.right-10||y<scene.top+10||y>scene.bottom-10) return
    const d=Math.hypot(x-cx,y-cy)
    if (d<bestD){bestD=d;best={x:Math.round(x),y:Math.round(y)}}
  })
  return best
})()`)
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pt2.x,y:pt2.y,button:'left',clickCount:1})
await sleep(80)
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pt2.x,y:pt2.y,button:'left',clickCount:1})
await sleep(2500)
const url=await evalJs('location.pathname')
ck('单击跳转详情', /^\/shop\/pet\/\d+$/.test(url), url)
console.log(`\n${pass} passed, ${fail} failed`)
chrome.kill();process.exit(fail===0?0:1)
