/**
 * 数据看板端到端验证：登录态 → 打开 /admin/dashboard → 校验 KPI/图表/实时动态 → 切换时间范围
 * 用法: node cdp_dashboard.mjs <baseUrl> <token>
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const TOKEN = process.argv[3] || ''
const DASH_PATH = process.argv[4] || '/admin/dashboard'
const PORT = 9337
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-dash-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1600,1200',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
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
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method }); if (r.ok) return await r.json() } catch {}
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
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    } else if (msg.method) listeners.forEach((fn) => fn(msg))
  })
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id; pending.set(mid, { resolve, reject })
      ws.send(JSON.stringify({ id: mid, method, params }))
    }),
    on: (fn) => { listeners.push(fn) },
  }
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(cdp(ws)))
    ws.addEventListener('error', reject)
  })
}

async function main() {
  await waitCdp()
  const tab = await newTab()
  const client = await connect(tab.webSocketDebuggerUrl)

  const errors = []
  const apiCalls = []
  client.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('异常: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''))
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map((a) => a.description || a.value).join(' '))
    } else if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/pet/dashboard')) {
      apiCalls.push(m.params.request.url)
    }
  })

  await client.send('Network.enable')
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Network.setCookie', {
    name: 'Admin-Token', value: TOKEN, domain: 'localhost', path: '/', httpOnly: false,
  }).catch(() => {})

  const evaluate = async (expression) => {
    const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return r.result?.value
  }

  await client.send('Page.navigate', { url: BASE + DASH_PATH })
  await sleep(9000)

  const info = await evaluate(`(() => {
    const q = (s) => document.querySelector(s)
    const cards = [...document.querySelectorAll('.kpi-card')].map((c) => ({
      label: c.querySelector('.kpi-label')?.innerText.trim(),
      value: c.querySelector('.kpi-value')?.innerText.trim(),
      badge: c.querySelector('.badge')?.innerText.trim(),
    }))
    const canvases = [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height }))
    return {
      title: q('.dash-head h2')?.innerText,
      range: q('.head-title p')?.innerText.replace(/\\s+/g, ' ').slice(0, 80),
      cards,
      canvasCount: canvases.length,
      canvases,
      feedCount: document.querySelectorAll('.feed li').length,
      feedFirst: q('.feed li .feed-title')?.innerText,
      updated: q('.meta-bar span')?.innerText,
      hasError: document.body.innerText.includes('加载失败') || document.body.innerText.includes('系统错误'),
    }
  })()`)

  console.log('=== 页面结构 ===')
  console.log('标题:', info?.title)
  console.log('副标题:', info?.range)
  console.log('KPI 卡片:', info?.cards?.length)
  ;(info?.cards || []).forEach((c) => console.log(`  ${c.label}: ${c.value}  ${c.badge || ''}`))
  console.log('ECharts 画布:', info?.canvasCount, JSON.stringify(info?.canvases?.slice(0, 3)))
  console.log('实时动态条数:', info?.feedCount, '| 首条:', info?.feedFirst)
  console.log('最后更新:', info?.updated)
  console.log('接口请求数:', apiCalls.length)
  ;[...new Set(apiCalls)].forEach((u) => console.log('  ' + u.replace(BASE, '')))

  // 切换近 90 天
  const before = apiCalls.length
  const clicked = await evaluate(`(() => {
    const btns = [...document.querySelectorAll('.head-tools .el-radio-button')]
    const t = btns.find((b) => b.innerText.includes('90'))
    if (!t) return 'not-found'
    t.click()
    return 'clicked'
  })()`)
  await sleep(6000)
  const after90 = await evaluate(`(() => {
    const input = document.querySelector('.head-tools .el-radio-button.is-active')
    return {
      active: input?.innerText?.trim(),
      canvasCount: document.querySelectorAll('canvas').length,
      subtitle: document.querySelector('.card-head span')?.innerText,
    }
  })()`)
  console.log('\\n=== 切换近 90 天 ===')
  console.log('点击:', clicked, '| 新增请求:', apiCalls.length - before, '| 当前选中:', after90?.active)
  console.log('画布数:', after90?.canvasCount)

  // 截图
  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  const shotPath = path.resolve('dashboard-shot.png')
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'))
  console.log('\\n截图已保存:', shotPath)

  console.log('\\n=== 控制台错误 ===')
  if (errors.length) errors.slice(0, 10).forEach((e) => console.log('  ! ' + e.slice(0, 220)))
  else console.log('  无')

  chrome.kill()
  process.exit(0)
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1) })
