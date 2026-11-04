/**
 * 移动端页脚布局验证：390×844，品牌块占满行、两组链接并排两列
 * 用法: node cdp_footer_mobile.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 390, H = 844
const PORT = 9393
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-foot-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--window-size=${W},${H}`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

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
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4500)

  // 滚到页脚再量
  await evaluate(`document.querySelector('.footer').scrollIntoView({block:'end'})`); await sleep(800)

  const m = await evaluate(`(() => {
    const grid = document.querySelector('.footer .foot-grid')
    const brand = document.querySelector('.footer .foot-brand')
    const cols = [...document.querySelectorAll('.footer .foot-col')]
    const gs = getComputedStyle(grid)
    const colRects = cols.map(c => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })
    return {
      columns: gs.gridTemplateColumns.split(' ').length,
      brandSpan: getComputedStyle(brand).gridColumnStart + '-' + getComputedStyle(brand).gridColumnEnd,
      brandW: Math.round(brand.getBoundingClientRect().width),
      gridW: Math.round(grid.getBoundingClientRect().width),
      colRects,
      sameRow: colRects.length === 2 && Math.abs(colRects[0].y - colRects[1].y) < 4,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      footerBottomVisible: (() => { const b = document.querySelector('.footer .foot-bot').getBoundingClientRect(); return b.bottom <= window.innerHeight + 2 })()
    }
  })()`)
  check('移动端网格为两列', m.columns === 2, 'columns=' + m.columns)
  check('品牌块占满整行', m.brandSpan.includes('-1') || m.brandW >= m.gridW - 2, `span=${m.brandSpan} w=${m.brandW}/${m.gridW}`)
  check('两组链接并排同一行', m.sameRow, JSON.stringify(m.colRects))
  check('无横向溢出', !m.overflowX)
  check('页脚底行未被底栏盖住', m.footerBottomVisible)
  await shot('footer-mobile-fixed.png')

  console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e); try { chrome.kill() } catch {}; process.exit(1) })
