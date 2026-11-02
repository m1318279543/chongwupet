/** 预约页头部评分徽标验证（线上截图 + 断言） */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const OUT = 'D:/AI/WorkBuddy/2026-09-21-20-38-15'
const PORT = 9367
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-apt-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,900',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('无法新建标签页') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('  ✓', name, extra) } else { fail++; console.log('  ✗', name, extra) }
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return r?.result?.value
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(r.data, 'base64'))
  }
  await send('Page.enable')
  await send('Runtime.enable')

  try {
    // 游客视角：预约页头部应显示评分徽标而非「0 条服务预约」
    await send('Page.navigate', { url: `${BASE}/shop/appointment` })
    await sleep(4200)
    const badge = await evalJs(`(() => {
      const el = document.querySelector('.as-rating')
      if (!el) return null
      return { text: el.innerText.replace(/\\s+/g, ' ').trim(), star: !!el.querySelector('.as-rating__star') }
    })()`)
    check('评分徽标渲染', !!badge, badge ? JSON.stringify(badge) : '未找到 .as-rating')
    check('星形图标存在', !!badge?.star)
    check('评分格式为 x.x', /^\d\.\d/.test(badge?.text || ''))
    check('旧文案已移除', !(await evalJs(`!!document.querySelector('.ui-head__aside .ui-count b') && document.querySelector('.ui-head__aside').innerText.includes('条服务预约')`)))
    await shot('apt-rating-desktop.png')

    // 手机视口
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await sleep(1800)
    const mBadge = await evalJs(`!!document.querySelector('.as-rating')`)
    check('手机端徽标仍显示', mBadge)
    await shot('apt-rating-mobile.png')
  } finally {
    chrome.kill()
  }
  console.log(`\\n结果: ${pass} 通过, ${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FATAL', e); chrome.kill(); process.exit(1) })
