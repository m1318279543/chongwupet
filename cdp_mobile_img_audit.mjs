/**
 * 手机端全站图片巡检：量测每页图片渲染尺寸 / 占屏比 / 横向溢出
 * 用法: node cdp_mobile_img_audit.mjs [BASE] [W] [H]
 * 需要 .rytoken（node get_token.mjs 生成）
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844)
const PORT = 9363
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken', 'utf8').trim() : ''
const THRESH = Number(process.env.THRESH || 35)   // 超过屏高 35% 视为"占屏过大"

const PAGES = [
  ['home', '/shop/home'],
  ['match', '/shop/match'],
  ['pet-detail', '/shop/pet/1'],
  ['favorite', '/shop/favorite'],
  ['appointment', '/shop/appointment'],
  ['service-health', '/shop/service/health'],
  ['service-origin', '/shop/service/origin'],
  ['service-care', '/shop/service/care'],
  ['service-after', '/shop/service/after'],
  ['doctor', '/shop/doctor'],
  ['consult', '/shop/consult'],
  ['food', '/shop/food'],
  ['cart', '/shop/cart'],
  ['order', '/shop/order'],
  ['profile', '/shop/profile'],
  ['login', '/login'],
]

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-audit-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  if (TOKEN) { await send('Network.enable'); await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' }) }

  const report = []
  for (const [name, p] of PAGES) {
    await send('Page.navigate', { url: BASE + p })
    await sleep(3800)
    await evaluate(`window.scrollTo(0, document.body.scrollHeight)`)
    await sleep(1400)
    await evaluate(`window.scrollTo(0, 0)`)
    await sleep(300)
    const r = await evaluate(`(() => {
      const vw = document.documentElement.clientWidth, vh = innerHeight
      const imgs = [], boxes = []
      document.querySelectorAll('img').forEach(img => {
        const rc = img.getBoundingClientRect()
        if (rc.width < 24 || rc.height < 24) return
        const cs = getComputedStyle(img)
        imgs.push({ w: Math.round(rc.width), h: Math.round(rc.height),
          vhPct: Math.round(rc.height / vh * 100), fit: cs.objectFit,
          cls: (typeof img.className === 'string' ? img.className : '').slice(0, 30),
          src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 34) })
      })
      document.querySelectorAll('.big-avatar,.pet-emoji,.tp-image,.card-img,.thumb,[class*="photo"],[class*="avatar"]').forEach(el => {
        const rc = el.getBoundingClientRect()
        if (rc.width < 60 || rc.height < 80) return
        boxes.push({ w: Math.round(rc.width), h: Math.round(rc.height), vhPct: Math.round(rc.height / vh * 100), cls: (el.className || '').toString().slice(0, 34) })
      })
      const over = []
      const seen = new Set()
      document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return
        const rc = el.getBoundingClientRect()
        if (rc.width < 2 || rc.height < 2) return
        const d = rc.right - vw
        if (d > 2) {
          const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).slice(0, 2).join('.') : ''
          const k = el.tagName + '.' + cls
          if (!seen.has(k)) { seen.add(k); over.push({ sel: k, over: Math.round(d) }) }
        }
      })
      const maxImg = imgs.reduce((a, b) => Math.max(a, b.vhPct), 0)
      const maxBox = boxes.reduce((a, b) => Math.max(a, b.vhPct), 0)
      return JSON.stringify({ path: location.pathname, vw, sw: document.documentElement.scrollWidth,
        vh, maxImg, maxBox, imgs: imgs.slice(0, 10), boxes: boxes.slice(0, 6),
        over: over.sort((a, b) => b.over - a.over).slice(0, 5) })
    })()`)
    const o = JSON.parse(r || '{}')
    report.push({ name, ...o })
    const bad = Math.max(o.maxImg || 0, o.maxBox || 0) > THRESH
    const over = (o.sw || 0) > (o.vw || 0) + 1
    console.log(`\n[${bad ? 'BIG ' : 'ok  '}][${over ? 'OVER' : 'ok  '}] ${name.padEnd(15)} ${o.path}  vw=${o.vw} sw=${o.sw}  maxImg=${o.maxImg}%vh maxBox=${o.maxBox}%vh`)
    for (const i of (o.imgs || [])) if (i.vhPct > THRESH) console.log(`      IMG ${i.w}x${i.h} (${i.vhPct}%vh) fit=${i.fit} cls=${i.cls} src=${i.src}`)
    for (const b of (o.boxes || [])) if (b.vhPct > THRESH) console.log(`      BOX ${b.w}x${b.h} (${b.vhPct}%vh) cls=${b.cls}`)
    if (over) console.log(`      OVER ${(o.over || []).map(x => x.sel + '+' + x.over).join(', ')}`)
  }
  fs.writeFileSync(`mobile-img-audit-${W}.json`, JSON.stringify(report, null, 2))
  const bads = report.filter(x => Math.max(x.maxImg || 0, x.maxBox || 0) > THRESH)
  console.log(`\n===== 超标页 ${bads.length}/${report.length}: ${bads.map(b => b.name).join(', ') || '无'}`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
