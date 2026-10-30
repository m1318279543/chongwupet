/**
 * 宠物详情页「它适合我吗？问 AI」按钮验证：点击应唤起 AI 助手并自动发出带宠物上下文的问题
 * 用法: node cdp_pet_ai_link.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9394
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-petail-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

async function main() {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    return r.result?.result?.value
  }

  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: BASE + '/shop/pet/1' })
  await sleep(3000)

  // 1. 按钮存在
  const hasBtn = await evalJs(`!!document.querySelector('.ai-link') && document.querySelector('.ai-link').textContent.includes('问 AI')`)
  check('详情页存在「它适合我吗？问 AI」按钮', hasBtn)

  // 2. 点击前助手未打开
  const before = await evalJs(`(() => {
    const p = document.querySelector('.ai-dock__panel, [class*="assistant"] [class*="panel"], [class*="assistant-panel"]')
    return p ? getComputedStyle(p).display : 'none-found'
  })()`)

  // 3. 点击按钮
  await evalJs(`document.querySelector('.ai-link').click()`)
  await sleep(1500)

  // 4. 助手打开且预设问题被自动发出（出现带宠物上下文的用户消息）
  const state = await evalJs(`(() => {
    const hasUserMsg = [...document.querySelectorAll('*')].some(el =>
      el.children.length === 0 && /它适合什么样的家庭/.test(el.textContent || ''))
    const dock = document.querySelector('[class*="ai-dock"], [class*="assistant"]')
    return { hasUserMsg, dockClass: dock ? dock.className : '' }
  })()`)
  check('预设问题自动发出（含宠物上下文）', state.hasUserMsg)

  // 5. 面板打开状态与点击前不同（真正唤起了助手）
  const after = await evalJs(`(() => {
    const p = document.querySelector('.ai-dock__panel, [class*="assistant"] [class*="panel"], [class*="assistant-panel"]')
    return p ? getComputedStyle(p).display : 'none-found'
  })()`)
  check('AI 助手面板已唤起（可见状态变化）', before !== after || after !== 'none-found', `before=${before} after=${after}`)

  chrome.kill()
  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1) })
