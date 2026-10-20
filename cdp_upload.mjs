/**
 * 上传功能端到端验证：
 * 1) /shop/profile 头像上传（真实文件选择）+ 昵称修改 + 顶栏同步
 * 2) /admin/system/user 批量导入 Excel（真实文件选择 → 开始导入）
 * 用法: node cdp_upload.mjs
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9346
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-upload-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1360,1000',
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

;(async () => {
  const token = await login('ry', 'admin123')
  console.log('登录成功 (ry)')

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
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable')
  const netLog = []
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
    if (m.method === 'Network.requestWillBeSent' && /profile\/avatar|importData|importTemplate/.test(m.params.request.url)) netLog.push('→ ' + m.params.request.method + ' ' + m.params.request.url.split('8081').pop())
    if (m.method === 'Network.responseReceived' && /profile\/avatar|importData|importTemplate/.test(m.params.response.url)) netLog.push('← HTTP ' + m.params.response.status + ' ' + m.params.response.url.split('8081').pop())
    if (m.method === 'Network.loadingFailed') netLog.push('✗ ' + m.params.errorText)
  })

  await send('Network.enable')
  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })

  // ---------- 1. 个人资料页 ----------
  await send('Page.navigate', { url: BASE + '/shop/profile' })
  await sleep(5000)
  const before = await evaluate(`JSON.stringify({
    title: document.title,
    account: document.querySelector('.pf-account')?.innerText.trim(),
    nickname: document.querySelector('.pf-name')?.innerText.trim(),
    hasAvatar: !!document.querySelector('.avatar-img'),
    topName: document.querySelector('.uname')?.innerText.trim()
  })`)
  console.log('资料页初始: ' + before)

  // 选择头像文件
  const doc = await send('DOM.getDocument', { depth: -1 })
  const fileNode = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.avatar-uploader input[type=file]' })
  console.log('头像输入框 nodeId=' + fileNode.nodeId)
  await send('DOM.setFileInputFiles', {
    nodeId: fileNode.nodeId,
    files: [path.resolve('avatar_test.png')]
  })
  await sleep(3500)
  const afterAvatar = await evaluate(`JSON.stringify({
    hasAvatarImg: !!document.querySelector('.avatar-img'),
    avatarSrc: document.querySelector('.avatar-img')?.getAttribute('src') || '',
    loaded: (() => { const i = document.querySelector('.avatar-img'); return i ? i.complete && i.naturalWidth > 0 : false })(),
    topAvatar: document.querySelector('.uname') ? 'shown' : 'none'
  })`)
  console.log('头像上传后: ' + afterAvatar)

  // 修改昵称
  const newNick = '睿睿铲屎官'
  await evaluate(`(() => {
    const input = document.querySelector('.pf-form input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, ${JSON.stringify(newNick)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(400)
  const saved = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.pf-form button')].find(b => b.innerText.includes('保存修改'))
    if (!btn) return 'no-save-btn'
    btn.click(); return 'clicked'
  })()`)
  await sleep(2500)
  const afterSave = await evaluate(`JSON.stringify({
    saveBtn: ${JSON.stringify(saved)},
    profileName: document.querySelector('.pf-name')?.innerText.trim(),
    avatarVisible: !!document.querySelector('.avatar-img'),
    topName: document.querySelector('.uname')?.innerText.trim(),
    msg: [...document.querySelectorAll('.el-message')].map(e => e.innerText.trim())
  })`)
  console.log('昵称保存后: ' + afterSave)

  const shot1 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.resolve('profile-shot.png'), Buffer.from(shot1.data, 'base64'))

  // ---------- 2. 后台批量导入（需 admin 权限） ----------
  const adminToken = await login('admin', 'admin123')
  await send('Network.setCookie', { name: 'Admin-Token', value: adminToken, domain: 'localhost', path: '/' })
  await sleep(500)
  await send('Page.navigate', { url: BASE + '/admin/system/user' })
  await sleep(6000)
  const userPage = await evaluate(`JSON.stringify({
    title: document.title,
    hasImportBtn: [...document.querySelectorAll('button')].some(b => b.innerText.includes('批量导入')),
    rowCount: document.querySelectorAll('.el-table__body tr').length,
    total: document.querySelector('.el-pagination__total')?.innerText.trim()
  })`)
  console.log('用户管理页: ' + userPage)

  const opened = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('批量导入'))
    if (!btn) return 'no-btn'
    btn.click(); return 'clicked'
  })()`)
  await sleep(1200)
  const dialog = await evaluate(`JSON.stringify({
    opened: ${JSON.stringify(opened)},
    dialogTitle: [...document.querySelectorAll('.el-dialog__title')].map(e => e.innerText.trim()),
    hasDrop: !!document.querySelector('.el-dialog .el-upload-dragger'),
    tip: document.querySelector('.el-dialog .el-upload__tip')?.innerText.trim()
  })`)
  console.log('导入对话框: ' + dialog)

  // 选择 Excel 并导入
  const doc2 = await send('DOM.getDocument', { depth: -1 })
  const fileNode2 = await send('DOM.querySelector', { nodeId: doc2.root.nodeId, selector: '.el-dialog .el-upload input[type=file]' })
  await send('DOM.setFileInputFiles', { nodeId: fileNode2.nodeId, files: [path.resolve('user_import_e2e.xlsx')] })
  await sleep(1500)
  const chosen = await evaluate(`JSON.stringify({
    fileShown: document.querySelector('.el-dialog .el-upload-list__item-name')?.innerText.trim() || '',
    btnDisabled: (() => { const b = [...document.querySelectorAll('.el-dialog button')].find(x => x.innerText.includes('开始导入')); return b ? b.disabled : 'no-btn' })()
  })`)
  console.log('文件选择: ' + chosen)

  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.el-dialog button')].find(b => b.innerText.includes('开始导入'))
    if (btn) btn.click()
  })()`)
  await sleep(1600)
  const importResult = await evaluate(`JSON.stringify({
    msgs: [...document.querySelectorAll('.el-message')].map(e => e.innerText.trim().slice(0, 120)),
    dialogClosed: !document.querySelector('.el-dialog__wrapper:not([style*="display: none"]) .el-dialog'),
    total: document.querySelector('.el-pagination__total')?.innerText.trim(),
    newRows: [...document.querySelectorAll('.el-table__body tr')].map(t => t.querySelectorAll('td')[1]?.innerText.trim()).filter(Boolean).join(',')
  })`)
  console.log('导入结果: ' + importResult)

  const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.resolve('batch-import-shot.png'), Buffer.from(shot2.data, 'base64'))

  console.log('\n=== 网络 ===')
  netLog.forEach((l) => console.log('  ' + l))
  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.slice(0, 5).join('\n') : '无')

  chrome.kill()
  process.exit(0)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
