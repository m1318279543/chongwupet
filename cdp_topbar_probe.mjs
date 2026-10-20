/**
 * 390px 视口下诊断 shop 顶栏布局：输出 bar-inner 直接子元素盒模型与 nav 滚动状态
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const PORT = 9357
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-topbar-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  `--window-size=390,844`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

const waitCdp = async () => { for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return } catch {} await sleep(250) } throw new Error('no cdp') }
const newTab = async () => { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('no tab') }
const connect = (url) => new Promise((res, rej) => { const w = new WebSocket(url); w.addEventListener('open', () => res(w)); w.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pend = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id) } })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value

  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(3500)

  console.log(await ev(`(() => {
    const bar = document.querySelector('.bar-inner')
    if (!bar) return 'NO BAR'
    const cs = getComputedStyle(bar)
    const kids = [...bar.children].map(el => {
      const r = el.getBoundingClientRect()
      return { cls: el.className, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }
    })
    const nav = bar.querySelector('.nav')
    const navCs = nav ? getComputedStyle(nav) : null
    return JSON.stringify({
      barRect: (() => { const r = bar.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
      display: cs.display, flexWrap: cs.flexWrap, height: cs.height, overflowX: cs.overflowX,
      kids,
      nav: nav ? { clientW: nav.clientWidth, scrollW: nav.scrollWidth, overflowX: navCs.overflowX, flex: navCs.flex } : null,
      loginBtn: (() => { const b = [...document.querySelectorAll('.bar-inner .el-button')].map(x => { const r = x.getBoundingClientRect(); return { t: x.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right) } }); return b })()
    }, null, 1)
  })()`))
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
