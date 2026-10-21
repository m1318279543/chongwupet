/** 同浏览器同账号并存截图：前台普通用户 + 后台 admin */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const HOST = new URL(BASE).hostname
const W = 1280, H = 860
const PORT = 9387
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

execSync(`node get_token.mjs ${BASE} ry admin123 .tok_ry`, { stdio: 'ignore' })
execSync(`node get_token.mjs ${BASE} admin admin123 .admintoken`, { stdio: 'ignore' })
const shopToken = fs.readFileSync('.tok_ry', 'utf8').trim()
const adminToken = fs.readFileSync('.admintoken', 'utf8').trim()

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-2shot-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch { } await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch { } } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  await send('Page.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

  // 两套 Cookie 同时写入（模拟前台登录普通用户 + 后台登录 admin）
  await send('Network.setCookie', { name: 'Shop-Token', value: shopToken, domain: HOST, path: '/', url: BASE + '/' })
  await send('Network.setCookie', { name: 'Admin-Token', value: adminToken, domain: HOST, path: '/', url: BASE + '/' })

  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(5200)
  let s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('roles-shop.png', Buffer.from(s.data, 'base64'))
  console.log('saved roles-shop.png')

  await send('Page.navigate', { url: BASE + '/admin/dashboard' }); await sleep(5600)
  s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('roles-admin.png', Buffer.from(s.data, 'base64'))
  console.log('saved roles-admin.png')

  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
