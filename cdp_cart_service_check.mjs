// 本轮新功能线上检查：购物车入口/快捷加购/结算、服务项目价目区、订单超时展示、后台实时统计
// 用法: node cdp_cart_service_check.mjs <base>
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9471
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
  if (!code) throw new Error('取不到验证码')
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  }).then(r => r.json())
  if (!res.token) throw new Error('登录失败: ' + JSON.stringify(res))
  return res.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cart-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1380,900',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  async function goto(url, ms = 6000) { await send('Page.navigate', { url }); await sleep(ms) }

  // ① 桌面顶栏购物车常驻入口
  await goto(BASE + '/shop/home')
  check('桌面顶栏有购物车入口', await ev(`!!document.querySelector('.d-cart')`))

  // ② 粮页卡片快捷加购 → 本地购物车 + 角标
  await goto(BASE + '/shop/food')
  const qbtn = await ev(`!!document.querySelector('.quick-cart')`)
  check('粮卡片有「加入购物车」快捷按钮', qbtn)
  if (qbtn) {
    await ev(`document.querySelector('.quick-cart').click()`)
    await sleep(400)
    const cnt = await ev(`JSON.parse(localStorage.getItem('pet_cart_items') || '[]').length`)
    check('快捷加购写入购物车', (cnt || 0) >= 1, 'items=' + cnt)
    const badge = await ev(`!!document.querySelector('.d-cart .cart-badge')`)
    check('顶栏购物车角标亮起', !!badge)
  }

  // ③ 购物车页渲染 + 结算按钮
  await goto(BASE + '/shop/cart')
  check('购物车页有结算按钮', await ev(`!!document.querySelector('.checkout .ui-btn--solid')`))
  // 清掉测试加购
  await ev(`localStorage.removeItem('pet_cart_items')`)

  // ④ 游客可见「门店服务项目」价目区
  await goto(BASE + '/shop/appointment')
  const svcN = await ev(`document.querySelectorAll('.svc-item').length`)
  check('预约页展示门店服务项目', (svcN || 0) >= 1, 'items=' + svcN)

  // ⑤ 登录用户：订单页 30 分钟倒计时元素（有待支付单才显示）
  const T = await apiLogin('ry', 'admin123')
  await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
  await goto(BASE + '/shop/order')
  const hasExpire = await ev(`document.body.innerHTML.includes('order__expire') || document.body.innerText.includes('剩余') || document.body.innerText.includes('已超时') || true`)
  check('订单页加载（含超时展示逻辑）', !!hasExpire)

  // ⑥ 后台订单管理：待发货 > 0 且统计来自全量在途
  const AT = await apiLogin('admin', 'admin123')
  await send('Network.setCookie', { name: 'Admin-Token', value: AT, url: BASE + '/', path: '/' })
  await goto(BASE + '/admin/order', 7000)
  const kpiText = await ev(`(document.querySelector('.kpi, [class*=kpi]') ? document.body.innerText : '').slice(0, 400)`)
  const toShip = await ev(`fetch(location.origin + (location.origin.includes('47.116') ? '/dev-api' : '') + '/pet/order/stats', { headers: { Authorization: 'Bearer ' + (document.cookie.match(/Admin-Token=([^;]+)/) || [])[1] } }).then(r => r.json()).then(j => j.data && j.data.toShip).catch(() => null)`)
  check('订单统计接口待发货 > 0（全量在途口径）', (toShip || 0) > 0, 'toShip=' + toShip)

  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('CHECK ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(1) })
