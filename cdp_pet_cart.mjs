/**
 * E2E：宠物加入购物车 + 与宠物粮同单结算
 *   1) 详情页点「加入购物车」→ 按钮变为「已在购物车 · 去结算」，服务端购物车出现 itemType='2'
 *   2) 购物车页出现「在售宠物」「宠物粮」两组，宠物数量固定「1 只」
 *   3) 收银台支付 → 订单明细同时含 itemType 1/2，宠物变为已售，购物车清空
 *   4) 取消该订单 → 宠物回到在售（收尾还原，不留脏数据）
 * 用法: node cdp_pet_cart.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn, execSync, execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9398
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 登录拿 Token（验证码走本地 Redis / 线上 ssh） */
function loginAs(username, password) {
  const cap = execSync(`node -e "fetch('${BASE}/dev-api/captchaImage').then(r=>r.json()).then(j=>console.log(JSON.stringify({uuid:j.uuid})))"`).toString().trim()
  const uuid = JSON.parse(cap).uuid
  let code
  if (BASE.includes('47.116.73.25')) {
    code = execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET captcha_codes:${uuid}`], { encoding: 'utf8' })
  } else {
    code = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', `captcha_codes:${uuid}`], { encoding: 'utf8' })
  }
  code = code.replace(/[\\"]/g, '').trim()
  return fetch(BASE + '/dev-api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid })
  }).then(r => r.json()).then(j => {
    if (!j.token) throw new Error('登录失败(' + username + '): ' + JSON.stringify(j).slice(0, 140))
    return j.token
  })
}
const login = () => loginAs('ry', 'admin123')

const TOKEN = await login()
const api = async (url, opts = {}) => {
  const r = await fetch(BASE + '/dev-api' + url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  return r.json()
}

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

// ---------- 预置数据：一只在售宠物 + 一件有库存的宠物粮 ----------
await api('/pet/shopcart/items', { method: 'DELETE' })   // 清空购物车，从零开始
const petsRes = await api('/pet/info/list?pageNum=1&pageSize=50&status=0')
const pet = (petsRes.rows || []).find((p) => Number(p.price) > 0)
check('找到在售宠物', !!pet, pet ? `#${pet.petId} ${pet.petName} ¥${pet.price}` : '无')
if (!pet) process.exit(1)
const goodsRes = await api('/pet/goods/list?pageNum=1&pageSize=50&status=0')
const food = (goodsRes.rows || []).find((g) => Number(g.stock) > 0 && Number(g.price) > 0)
check('找到有库存的宠物粮', !!food, food ? `${food.goodsName} 库存${food.stock}` : '无')
if (!food) process.exit(1)

// 宠物粮直接走接口加购（宠物加购才是本轮被测的 UI 路径）
const addFood = await api('/pet/shopcart/items', {
  method: 'POST', body: JSON.stringify({
    itemType: '1', goodsId: food.goodsId, skuId: food.skuId || null,
    goodsName: food.goodsName, goodsImage: food.image || '', goodsSpec: food.spec || '',
    price: Number(food.price), qty: 1
  })
})
check('宠物粮已进购物车', (addFood.data || []).some((r) => r.goodsId === food.goodsId))

// ---------- 启动无头 Chrome ----------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-petcart-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

await waitCdp()
const tab = await newTab()
const ws = await connect(tab.webSocketDebuggerUrl)
let id = 0; const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2200) }
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })

