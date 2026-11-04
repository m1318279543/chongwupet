/**
 * 验证：前台「门店展示大屏」已删除
 *  - 桌面导航 / 手机菜单 / 页脚 均无入口
 *  - /shop/display 走 404 页（不再是展示大屏）
 *  - 商城主要页面仍正常渲染、无 JS 异常
 * 用法: node cdp_display_removed.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const PORT = 9394
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-display-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--window-size=1440,900', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

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
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params?.exceptionDetails?.text || 'exception')
    if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') errors.push(m.params.entry.text)
  })
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

  // ---------- 桌面 ----------
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4000)
  const desk = await evaluate(`(() => {
    const navText = [...document.querySelectorAll('.nav-item')].map(a => a.textContent.trim()).join('|')
    const footText = document.querySelector('.footer')?.innerText || ''
    return {
      nav: navText,
      navHas: navText.includes('门店大屏'),
      footHas: footText.includes('门店展示大屏'),
      links: [...document.querySelectorAll('.footer a')].map(a => a.getAttribute('href')).filter(Boolean),
      hero: !!document.querySelector('.hero, .home-hero, section')
    }
  })()`)
  check('桌面导航已无「门店大屏」', !desk.navHas, desk.nav)
  check('页脚已无「门店展示大屏」', !desk.footHas)
  check('页脚无 /shop/display 链接', !desk.links.some(h => h.includes('/shop/display')))
  check('首页正常渲染', !!desk.hero)
  await shot('display-removed-1-home.png')

  // ---------- 直接访问已删除路由 ----------
  await send('Page.navigate', { url: BASE + '/shop/display' }); await sleep(3500)
  const nf = await evaluate(`(() => {
    const t = document.body.innerText
    return { has404: !!document.querySelector('.nf-code') && t.includes('这个页面找不到了'),
             hasDisp: !!document.querySelector('.disp-title'), url: location.pathname, text: t.slice(0, 60).replace(/\\n/g, ' ') }
  })()`)
  check('/shop/display 落到 404 页', nf.has404, nf.url)
  check('不再是展示大屏页面', !nf.hasDisp)
  await shot('display-removed-2-404.png')

  // ---------- 手机菜单 ----------
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4000)
  await evaluate(`document.querySelector('.m-menu, .hamburger, .m-burger')?.click()`)
  await sleep(600)
  const mob = await evaluate(`(() => {
    const items = [...document.querySelectorAll('.m-item')].map(a => a.textContent.trim())
    return { items: items.join('|'), has: items.some(t => t.includes('门店大屏')),
             footHas: (document.querySelector('.footer')?.innerText || '').includes('门店展示大屏') }
  })()`)
  check('手机菜单已无「门店大屏」', !mob.has, mob.items)
  check('手机页脚已无「门店展示大屏」', !mob.footHas)
  await shot('display-removed-3-mobile.png')

  check('无页面 JS 异常', errors.length === 0, errors.slice(0, 2).join(' / '))

  console.log(`\n=== 结果：${pass} PASS / ${fail} FAIL ===`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('异常:', e); try { chrome.kill() } catch {}; process.exit(1) })
