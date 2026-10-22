/** 通用全页截图：node shot2.mjs <绝对路径html> <宽> <高> <输出png> */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const [, , target, W = '1440', H = '900', OUT = 'out.png', CLIPH = '0', OFFY = '0'] = process.argv
const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const FILE = 'file:///' + encodeURI(target).replace(/#/g, '%23')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PORT = 9400 + Math.floor(Math.random() * 300)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-gen-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--allow-file-access-from-files', '--hidden-scrollbars',
  `--window-size=${W},${H}`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('no cdp') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('no tab') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp(); const tab = await newTab(); const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 500 })
  await send('Page.navigate', { url: FILE })
  await sleep(1500)
  const m = await send('Page.getLayoutMetrics')
  const cw = Math.ceil(m.cssContentSize.width), ch = Math.ceil(m.cssContentSize.height)
  const clipH = +CLIPH > 0 ? Math.min(+CLIPH, ch) : Math.min(ch, 15000)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: +OFFY, width: cw, height: clipH, scale: 1 } })
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
  console.log('saved', OUT, cw + 'x' + ch)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 150)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
