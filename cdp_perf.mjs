/**
 * CDP 页面加载性能实测（冷启动 vs 缓存命中）
 * 用法: node cdp_perf.mjs <url>
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const TARGET = process.argv[2]
const PORT = 9333
if (!TARGET) { console.error('用法: node cdp_perf.mjs <url>'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-perf-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--mute-audio',
  '--ignore-certificate-errors',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}

async function newTab() {
  for (const method of ['PUT', 'GET']) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method })
      if (r.ok) return await r.json()
    } catch {}
  }
  throw new Error('无法新建标签页')
}

function cdp(ws) {
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners) fn(msg)
    }
  })
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id
      pending.set(mid, { resolve, reject })
      ws.send(JSON.stringify({ id: mid, method, params }))
    }),
    on: (fn) => { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1) } },
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', (e) => reject(new Error('WS 连接失败')))
  })
}

/** 跑一次导航，返回统计 */
async function run(client, label, clearCache) {
  const stats = { label, requests: 0, failed: 0, bytes: 0, byType: {}, failedUrls: [], loadMs: 0 }
  const start = Date.now()
  const reqUrls = new Map()

  const onEvent = (msg) => {
    const { method, params } = msg
    if (method === 'Network.requestWillBeSent') {
      stats.requests++
      reqUrls.set(params.requestId, params.request.url)
    } else if (method === 'Network.responseReceived') {
      const t = params.type || 'Other'
      stats.byType[t] = (stats.byType[t] || 0) + 1
    } else if (method === 'Network.loadingFinished') {
      stats.bytes += params.encodedDataLength || 0
    } else if (method === 'Network.loadingFailed') {
      stats.failed++
      if (params.errorText !== 'net::ERR_ABORTED') {
        stats.failedUrls.push((reqUrls.get(params.requestId) || '?') + ' -> ' + params.errorText)
      }
    }
  }
  const off = client.on(onEvent)

  if (clearCache) await client.send('Network.clearBrowserCache').catch(() => { })

  let offLoad = null
  const loaded = new Promise((resolve) => {
    const t = setTimeout(resolve, 60000)
    offLoad = client.on((msg) => { if (msg.method === 'Page.loadEventFired') { clearTimeout(t); resolve() } })
  })
  await client.send('Page.navigate', { url: TARGET })
  await loaded
  if (offLoad) offLoad()
  // 等网络静默（动态 import 的 chunk 与接口请求）
  let last = stats.requests
  for (let i = 0; i < 25; i++) {
    await sleep(400)
    if (stats.requests === last) break
    last = stats.requests
  }
  off()
  stats.loadMs = Date.now() - start
  return stats
}

const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB')

try {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  const client = cdp(ws)
  await client.send('Network.enable')
  await client.send('Page.enable')

  console.log(`目标: ${TARGET}`)
  console.log('─'.repeat(64))

  // 第一次：清缓存 → 冷启动
  const cold = await run(client, '首次访问(无缓存)', true)
  console.log(`【${cold.label}】耗时 ${(cold.loadMs / 1000).toFixed(2)}s | 请求 ${cold.requests} 个 | 传输 ${fmt(cold.bytes)} | 失败 ${cold.failed}`)
  const types = Object.entries(cold.byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ')
  console.log(`  资源类型: ${types}`)
  if (cold.failedUrls.length) console.log('  失败明细:\n    ' + cold.failedUrls.slice(0, 8).join('\n    '))

  // 第二次：保留缓存 → 二次访问
  const warm = await run(client, '二次访问(缓存命中)', false)
  console.log(`【${warm.label}】耗时 ${(warm.loadMs / 1000).toFixed(2)}s | 请求 ${warm.requests} 个 | 传输 ${fmt(warm.bytes)} | 失败 ${warm.failed}`)

  console.log('─'.repeat(64))
  const speedup = (cold.loadMs / Math.max(warm.loadMs, 1)).toFixed(1)
  console.log(`二次访问比首次快 ${speedup} 倍，传输量减少 ${((1 - warm.bytes / Math.max(cold.bytes, 1)) * 100).toFixed(0)}%`)

  // 页面是否真的渲染出内容
  const html = await client.send('Runtime.evaluate', {
    expression: "document.body ? document.body.innerText.trim().slice(0,120) : '(空)'",
    returnByValue: true,
  }).catch(() => null)
  if (html?.result?.value !== undefined) {
    console.log(`页面文本: ${JSON.stringify(html.result.value)}`)
  }

  ws.close()
} catch (e) {
  console.error('错误: ' + e.message)
} finally {
  try { chrome.kill() } catch {}
  await sleep(500)
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch {}
  process.exit(0)
}
