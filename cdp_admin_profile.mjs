/**
 * 82 后台个人资料弹窗（头像上传+昵称修改）+ 前台同步 验证
 * 用法: node cdp_admin_profile.mjs
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9348
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 10; i++) {
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-adminpf-'))
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

;(async () => {
  const token = await login('admin', 'admin123')
  console.log('admin 登录成功')

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

  const errors = []
  const net = []
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable')
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
    if (m.method === 'Network.requestWillBeSent' && /profile\/avatar|system\/user\/profile|getInfo/.test(m.params.request.url)) net.push('→ ' + m.params.request.method + ' ' + m.params.request.url.split('8081').pop())
    if (m.method === 'Network.responseReceived' && /profile\/avatar|system\/user\/profile|getInfo/.test(m.params.response.url)) net.push('← ' + m.params.response.status + ' ' + m.params.response.url.split('8081').pop())
  })

  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })

  // 1. 打开后台
  await send('Page.navigate', { url: BASE + '/admin/dashboard' })
  await sleep(6000)
  const head = await evaluate(`JSON.stringify({
    title: document.title,
    hasUser: !!document.querySelector('.header .user'),
    name: document.querySelector('.header .name')?.innerText.trim(),
    avatarImg: document.querySelector('.header .avatar img')?.getAttribute('src') || ''
  })`)
  console.log('后台顶栏: ' + head)

  // 2. 悬停头像打开下拉，点击 个人资料
  const box = await send('DOM.getDocument', { depth: -1 })
  const userNode = await send('DOM.querySelector', { nodeId: box.root.nodeId, selector: '.header .user' })
  const ub = (await send('DOM.getBoxModel', { nodeId: userNode.nodeId })).model.content
  const cx = (ub[0] + ub[2]) / 2, cy = (ub[1] + ub[5]) / 2
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy })
  await sleep(900)
  const clicked = await evaluate(`(() => {
    const item = [...document.querySelectorAll('.el-dropdown-menu__item')].find(e => e.innerText.includes('个人资料'))
    if (!item) return 'no-item: ' + [...document.querySelectorAll('.el-dropdown-menu__item')].map(e => e.innerText.trim()).join('/')
    item.click(); return 'clicked'
  })()`)
  console.log('下拉菜单: ' + clicked)
  await sleep(1200)
  const dlg = await evaluate(`JSON.stringify({
    open: [...document.querySelectorAll('.el-dialog__title')].some(t => t.innerText.includes('个人资料')),
    hasUpload: !!document.querySelector('.pf-upload input[type=file]'),
    nickValue: document.querySelector('.pf-form input:not([disabled])')?.value || ''
  })`)
  console.log('资料弹窗: ' + dlg)

  // 3. 修改昵称并保存
  await evaluate(`(() => {
    const input = document.querySelector('.pf-form input:not([disabled])')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '宠物管理员')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(400)
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.el-dialog__footer button')].find(b => b.innerText.includes('保存'))
    if (btn) btn.click()
  })()`)
  await sleep(2500)
  const saved = await evaluate(`JSON.stringify({
    msgs: [...document.querySelectorAll('.el-message')].map(e => e.innerText.trim()),
    headerName: document.querySelector('.header .name')?.innerText.trim()
  })`)
  console.log('昵称保存: ' + saved)

  // 4. 上传头像
  const doc = await send('DOM.getDocument', { depth: -1 })
  const fileNode = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.pf-upload input[type=file]' })
  console.log('头像输入 nodeId=' + fileNode.nodeId)
  if (fileNode.nodeId) {
    await send('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [path.resolve('avatar_admin_test.png')] })
  }
  await sleep(3500)
  const up = await evaluate(`JSON.stringify({
    avatarSrc: document.querySelector('.header .avatar img')?.getAttribute('src') || '',
    loaded: (() => { const i = document.querySelector('.header .avatar img'); return i ? (i.complete && i.naturalWidth > 0) : false })(),
    msgs: [...document.querySelectorAll('.el-message')].map(e => e.innerText.trim())
  })`)
  console.log('头像上传: ' + up)

  const shot1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.resolve('admin-profile-shot.png'), Buffer.from(shot1.data, 'base64'))

  // 5. 切到前台，验证昵称/头像同步
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(5000)
  const shop = await evaluate(`JSON.stringify({
    uname: document.querySelector('.uname')?.innerText.trim(),
    avatarSrc: document.querySelector('.uname') ? (document.querySelector('.avatar img')?.getAttribute('src') || '') : '',
    avatarLoaded: (() => { const i = document.querySelector('.avatar img'); return i ? (i.complete && i.naturalWidth > 0) : false })()
  })`)
  console.log('前台同步: ' + shop)

  const shot2 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.resolve('shop-sync-shot.png'), Buffer.from(shot2.data, 'base64'))

  console.log('\n=== 网络 ===')
  net.forEach((l) => console.log('  ' + l))
  console.log('=== 控制台错误 ===')
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '无')

  chrome.kill()
  process.exit(0)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
