/**
 * 后台支付管理 UI 回归：订单总览卡片 / 支付状态筛选 / 支付说明列 / 支付流水页
 * 用法: node cdp_admin_payment.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1440, H = 950
const PORT = 9395
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function adminToken() {
  if (fs.existsSync('.admintoken') && fs.statSync('.admintoken').size > 50) return fs.readFileSync('.admintoken', 'utf8').trim()
  execSync('node get_token.mjs ' + BASE + ' admin admin123 .admintoken', { stdio: 'inherit' })
  return fs.readFileSync('.admintoken', 'utf8').trim()
}
const TOKEN = adminToken()

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-admpay-'))
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
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Network.setCookie', { name: 'Admin-Token', value: TOKEN, url: BASE + '/', path: '/' })

  // ============ 1. 购物车管理：总览卡 ============
  console.log('\n--- 1. 订单总览 ---')
  await send('Page.navigate', { url: BASE + '/admin/cart' }); await sleep(5500)
  const ov = JSON.parse(await evaluate(`(() => JSON.stringify({
    path: location.pathname,
    cards: [...document.querySelectorAll('.ov-card')].map(c => c.innerText.replace(/\\n/g, '|')),
    hasPayStateCol: document.body.innerText.includes('支付状态'),
    hasExplainCol: document.body.innerText.includes('支付说明'),
    rows: document.querySelectorAll('.el-table__body .el-table__row').length
  }))()`))
  check('进入购物车管理页', ov.path === '/admin/cart', ov.path)
  check('四张状态卡渲染', ov.cards.length === 4, ov.cards.join(' / '))
  check('统计卡有笔数', ov.cards.every(c => /\d+\s*\|?\s*笔/.test(c)), ov.cards[0])
  check('存在支付状态列', ov.hasPayStateCol)
  check('存在支付说明列', ov.hasExplainCol)
  check('列表有订单数据', ov.rows > 0, ov.rows + ' 行')
  await shot('admin-pay-1-overview.png')

  // ============ 2. 点击"支付失败"卡筛选 ============
  console.log('\n--- 2. 支付失败筛选 ---')
  await evaluate(`(() => { const c = [...document.querySelectorAll('.ov-card')].find(x => x.innerText.includes('支付失败')); c && c.click(); return !!c })()`)
  await sleep(2500)
  const f1 = JSON.parse(await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.el-table__body .el-table__row')]
    return JSON.stringify({
      active: !!document.querySelector('.ov-card.active'),
      n: rows.length,
      allFail: rows.every(r => r.innerText.includes('支付失败')),
      reasons: rows.map(r => (r.innerText.match(/(余额不足|不可支付|失败)/) || [''])[0]).slice(0, 3)
    })
  })()`))
  check('卡片进入选中态', f1.active)
  check('筛选后仍有数据', f1.n > 0, f1.n + ' 行')
  check('结果全部为支付失败', f1.allFail)
  await shot('admin-pay-2-fail-filter.png')

  // 下拉筛选：已支付
  console.log('\n--- 3. 下拉切换支付状态 ---')
  await evaluate(`(() => {
    const item = [...document.querySelectorAll('.el-form-item')].find(f => f.innerText.includes('支付状态'))
    const sel = item && item.querySelector('.el-select')
    sel && sel.querySelector('.el-select__wrapper')?.click()
    return !!sel
  })()`)
  await sleep(700)
  const picked = await evaluate(`(() => {
    const it = [...document.querySelectorAll('.el-select-dropdown__item')].find(x => x.textContent.trim() === '已支付')
    it && it.click(); return !!it
  })()`)
  await sleep(2200)
  const paid = JSON.parse(await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.el-table__body .el-table__row')]
    return JSON.stringify({ n: rows.length, allPaid: rows.every(r => r.innerText.includes('已支付')) })
  })()`))
  check('下拉选中「已支付」', !!picked)
  check('已支付列表数据正确', paid.n > 0 && paid.allPaid, paid.n + ' 行')

  // ============ 4. 支付流水页 ============
  console.log('\n--- 4. 支付流水页 ---')
  await send('Page.navigate', { url: BASE + '/admin/payment' }); await sleep(5000)
  const pl = JSON.parse(await evaluate(`(() => JSON.stringify({
    path: location.pathname,
    summary: [...document.querySelectorAll('.ps-item')].map(x => x.innerText.replace(/\\n/g, '|')),
    rows: document.querySelectorAll('.el-table__body .el-table__row').length,
    hasResultTag: document.body.innerText.includes('成功') && document.body.innerText.includes('失败'),
    reasons: [...document.querySelectorAll('.el-table__body .el-table__row')].slice(0, 3).map(r => r.innerText.split('\\n').slice(-1)[0])
  }))()`))
  check('进入支付流水页', pl.path === '/admin/payment', pl.path)
  check('四项汇总条渲染', pl.summary.length === 4, pl.summary.join(' / '))
  check('流水表格有数据', pl.rows > 0, pl.rows + ' 行')
  check('结果列含成功/失败标签', pl.hasResultTag)
  check('显示失败原因文本', pl.reasons.some(r => /失败|余额不足|不可支付/.test(r)), pl.reasons.join(' ; '))
  await shot('admin-pay-3-log-page.png')

  // 筛选失败
  await evaluate(`(() => {
    const item = [...document.querySelectorAll('.el-form-item')].find(f => f.innerText.includes('结果'))
    const sel = item && item.querySelector('.el-select')
    sel && sel.querySelector('.el-select__wrapper')?.click(); return !!sel
  })()`)
  await sleep(700)
  await evaluate(`(() => { const it = [...document.querySelectorAll('.el-select-dropdown__item')].find(x => x.textContent.trim() === '失败'); it && it.click(); return !!it })()`)
  await sleep(2000)
  const fl = JSON.parse(await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.el-table__body .el-table__row')]
    return JSON.stringify({ n: rows.length, allFail: rows.every(r => r.innerText.includes('失败')) })
  })()`))
  check('流水筛选「失败」有效', fl.n > 0 && fl.allFail, fl.n + ' 行')

  console.log(`\n===== 结果: ${pass} 通过 / ${fail} 失败 =====`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('脚本异常:', e); process.exit(2) })
