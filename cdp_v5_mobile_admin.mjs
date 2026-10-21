/**
 * 手机端 + 后台补充验证：收银台/铃铛/筛选条 390 视口无溢出；后台购物车支付列、铃铛
 * 用法: node cdp_v5_mobile_admin.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 390, H = 844
const PORT = 9383
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function tok(file, user, pass) {
  if (fs.existsSync(file) && fs.statSync(file).size > 50) return fs.readFileSync(file, 'utf8').trim()
  execSync(`node get_token.mjs ${BASE} ${user} ${pass} ${file}`, { stdio: 'inherit' })
  return fs.readFileSync(file, 'utf8').trim()
}
const SHOP_TOKEN = tok('.tok_ry', 'ry', 'admin123')
const ADMIN_TOKEN = tok('.admintoken', 'admin', 'admin123')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-v5m-'))
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)return}catch{}await sleep(250)}throw new Error('CDP 未就绪')}
async function newTab(){for(const m of['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok)return await r.json()}catch{}}throw new Error('tab fail')}
const connect=(url)=>new Promise((res,rej)=>{const ws=new WebSocket(url);ws.addEventListener('open',()=>res(ws));ws.addEventListener('error',rej)})

let pass=0, fail=0
const check=(n,c,d='')=>{console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+d+']':''));c?pass++:fail++}

;(async()=>{
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  const setTok = async (t, name = 'Shop-Token') => {
    await send('Network.deleteCookies', { name: 'Shop-Token', url: BASE + '/' })
    await send('Network.deleteCookies', { name: 'Admin-Token', url: BASE + '/' })
    await send('Network.setCookie', { name, value: t, url: BASE + '/', path: '/' })
  }
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }
  const overflow = `(() => { const vw = document.documentElement.clientWidth; const bad = []
    document.querySelectorAll('body *').forEach(el => { const cs = getComputedStyle(el)
      if (cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed') return
      const rc = el.getBoundingClientRect(); if (rc.width<2||rc.height<2) return
      if (rc.right - vw > 2) bad.push(el.tagName + '.' + String(el.className||'').split(/\\s+/)[0]) })
    return JSON.stringify({ vw, sw: document.documentElement.scrollWidth, bad: [...new Set(bad)].slice(0,4) }) })()`

  // ---- 手机端订单页 + 收银台 ----
  await setTok(SHOP_TOKEN)
  await send('Page.navigate', { url: BASE + '/shop/order' }); await sleep(4000)
  let o = JSON.parse(await evaluate(overflow) || '{}')
  check('手机订单页无横向溢出', o.sw <= o.vw + 1, `sw=${o.sw}`)
  await shot('v5m-order.png')
  await evaluate(`[...document.querySelectorAll('.el-button')].find(b => b.textContent.includes('去支付'))?.click()`)
  await sleep(1200)
  const c1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    open: !!document.querySelector('.cashier-dialog'),
    fit: (() => { const d = document.querySelector('.cashier-dialog'); if (!d) return 0; const r = d.getBoundingClientRect(); return r.width <= window.innerWidth })()
  }))()`) || '{}')
  check('手机收银台弹出且不超屏', c1.open && c1.fit === true)
  await shot('v5m-cashier.png')

  // ---- 手机端铃铛面板 ----
  await evaluate(`(() => { document.querySelectorAll('.el-dialog__headerbtn')?.forEach(b=>b.click()); return 1 })()`)
  await sleep(600)
  await evaluate(`document.querySelector('.notify-bell .bell-btn')?.click()`)
  await sleep(900)
  const n1 = JSON.parse(await evaluate(`(() => { const p = document.querySelector('.np-panel'); if (!p) return '{}'
    const r = p.getBoundingClientRect()
    return JSON.stringify({ open: true, w: Math.round(r.width), vw: window.innerWidth, left: Math.round(r.left) }) })()`) || '{}')
  check('手机通知面板打开且不超屏', n1.open && n1.w <= n1.vw, `w=${n1.w} vw=${n1.vw}`)
  await shot('v5m-notify.png')

  // ---- 手机端首页筛选条 ----
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4000)
  await evaluate(`[...document.querySelectorAll('.cat-tab')].find(t => t.textContent.trim() !== '全部')?.click()`)
  await sleep(1200)
  o = JSON.parse(await evaluate(overflow) || '{}')
  check('手机筛选条无溢出', o.sw <= o.vw + 1, `sw=${o.sw} bad=${(o.bad||[]).join(',')}`)
  const fwrap = await evaluate(`(() => { const f = document.querySelector('.filter-bar'); if (!f) return 0; return f.scrollWidth <= f.clientWidth + 2 ? 1 : 2 })()`)
  check('筛选条内部可容纳/滚动', fwrap !== 0, fwrap === 1 ? 'fit' : 'wrap')
  await shot('v5m-filter.png')

  // ---- 后台：铃铛 + 购物车支付列 ----
  await setTok(ADMIN_TOKEN, 'Admin-Token')
  await send('Page.navigate', { url: BASE + '/admin/cart' }); await sleep(4500)
  const a1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    bell: !!document.querySelector('.notify-bell .bell-btn'),
    payCol: document.body.innerText.includes('支付状态'),
    paidTag: document.body.innerText.includes('已支付'),
    orderCol: document.body.innerText.includes('订单号')
  }))()`) || '{}')
  check('后台铃铛可见', a1.bell)
  check('后台购物车有支付状态列', a1.payCol)
  check('后台显示已支付标签', a1.paidTag)
  check('后台显示订单号列', a1.orderCol)
  await shot('v5m-admin-cart.png')

  console.log(`\\n===== 结果: ${pass} PASS / ${fail} FAIL =====`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
