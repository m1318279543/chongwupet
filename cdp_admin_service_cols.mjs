// 后台服务工单页：新增的服务方式/收款/应付列与筛选是否到位
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9487
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
const check = (n, ok, extra = '') => { ok ? (pass++, console.log(`  PASS ${n}${extra ? '  ' + extra : ''}`)) : (fail++, console.log(`  FAIL ${n}${extra ? '  ' + extra : ''}`)) }

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
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  }).then(r => r.json())
  if (!res.token) throw new Error('登录失败 ' + JSON.stringify(res))
  return res.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-svcadmin-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1600,950',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const waitCdp = async () => { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
const newTab = async () => { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')

  const T = await apiLogin('admin', 'admin123')
  await send('Network.setCookie', { name: 'Admin-Token', value: T, url: BASE + '/', path: '/' })
  await send('Page.navigate', { url: BASE + '/admin/service' })
  await sleep(7000)

  const heads = await ev(`[...document.querySelectorAll('.el-table__header th')].map(th => th.innerText.trim()).join(',')`)
  check('后台工单表有「方式」列', heads.includes('方式'), heads.slice(0, 120))
  check('后台工单表有「应付」与「收款」列', heads.includes('应付') && heads.includes('收款'))
  const labels = await ev(`[...document.querySelectorAll('.el-form-item__label')].map(x => x.innerText.trim()).join(',')`)
  check('筛选含服务方式与支付状态', labels.includes('服务方式') && labels.includes('支付状态'), labels.slice(0, 120))

  // 接口字段完整：serviceMode/qty/totalAmount/payMethod/address
  const api = await fetch(`${API}/pet/service/order/list?pageNum=1&pageSize=1`, { headers: { Authorization: 'Bearer ' + T } }).then(r => r.json())
  const row = api.rows?.[0] || {}
  const keys = ['serviceMode', 'qty', 'totalAmount', 'payStatus', 'contactName', 'contactPhone']
  const missing = keys.filter(k => !(k in row))
  check('列表接口返回预约扩展字段', missing.length === 0, 'missing=' + missing.join(','))

  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  chrome.kill(); process.exit(fail ? 1 : 0)
})().catch(e => { console.error('CHECK ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(1) })
