/**
 * 售后无忧「立即在线咨询」跳转验证：游客点击 → 应进入 /shop/consult 并显示登录引导
 * 用法: node cdp_consult_jump.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9393
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-consult-'))
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
  await send('Page.navigate', { url: BASE + '/shop/service/after' })
  await sleep(3000)

  // 断言1：按钮存在
  const hasBtn = await evalJs(`!!document.querySelector('.contact-right .el-button--primary') && document.querySelector('.contact-right .el-button--primary').textContent.includes('立即在线咨询')`)
  check('售后无忧页存在「立即在线咨询」按钮', hasBtn)

  // 断言2：游客点击后跳转到 /shop/consult（不被守卫弹回首页）
  await evalJs(`document.querySelector('.contact-right .el-button--primary').click()`)
  await sleep(2000)
  const url1 = await evalJs('location.pathname')
  check('点击后进入 /shop/consult', url1 === '/shop/consult', url1)

  // 断言3：页面显示（未登录引导 或 咨询表单），而非被重定向回首页
  const shown = await evalJs(`!!document.querySelector('.consult') && (document.body.textContent.includes('请先登录') || document.body.textContent.includes('提交咨询'))`)
  check('客服页正常渲染（登录引导/咨询表单）', shown)

  await ws.close()
  console.log(`\n== ${pass} 通过 / ${fail} 失败 ==`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(2) })
