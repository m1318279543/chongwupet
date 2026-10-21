/** 手机视口测匹配结果页图片尺寸 + 截图 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844)
const PORT = 9365
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = fs.existsSync('.rytoken') ? fs.readFileSync('.rytoken', 'utf8').trim() : ''

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-mm-'))
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
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  if (TOKEN) { await send('Network.enable'); await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' }) }

  await send('Page.navigate', { url: BASE + '/shop/match' }); await sleep(4000)
  for (let i = 0; i < 10; i++) {
    const ok = await evaluate(`(() => { const el = document.querySelector('.opt'); if (!el) return 'none'; el.click(); return 'ok' })()`)
    if (ok !== 'ok') break
    await sleep(900)
  }
  const sub = await evaluate(`(() => { const b = [...document.querySelectorAll('.quiz-actions button')].find(x => x.innerText.includes('开始智能匹配')); if (!b) return 'no-btn'; if (b.disabled) return 'disabled'; b.click(); return 'ok' })()`)
  console.log('submit:', sub)
  for (let i = 0; i < 40; i++) { await sleep(500); if (await evaluate(`!!document.querySelector('.top-pick')`)) break }
  await sleep(1200)

  const r = await evaluate(`(() => {
    const vh = innerHeight, vw = document.documentElement.clientWidth
    const imgs = [], boxes = []
    document.querySelectorAll('img').forEach(img => {
      const rc = img.getBoundingClientRect()
      if (rc.width < 24 || rc.height < 24) return
      imgs.push({ w: Math.round(rc.width), h: Math.round(rc.height), vhPct: Math.round(rc.height / vh * 100), fit: getComputedStyle(img).objectFit, cls: img.className })
    })
    document.querySelectorAll('.tp-image,.card-img,.card,[class*="photo"],[class*="avatar"]').forEach(el => {
      const rc = el.getBoundingClientRect()
      if (rc.width < 60 || rc.height < 60) return
      boxes.push({ w: Math.round(rc.width), h: Math.round(rc.height), vhPct: Math.round(rc.height / vh * 100), cls: (el.className || '').toString().slice(0, 30) })
    })
    return JSON.stringify({ path: location.pathname, vw, sw: document.documentElement.scrollWidth, vh, imgs, boxes, hasTop: !!document.querySelector('.top-pick') })
  })()`)
  const o = JSON.parse(r || '{}')
  console.log(`== match-result ${W}x${H}  path=${o.path} hasTop=${o.hasTop} vw=${o.vw} sw=${o.sw} vh=${o.vh}`)
  for (const i of (o.imgs || [])) console.log(`   IMG ${i.w}x${i.h} (${i.vhPct}%vh) fit=${i.fit}`)
  for (const b of (o.boxes || [])) console.log(`   BOX ${b.w}x${b.h} (${b.vhPct}%vh) cls=${b.cls}`)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(`match-mobile-${W}.png`, Buffer.from(shot.data, 'base64'))
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
