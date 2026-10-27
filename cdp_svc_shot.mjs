// 截「门店服务项目」价目区验证排版（游客页，无需登录）
// 用法: node cdp_svc_shot.mjs <base>
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://47.116.73.25'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9422
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'svc-shot-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break } catch {} await sleep(250) }

const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const pend = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaljs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value

await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: `${BASE}/shop/appointment` })
await sleep(5000)
const info = await evaljs(`(() => {
  const grid = document.querySelector('.svc-price__grid')
  if (!grid) return JSON.stringify({ err: 'NO_GRID' })
  const cs = getComputedStyle(grid)
  const item = grid.querySelector('.svc-item')
  const ics = item ? getComputedStyle(item) : null
  return JSON.stringify({ items: grid.children.length, display: cs.display,
    cols: cs.gridTemplateColumns.split(' ').length,
    itemBorder: ics && ics.borderTopWidth, itemBg: ics && ics.backgroundColor,
    title: document.querySelector('.svc-price__title')?.textContent || '' })
})()`)
console.log('check:', info)
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('svc_layout.png', Buffer.from(shot.result.data, 'base64'))
console.log('screenshot saved -> svc_layout.png')
ws.close(); chrome.kill(); process.exit(0)