/** 轮询等某个表达式为真 */
async function waitFor(expr, ms = 8000, step = 250) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(expr)) return true; await sleep(step) }
  return false
}
/** 按文本点按钮（文案里带关键字即可） */
const clickByText = (sel, text) => evaluate(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(n => n.innerText.includes(${JSON.stringify(text)}));
  if (!el) return false; el.click(); return true;
})()`)

// ---------- 1) 详情页加购 ----------
await goto(`${BASE}/shop/pet/${pet.petId}`)
const titleOk = await waitFor('!!document.querySelector(".actions .btn-cart")')
check('宠物详情页渲染出「加入购物车」按钮', titleOk,
  (await evaluate('document.querySelector(".actions .btn-cart")?.innerText || ""')).trim())
await shot('shot-pet-detail-cart.png')

const clicked = await evaluate('(() => { const b = document.querySelector(".actions .btn-cart"); if(!b) return false; b.click(); return true })()')
check('点击「加入购物车」', clicked === true)
await sleep(900)
const btnText = (await evaluate('document.querySelector(".actions .btn-cart")?.innerText || ""')).trim()
check('按钮变为「已在购物车 · 去结算」', btnText.includes('已在购物车'), btnText)

const cartNow = await api('/pet/shopcart/items')
// 前端加购是乐观更新后异步 POST，这里给 3s 余量重查
let petRow = (cartNow.data || []).find((r) => r.itemType === '2' && Number(r.petId) === Number(pet.petId))
for (let i = 0; i < 6 && !petRow; i++) {
  await sleep(500)
  const again = await api('/pet/shopcart/items')
  petRow = (again.data || []).find((r) => r.itemType === '2' && Number(r.petId) === Number(pet.petId))
}
check('服务端购物车已写入该宠物', !!petRow, petRow ? `cartItemId=${petRow.cartItemId} ¥${petRow.price}` : '未找到')
check('宠物行数量恒为 1', petRow && Number(petRow.qty) === 1, petRow ? String(petRow.qty) : '')
const badge = (await evaluate('document.querySelector(".cart-badge")?.innerText.trim() || ""')) || ''
check('顶栏购物车角标 ≥ 2（宠物 + 粮）', Number(badge) >= 2, badge || '无角标')

// ---------- 2) 购物车页分组 ----------
await goto(`${BASE}/shop/cart`)
const groupsOk = await waitFor('document.querySelectorAll(".group-name").length >= 1')
await sleep(800)
const groups = (await evaluate('[...document.querySelectorAll(".group-name")].map(n => n.innerText.trim())')) || []
check('购物车出现「在售宠物」分组', groups.includes('在售宠物'), groups.join(' / '))
check('购物车出现「宠物粮」分组', groups.includes('宠物粮'), groups.join(' / '))
const qtyFixed = (await evaluate('[...document.querySelectorAll(".qty-fixed")].map(n => n.innerText.trim())')) || []
check('宠物行数量显示「1 只」且无步进器', qtyFixed.length >= 1 && qtyFixed.every((t) => t.includes('1 只')), qtyFixed.join(','))
const totalText = (await evaluate('document.querySelector(".checkout__sum .ui-price")?.innerText || ""')).trim()
const expectTotal = Number(pet.price) + Number(food.price)
check('结算合计 = 宠物 + 宠物粮', Math.abs(parseFloat(totalText.replace(/[^\d.]/g, '')) - expectTotal) < 0.01, `${totalText} vs ¥${expectTotal.toFixed(2)}`)
await shot('shot-cart-mixed.png')

// ---------- 3) 结算支付 ----------
await evaluate('document.querySelector(".checkout__go")?.click()')
const cashierOk = await waitFor('!!document.querySelector(".cashier-body")')
check('收银台弹出', cashierOk)
await sleep(600)
const detailRows = (await evaluate('[...document.querySelectorAll(".cd-row")].map(n => n.innerText.replace(/\\s+/g, " ").trim())')) || []
check('收银台明细含宠物与宠物粮两行', detailRows.length >= 2, detailRows.join(' | '))
check('宠物明细标「1 只」', detailRows.some((t) => t.includes('1 只')), detailRows.join(' | '))
await shot('shot-cashier-mixed.png')

await clickByText('.cashier-body button', '立即支付')
const paidOk = await waitFor('!!document.querySelector(".cashier-success")', 20000)
check('支付成功（收银台成功页）', paidOk)
await sleep(500)
await clickByText('.cashier-success button', '完成')
await sleep(1200)

// ---------- 4) 支付后：清车 + 订单明细 + 宠物锁定 ----------
const cartAfter = await api('/pet/shopcart/items')
check('支付后服务端购物车已清空', (cartAfter.data || []).length === 0,
  `剩 ${(cartAfter.data || []).length} 条`)
const emptyVisible = await waitFor('!!document.querySelector(".cart-empty")', 5000)
check('页面购物车进入空态', emptyVisible)

const mine = await api('/pet/order/mine')
const rows = mine.rows || mine.data || []
const order = rows.find((o) => (o.items || []).some((it) => it.itemType === '2' && Number(it.petId) === Number(pet.petId)))
check('我的订单里出现含该宠物的订单', !!order, order ? order.orderNo : '未找到')
if (order) {
  const types = (order.items || []).map((i) => i.itemType)
  check('同一订单明细同时含宠物与商品', types.includes('2') && types.includes('1'), types.join(','))
  check('订单已支付', order.payStatus === '1', String(order.payStatus))
}
const petAfter = await api('/pet/info/' + pet.petId)
check('宠物已被订走（status=1）', petAfter.data && String(petAfter.data.status) === '1', petAfter.data ? String(petAfter.data.status) : '')

// ---------- 5) 收尾：释放宠物（未支付直接取消；已支付走退款审核，同意即回在售） ----------
if (order) {
  const cancel = await api(`/pet/order/cancel/${order.orderNo}?reason=` + encodeURIComponent('E2E 收尾'), { method: 'POST' })
  if (cancel.code === 200) {
    console.log('  ℹ 未支付订单已直接取消')
  } else {
    console.log('  ℹ 订单已支付，走退款审核释放宠物：' + (cancel.msg || ''))
    const apply = await api('/pet/refund/apply', { method: 'POST', body: JSON.stringify({ orderNo: order.orderNo, reason: 'E2E 收尾，宠物放回在售' }) })
    const refundId = apply.data && apply.data.refundId
    check('退款申请已提交', !!refundId, apply.msg || '')
    if (refundId) {
      const adminToken = await loginAs('admin', 'admin123')
      const audit = await fetch(BASE + '/dev-api/pet/refund/audit/' + refundId, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass: true, remark: 'E2E 收尾' })
      }).then((r) => r.json())
      check('后台同意退款', audit.code === 200, audit.msg || '')
    }
  }
  const petBack = await api('/pet/info/' + pet.petId)
  check('宠物回到在售（status=0）', petBack.data && String(petBack.data.status) === '0',
    petBack.data ? String(petBack.data.status) : '')
}
await api('/pet/shopcart/items', { method: 'DELETE' })

console.log(`\n===== ${pass} passed, ${fail} failed =====`)
chrome.kill()
process.exit(fail ? 1 : 0)
