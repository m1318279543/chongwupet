/** 验证导航顺序与移动端菜单 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shot(port, w, h, mobile, file, after) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-nav-'))
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
    '--ignore-certificate-errors', `--window-size=${w},${h}`,
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) break } catch {} await sleep(250) }
    let tab = null
    for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: m }); if (r.ok) { tab = await r.json(); break } } catch {} }
    const ws = await new Promise((res, rej) => { const s = new WebSocket(tab.webSocketDebuggerUrl); s.addEventListener('open', () => res(s)); s.addEventListener('error', rej) })
    let id = 0; const pending = new Map()
    ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
    const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
    const evl = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value }
    await send('Page.enable'); await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
    await send('Page.navigate', { url: 'http://47.116.73.25/shop/home' })
    await sleep(5000)
    if (after) console.log(file, '->', await evl(after))
    const s = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(file, Buffer.from(s.data, 'base64'))
    console.log('saved', file)
    ws.close()
  } finally { chrome.kill() }
}

;(async () => {
  await shot(9362, 1440, 420, false, 'D:/AI/WorkBuddy/2026-09-21-20-38-15/nav-desktop.png',
    `JSON.stringify([...document.querySelectorAll('.nav .nav-item')].map(x=>x.textContent.trim()))`)
  await shot(9363, 390, 844, true, 'D:/AI/WorkBuddy/2026-09-21-20-38-15/nav-mobile.png',
    `(()=>{const b=document.querySelector('.hamburger');if(b)b.click();return 'menu opened'})()`)
  setTimeout(() => process.exit(0), 500)
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1) })
