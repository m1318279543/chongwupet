/**
 * 后台入口权限实测
 * 用法: node cdp_admin_gate.mjs [adminBaseUrl]
 * 场景：
 *   A. 前台已登录普通账号(ry) → 打开 /admin → 应落在 /admin/login（能看到后台登录页）
 *   B. 在后台登录页用 admin/admin123 登录 → 应进入 /admin/dashboard
 *   C. 清掉登录态 → 在后台登录页用普通账号 ry 登录 → 应被拒绝并停留在 /admin/login
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:83'
const SHOP = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9361
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
  if (!data.token) throw new Error(`${username} 登录失败: ` + JSON.stringify(data))
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-gate-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1000',
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

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

;(async () => {
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

  let errors = []
  const captchaReqs = []
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
    }
    if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/captchaImage')) {
      captchaReqs.push(m.params.requestId)
    }
  })

  const pathNow = () => evaluate('location.pathname')
  const waitPath = async (want, ms = 12000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      if ((await pathNow()) === want) return true
      await sleep(200)
    }
    return false
  }
  async function refreshCaptcha() {
    captchaReqs.length = 0
    await evaluate(`(() => { const el = document.querySelector('.code-img'); if (el) el.click(); return true })()`)
    for (let i = 0; i < 60 && !captchaReqs.length; i++) await sleep(100)
    if (!captchaReqs.length) throw new Error('未捕获验证码请求')
    const body = await send('Network.getResponseBody', { requestId: captchaReqs[captchaReqs.length - 1] })
    const data = JSON.parse(body.body)
    let code = ''
    for (let i = 0; i < 15; i++) {
      code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${data.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
      await sleep(150)
    }
    return { uuid: data.uuid, code }
  }
  const fill = (selector, value) => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return 'no-el';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`)

  // ---------- A. 前台普通账号登录后打开后台 ----------
  const normalToken = await apiLogin('ry', 'admin123')
  console.log('普通账号 ry 已登录（token 就绪）')
  await send('Network.setCookie', { name: 'Admin-Token', value: normalToken, domain: 'localhost', path: '/' })
  await send('Page.navigate', { url: SHOP + '/shop/home' })
  await sleep(4000)
  check('前台以普通账号进入商城', (await pathNow()) === '/shop/home', 'path=' + (await pathNow()))

  errors = []
  await send('Page.navigate', { url: BASE + '/admin' })
  const landedLogin = await waitPath('/admin/login', 10000)
  check('普通账号打开 /admin 能进入后台登录页', landedLogin, 'path=' + (await pathNow()))
  const hasForm = await evaluate(`!!document.querySelector('input[autocomplete="username"]') && !!document.querySelector('.submit')`)
  check('后台登录表单已渲染', hasForm === true)
  check('页面无运行时错误', errors.length === 0, errors.join(' | ').slice(0, 200))

  // ---------- B. admin 登录 ----------
  let cap = await refreshCaptcha()
  await fill('input[autocomplete="username"]', 'admin')
  await fill('input[autocomplete="current-password"]', 'admin123')
  await fill('.code-row input', cap.code)
  await sleep(300)
  await evaluate(`document.querySelector('.submit').click()`)
  const enteredAdmin = await waitPath('/admin/dashboard', 15000)
  check('admin 账号在后台登录页登录成功', enteredAdmin, 'path=' + (await pathNow()))

  // ---------- C. 普通账号在后台登录页被拒绝 ----------
  await send('Network.deleteCookies', { name: 'Admin-Token', domain: 'localhost', path: '/' })
  await send('Page.navigate', { url: BASE + '/admin/login' })
  await sleep(3500)
  check('退出后仍可打开后台登录页', (await pathNow()) === '/admin/login', 'path=' + (await pathNow()))

  cap = await refreshCaptcha()
  await fill('input[autocomplete="username"]', 'ry')
  await fill('input[autocomplete="current-password"]', 'admin123')
  await fill('.code-row input', cap.code)
  await sleep(300)
  await evaluate(`document.querySelector('.submit').click()`)
  // ElMessage 默认 3 秒消失，这里轮询抓取首个提示文案
  let msg = ''
  for (let i = 0; i < 40; i++) {
    await sleep(200)
    const t = await evaluate(`(document.querySelector('.el-message__content') || {}).textContent || ''`)
    if (t) { msg = t; break }
  }
  const stillLogin = (await pathNow()) === '/admin/login'
  check('普通账号登录后台被拒绝', stillLogin && /不是管理员/.test(msg || ''), `path=${await pathNow()} msg=${msg}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (shot?.data) fs.writeFileSync('admin-gate-shot.png', Buffer.from(shot.data, 'base64'))

  console.log('\n=========== 结果 ===========')
  const pass = results.filter((r) => r.ok).length
  console.log(`${pass}/${results.length} 通过`)
  results.filter((r) => !r.ok).forEach((r) => console.log('  未通过: ' + r.name + ' ' + r.detail))

  ws.close(); chrome.kill()
  setTimeout(() => process.exit(results.every((r) => r.ok) ? 0 : 1), 300)
})().catch((e) => {
  console.error('TEST ERROR:', e.message)
  try { chrome.kill() } catch {}
  process.exit(2)
})
