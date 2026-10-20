/**
 * ruoyi-ui(81) 后台头像上传实测 + 昵称同步检查
 * 用法: node cdp_ruoyi_avatar.mjs
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:81'
const API = 'http://localhost:8081'
const PORT = 9347
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-ryavatar-'))
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
    if (m.method === 'Network.requestWillBeSent' && /profile\/avatar|getInfo/.test(m.params.request.url)) net.push('→ ' + m.params.request.method + ' ' + m.params.request.url)
    if (m.method === 'Network.responseReceived' && /profile\/avatar|getInfo/.test(m.params.response.url)) net.push('← ' + m.params.response.status + ' ' + m.params.response.url)
    if (m.method === 'Network.loadingFailed') net.push('✗ ' + m.params.errorText)
  })

  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })

  // 1. 打开个人中心
  await send('Page.navigate', { url: BASE + '/user/profile' })
  await sleep(9000)
  const pageState = await evaluate(`JSON.stringify({
    url: location.href,
    title: document.title,
    hasHead: !!document.querySelector('.user-info-head'),
    avatarSrc: document.querySelector('.user-info-head img')?.getAttribute('src') || '',
    avatarLoaded: (() => { const i = document.querySelector('.user-info-head img'); return i ? (i.complete && i.naturalWidth > 0) : false })(),
    navAvatar: document.querySelector('.user-avatar')?.getAttribute('src') || '',
    navNick: document.querySelector('.user-nickname')?.innerText.trim() || ''
  })`)
  console.log('个人中心: ' + pageState)

  // 2. 点头像打开裁剪框
  await evaluate(`document.querySelector('.user-info-head')?.click()`)
  await sleep(1500)
  const dialogState = await evaluate(`JSON.stringify({
    dialogOpen: !!document.querySelector('.el-dialog'),
    hasCropper: !!document.querySelector('.vue-cropper'),
    cropperImg: document.querySelector('.vue-cropper img')?.getAttribute('src')?.slice(0, 40) || '',
    fileInputs: document.querySelectorAll('.el-dialog input[type=file]').length
  })`)
  console.log('裁剪弹窗: ' + dialogState)

  // 3. 选择文件
  const doc = await send('DOM.getDocument', { depth: -1 })
  const fileNode = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.el-dialog input[type=file]' })
  console.log('文件输入 nodeId=' + fileNode.nodeId)
  if (fileNode.nodeId) {
    await send('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [path.resolve('avatar_admin_test.png')] })
  }
  await sleep(2000)
  const afterPick = await evaluate(`JSON.stringify({
    cropperImg: document.querySelector('.vue-cropper img')?.getAttribute('src')?.slice(0, 30) || '',
    previewImg: document.querySelector('.avatar-upload-preview img')?.getAttribute('src')?.slice(0, 30) || ''
  })`)
  console.log('选择文件后: ' + afterPick)

  // 4. 点提交
  const submit = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.el-dialog button')].find(b => b.innerText.replace(/\\s/g, '').includes('提交'))
    if (!btn) return 'no-btn'
    btn.click(); return 'clicked'
  })()`)
  console.log('提交按钮: ' + submit)
  await sleep(4000)

  const afterUpload = await evaluate(`JSON.stringify({
    msgs: [...document.querySelectorAll('.el-message')].map(e => e.innerText.trim()),
    navAvatar: document.querySelector('.user-avatar')?.getAttribute('src') || '',
    navAvatarLoaded: (() => { const i = document.querySelector('.user-avatar'); return i ? (i.complete && i.naturalWidth > 0) : false })(),
    dialogOpen: !!document.querySelector('.el-dialog')
  })`)
  console.log('上传后: ' + afterUpload)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.resolve('ruoyi-avatar-shot.png'), Buffer.from(shot.data, 'base64'))

  console.log('\n=== 网络 ===')
  net.forEach((l) => console.log('  ' + l))
  console.log('=== 控制台错误 ===')
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '无')

  chrome.kill()
  process.exit(0)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
