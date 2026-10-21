/**
 * 支付通道专项验证：三个通道可选、UI 支付成功、失败时显示真实业务提示（不再"系统异常"）、历史订单兜底
 * 用法: node cdp_pay_check.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9391
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function shopToken() {
  if (fs.existsSync('.tok_ry') && fs.statSync('.tok_ry').size > 50) return fs.readFileSync('.tok_ry', 'utf8').trim()
  execSync('node get_token.mjs ' + BASE + ' ry admin123 .tok_ry', { stdio: 'inherit' })
  return fs.readFileSync('.tok_ry', 'utf8').trim()
}
const TOKEN = shopToken()
const api = async (url, opts = {}) => {
  const r = await fetch(BASE + '/dev-api' + url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  return r.json()
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-pay-'))
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
  const toasts = () => evaluate(`[...document.querySelectorAll('.el-message')].map(e => e.innerText.trim()).join(' | ')`)

  // 预置两笔待支付订单：A 走 UI 正常支付，B 先由接口支付再用 UI 触发冲突
  const subA = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: 'UI测试通道A', goodsImage: '', goodsSpec: '1kg', price: 20, qty: 1 }]) })
  const subB = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: 'UI测试通道B', goodsImage: '', goodsSpec: '1kg', price: 30, qty: 1 }]) })
  const NO_A = subA?.data?.orderNo, NO_B = subB?.data?.orderNo
  check('预置两笔待支付订单', !!NO_A && !!NO_B, [NO_A, NO_B].join(','))

  await send('Page.navigate', { url: BASE + '/shop/order' }); await sleep(4000)

  // 1. 三个通道都渲染且可切换
  console.log('\n--- 1. 三通道渲染与切换 ---')
  await evaluate(`(() => {
    const card = [...document.querySelectorAll('.order-card, .order-item, .o-card')].find(c => c.innerText.includes('${NO_B}'))
    const btn = card && [...card.querySelectorAll('.el-button')].find(b => b.textContent.includes('去支付'))
    btn && btn.click(); return !!btn
  })()`)
  await sleep(900)
  const m1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    names: [...document.querySelectorAll('.pay-item .pm-info b')].map(b => b.textContent.trim()),
    active: document.querySelector('.pay-item.active .pm-info b')?.textContent.trim(),
    dialog: !!document.querySelector('.cashier-body')
  }))()`))
  check('收银台弹出', m1.dialog)
  check('三个通道齐全', m1.names.length === 3 && m1.names.includes('支付宝') && m1.names.includes('微信支付') && m1.names.includes('平台余额'), m1.names.join('/'))
  check('默认选中支付宝', m1.active === '支付宝', m1.active)

  const clickMethod = async (name) => {
    await evaluate(`(() => { const it = [...document.querySelectorAll('.pay-item')].find(x => x.innerText.includes('${name}')); it && it.click(); return !!it })()`)
    await sleep(350)
    return evaluate(`document.querySelector('.pay-item.active .pm-info b')?.textContent.trim()`)
  }
  check('可切到微信支付', (await clickMethod('微信支付')) === '微信支付')
  check('可切到平台余额', (await clickMethod('平台余额')) === '平台余额')
  await shot('pay-1-methods.png')

  // 2. 用 UI 正常支付（平台余额通道）
  console.log('\n--- 2. UI 支付成功 ---')
  await evaluate(`[...document.querySelectorAll('.cashier-actions .el-button')].find(b => b.textContent.includes('立即支付'))?.click()`)
  let ok = false
  for (let i = 0; i < 40; i++) { await sleep(300); if (await evaluate(`!!document.querySelector('.cashier-success')`)) { ok = true; break } }
  check('支付成功动画出现', ok)
  const okText = await evaluate(`document.querySelector('.cashier-success')?.innerText || ''`)
  check('成功页金额正确', okText.includes('30.00'), okText.replace(/\n/g, ' ').slice(0, 50))
  await shot('pay-2-success.png')
  const paid = await api('/pet/cart/list')
  const rowB = (paid.rows || []).find(r => r.orderNo === NO_B)
  check('订单状态已置为已支付', rowB && rowB.payStatus === '1', rowB && rowB.payStatus)
  check('支付通道已记录为余额', rowB && rowB.payMethod === 'balance', rowB && rowB.payMethod)

  // 3. 冲突支付：后端 500，前端要显示真实业务提示而不是"系统异常"
  console.log('\n--- 3. 失败提示可读性 ---')
  await evaluate(`[...document.querySelectorAll('.cashier-success .el-button')].find(b => b.textContent.includes('完成'))?.click()`)
  await sleep(700)
  // 重新打开 B 的收银台（页面此刻 B 已支付，无按钮）→ 改为对 A 先接口支付，再用 UI 点支付
  await api('/pet/cart/pay/' + NO_A, { method: 'POST', body: JSON.stringify({ payMethod: 'alipay' }) })
  await evaluate(`window.scrollTo(0,0)`)
  await evaluate(`(() => { location.reload(); return 1 })()`)
  await sleep(4000)
  // A 已被接口支付，但页面可能已刷新为已支付；此时直接验证拦截器：用页面内 axios 不可得，
  // 故改走业务路径：新建 C 单，打开收银台后由接口抢先支付，再点"立即支付"
  const subC = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: 'UI测试通道C', goodsImage: '', goodsSpec: '1kg', price: 5, qty: 1 }]) })
  const NO_C = subC?.data?.orderNo
  await evaluate(`(() => { location.reload(); return 1 })()`)
  await sleep(4000)
  const opened = await evaluate(`(() => {
    const card = [...document.querySelectorAll('.order-card, .order-item, .o-card')].find(c => c.innerText.includes('${NO_C}'))
    const btn = card && [...card.querySelectorAll('.el-button')].find(b => b.textContent.includes('去支付'))
    btn && btn.click(); return !!btn
  })()`)
  check('C 单收银台可打开', !!opened)
  await sleep(600)
  await api('/pet/cart/pay/' + NO_C, { method: 'POST', body: JSON.stringify({ payMethod: 'wechat' }) })
  await evaluate(`[...document.querySelectorAll('.cashier-actions .el-button')].find(b => b.textContent.includes('立即支付'))?.click()`)
  await sleep(1800)
  const t = await toasts()
  check('提示含真实原因', t.includes('订单不可支付'), t)
  check('不再显示"系统异常"', !t.includes('系统异常'), t)

  // 4. 历史订单（无单号）兜底
  console.log('\n--- 4. 历史订单兜底 ---')
  const legacyId = 871
  execSync(`"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -uroot -p123456 --default-character-set=utf8mb4 ry-pet -e "UPDATE pet_cart SET order_no=NULL,pay_status=0 WHERE cart_id=${legacyId}"`, { stdio: 'ignore' })
  await evaluate(`(() => { location.reload(); return 1 })()`)
  await sleep(4000)
  const legacy = JSON.parse(await evaluate(`(() => JSON.stringify({
    btn: [...document.querySelectorAll('.el-button')].some(b => b.textContent.trim() === '历史订单'),
    payBtns: [...document.querySelectorAll('.el-button')].filter(b => b.textContent.includes('去支付')).length
  }))()`))
  check('无单号订单显示「历史订单」按钮', legacy.btn)
  await evaluate(`(() => { const b = [...document.querySelectorAll('.el-button')].find(x => x.textContent.trim() === '历史订单'); b && b.click(); return !!b })()`)
  await sleep(800)
  const alertText = await evaluate(`document.querySelector('.el-message-box')?.innerText || ''`)
  check('点击给出重新下单引导', alertText.includes('重新下单'), alertText.replace(/\n/g, ' ').slice(0, 60))
  await shot('pay-3-legacy.png')
  await evaluate(`document.querySelector('.el-message-box__headerbtn')?.click()`)
  // 还原
  execSync(`"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -uroot -p123456 --default-character-set=utf8mb4 ry-pet -e "UPDATE pet_cart SET order_no=CONCAT('ORD20261017200000', LPAD(cart_id,3,'0')) WHERE cart_id=${legacyId}"`, { stdio: 'ignore' })

  // 清理测试订单
  for (const no of [NO_A, NO_B, NO_C]) {
    if (no) await api('/pet/cart/cancel/' + no, { method: 'POST' }).catch(() => {})
  }
  await fetch(BASE + '/dev-api/pet/cart/' + 'x', { method: 'DELETE' }).catch(() => {})

  console.log(`\n===== 结果: ${pass} 通过 / ${fail} 失败 =====`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('脚本异常:', e); process.exit(2) })
