// 诊断：打开页面收集 console 错误 / 未捕获异常 / 实际上渲染内容
// 用法: node diag_page_error.mjs <base> <path>
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const P = process.argv[3] || '/shop/home'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9555
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break } catch {} await sleep(250) }

const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pend = new Map()
const logs = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
    logs.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    logs.push('[exception] ' + (d.exception?.description || d.text || '').slice(0, 400))
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    logs.push('[log] ' + m.params.entry.text.slice(0, 300))
  }
})
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaljs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
const nav = await send('Page.navigate', { url: BASE + P })
console.log('navigate:', JSON.stringify(nav.result || nav.error))
await sleep(5000)
const info = await evaljs(`JSON.stringify({ url: location.pathname + location.search, app: !!document.querySelector('#app')?.children.length, textLen: (document.body.innerText||'').length, head: (document.body.innerText||'').slice(0,120) })`)
console.log('page:', info)
console.log('--- errors ---')
console.log(logs.length ? [...new Set(logs)].slice(0, 12).join('\n') : '(无)')
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('diag_page.png', Buffer.from(shot.result.data, 'base64'))
ws.close(); chrome.kill(); process.exit(0)
