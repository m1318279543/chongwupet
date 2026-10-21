/**
 * 手机端交互态 / 后台页面图片巡检
 * 覆盖：匹配结果页大图、宠物粮详情弹窗、AI 助手面板、后台看板图表
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844)
const PORT = 9364
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UTOKEN = fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken', 'utf8').trim() : ''
const ATOKEN = fs.existsSync('.admintoken') ? fs.readFileSync('.admintoken', 'utf8').trim() : ''

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-act-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  const setCookie = async (tok) => { await send('Network.enable'); await send('Network.setCookie', { name: 'Admin-Token', value: tok, url: BASE + '/', path: '/' }); await send('Network.setCookie', { name: 'Shop-Token', value: tok, url: BASE + '/', path: '/' }) }
  const clearCookie = async () => { await send('Network.deleteCookies', { name: 'Admin-Token', url: BASE + '/' }); await send('Network.deleteCookies', { name: 'Shop-Token', url: BASE + '/' }) }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })

  const measure = async (label) => {
    const r = await evaluate(`(() => {
      const vh = innerHeight, vw = document.documentElement.clientWidth
      const imgs = [], boxes = []
      document.querySelectorAll('img').forEach(img => {
        const rc = img.getBoundingClientRect()
        if (rc.width < 24 || rc.height < 24) return
        imgs.push({ w: Math.round(rc.width), h: Math.round(rc.height), vhPct: Math.round(rc.height / vh * 100),
          fit: getComputedStyle(img).objectFit, cls: (typeof img.className === 'string' ? img.className : '').slice(0, 26) })
      })
      document.querySelectorAll('.tp-image,.card-img,.detail-left,.big-avatar,.chart,[class*="photo"],[class*="avatar"]').forEach(el => {
        const rc = el.getBoundingClientRect()
        if (rc.width < 60 || rc.height < 80) return
        boxes.push({ w: Math.round(rc.width), h: Math.round(rc.height), vhPct: Math.round(rc.height / vh * 100), cls: (el.className || '').toString().slice(0, 30) })
      })
      return JSON.stringify({ path: location.pathname, vh, vw, sw: document.documentElement.scrollWidth, imgs, boxes })
    })()`)
    const o = JSON.parse(r || '{}')
    console.log(`\n== ${label}  ${o.path}  vw=${o.vw} sw=${o.sw} vh=${o.vh}`)
    const over = (o.sw || 0) > (o.vw || 0) + 1
    let maxPct = 0
    for (const i of (o.imgs || [])) { maxPct = Math.max(maxPct, i.vhPct); if (i.vhPct > 30) console.log(`   IMG ${i.w}x${i.h} (${i.vhPct}%vh) fit=${i.fit} cls=${i.cls}`) }
    for (const b of (o.boxes || [])) { maxPct = Math.max(maxPct, b.vhPct); if (b.vhPct > 30) console.log(`   BOX ${b.w}x${b.h} (${b.vhPct}%vh) cls=${b.cls}`) }
    console.log(`   [${maxPct > 35 ? 'BIG' : 'ok '}][${over ? 'OVER' : 'ok  '}] max=${maxPct}%vh`)
    return { maxPct, over }
  }

  // 1) 匹配结果页：连点第一个选项直到出结果
  await setCookie(UTOKEN)
  await send('Page.navigate', { url: BASE + '/shop/match' }); await sleep(4000)
  for (let i = 0; i < 12; i++) {
    const has = await evaluate(`!!document.querySelector('.top-pick') || !!document.querySelector('.empty-result')`)
    if (has) break
    const ok = await evaluate(`(() => { const el = document.querySelector('.opt'); if (!el) return 0; el.click(); return 1 })()`)
    await sleep(800)
    if (!ok) break
  }
  const sub = await evaluate(`(() => { const b = [...document.querySelectorAll('.quiz-actions button')].find(x => x.innerText.includes('开始智能匹配')); if (!b) return 'no-btn'; if (b.disabled) return 'disabled'; b.click(); return 'ok' })()`)
  console.log('\n   match submit:', sub)
  for (let i = 0; i < 40; i++) { await sleep(500); if (await evaluate(`!!document.querySelector('.top-pick')`)) break }
  await sleep(1000)
  await evaluate(`window.scrollTo(0,0)`); await sleep(300)
  await measure('match-result')

  // 2) 宠物粮详情弹窗
  await send('Page.navigate', { url: BASE + '/shop/food' }); await sleep(4000)
  await evaluate(`(() => { const c = document.querySelector('.card'); if (c) c.click(); })()`)
  await sleep(1800)
  await measure('food-dialog')
  const dlgH = await evaluate(`(() => { const d = document.querySelector('.food-detail-dialog .detail'); if (!d) return 0; return Math.round(d.getBoundingClientRect().height) })()`)
  console.log('   food dialog .detail height =', dlgH)

  // 3) AI 助手面板
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4000)
  await evaluate(`(() => { const b = document.querySelector('.ai-fab,.ai-bubble,.ai-launcher,.ai-assistant button'); if (b) b.click(); })()`)
  await sleep(1200)
  const aiOpen = await evaluate(`!!document.querySelector('.ai-panel')`)
  console.log('\n   AI 面板打开:', aiOpen)
  if (aiOpen) await measure('ai-panel')

  // 4) 后台看板（admin token）
  await setCookie(ATOKEN)
  await send('Page.navigate', { url: BASE + '/admin/dashboard' }); await sleep(6000)
  await measure('admin-dashboard')
  const adminPages = [['admin-pet', '/admin/info'], ['admin-category', '/admin/category'], ['admin-appointment', '/admin/appointment'], ['admin-match', '/admin/match']]
  for (const [n, p] of adminPages) {
    await send('Page.navigate', { url: BASE + p }); await sleep(4000)
    await measure(n)
  }
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
