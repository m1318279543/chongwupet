// 验收：①宠物页页内改搜 ②首页粮卡就地弹详情
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'

const BASE = process.env.FOOD_BASE || 'http://localhost:82'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'D:/Undergraduate_courses/qiyekaifa/chongwupet/shots'
fs.mkdirSync(OUT, { recursive: true })
const PORT = 9334
const userData = path.join(os.tmpdir(), 'cdp-research-' + Date.now())
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + userData, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
function getJSON(url) { return new Promise((res, rej) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej)) }

await sleep(2200)
const tabs = await getJSON(`http://127.0.0.1:${PORT}/json/list`)
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result
const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64')) }

await send('Page.enable'); await send('Runtime.enable')
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' | ' + detail : '')) }
const click = async (expr) => { await evalJs(`(() => { const el = ${expr}; if (!el) return 'no-el'; el.click(); return 'ok' })()`) }

// ========== 场景A：宠物页带 kw 进入，页内改搜 ==========
await send('Page.navigate', { url: BASE + '/shop/pets?kw=' + encodeURIComponent('金毛') })
await sleep(3200)
let r = await evalJs(`(() => ({
  path: location.pathname + location.search,
  kw: document.querySelector('.kw-edit input')?.value || null,
  firstCard: document.querySelector('.grid .pet-card, .grid article, .grid [class*=card]')?.textContent?.slice(0, 24) || ''
}))()`)
console.log('[A1]', JSON.stringify(r.result?.value || r))
check('A1: 带 kw 进入显示搜索框', (r.result?.value?.kw || '') === '金毛', JSON.stringify(r.result?.value))

// 改搜「布偶」并回车
await evalJs(`(() => {
  const inp = document.querySelector('.kw-edit input')
  if (!inp) return 'no-input'
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(inp, '布偶')
  inp.dispatchEvent(new Event('input', { bubbles: true }))
  return 'ok'
})()`)
await evalJs(`(() => { const inp = document.querySelector('.kw-edit input'); inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })); return 'ok' })()`)
await sleep(1800)
r = await evalJs(`(() => ({
  url: location.search,
  kw: document.querySelector('.kw-edit input')?.value,
  bodyHasBuOu: document.querySelector('.grid')?.textContent || ''
}))()`)
console.log('[A2]', JSON.stringify({ url: r.result?.value?.url, kw: r.result?.value?.kw, hasBuOu: (r.result?.value?.bodyHasBuOu || '').includes('布偶'), head: (r.result?.value?.bodyHasBuOu || '').slice(0, 40) }))
check('A2: 页内改搜布偶生效（不回首页）', decodeURIComponent(r.result?.value?.url || '').includes('布偶') && (r.result?.value?.kw) === '布偶', JSON.stringify({ url: r.result?.value?.url }))
await shot('pets-research.png')

// ========== 场景B：首页粮卡就地弹详情 ==========
await send('Page.navigate', { url: BASE + '/shop/home' })
await sleep(3500)
r = await evalJs(`(() => ({
  cards: document.querySelectorAll('.food-card').length,
  dialogBefore: !!document.querySelector('.food-detail-dialog')
}))()`)
console.log('[B1]', JSON.stringify(r.result?.value))
check('B1: 首页有粮卡且初始无弹窗', (r.result?.value?.cards || 0) > 0 && !r.result?.value?.dialogBefore, 'cards=' + r.result?.value?.cards)

await click(`document.querySelectorAll('.food-card')[0]`)
await sleep(2200)
r = await evalJs(`(() => {
  const dlg = document.querySelector('.food-detail-dialog')
  return {
    dialogVisible: !!dlg && dlg.offsetParent !== null,
    stillHome: location.pathname === '/shop/home',
    name: dlg?.querySelector('.detail-name')?.textContent?.trim() || '',
    hasClose: !!dlg?.querySelector('.el-dialog__headerbtn'),
    hasSocial: !!dlg?.querySelector('.pet-social')
  }
})()`)
console.log('[B2]', JSON.stringify(r.result?.value))
check('B2: 点粮卡就地弹详情（仍在家页）', r.result?.value?.dialogVisible && r.result?.value?.stillHome && !!r.result?.value?.name, JSON.stringify(r.result?.value))
await shot('home-food-dialog.png')

// 点 X 关闭
await click(`document.querySelector('.food-detail-dialog .el-dialog__headerbtn')`)
await sleep(1200)
r = await evalJs(`(() => {
  const dlg = document.querySelector('.food-detail-dialog')
  return { visible: !!dlg && dlg.offsetParent !== null }
})()`)
check('B3: 点 X 关闭弹窗', r.result?.value?.visible === false, JSON.stringify(r.result?.value))

// 再点一张卡确认可重复打开
await click(`document.querySelectorAll('.food-card')[1] || document.querySelectorAll('.food-card')[0]`)
await sleep(1600)
r = await evalJs(`(() => { const dlg = document.querySelector('.food-detail-dialog'); return { visible: !!dlg && dlg.offsetParent !== null } })()`)
check('B4: 可再次打开另一张卡', r.result?.value?.visible === true)

// ========== 场景C：粮专区页弹窗回归 ==========
await send('Page.navigate', { url: BASE + '/shop/food' })
await sleep(3200)
r = await evalJs(`(() => ({
  cards: document.querySelectorAll('.card').length,
  back: !!document.querySelector('.ui-back')
}))()`)
console.log('[C1]', JSON.stringify(r.result?.value))
await click(`document.querySelector('.grid .card')`)
await sleep(2000)
r = await evalJs(`(() => {
  const dlg = document.querySelector('.food-detail-dialog')
  return { visible: !!dlg && dlg.offsetParent !== null, name: dlg?.querySelector('.detail-name')?.textContent?.trim() || '' }
})()`)
check('C1: 粮专区页弹窗回归正常', r.result?.value?.visible && !!r.result?.value?.name, JSON.stringify(r.result?.value))
await shot('food-page-dialog.png')

ws.close(); chrome.kill()
try { fs.rmSync(userData, { recursive: true, force: true }) } catch { }
const fails = results.filter(x => !x).length
console.log(`\n== ${results.length - fails}/${results.length} 通过 ==`)
process.exit(fails ? 1 : 0)
