/**
 * 公网部署验收：node cdp_remote_check.mjs
 * 环境变量 BASE（默认 http://47.116.73.25）、TOKEN（可选，用于后台登录态）
 * 输出 remote-shop.png / remote-admin.png，并打印 console 错误与失败请求
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.BASE || 'http://47.116.73.25'
const TOKEN = process.env.TOKEN || ''
const PORT = 9381
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAGES = [
  { url: '/shop/home', name: 'remote-shop.png', full: true },
  { url: '/shop/match', name: 'remote-match.png', full: false },
  { url: '/admin/dashboard', name: 'remote-admin.png', full: true, needAuth: true },
]

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-remote-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1000',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}
async function newTab() {
  for (const method of ['PUT', 'GET']) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method }); if (r.ok) return await r.json() } catch {}
  }
  throw new Error('无法新建标签页')
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await new Promise((res, rej) => {
    const w = new WebSocket(tab.webSocketDebuggerUrl)
    w.addEventListener('open', () => res(w)); w.addEventListener('error', rej)
  })
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    else if (m.method) listeners.forEach((f) => f(m))
  })
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result?.value
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  if (TOKEN) await send('Network.setCookie', { name: 'Admin-Token', value: TOKEN, url: BASE + '/', path: '/' })

  let errors = [], failed = []
  listeners.push((m) => {
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 200))
    }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || '').slice(0, 200))
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      failed.push(`${m.params.response.status} ${m.params.response.url.replace(BASE, '')}`)
    }
    if (m.method === 'Network.loadingFailed') {
      failed.push(`FAILED ${m.params.errorText}`)
    }
  })

  for (const p of PAGES) {
    errors = []; failed = []
    await send('Page.navigate', { url: BASE + p.url })
    await sleep(4500)
    const state = await evaluate(`(() => {
      const app = document.querySelector('#app')
      const txt = (app ? app.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 120)
      const imgs = [...document.images]
      return JSON.stringify({
        path: location.pathname,
        mounted: !!(app && app.children.length),
        text: txt,
        imgs: imgs.length,
        brokenImgs: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src).slice(0, 5),
        h: document.documentElement.scrollHeight
      })
    })()`)
    const s = JSON.parse(state || '{}')
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!p.full })
    if (shot?.data) fs.writeFileSync(p.name, Buffer.from(shot.data, 'base64'))
    console.log(`\n[${p.url}] -> ${s.path} mounted=${s.mounted} 高度=${s.h} 图片=${s.imgs} 坏图=${s.brokenImgs?.length || 0}`)
    console.log(`  文案: ${s.text}`)
    if (s.brokenImgs?.length) console.log('  坏图示例: ' + s.brokenImgs.join(' | '))
    if (errors.length) console.log('  控制台错误: ' + [...new Set(errors)].slice(0, 5).join(' || '))
    const realFailed = [...new Set(failed)].filter((f) => !/favicon/.test(f))
    if (realFailed.length) console.log('  失败请求: ' + realFailed.slice(0, 6).join(' || '))
    if (!errors.length && !realFailed.length) console.log('  ✓ 无控制台错误、无失败请求')
  }

  ws.close(); chrome.kill()
  setTimeout(() => process.exit(0), 300)
})().catch((e) => { console.error('ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(2) })
