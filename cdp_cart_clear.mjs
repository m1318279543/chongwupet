/**
 * UI 冒烟：购物车结算支付后页面购物车必须清空（clearAfterCheckout 时序修复）
 * 用法: node cdp_cart_clear.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn, execSync, execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9392
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 登录拿 Shop-Token（验证码：本地 D:/Redis/redis-cli.exe，线上走 ssh_run.py） */
function login() {
  const cap = execSync(`node -e "fetch('${BASE}/dev-api/captchaImage').then(r=>r.json()).then(j=>console.log(JSON.stringify({uuid:j.uuid})))"`).toString().trim()
  const uuid = JSON.parse(cap).uuid
  let code
  if (BASE.includes('47.116.73.25')) {
    code = execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET captcha_codes:${uuid}`], { encoding: 'utf8' })
  } else {
    code = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', `captcha_codes:${uuid}`], { encoding: 'utf8' })
  }
  code = code.replace(/[\\"]/g, '').trim()
  const req = fetch(BASE + '/dev-api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ry', password: 'admin123', code, uuid })
  })
  return req.then(r => r.json()).then(j => {
    if (!j.token) throw new Error('登录失败: ' + JSON.stringify(j).slice(0, 120))
    return j.token
  })
}

const TOKEN = await login()
const api = async (url, opts = {}) => {
  const r = await fetch(BASE + '/dev-api' + url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  return r.json()
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cart-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

  // 预置：挑一件在售宠物粮加入购物车（UI 加购路径走 store，这里直接接口加购更稳）
  const goods = await api('/pet/goods/list?pageNum=1&pageSize=5&status=0')
  const g = (goods.rows || []).find(x => x.goodsId && Number(x.price) > 0)
  check('找到在售宠物粮', !!g, g ? g.goodsName : '')
  const add = await api('/pet/shopcart/items', { method: 'POST', body: JSON.stringify({
    itemType: '1', goodsId: g.goodsId, skuId: g.skuId || null,
    goodsName: g.goodsName, goodsImage: g.image || '', goodsSpec: g.spec || '', price: Number(g.price), qty: 1
  }) })
  check('接口加购成功', (add.data || []).some(r => r.goodsId === g.goodsId))

  await send('Page.navigate', { url: BASE + '/shop/cart' }); await sleep(4000)

  const tabCount = () => evaluate(`(() => {
    const t = [...document.querySelectorAll('.ui-tab')].find(x => x.textContent.includes('购物车'))
    return t ? Number(t.querySelector('.ui-tab__n')?.textContent || -1) : -1
  })()`)
  const before = await tabCount()
  check('购物车标签计数=1（结算前）', before === 1, 'count=' + before)
  const rowVisible = await evaluate(`!!document.querySelector('.cart-table') && document.querySelector('.cart-table').innerText.includes('${g.goodsName}')`)
  check('购物车表格显示该商品', !!rowVisible)
  await shot('cart-clear-1-before.png')

  // 结算 → 收银台 → 立即支付
  await evaluate(`document.querySelector('.checkout__go')?.click()`)
  let opened = false
  for (let i = 0; i < 20; i++) { await sleep(300); if (await evaluate(`!!document.querySelector('.cashier-body')`)) { opened = true; break } }
  check('收银台弹出', opened)
  await evaluate(`[...document.querySelectorAll('.cashier-actions button')].find(b => b.textContent.includes('立即支付'))?.click()`)
  let paid = false
  for (let i = 0; i < 50; i++) { await sleep(300); if (await evaluate(`!!document.querySelector('.cashier-success')`)) { paid = true; break } }
  check('支付成功页出现', paid)
  await shot('cart-clear-2-paid.png')

  // 点完成 → 购物车应清空（clearAfterCheckout：等服务端删完再回填）
  await evaluate(`[...document.querySelectorAll('.cashier-success button')].find(b => b.textContent.includes('完成'))?.click()`)
  let after = -2
  for (let i = 0; i < 30; i++) { await sleep(400); after = await tabCount(); if (after === 0) break }
  check('支付后购物车标签计数=0', after === 0, 'count=' + after)
  const empty = await evaluate(`!!document.querySelector('.cart-empty')`)
  check('购物车空态出现', !!empty)
  await shot('cart-clear-3-after.png')

  console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e); try { chrome.kill() } catch {} ; process.exit(1) })
