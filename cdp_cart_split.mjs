/**
 * 验证：购物车只放宠物粮 + 订单区含宠物单（待支付/已支付/已取消）+ 顶栏 AI 星星图标已删
 * 用法: node cdp_cart_split.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn, execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const API = BASE + '/dev-api'
const PORT = 9396
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const redisCli = BASE.includes('47.116.73.25')
  ? (key) => execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET ${key}`], { encoding: 'utf8' })
  : (key) => execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', key], { encoding: 'utf8' })

const cap = await fetch(API + '/captchaImage').then(r => r.json())
const code = redisCli('captcha_codes:' + cap.uuid).replace(/[\\"]/g, '').trim()
const lr = await fetch(API + '/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'ry', password: 'admin123', code, uuid: cap.uuid })
}).then(r => r.json())
const TOKEN = lr.token
const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }

// 预置：购物车里放一件宠物粮（保证购物车标签非空）
const goods = await fetch(API + '/pet/goods/list?pageNum=1&pageSize=5&status=0', { headers: H }).then(r => r.json())
const g = (goods.rows || []).find(x => x.goodsId && Number(x.price) > 0)
await fetch(API + '/pet/shopcart/items', { method: 'POST', headers: H, body: JSON.stringify({
  itemType: '1', goodsId: g.goodsId, skuId: g.skuId || null, goodsName: g.goodsName,
  goodsImage: g.image || '', goodsSpec: g.spec || '', price: Number(g.price), qty: 1
}) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-split-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--window-size=1440,1000', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

const waitCdp = async () => { for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return } catch {} await sleep(250) } throw new Error('CDP') }
const newTab = async () => {
  for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return r.json() } catch {} }
  throw new Error('tab')
}
await waitCdp()
const tab = await newTab()
const ws = await new Promise((res, rej) => { const w = new WebSocket(tab.webSocketDebuggerUrl); w.addEventListener('open', () => res(w)); w.addEventListener('error', rej) })
let id = 0; const pend = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id) } })
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })
const shot = async (n) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(n, Buffer.from(s.data, 'base64')); console.log('  📷', n) }

await send('Page.navigate', { url: BASE + '/shop/cart' }); await sleep(4500)

// 1. 顶栏不再有 AI 星星入口，悬浮球仍在
const ai = await ev(`(() => ({
  entry: document.querySelectorAll('.as-entry').length,
  dock: !!document.querySelector('.assistant-dock'),
  launcher: !!document.querySelector('.as-orb, .assistant-dock .as-launcher, .assistant-dock button')
}))()`)
check('顶栏 AI 星星图标已移除', ai.entry === 0, 'as-entry=' + ai.entry)
check('右下角悬浮球仍在', ai.dock)

// 2. 四个标签
const tabs = await ev(`[...document.querySelectorAll('.ui-tab')].map(t => t.innerText.replace(/\\n/g,' ').trim())`)
check('标签为 购物车/待支付/已支付/已取消', tabs.length === 4 && tabs[0].startsWith('购物车') && tabs[1].startsWith('待支付') && tabs[2].startsWith('已支付') && tabs[3].startsWith('已取消'), tabs.join(' | '))

// 3. 购物车标签：只有宠物粮分组，无宠物行
const cart = await ev(`(() => ({
  groups: [...document.querySelectorAll('.group-name')].map(e => e.textContent.trim()),
  hasPetGroup: [...document.querySelectorAll('.group-name')].some(e => e.textContent.includes('在售宠物')),
  petRows: [...document.querySelectorAll('.cart-table tbody tr')].filter(tr => tr.innerText.includes('宠物') && !tr.classList.contains('group-row')).length,
  names: [...document.querySelectorAll('.goods__name')].map(e => e.textContent.trim())
}))()`)
check('购物车分组仅「宠物粮」', cart.groups.length === 1 && cart.groups[0] === '宠物粮', cart.groups.join('/'))
check('购物车无活体分组/行', !cart.hasPetGroup && cart.petRows === 0)
check('购物车展示宠物粮', cart.names.length >= 1, cart.names.join(','))
await shot('cart-split-1-cart.png')

// 4. 待支付：宠物单可见 + 有去支付按钮
await ev(`[...document.querySelectorAll('.ui-tab')].find(t => t.textContent.includes('待支付'))?.click()`); await sleep(900)
const unpaid = await ev(`(() => ({
  head: document.querySelector('.order-sheet__head')?.innerText.replace(/\\n/g,' ').trim(),
  orders: [...document.querySelectorAll('.order')].map(o => o.innerText.replace(/\\n/g,' ').slice(0, 70)),
  payBtn: [...document.querySelectorAll('.order button')].filter(b => b.textContent.includes('去支付')).length,
  hasChip: [...document.querySelectorAll('.ui-chip')].some(c => c.textContent.includes('宠物'))
}))()`)
check('待支付区含宠物单', unpaid.hasChip && unpaid.orders.some(o => /鱼|龙|猫|狗/.test(o)), unpaid.orders[0] || '空')
check('待支付单可点「去支付」', unpaid.payBtn >= 1, 'buttons=' + unpaid.payBtn)
await shot('cart-split-2-unpaid.png')

// 5. 已支付：宠物单可见
await ev(`[...document.querySelectorAll('.ui-tab')].find(t => t.textContent.trim().startsWith('已支付'))?.click()`); await sleep(900)
const paid = await ev(`(() => ({
  orders: [...document.querySelectorAll('.order')].map(o => o.innerText.replace(/\\n/g,' ').slice(0, 70)),
  petChip: [...document.querySelectorAll('.ui-chip')].filter(c => c.textContent.includes('宠物')).length,
  more: !!document.querySelector('.order-sheet__more')
}))()`)
check('已支付区含宠物订单', paid.petChip >= 1, '宠物徽标 ' + paid.petChip + ' 个')
check('订单区有「我的订单」直达链接', paid.more)
await shot('cart-split-3-paid.png')

// 6. 已取消标签可打开
await ev(`[...document.querySelectorAll('.ui-tab')].find(t => t.textContent.trim().startsWith('已取消'))?.click()`); await sleep(800)
const canceled = await ev(`document.querySelector('.order-sheet__head')?.innerText.replace(/\\n/g,' ').trim()`)
check('已取消区可打开', !!canceled && canceled.includes('已取消'), canceled)

console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`)
chrome.kill()
process.exit(fail ? 1 : 0)
