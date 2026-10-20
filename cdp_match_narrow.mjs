/**
 * 匹配页窄视口验证：360px 宽窗口打开 /shop/match
 * 校验：无横向溢出（scrollWidth <= clientWidth）、选项可见、截图
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const PORT = 9342
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-narrow-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=360,640`,
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
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', reject)
  })
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id); pending.delete(msg.id); resolve(msg.result)
    }
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, { resolve }); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return r.result?.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: BASE + '/shop/match' })
  await sleep(5000)

  const check = await evaluate(`(() => {
    const de = document.documentElement
    const quiz = document.querySelector('.quiz-wrap')
    const opt = document.querySelector('.option')
    const optRect = opt ? opt.getBoundingClientRect() : null
    return JSON.stringify({
      title: document.title,
      docScrollW: de.scrollWidth,
      docClientW: de.clientWidth,
      hOverflow: de.scrollWidth > de.clientWidth + 1,
      quizW: quiz ? Math.round(quiz.getBoundingClientRect().width) : null,
      optionW: optRect ? Math.round(optRect.width) : null,
      optionVisible: optRect ? optRect.width > 100 && optRect.left >= 0 : false,
      optionCount: document.querySelectorAll('.option').length,
      labelsShown: [...document.querySelectorAll('.step .label')].filter(e => getComputedStyle(e).display !== 'none').length
    })
  })()`)
  console.log('窄视口(360px)检查: ' + check)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.resolve('match-narrow-shot.png'), Buffer.from(shot.data, 'base64'))
  console.log('截图: match-narrow-shot.png')

  chrome.kill()
  process.exit(0)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
