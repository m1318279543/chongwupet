/**
 * 手机端布局巡检：真实手机视口逐页检查横向溢出 / 元素越界
 * 用法: node cdp_mobile_audit.mjs [BASE] [宽度] [高度]
 *   BASE 默认 http://47.116.73.25
 *   env TOKEN 可选：注入 Shop-Token 用于需要登录的页面
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const W = Number(process.argv[3] || 390)
const H = Number(process.argv[4] || 844)
const PORT = 9355
const TOKEN = process.env.TOKEN || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAGES = [
  ['home', '/shop/home'],
  ['match', '/shop/match'],
  ['food', '/shop/food'],
  ['cart', '/shop/cart'],
  ['service-health', '/shop/service/health'],
  ['doctor', '/shop/doctor'],
  ['consult', '/shop/consult'],
  ['order', '/shop/order'],
  ['appointment', '/shop/appointment'],
  ['favorite', '/shop/favorite'],
  ['profile', '/shop/profile'],
  ['admin-login', '/admin/login'],
  ['admin-dashboard', '/admin/dashboard'],
]

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-mobile-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}
async function newTab() {
  for (const method of ['PUT', 'GET']) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method }); if (r.ok) return await r.json() } catch {}
  }
  throw new Error('无法新建标签页')
}
const connect = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.addEventListener('open', () => res(ws))
  ws.addEventListener('error', rej)
})

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return r.result?.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 2, mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

  if (TOKEN) {
    await send('Network.enable')
    await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })
  }

  const report = []
  for (const [name, p] of PAGES) {
    await send('Page.navigate', { url: BASE + p })
    await sleep(3200)
    const r = await evaluate(`(() => {
      const de = document.documentElement
      const vw = de.clientWidth
      const bad = []
      const seen = new Set()
      document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) return
        const overRight = r.right - vw
        if (overRight > 2) {
          const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\\s+/).slice(0,2).join('.') : ''
          const key = el.tagName + '.' + cls
          if (!seen.has(key)) {
            seen.add(key)
            bad.push({ sel: key, w: Math.round(r.width), over: Math.round(overRight) })
          }
        }
      })
      bad.sort((a,b) => b.over - a.over)
      return JSON.stringify({
        path: location.pathname,
        vw,
        scrollW: de.scrollWidth,
        hOverflow: de.scrollWidth > vw + 1,
        bodyH: document.body.scrollHeight,
        worst: bad.slice(0, 6)
      })
    })()`)
    const o = JSON.parse(r || '{}')
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    fs.writeFileSync(path.resolve(`mobile-${name}.png`), Buffer.from(shot.data, 'base64'))
    report.push({ name, ...o })
    console.log(`[${o.hOverflow ? 'OVERFLOW' : 'ok      '}] ${name.padEnd(16)} ${o.path} vw=${o.vw} scrollW=${o.scrollW}${o.worst?.length ? '  越界: ' + o.worst.map(x => `${x.sel}+${x.over}px`).join(', ') : ''}`)
  }

  fs.writeFileSync(path.resolve(`mobile-report-${W}.json`), JSON.stringify(report, null, 2))
  console.log('\n截图: mobile-*.png  报告: mobile-report-' + W + '.json')
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
