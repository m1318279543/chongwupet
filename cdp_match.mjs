/**
 * AI 宠物智能匹配 - 真实点击端到端验证
 * 用法: node cdp_match.mjs <baseUrl> [token]
 * 流程: 打开 /shop/match → 依次选择 10 题 → 提交 → 校验结果卡片与理由
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const TOKEN = process.argv[3] || ''
const PORT = 9341
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-match-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1400',
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

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const client = await connect(tab.webSocketDebuggerUrl)

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Network.enable')

  if (TOKEN) {
    await client.send('Network.setCookie', {
      name: 'Shop-Token', value: TOKEN, domain: 'localhost', path: '/', httpOnly: false,
    }).catch(() => {})
  }

  const errors = []
  const apiCalls = []
  client.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('未捕获异常: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''))
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map((a) => a.description || a.value).join(' '))
    } else if (m.method === 'Network.requestWillBeSent') {
      const u = m.params.request.url
      if (u.includes('/pet/match')) apiCalls.push(m.params.request.method + ' ' + u.split(BASE)[1])
    } else if (m.method === 'Network.responseReceived') {
      const u = m.params.response.url
      if (u.includes('/pet/match/recommend')) apiCalls.push('→ HTTP ' + m.params.response.status)
    }
  })

  const evaluate = async (expression) => {
    const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result?.value
  }

  await client.send('Page.navigate', { url: BASE + '/shop/match' })
  await sleep(6000)

  const head = await evaluate(`(() => {
    const h1 = document.querySelector('.hero h1')?.innerText.trim()
    const chip = document.querySelector('.quiz-chip')?.innerText.trim()
    const count = document.querySelector('.quiz-count')?.innerText.trim()
    const opts = document.querySelectorAll('.opt').length
    return JSON.stringify({ h1, chip, count, options: opts })
  })()`)
  console.log('页面结构: ' + head)

  // 单题向导：逐题点击选项（选中后 280ms 自动滑入下一题，过渡动画约 0.5s，需轮询等待）
  const picks = [
    '小户型 / 合租', '没有', '几乎不能接受',      // 居住与家庭
    '宅家为主', '1 ~ 3 小时', '都可以',           // 生活方式
    '第一次养', '1000 ~ 3000 元', '200 ~ 500 元', // 经验与预算
    '猫咪'                                        // 偏好
  ]
  for (let i = 0; i < picks.length; i++) {
    // 轮询等待目标选项出现（最多 4s）
    let ok = 'timeout'
    for (let t = 0; t < 20; t++) {
      ok = await evaluate(`(() => {
        const el = [...document.querySelectorAll('.opt')].find(e => e.innerText.includes(${JSON.stringify(picks[i])}))
        if (!el) return 'not-found'
        el.click()
        return 'clicked'
      })()`)
      if (ok === 'clicked') break
      await sleep(200)
    }
    if (ok !== 'clicked') console.log('  ! 选项未找到: ' + picks[i] + ' -> ' + ok)
    await sleep(850)
  }
  const state = await evaluate(`document.querySelector('.quiz-count')?.innerText.trim()`)
  console.log('全部选择完成，进度: ' + state)

  // 提交
  const submitted = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.quiz-actions button')].find(b => b.innerText.includes('开始智能匹配'))
    if (!btn) return 'no-submit-btn'
    if (btn.disabled) return 'submit-disabled'
    btn.click()
    return 'submitted'
  })()`)
  console.log('提交: ' + submitted)

  // 等待结果
  let ready = false
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    const has = await evaluate(`!!document.querySelector('.top-pick') || !!document.querySelector('.empty-result')`)
    if (has) { ready = true; break }
  }
  await sleep(800)

  const result = await evaluate(`(() => {
    const top = document.querySelector('.top-pick')
    const empty = document.querySelector('.empty-result')
    if (empty) return JSON.stringify({ empty: true, msg: empty.innerText.slice(0, 120) })
    if (!top) return JSON.stringify({ ready: false })
    const txt = (s) => document.querySelector(s)?.innerText.trim() || ''
    return JSON.stringify({
      ready: true,
      summary: txt('.summary'),
      topName: txt('.tp-head h3'),
      score: txt('.ring-inner strong'),
      level: txt('.tag.level'),
      reasons: [...document.querySelectorAll('.reason')].map(e => e.innerText.trim()),
      dims: [...document.querySelectorAll('.dim')].map(e => e.innerText.replace(/\\n/g, ' ')).slice(0, 7),
      cards: [...document.querySelectorAll('.card')].map(c => ({
        name: c.querySelector('.card-name')?.innerText.trim(),
        score: c.querySelector('.card-score')?.innerText.trim()
      })),
      algo: txt('.algo'),
      cautions: [...document.querySelectorAll('.caution')].map(e => e.innerText.trim())
    })
  })()`)

  console.log('\n=== 匹配结果 ===')
  try {
    const r = JSON.parse(result)
    if (r.empty) {
      console.log('空结果: ' + r.msg)
    } else if (!r.ready) {
      console.log('结果未渲染')
    } else {
      console.log('摘要: ' + r.summary)
      console.log(`首推: ${r.topName} | 匹配度 ${r.score} | ${r.level}`)
      console.log('理由: ' + r.reasons.join(' / '))
      console.log('维度: ' + r.dims.join(' | '))
      console.log('提示: ' + (r.cautions.join(' / ') || '无'))
      console.log('其他推荐: ' + r.cards.map(c => `${c.name}(${c.score})`).join('、'))
    }
  } catch (e) {
    console.log('解析失败: ' + result)
  }

  console.log('\n=== 网络 ===')
  apiCalls.forEach((c) => console.log('  ' + c))

  console.log('\n=== 控制台错误 ===')
  if (errors.length) errors.slice(0, 8).forEach((e) => console.log('  ! ' + e.slice(0, 200)))
  else console.log('  无')

  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  const out = path.resolve('match-shot.png')
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('\n截图: ' + out)

  chrome.kill()
  process.exit(0)
})().catch((e) => {
  console.error('FAILED: ' + e.message)
  chrome.kill()
  process.exit(1)
})
