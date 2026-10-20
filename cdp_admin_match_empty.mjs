/**
 * 后台「智能匹配记录」页面验证：无匹配记录展示、状态筛选、详情诊断
 * 用法: node cdp_admin_match_empty.mjs [base] [api]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const API = process.argv[3] || 'http://127.0.0.1:8081'
const PORT = 9365
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-am-'))
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

let pass = 0
let fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
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
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
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

  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: '127.0.0.1', path: '/' }).catch(() =>
    send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' }))
  await send('Page.navigate', { url: BASE + '/admin/match' })
  await sleep(5000)

  const page = await evaluate(`JSON.stringify({
    stat: document.querySelector('.mb8 .el-col:nth-child(3)')?.innerText.trim().replace(/\\n/g, ' '),
    rows: document.querySelectorAll('.el-table__body tr').length,
    hasEmptyTag: [...document.querySelectorAll('.el-table__body .el-tag')].some(t => t.innerText.includes('未匹配')),
    hasFilter: !!document.querySelector('.el-form .el-select'),
    filterText: document.querySelector('.el-form .el-select .el-select__placeholder')?.innerText || document.querySelector('.el-form .el-select input')?.placeholder || ''
  })`)
  let p = {}
  try { p = JSON.parse(page) } catch (e) {}
  check('统计栏显示无匹配次数', /无匹配\s*\d+/.test(p.stat || ''), (p.stat || '').slice(0, 90))
  check('表格中有"未匹配到宠物"标签', !!p.hasEmptyTag)
  check('存在"匹配结果"筛选下拉', !!p.hasFilter, 'placeholder=' + p.filterText)
  check('列表有数据', (p.rows || 0) > 0, p.rows + ' 行')

  // 点击一行未匹配记录的详情
  const opened = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.el-table__body tr')].find(t => t.innerText.includes('未匹配'))
    if (!row) return 'no-empty-row'
    ;[...row.querySelectorAll('button')].find(b => b.innerText.includes('详情'))?.click()
    return 'opened'
  })()`)
  check('能打开无匹配记录详情', opened === 'opened', opened)
  await sleep(1200)

  const dlg = await evaluate(`JSON.stringify((() => {
    const d = [...document.querySelectorAll('.el-dialog')].find(x => x.innerText.includes('智能匹配详情'))
    if (!d) return { err: 'no-dialog' }
    return {
      hasEmptyTag: [...d.querySelectorAll('.el-tag')].some(t => t.innerText.includes('未匹配到宠物')),
      hasDiag: d.innerText.includes('未匹配诊断'),
      diagCells: [...d.querySelectorAll('.diag-cell')].map(c => c.innerText.replace(/\\n/g, ':')),
      tips: [...d.querySelectorAll('.diag-tip')].map(t => t.innerText.trim()),
      portrait: d.innerText.includes('问卷画像')
    }
  })())`)
  let d = {}
  try { d = JSON.parse(dlg) } catch (e) {}
  check('详情标记"未匹配到宠物"', !!d.hasEmptyTag)
  check('详情含"未匹配诊断"模块', !!d.hasDiag)
  check('诊断展示各条件淘汰数', (d.diagCells || []).length >= 4, (d.diagCells || []).slice(0, 4).join(' | '))
  check('诊断含改进建议', (d.tips || []).length > 0, (d.tips || [])[0] || '')

  // 筛选"已匹配"
  await evaluate(`(() => { [...document.querySelectorAll('.el-dialog__headerbtn')].forEach(b => b.click()) })()`)
  await sleep(600)
  await evaluate(`(() => {
    const sel = document.querySelector('.el-form .el-select')
    if (!sel) return 'no-select'
    sel.querySelector('.el-select__wrapper, .el-input__inner').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return 'clicked'
  })()`)
  await sleep(800)
  await evaluate(`(() => {
    const opt = [...document.querySelectorAll('.el-select-dropdown__item')].find(o => o.innerText.includes('已匹配'))
    if (!opt) return 'no-opt'
    opt.click()
    return 'picked'
  })()`)
  await sleep(1600)
  const filtered = await evaluate(`JSON.stringify({
    rows: document.querySelectorAll('.el-table__body tr').length,
    anyEmpty: [...document.querySelectorAll('.el-table__body tr')].some(t => t.innerText.includes('未匹配'))
  })`)
  let f = {}
  try { f = JSON.parse(filtered) } catch (e) {}
  check('筛选"已匹配"后无未匹配行', f.rows > 0 && !f.anyEmpty, f.rows + ' 行')

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.resolve('admin-match-empty.png'), Buffer.from(shot.data, 'base64'))

  console.log('\n控制台错误: ' + (errors.length ? errors.join(' | ').slice(0, 200) : '无'))
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); chrome.kill(); process.exit(2) })
