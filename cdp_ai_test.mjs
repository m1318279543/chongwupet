/**
 * AI 智能化能力端到端实测
 *   1) 全站悬浮助手：打开 / 快捷提问 / 收到回复
 *   2) 选宠页 AI 一句话自动填答
 *   3) 详情页「问 AI」唤起助手并带上下文
 * 用法: node cdp_ai_test.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = Number(process.argv[3] || 1280)
const H = Number(process.argv[4] || 900)
const PORT = 9377
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-ai-'))

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' })

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

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
const connect = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.addEventListener('open', () => res(ws))
  ws.addEventListener('error', rej)
})

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value ?? a.description).join(' '))
    }
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    fs.writeFileSync(path.resolve(`ai-${name}.png`), Buffer.from(s.data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

  // ---------- 1. 首页悬浮助手 ----------
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(2600)

  const fab = await evaluate(`(() => {
    const b = document.querySelector('.ai-fab')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 20 }
  })()`)
  check('首页出现 AI 悬浮球', !!fab && fab.visible, fab ? `${Math.round(fab.w)}x${Math.round(fab.h)}` : 'not found')

  if (fab) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fab.x + fab.w / 2, y: fab.y + fab.h / 2, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fab.x + fab.w / 2, y: fab.y + fab.h / 2, button: 'left', clickCount: 1 })
    await sleep(600)
  }

  const panel = await evaluate(`(() => {
    const p = document.querySelector('.ai-panel')
    if (!p) return { open: false }
    const r = p.getBoundingClientRect()
    return { open: r.width > 200, w: Math.round(r.width), h: Math.round(r.height),
      quick: [...document.querySelectorAll('.ai-quick button')].map(b => b.textContent.trim()),
      greeted: !!document.querySelector('.ai-body .bubble') }
  })()`)
  check('点击后展开助手面板', panel.open === true, `${panel.w}x${panel.h}`)
  check('欢迎语已渲染', panel.greeted === true)
  check('快捷问题可用', (panel.quick || []).length >= 3, (panel.quick || []).join(' / '))
  await shot('1-panel')

  // 发一条消息，等待回复（免费通道可能限流，最多等 60s）
  const sent = await evaluate(`(async () => {
    const ta = document.querySelector('.ai-input textarea')
    if (!ta) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, '我住小户型，上班忙，想养只猫')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 500))   // 等 Vue 更新 draft 与按钮状态
    const btn = document.querySelector('.ai-send')
    if (btn.disabled) return 'disabled'
    const before = document.querySelectorAll('.ai-body .msg.user').length
    btn.click()
    await new Promise(r => setTimeout(r, 400))
    return document.querySelectorAll('.ai-body .msg.user').length > before
  })()`)
  check('输入框可发送消息', sent === true, String(sent))

  let replied = null
  for (let i = 0; i < 35; i++) {
    await sleep(2000)
    replied = await evaluate(`(() => {
      const msgs = [...document.querySelectorAll('.ai-body .msg.assistant .bubble')]
      const last = msgs[msgs.length - 1]
      if (!last) return null
      const txt = last.textContent.trim()
      const typing = !!document.querySelector('.bubble.thinking') || !!document.querySelector('.cursor')
      return { txt, typing, len: txt.length, count: msgs.length }
    })()`)
    // 需要出现第二条助手消息（第一条是欢迎语）才算真正回复
    if (replied && replied.count >= 2 && replied.len > 12 && !replied.typing) break
  }
  check('助手返回了实质回复', !!replied && replied.count >= 2 && replied.len > 12,
    replied ? replied.txt.slice(0, 70).replace(/\n/g, ' ') : 'timeout')
  await shot('2-reply')

  // ---------- 2. 选宠页 AI 自动填答 ----------
  await send('Page.navigate', { url: BASE + '/shop/match' })
  await sleep(2400)
  const hasFill = await evaluate(`!!document.querySelector('.ai-fill')`)
  check('选宠页出现 AI 自动填答区', hasFill)

  const fill = await evaluate(`(() => {
    const input = document.querySelector('.ai-fill .el-input__inner')
    if (!input) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '我住小户型合租，上班很忙，第一次养，预算3000，想养只安静的猫')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const btn = [...document.querySelectorAll('.ai-fill button')].find(b => b.textContent.includes('智能填答'))
    btn && btn.click()
    return !!btn
  })()`)
  check('可提交自然语言需求', fill === true)

  let fillRes = null
  for (let i = 0; i < 30; i++) {
    await sleep(2000)
    fillRes = await evaluate(`(() => {
      const ok = document.querySelector('.ai-fill-ok')
      const count = document.querySelector('.quiz-count')?.textContent?.trim() || ''
      return { hint: ok ? ok.textContent.trim() : '', count }
    })()`)
    if (fillRes.hint) break
  }
  check('AI 完成自动填答', !!fillRes && !!fillRes.hint, fillRes ? fillRes.hint : 'timeout')
  check('问卷已填满（10/10）', !!fillRes && /10\s*\/\s*10/.test(fillRes.count), fillRes?.count || '')
  await shot('3-autofill')

  // 直接出结果
  const goResult = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.ai-fill-result button')].find(x => x.textContent.includes('查看匹配结果'))
    if (!b) return false
    b.click(); return true
  })()`)
  if (goResult) {
    await sleep(5000)
    const res = await evaluate(`(() => {
      const top = document.querySelector('.top-pick h3')
      const cards = document.querySelectorAll('.cards .card').length
      return { name: top?.textContent?.trim() || '', cards }
    })()`)
    check('AI 填答可直接得出匹配结果', !!res.name, `${res.name} + ${res.cards} 张卡片`)
    await shot('4-result')
  } else {
    check('AI 填答可直接得出匹配结果', false, '未出现快速结果按钮')
  }

  // ---------- 3. 详情页问 AI ----------
  await send('Page.navigate', { url: BASE + '/shop/pet/3' })
  await sleep(2400)
  const askBtn = await evaluate(`(() => {
    const b = document.querySelector('.ai-ask')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })()`)
  check('详情页出现「问 AI」按钮', !!askBtn)

  if (askBtn) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: askBtn.x + askBtn.w / 2, y: askBtn.y + askBtn.h / 2, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: askBtn.x + askBtn.w / 2, y: askBtn.y + askBtn.h / 2, button: 'left', clickCount: 1 })
    await sleep(700)
    const ctx = await evaluate(`(() => {
      const p = document.querySelector('.ai-panel')
      const userMsg = [...document.querySelectorAll('.ai-body .msg.user .bubble')].pop()
      return { open: !!p, lastUser: userMsg ? userMsg.textContent.trim() : '' }
    })()`)
    check('点击后唤起助手', ctx.open === true)
    check('自动带上当前宠物上下文', (ctx.lastUser || '').includes('我在看'), (ctx.lastUser || '').slice(0, 40))
    await shot('5-detail-ai')
  }

  const real = errors.filter(e => e && !/favicon|ERR_|net::|Failed to fetch/i.test(e))
  check('无 JS 报错', real.length === 0, real.slice(0, 2).join(' | '))

  const fail = results.filter(r => !r.pass)
  console.log(`\n== ${results.length - fail.length}/${results.length} 通过 ==`)
  if (fail.length) console.log('失败: ' + fail.map(f => f.name).join(', '))
  fs.writeFileSync(path.resolve('ai-test-report.json'), JSON.stringify(results, null, 2))
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail.length ? 1 : 0), 300)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
