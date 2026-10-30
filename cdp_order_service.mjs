// 服务预约单进订单 + 手机号严格校验
// 用法: node cdp_order_service.mjs [base]
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9489
const PY = String.raw`C:\Users\asus\.workbuddy\binaries\python\versions\3.13.12\python.exe`
const MYSQL = IS_REMOTE
  ? (sql) => execSync(`${PY} deploy/ssh_run.py "mysql -upet -pPetShop2026 --default-character-set=utf8mb4 -N -B ry-pet -e \\"${sql}\\""`, { encoding: 'utf8' }).trim()
  : (sql) => execSync(`"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -uroot -p123456 --default-character-set=utf8mb4 -N -B ry-pet -e "${sql}"`, { encoding: 'utf8' }).trim()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
const check = (n, ok, extra = '') => { ok ? (pass++, console.log(`  PASS ${n}${extra ? '  ' + extra : ''}`)) : (fail++, console.log(`  FAIL ${n}${extra ? '  ' + extra : ''}`)) }

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 15; i++) {
    try {
      code = IS_REMOTE
        ? (() => { const raw = execSync(`${PY} deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim(); return raw.replace(/^"|"$/g, '').split('\n').pop().trim() })()
        : execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
    } catch {}
    await sleep(200)
  }
  if (!code) throw new Error('取不到验证码')
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  }).then(r => r.json())
  if (!res.token) throw new Error('登录失败 ' + JSON.stringify(res))
  return res.token
}

const PHONE_RAW = '139-0000-' + String(Date.now()).slice(-4)
const PHONE_DIGITS = PHONE_RAW.replace(/-/g, '')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-ordersvc-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1600,960',
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

  const T = await apiLogin('ry', 'admin123')
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + T }

  // ---------- ① 手机号严格校验（接口层） ----------
  const opts = await fetch(`${API}/pet/service/item/options`).then(r => r.json())
  const paidItem = (opts.data || []).find(i => Number(i.price) > 0) || (opts.data || [])[0]
  const d = new Date(Date.now() + 86400000)
  const p2 = (n) => String(n).padStart(2, '0')
  const when = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} 16:00:00`
  const body = (phone) => JSON.stringify({
    itemId: paidItem.itemId, serviceMode: '1', appointTime: when, qty: 1,
    contactName: '手机号E2E', contactPhone: phone
  })

  for (const bad of ['10000000000', '1390000213', '139000021345', '23900002134', 'abcdefghijk']) {
    const r = await fetch(`${API}/pet/service/order/booking`, { method: 'POST', headers: H, body: body(bad) }).then(r => r.json())
    check(`非法手机号被拒（${bad}）`, r.code !== 200 && /手机号|联系电话/.test(r.msg || ''), r.msg || '')
  }
  const emptyPhone = await fetch(`${API}/pet/service/order/booking`, { method: 'POST', headers: H, body: body('') }).then(r => r.json())
  check('手机号为空被拒', emptyPhone.code !== 200 && /联系电话/.test(emptyPhone.msg || ''), emptyPhone.msg || '')

  // 带空格/连字符的合法号码：允许，但入库必须规范化成 11 位纯数字
  const okRes = await fetch(`${API}/pet/service/order/booking`, { method: 'POST', headers: H, body: body(PHONE_RAW) }).then(r => r.json())
  check('带分隔符的合法手机号可下单', okRes.code === 200, JSON.stringify(okRes.msg || okRes.data?.serviceNo))
  const svcNo = okRes.data?.serviceNo
  const storedPhone = MYSQL(`SELECT contact_phone FROM pet_service_order WHERE service_no='${svcNo}'`)
  check('入库手机号已规范化', storedPhone === PHONE_DIGITS, `${PHONE_RAW} -> ${storedPhone}`)

  // 旧版按宠物预约接口同样严格
  const legacy = await fetch(`${API}/pet/appointment`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ storeId: 1, appointmentDate: when, contactPhone: '12345', remark: '手机号校验E2E' })
  }).then(r => r.json())
  check('旧预约接口拒绝非法手机号', legacy.code !== 200 && /手机号/.test(legacy.msg || ''), legacy.msg || '')

  // ---------- ② 顾客端 /shop/order 出现「服务预约」入口 ----------
  await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
  await send('Page.navigate', { url: BASE + '/shop/order' })
  await sleep(7000)

  const scopes = await ev(`[...document.querySelectorAll('.scope-btn')].map(b => b.innerText.replace(/\\s+/g, '')).join('|')`)
  check('我的订单有商品订单/服务预约切换', scopes.includes('商品订单') && scopes.includes('服务预约'), scopes)

  await ev(`[...document.querySelectorAll('.scope-btn')].find(b => b.innerText.includes('服务预约')).click()`)
  await sleep(1500)
  const svcCardText = await ev(`(() => {
    const cards = [...document.querySelectorAll('.order')]
    const hit = cards.find(c => c.innerText.includes('${svcNo}'))
    return hit ? hit.innerText.replace(/\\s+/g, ' ') : (cards[0] ? 'FIRST:' + cards[0].innerText.replace(/\\s+/g, ' ').slice(0, 80) : 'EMPTY')
  })()`)
  check('服务预约列表包含刚下的单', svcCardText.includes(svcNo), svcCardText.slice(0, 90))
  check('列表显示待支付与金额', svcCardText.includes('待支付') && svcCardText.includes('¥'), svcCardText.slice(0, 90))

  // ---------- ③ 后台订单管理出现「服务预约单」 ----------
  const AT = await apiLogin('admin', 'admin123')
  await send('Network.setCookie', { name: 'Admin-Token', value: AT, url: BASE + '/', path: '/' })
  await send('Page.navigate', { url: BASE + '/admin/order' })
  await sleep(7000)

  const radios = await ev(`[...document.querySelectorAll('.scope-switch .el-radio-button')].map(x => x.innerText.trim()).join('|')`)
  check('后台订单页有服务预约单入口', radios.includes('服务预约单') && radios.includes('商品订单'), radios)

  await ev(`(() => { const b = [...document.querySelectorAll('.scope-switch .el-radio-button')].find(x => x.innerText.includes('服务预约单')); b.querySelector('input').click(); return true })()`)
  await sleep(2500)
  const heads = await ev(`[...document.querySelectorAll('.el-table__header th')].map(th => th.innerText.trim()).join(',')`)
  check('服务单表格列齐全', heads.includes('服务单号') && heads.includes('方式') && heads.includes('应付'), heads.slice(0, 120))
  // 按服务单号检索（列表默认按预约时间排，新单不一定在第一页）
  await ev(`(() => {
    const forms = [...document.querySelectorAll('.el-form')]
    const f = forms[forms.length - 1]
    const input = f.querySelector('input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, '${svcNo}')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return input.value
  })()`)
  await sleep(300)
  await ev(`(() => {
    const forms = [...document.querySelectorAll('.el-form')]
    const f = forms[forms.length - 1]
    const btn = [...f.querySelectorAll('.el-button')].find(b => b.innerText.includes('搜索'))
    btn.click()
  })()`)
  await sleep(1800)
  const rowHit = await ev(`(() => {
    const rows = [...document.querySelectorAll('.el-table__body tr')]
    return rows.some(r => r.innerText.includes('${svcNo}')) ? 'HIT' : 'MISS:' + rows.length
  })()`)
  check('后台列表能查到该服务单', rowHit === 'HIT', rowHit)

  // ---------- 清理 ----------
  MYSQL(`DELETE FROM pet_payment_log WHERE order_no='${svcNo}'`)
  MYSQL(`UPDATE pet_service_order SET del_flag='2' WHERE service_no='${svcNo}'`)
  MYSQL(`DELETE FROM pet_appointment WHERE remark='手机号校验E2E'`)

  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('CHECK ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(1) })
