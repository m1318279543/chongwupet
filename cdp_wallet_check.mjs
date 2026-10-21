/**
 * 余额通道专项：余额展示、余额不足真实拦截（含真实可用余额/需付金额）、余额充足扣款、充值、流水落库
 * 用法: node cdp_wallet_check.mjs [BASE]
 * 说明：脚本自造订单（金额 = 当前余额 + 300 触发不足，5 元验证充足），跑完自动清理测试数据
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_LOCAL = /127\.0\.0\.1|localhost/.test(BASE)
const RUN = String(Date.now()).slice(-6)
const W = 1280, H = 900
const PORT = 9397
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function shopToken() {
  if (fs.existsSync('.tok_ry') && fs.statSync('.tok_ry').size > 50) return fs.readFileSync('.tok_ry', 'utf8').trim()
  execSync('node get_token.mjs ' + BASE + ' ry admin123 .tok_ry', { stdio: 'inherit' })
  return fs.readFileSync('.tok_ry', 'utf8').trim()
}
function adminToken() {
  if (fs.existsSync('.admintoken') && fs.statSync('.admintoken').size > 50) return fs.readFileSync('.admintoken', 'utf8').trim()
  execSync('node get_token.mjs ' + BASE + ' admin admin123 .admintoken', { stdio: 'inherit' })
  return fs.readFileSync('.admintoken', 'utf8').trim()
}
const TOKEN = shopToken()
const AT = adminToken()
const api = async (url, opts = {}) => {
  const r = await fetch(BASE + '/dev-api' + url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  return r.json()
}
const adminApi = (url) => fetch(BASE + '/dev-api' + url, { headers: { Authorization: 'Bearer ' + AT } }).then(r => r.json())

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-wallet-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

const BIG_NAME = 'UI测试余额不足' + RUN
const OK_NAME = 'UI测试余额OK' + RUN
let bigNo = '', okNo = ''

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

  // 基线余额
  const w0 = Number((await api('/pet/wallet/mine')).data.balance)
  const bigAmount = Math.ceil(w0) + 300
  console.log('\n--- 0. 基线 ---')
  check('钱包接口可用', Number.isFinite(w0), '¥' + w0)
  check('构造必失败金额', bigAmount > w0, '¥' + bigAmount + ' > ¥' + w0)

  // 造两笔订单
  const s1 = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: BIG_NAME, goodsImage: '', goodsSpec: '1件', price: bigAmount, qty: 1 }]) })
  const s2 = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: OK_NAME, goodsImage: '', goodsSpec: '1件', price: 5, qty: 1 }]) })
  bigNo = (s1.data || {}).orderNo
  okNo = (s2.data || {}).orderNo
  check('测试订单已创建', !!bigNo && !!okNo, bigNo + ' / ' + okNo)

  console.log('\n--- 1. 收银台余额展示 ---')
  await send('Page.navigate', { url: BASE + '/shop/order' })
  await sleep(4200)
  check('订单页已加载', !!(await evaluate(`!!document.querySelector('.order-card')`)))

  const openBig = await evaluate(`(() => {
    const c = [...document.querySelectorAll('.order-card')].find(el => el.innerText.includes(${JSON.stringify(BIG_NAME)}))
    if (!c) return false
    const b = [...c.querySelectorAll('.el-button')].find(x => x.textContent.includes('去支付'))
    if (!b) return false
    b.click(); return true
  })()`)
  check('打开大额订单收银台', openBig)
  await sleep(900)

  const desc = await evaluate(`(() => {
    const item = [...document.querySelectorAll('.pay-item')].find(el => el.innerText.includes('平台余额'))
    return item ? item.querySelector('em')?.textContent.trim() : ''
  })()`)
  check('余额通道显示可用余额', /可用 ¥\d+\.\d{2}/.test(desc || ''), desc)

  await evaluate(`(() => { const i = [...document.querySelectorAll('.pay-item')].find(el => el.innerText.includes('平台余额')); i && i.click(); return 1 })()`)
  await sleep(500)
  const tip = await evaluate(`(() => { const t = document.querySelector('.balance-tip'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : '' })()`)
  check('提示条标出余额不足', /余额不足/.test(tip) && /可用 ¥/.test(tip) && tip.includes('¥' + bigAmount + '.00'), tip)
  check('提供去充值入口', !!(await evaluate(`(() => { const t = document.querySelector('.balance-tip'); return !!(t && [...t.querySelectorAll('button')].find(b => b.textContent.includes('充值'))) })()`)))
  await shot('wallet-1-insufficient.png')

  console.log('\n--- 2. 余额不足真实拦截 ---')
  await evaluate(`(() => { const b = [...document.querySelectorAll('.cashier-actions .el-button')].find(x => x.textContent.includes('立即支付')); b && b.click(); return 1 })()`)
  await sleep(2400)
  const msg = await toasts()
  check('提示真实原因（含金额）', /余额不足/.test(msg) && msg.includes('¥' + bigAmount + '.00'), msg)
  check('未误报"系统异常"', !/系统异常/.test(msg), msg)
  const wAfterFail = Number((await api('/pet/wallet/mine')).data.balance)
  check('失败不扣款', Math.abs(wAfterFail - w0) < 0.001, '¥' + wAfterFail)
  await shot('wallet-2-blocked.png')

  const logs = await adminApi('/pet/payment/list?pageNum=1&pageSize=20&orderNo=' + bigNo)
  const failLog = (logs.rows || []).find(r => r.result === 'fail')
  check('失败流水已落库', !!failLog && /余额不足（可用/.test(failLog.reason || ''), failLog && failLog.reason)

  console.log('\n--- 3. 余额充足扣款 ---')
  await evaluate(`(() => { document.querySelectorAll('.el-dialog__headerbtn').forEach(b => b.click()); return 1 })()`)
  await sleep(700)
  const openOk = await evaluate(`(() => {
    const c = [...document.querySelectorAll('.order-card')].find(el => el.innerText.includes(${JSON.stringify(OK_NAME)}))
    if (!c) return false
    const b = [...c.querySelectorAll('.el-button')].find(x => x.textContent.includes('去支付'))
    if (!b) return false
    b.click(); return true
  })()`)
  check('打开小额订单收银台', openOk)
  await sleep(900)
  await evaluate(`(() => { const i = [...document.querySelectorAll('.pay-item')].find(el => el.innerText.includes('平台余额')); i && i.click(); return 1 })()`)
  await sleep(400)
  const tip2 = await evaluate(`(() => { const t = document.querySelector('.balance-tip'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : '' })()`)
  check('余额充足显示剩余金额', /支付后剩余/.test(tip2), tip2)
  await evaluate(`(() => { const b = [...document.querySelectorAll('.cashier-actions .el-button')].find(x => x.textContent.includes('立即支付')); b && b.click(); return 1 })()`)
  await sleep(2600)
  check('支付成功页', !!(await evaluate(`!!document.querySelector('.cashier-success')`)))
  const wAfterOk = Number((await api('/pet/wallet/mine')).data.balance)
  check('余额正确扣减 5 元', Math.abs(wAfterOk - (w0 - 5)) < 0.001, '¥' + wAfterOk)
  const okLog = (await adminApi('/pet/payment/list?pageNum=1&pageSize=20&orderNo=' + okNo)).rows || []
  check('成功流水记录剩余余额', okLog.some(r => r.result === 'success' && /余额 ¥/.test(r.reason || '')), okLog[0] && okLog[0].reason)
  await shot('wallet-3-paid.png')

  console.log('\n--- 4. 充值 ---')
  const r = await api('/pet/wallet/recharge', { method: 'POST', body: JSON.stringify({ amount: 100 }) })
  check('充值接口成功', r.code === 200, r.msg)
  const wAfterRecharge = Number((await api('/pet/wallet/mine')).data.balance)
  check('余额已增加 100', Math.abs(wAfterRecharge - (wAfterOk + 100)) < 0.001, '¥' + wAfterRecharge)

  console.log(`\n===== 结果: ${pass} 通过 / ${fail} 失败 =====`)

  // 清理测试数据
  try {
    if (IS_LOCAL) {
      const M = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe'
      execSync(`"${M}" -uroot -p123456 --default-character-set=utf8mb4 ry-pet -e "DELETE FROM pet_cart WHERE goods_name LIKE 'UI测试余额%'; DELETE FROM pet_payment_log WHERE order_no NOT IN (SELECT order_no FROM pet_cart WHERE order_no IS NOT NULL); UPDATE pet_wallet w JOIN sys_user u ON u.user_id=w.user_id SET w.balance=200 WHERE u.user_name='ry';"`, { stdio: 'ignore' })
      console.log('  🧹 本地测试数据已清理，ry 余额还原 200')
    } else {
      const rows = (await api('/pet/cart/list?pageNum=1&pageSize=100')).rows || []
      const ids = rows.filter(x => (x.goodsName || '').includes('UI测试余额')).map(x => x.cartId)
      if (ids.length) await adminApi('/pet/cart/' + ids.join(','))
      console.log('  🧹 线上测试订单已清理:', ids.length, '条（请手工核对余额）')
    }
  } catch (e) { console.log('  ⚠️ 清理失败:', e.message) }

  ws.close(); chrome.kill()
  setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(async e => {
  console.error('ERR', e)
  try { chrome.kill() } catch {}
  process.exit(2)
})
