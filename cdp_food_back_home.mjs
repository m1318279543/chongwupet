// 检查宠物粮页是否具备返回首页入口：桌面端/移动端截图 + DOM 探测
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.FOOD_BASE || 'http://localhost:82'
const OUT = 'D:/Undergraduate_courses/qiyekaifa/chongwupet/shots'
fs.mkdirSync(OUT, { recursive: true })
const PORT = 9333
const userData = path.join(os.tmpdir(), 'cdp-foodhome-' + Date.now())
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + userData, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
function getJSON(url) {
  return new Promise((res, rej) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej))
}

await sleep(2200)
const tabs = await getJSON(`http://127.0.0.1:${PORT}/json/list`)
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result
const shot = async (file) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')

const results = []
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' | ' + detail : '')) }

for (const [tag, w, h, mobile] of [['desk', 1440, 900, false], ['mobile', 390, 844, true]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await send('Page.navigate', { url: BASE + '/shop/food' })
  await sleep(3500)
  const info = await evalJs(`(() => {
    const q = (s) => Array.from(document.querySelectorAll(s))
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' }
    const backs = q('a,button').filter(el => /首页|返回/.test((el.textContent || '').trim()) && vis(el))
    const topbar = document.querySelector('.topbar')
    return {
      title: document.querySelector('.ui-title')?.textContent?.trim() || '',
      navVisible: (() => { const n = document.querySelector('.nav'); return !!n && vis(n) })(),
      hamburger: (() => { const b = document.querySelector('.m-burger, .burger, .menu-btn'); return !!b && vis(b) })(),
      tabbar: (() => { const t = document.querySelector('.tabbar'); return !!t && vis(t) })(),
      backs: backs.map(el => ({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 10), cls: el.className })),
      topbarSticky: topbar ? getComputedStyle(topbar).position : 'none'
    }
  })()`)
  const v = info.result?.value || {}
  console.log('[' + tag + ']', JSON.stringify(v))

  check(`${tag}: 页面已渲染`, !!v.title, v.title)
  if (tag === 'desk') {
    check('desk: 顶栏主导航可见', v.navVisible === true)
    check('desk: 存在可见的「首页/返回」入口', (v.backs || []).length > 0, JSON.stringify(v.backs))
  } else {
    check('mobile: 存在可见的「首页/返回」入口', (v.backs || []).length > 0, JSON.stringify(v.backs))
  }
  await shot(`food-${tag}.png`)
}

// 滚到底再看一次（检验吸顶导航是否常驻）
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: BASE + '/shop/food' })
await sleep(3000)
await evalJs('window.scrollTo(0, document.body.scrollHeight)')
await sleep(800)
const scrolled = await evalJs(`(() => {
  const els = Array.from(document.querySelectorAll('.nav, .nav-item'))
  const home = Array.from(document.querySelectorAll('a')).find(a => (a.textContent||'').trim() === '首页')
  const r = home ? home.getBoundingClientRect() : null
  return { scrollY: window.scrollY, homeTop: r ? Math.round(r.top) : null, homeVisible: r ? (r.top >= 0 && r.bottom <= innerHeight) : false }
})()`)
console.log('[scrolled]', JSON.stringify(scrolled.result?.value))
check('desk: 滚动到底部后首页入口仍可见', scrolled.result?.value?.homeVisible === true, `top=${scrolled.result?.value?.homeTop}`)
await shot('food-scrolled.png')

ws.close()
chrome.kill()
// 清理临时 profile
try { fs.rmSync(userData, { recursive: true, force: true }) } catch { }
const fails = results.filter(r => !r.ok)
console.log(`\n== ${results.length - fails.length}/${results.length} 通过 ==`)
process.exit(fails.length ? 1 : 0)
