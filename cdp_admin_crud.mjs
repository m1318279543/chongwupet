/**
 * 自研后台岗位管理 增/删 功能验证
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9352
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
  if (!data.token) throw new Error('登录失败')
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-crud-'))
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
    if (r.exceptionDetails) return { err: r.exceptionDetails.exception?.description || r.exceptionDetails.text }
    return r.result?.value
  }
  let errors = []
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || '')
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
  })

  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })
  await send('Page.navigate', { url: BASE + '/admin/system/post' })
  await sleep(5000)

  // 1. 新增岗位
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('新增'))?.click()`)
  await sleep(900)
  const fill = await evaluate(`(() => {
    const dlg = [...document.querySelectorAll('.el-dialog')].find(d => d.innerText.includes('岗位名称'))
    if (!dlg) return 'no-dialog'
    const inputs = dlg.querySelectorAll('.el-input__inner')
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })) }
    set(inputs[0], 'E2E测试岗')            // 岗位名称
    set(inputs[1], 'e2etest' + Date.now() % 100000) // 岗位编码
    return 'filled'
  })()`)
  console.log('填写表单: ' + JSON.stringify(fill))
  await evaluate(`(() => {
    const dlg = [...document.querySelectorAll('.el-dialog')].find(d => d.innerText.includes('岗位名称'))
    ;[...dlg.querySelectorAll('button')].find(b => b.innerText.trim() === '确 定')?.click()
  })()`)
  await sleep(1800)
  const after = await evaluate(`JSON.stringify({
    msg: [...document.querySelectorAll('.el-message')].map(m => m.innerText).join('|'),
    hasNew: [...document.querySelectorAll('.el-table__body tr')].some(t => t.innerText.includes('E2E测试岗')),
    rows: document.querySelectorAll('.el-table__body tr').length
  })`)
  console.log('新增后: ' + after)

  // 2. 删除该岗位
  await evaluate(`(() => {
    const row = [...document.querySelectorAll('.el-table__body tr')].find(t => t.innerText.includes('E2E测试岗'))
    if (!row) return 'no-row'
    ;[...row.querySelectorAll('button')].find(b => b.innerText.includes('删除'))?.click()
  })()`)
  await sleep(900)
  await evaluate(`[...document.querySelectorAll('.el-message-box button')].find(b => b.innerText.trim() === '确定')?.click()`)
  await sleep(1500)
  const afterDel = await evaluate(`JSON.stringify({
    hasNew: [...document.querySelectorAll('.el-table__body tr')].some(t => t.innerText.includes('E2E测试岗')),
    rows: document.querySelectorAll('.el-table__body tr').length
  })`)
  console.log('删除后: ' + afterDel)
  console.log('控制台错误: ' + (errors.length ? errors.join(' | ').slice(0, 200) : '无'))

  chrome.kill()
  process.exit(0)
})().catch((e) => { console.error(e); chrome.kill(); process.exit(2) })
