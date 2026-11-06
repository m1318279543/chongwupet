// README 截图重拍：前台 4 页 + 后台看板 + 大屏 + 智能选宠
// 输出直接写入 docs/screenshots/
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'

const BASE = process.env.SHOT_BASE || 'http://localhost:82'
const OUT = 'D:/Undergraduate_courses/qiyekaifa/chongwupet/docs/screenshots'
fs.mkdirSync(OUT, { recursive: true })
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9345
const userData = path.join(os.tmpdir(), 'cdp-readme-' + Date.now())
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + userData, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
function getJSON(url) { return new Promise((res, rej) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej)) }

await sleep(2200)
const tabs = await getJSON(`http://127.0.0.1:${PORT}/json/list`)
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result
const shot = async (file) => {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64'))
  console.log('saved', file)
}
const viewport = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })

// 后台登录：验证码 + Redis 取码，换 Admin-Token
async function adminLogin() {
  const cap = await evalJs(`fetch('/dev-api/captchaImage').then(r => r.json())`)
  const uuid = cap.result?.value?.uuid
  const { execFileSync } = await import('node:child_process')
  const out = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', 'captcha_codes:' + uuid], { encoding: 'utf8' })
  const code = out.replace(/[\\"]/g, '').trim()
  const login = await evalJs(`fetch('/dev-api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' + '123', code: ${JSON.stringify(code)}, uuid: ${JSON.stringify(uuid)} }) }).then(r => r.json())`)
  const token = login.result?.value?.token
  if (!token) throw new Error('登录失败: ' + JSON.stringify(login.result?.value || login))
  // 同源 127.0.0.1 才能设 cookie，后面统一用 127.0.0.1 访问
  await send('Network.enable')
  await send('Network.setCookie', { name: 'Admin-Token', value: token, url: BASE.replace('localhost', '127.0.0.1') })
  console.log('admin token ok, len', token.length)
  return token
}

await send('Page.enable')
await send('Runtime.enable')

// ========== 前台页面 ==========
const pages = [
  ['shop-home.png', '/shop/home', 1440, 900],
  ['shop-food.png', '/shop/food', 1440, 900],
  ['shop-pets.png', '/shop/pets', 1440, 900],
  ['shop-match.png', '/shop/match', 1440, 900]
]
for (const [file, pathUrl, w, h] of pages) {
  await viewport(w, h)
  await send('Page.navigate', { url: BASE + pathUrl })
  await sleep(4200)
  await shot(file)
}

// 宠物详情（取列表第一只的 petId）
await viewport(1440, 900)
await send('Page.navigate', { url: BASE + '/shop/pets' })
await sleep(3200)
const pid = await evalJs(`(window.__pid = (document.querySelector('.grid [class*=card]') ? (location.href, null) : null), fetch('/dev-api/pet/info/list?pageNum=1&pageSize=1').then(r => r.json()).then(d => d.rows?.[0]?.petId))`.replace('(window.__pid = (document.querySelector(\'.grid [class*=card]\') ? (location.href, null) : null), ', ''))
const petId = pid.result?.value
if (petId) {
  await send('Page.navigate', { url: BASE + '/shop/pet/' + petId })
  await sleep(3800)
  await shot('shop-pet-detail.png')
} else {
  console.log('petId 获取失败，跳过详情截图')
}

// ========== 后台 ==========
await adminLogin()

await viewport(1600, 900)
await send('Page.navigate', { url: BASE.replace('localhost', '127.0.0.1') + '/admin/dashboard' })
await sleep(5000)
await shot('admin-dashboard.png')

await viewport(1920, 1080)
await send('Page.navigate', { url: BASE.replace('localhost', '127.0.0.1') + '/admin/bigscreen' })
await sleep(6000)
await shot('admin-bigscreen.png')

ws.close()
chrome.kill()
try { fs.rmSync(userData, { recursive: true, force: true }) } catch { }
console.log('ALL DONE')
process.exit(0)
