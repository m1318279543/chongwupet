/**
 * 验证「http 站点也能用浏览器精确定位」的可行性。
 *
 * 结论用途：浏览器 Geolocation 只在安全上下文可用，http 公网 IP 默认被禁。
 * 演示机可用 Chrome 启动参数 --unsafely-treat-insecure-origin-as-secure=<origin>
 * 把该源视为安全上下文，GPS 即可恢复（无需改服务器 / 无需证书）。
 *
 * 用法：node cdp_http_secure_probe.mjs http://47.116.73.25:8083
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = (process.argv[2] || 'http://47.116.73.25:8083').replace(/\/$/, '')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9441
const profile = mkdtempSync(path.join(tmpdir(), 'petsecure-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FLAG = `--unsafely-treat-insecure-origin-as-secure=${BASE}`

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  FLAG, BASE + '/shop/home'
], { stdio: 'ignore' })

async function waitFor(fn, ms = 25000, step = 300) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v } catch (e) { /* ignore */ }
    await sleep(step)
  }
  return null
}

let ws
let seq = 0
const pending = new Map()
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout: ' + method)) } }, 20000)
  })
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.result?.value
}

let fail = 0
function check(name, ok, extra = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
  if (!ok) fail++
}

try {
  const ver = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
    return r.ok ? await r.json() : null
  }, 20000)
  if (!ver) throw new Error('Chrome DevTools 未就绪')

  const page = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    return (await r.json()).find((t) => t.type === 'page' && t.url.includes('/shop/home'))
  }, 20000)
  if (!page) throw new Error('未找到页面 target')

  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  await send('Runtime.enable')
  await send('Page.enable')

  // 模拟设备 GPS：CDP 注入一个观音桥附近的坐标
  await send('Browser.grantPermissions', { origin: new URL(BASE).origin, permissions: ['geolocation'] })
  await send('Emulation.setGeolocationOverride', { latitude: 29.573541, longitude: 106.530573, accuracy: 25 })
  await send('Page.reload', { ignoreCache: true })
  await waitFor(async () => await evalJs(`document.querySelectorAll('.store').length >= 2`), 30000)
  await sleep(2500)

  const secure = await evalJs('window.isSecureContext')
  check('1. 加上 flag 后 http 源被浏览器视为安全上下文', secure === true, `isSecureContext=${secure}`)

  const hasGeo = await evalJs('!!navigator.geolocation')
  check('2. Geolocation API 可用', hasGeo === true)

  // 以业务页真实状态为准：watchPosition 成功才会显示「已定位 ±N m」
  // （headless 下额外再调一次 getCurrentPosition 偶发 Timeout，与 flag 无关）
  const locState = await evalJs(`(document.querySelector('.loc-state')?.innerText || '').trim()`)
  check('3. http 源成功拿到 GPS 坐标', /已定位/.test(locState) && /±\s*25/.test(locState), locState)
  check('4. 不再显示城市级估算', !/估算/.test(locState), locState)

  console.log('\n启动参数（演示机专用，零服务器改动）：')
  console.log(`  "${CHROME}" ${FLAG} --user-data-dir=<独立目录> ${BASE}/shop/home`)
} catch (e) {
  console.error('SCRIPT ERROR:', e.message)
  fail++
} finally {
  try { ws?.close() } catch (e) { /* ignore */ }
  try { chrome.kill() } catch (e) { /* ignore */ }
  await sleep(300)
  try { rmSync(profile, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  process.exit(fail ? 1 : 0)
}
