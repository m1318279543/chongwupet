/** 检查 food 弹窗 DOM 结构与样式命中情况 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:82'
const PORT = 9366
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const W = 390, H = 844
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-dlg-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('no cdp') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('no tab') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })
;(async () => {
  await waitCdp(); const tab = await newTab(); const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: BASE + '/shop/food' }); await sleep(4000)
  await evaluate(`document.querySelector('.card').click()`); await sleep(1500)
  const r = await evaluate(`(() => {
    const dlg = document.querySelector('.food-detail-dialog')
    const elDialog = document.querySelector('.el-dialog')
    const detail = document.querySelector('.food-detail-dialog .detail') || document.querySelector('.el-dialog .detail')
    const left = document.querySelector('.detail-left')
    const img = left ? left.querySelector('img') : null
    const cs = img ? getComputedStyle(img) : null
    return JSON.stringify({
      dlgClass: dlg ? dlg.className : null,
      dlgWidth: dlg ? getComputedStyle(dlg).width : null,
      elDialogClass: elDialog ? elDialog.className : null,
      detailFound: !!detail,
      detailFlexDir: detail ? getComputedStyle(detail).flexDirection : null,
      leftWidth: left ? Math.round(left.getBoundingClientRect().width) : null,
      imgSize: img ? [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)] : null,
      imgMaxH: cs ? cs.maxHeight : null,
      imgObjectFit: cs ? cs.objectFit : null,
      imgHeightCss: cs ? cs.height : null
    })
  })()`)
  console.log(r)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
