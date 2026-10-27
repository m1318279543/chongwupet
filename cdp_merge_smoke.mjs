// 合并后冒烟：首页精选 12 只 / 订单页（新接口+收银台）/ 后台看板 / 新后台页可达
// 用法: node cdp_merge_smoke.mjs <base>   例: node cdp_merge_smoke.mjs http://127.0.0.1:82
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9421
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  PASS ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  FAIL ${name}${extra ? '  ' + extra : ''}`) }
}

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 15; i++) {
    try {
      code = IS_REMOTE
        ? (() => { const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim(); return raw.replace(/^"|"$/g, '').split('\n').pop().trim() })()
        : execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
    } catch {}
    await sleep(200)
  }
  const r = await (await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })).json()
  if (!r.token) throw new Error('登录失败: ' + JSON.stringify(r).slice(0, 120))
  return r.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-smoke-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break } catch {} await sleep(250) }

const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const pend = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable')

const goto = async (url, wait = 3500) => { await send('Page.navigate', { url }); await sleep(wait) }

try {
  // ① 游客首页：新版设计 + 精选 12 只
  await goto(BASE + '/shop/home', 5000)
  check('首页可访问', (await ev('document.body.innerText.length')) > 200)
  const cards = await ev(`document.querySelectorAll('.grid .pet-card, .grid a[href*=\"/pet/\"]').length`)
  check('首页精选区展示 12 张宠物卡', cards === 12, 'cards=' + cards)
  const more = await ev(`!!document.querySelector('.more')`)
  check('首页有「查看全部」入口', more)

  // ② 游客可进联系客服（回归）
  await goto(BASE + '/shop/consult', 2500)
  check('游客可进入 /shop/consult', (await ev('location.pathname')).includes('/shop/consult'))

  // ③ 后台登录（admin）
  const token = await apiLogin('admin', 'admin123')
  await goto(BASE + '/admin/login', 1200)
  await ev(`document.cookie = 'Admin-Token=' + encodeURIComponent(${JSON.stringify(token)}) + '; path=/'`)

  // ④ 看板：8 张 KPI + 图表 + 支付卡
  await goto(BASE + '/admin/dashboard', 7000)
  const kpi = await ev(`document.querySelectorAll('.kpi-card').length`)
  check('看板 8 张 KPI 卡', kpi === 8, 'kpi=' + kpi)
  const payCard = await ev(`document.body.innerText.includes('支付金额') && document.body.innerText.includes('支付成功率')`)
  check('支付指标卡在', payCard)
  const canvases = await ev(`document.querySelectorAll('canvas').length`)
  check('看板图表 canvas ≥ 9', canvases >= 9, 'canvas=' + canvases)
  const kpiValue = await ev(`(document.querySelector('.kpi-value')||{}).textContent || ''`)
  check('KPI 有数值（订单迁移后看板有数据）', /\d/.test(kpiValue || ''), 'first=' + (kpiValue || '').slice(0, 16))

  // ⑤ 新后台页可达：门店 / 订单 / 支付流水
  await goto(BASE + '/admin/store', 3000)
  check('门店管理页渲染', (await ev(`document.body.innerText.includes('门店')`)))
  await goto(BASE + '/admin/order', 3000)
  check('订单管理页渲染', (await ev(`document.body.innerText.length`)) > 100)
  await goto(BASE + '/admin/payment', 3000)
  check('支付流水页仍可达', (await ev(`document.body.innerText.length`)) > 100)

  // ⑥ 前台订单页（ry 账号）
  const utoken = await apiLogin('ry', 'admin123')
  await goto(BASE + '/login', 800)
  await ev(`document.cookie = 'Shop-Token=' + encodeURIComponent(${JSON.stringify(utoken)}) + '; path=/'`)
  await goto(BASE + '/shop/order', 4000)
  const orderText = await ev('document.body.innerText')
  check('我的订单页加载（新 pet/order/mine 接口）', orderText.length > 100 && !orderText.includes('系统异常'), 'len=' + orderText.length)

  console.log(`\\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
} catch (e) {
  console.error('SMOKE ERROR:', e.message)
  fail++
} finally {
  chrome.kill(); process.exit(fail ? 1 : 0)
}
