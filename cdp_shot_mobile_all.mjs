/** 手机端截图：收藏 / 服务保障 / 粮详情弹窗 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 390, H = 844, PORT = 9367
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken', 'utf8').trim() : ''
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-shot2-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('no cdp') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('no tab') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })
;(async () => {
  await waitCdp(); const tab = await newTab(); const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  if (TOKEN) { await send('Network.enable'); await send('Network.setCookie', { name: 'Admin-Token', value: TOKEN, url: BASE + '/', path: '/' }) }

  const shots = []
  for (const [name, p, act] of [
    ['favorite', '/shop/favorite', ''],
    ['service', '/shop/service/health', ''],
    ['food-dialog', '/shop/food', `document.querySelector('.card')?.click()`],
    ['cart', '/shop/cart', ''],
  ]) {
    await send('Page.navigate', { url: BASE + p }); await sleep(4200)
    if (act) { await evaluate(act); await sleep(1800) }
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const f = `opt-m-${name}.png`
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'))
    shots.push(f)
    console.log('saved', f)
  }
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
