/**
 * 前台导航栏多宽度截图：node cdp_nav_shot.mjs
 * 输出 nav-w<width>.png（裁顶栏 140px 高）
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9371
const WIDTHS = [1440, 1280, 1100, 960, 820, 420]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 15; i++) {
    try {
      code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
    } catch {}
    await sleep(200)
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })
  const data = await res.json()
  if (!data.token) throw new Error('登录失败: ' + JSON.stringify(data))
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-nav-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1500,1000',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 100; i++) {
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

;(async () => {
  const token = await apiLogin('admin', 'admin123')
  console.log('admin token 就绪（导航显示全部登录态菜单）')
  await waitCdp()
  const tab = await newTab()
  const ws = await new Promise((res, rej) => {
    const w = new WebSocket(tab.webSocketDebuggerUrl)
    w.addEventListener('open', () => res(w)); w.addEventListener('error', rej)
  })
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    else if (m.method) listeners.forEach((f) => f(m))
  })
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result?.value
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })

  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 2, mobile: false })
    await send('Page.navigate', { url: BASE + '/shop/home' })
    await sleep(3500)
    // 检查导航是否折行：每个 .nav-item 高度应 <= 单行
    const wrapInfo = await evaluate(`(() => {
      const items = [...document.querySelectorAll('.topbar .nav-item, .topbar .drop-trigger')]
      const bad = items.filter(el => el.getBoundingClientRect().height > 40).map(el => el.textContent.trim())
      const bar = document.querySelector('.topbar .bar-inner')
      return JSON.stringify({ count: items.length, wrapped: bad, scrollW: bar ? bar.scrollWidth : 0, clientW: bar ? bar.clientWidth : 0 })
    })()`)
    const info = JSON.parse(wrapInfo)
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: 80, scale: 1 } })
    const file = `nav-w${w}.png`
    if (shot?.data) fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
    console.log(`w=${w}  items=${info.count}  折行项=${info.wrapped.length ? info.wrapped.join(',') : '无'}  bar滚动=${info.scrollW > info.clientW ? '是' : '否'}  -> ${file}`)
  }
  ws.close(); chrome.kill()
  setTimeout(() => process.exit(0), 300)
})().catch((e) => { console.error('ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(2) })
