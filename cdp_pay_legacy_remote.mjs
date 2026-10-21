/** 线上历史订单兜底专项：无需本地 mysql，由外部先把目标单号置空 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const PORT = 9392
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = fs.readFileSync('.tok_ry', 'utf8').trim()

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-lg-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--ignore-certificate-errors', '--window-size=1280,900',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

  await send('Page.navigate', { url: BASE + '/shop/order' }); await sleep(6000)
  const legacy = JSON.parse(await evaluate(`(() => JSON.stringify({
    label: document.body.innerText.includes('历史订单（未生成单号）'),
    btn: [...document.querySelectorAll('.el-button')].some(b => b.textContent.trim() === '历史订单'),
    noPayBtnOnLegacy: true
  }))()`))
  check('列表显示「历史订单（未生成单号）」', legacy.label)
  check('显示「历史订单」按钮而非「去支付」', legacy.btn)
  await evaluate(`(() => { const b = [...document.querySelectorAll('.el-button')].find(x => x.textContent.trim() === '历史订单'); b && b.click(); return !!b })()`)
  await sleep(1200)
  const alertText = await evaluate(`document.querySelector('.el-message-box')?.innerText || ''`)
  check('弹窗引导重新下单', alertText.includes('重新下单'), alertText.replace(/\n/g, ' ').slice(0, 70))
  await shot('pay-legacy-prod.png')

  console.log(`\n===== 结果: ${pass} 通过 / ${fail} 失败 =====`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('脚本异常:', e); process.exit(2) })
