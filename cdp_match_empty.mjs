/**
 * 智能匹配 - 无匹配结果落库与提示验证
 * 用法: node cdp_match_empty.mjs <baseUrl>
 *
 * 场景：小户型 + 无小孩 + 宅家 + 新手 + 预算 1000 以内 + 偏好猫咪
 *       → 猫最低价 1800，必然 0 结果；验证前端给出具体原因，且后端仍写入记录。
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const PORT = 9363
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-match-empty-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1200',
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

let pass = 0
let fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const client = await connect(tab.webSocketDebuggerUrl)
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Network.enable')

  const errors = []
  let recommendResp = null
  client.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'exception')
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
    } else if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/pet/match/recommend')) {
      recommendResp = { status: m.params.response.status, reqId: m.params.requestId }
    }
  })

  const evaluate = async (expression) => {
    const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result?.value
  }

  await client.send('Page.navigate', { url: BASE + '/shop/match' })
  await sleep(5500)

  const picks = [
    '小户型 / 合租', '没有', '几乎不能接受',
    '宅家为主', '1 ~ 3 小时', '都可以',
    '第一次养', '1000 元以内', '200 ~ 500 元',
    '猫咪'
  ]
  for (const label of picks) {
    for (let t = 0; t < 24; t++) {
      const ok = await evaluate(`(() => {
        const el = [...document.querySelectorAll('.opt')].find(e => e.innerText.includes(${JSON.stringify(label)}))
        if (!el) return 'not-found'
        el.click()
        return 'clicked'
      })()`)
      if (ok === 'clicked') break
      await sleep(200)
    }
    await sleep(820)
  }

  const submitted = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.quiz-actions button')].find(b => b.innerText.includes('开始智能匹配'))
    if (!btn) return 'no-submit-btn'
    if (btn.disabled) return 'submit-disabled'
    btn.click()
    return 'submitted'
  })()`)
  check('问卷提交成功', submitted === 'submitted', submitted)

  let emptyInfo = null
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    emptyInfo = await evaluate(`(() => { const e = document.querySelector('.empty-result'); return e ? e.innerText : null })()`)
    if (emptyInfo) break
  }
  check('渲染出"无匹配"结果页', !!emptyInfo)

  const text = emptyInfo || ''
  check('展示具体原因（不是泛泛提示）', /最低价|预算|类型|儿童/.test(text), text.replace(/\n/g, ' | ').slice(0, 120))
  check('给出返工建议', /上调预算|改为「不限」|咨询客服/.test(text))
  check('展示比对数量', /共比对了\s*\d+\s*只在售宠物/.test(text))

  // 校验接口返回也带 diagnosis 与 recordId
  const body = await evaluate(`(async () => {
    const r = await fetch('/dev-api/pet/match/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({home:'small',kids:'no',noise:'low',activity:'low',time:'lt1',companion:'independent',experience:'none',budget:'1000',monthly:'200',prefer:'1'})
    })
    const j = await r.json()
    const d = j.data || {}
    return JSON.stringify({ matched: d.matchedCount, recordId: d.recordId, rootCause: d.diagnosis && d.diagnosis.rootCause, summary: d.summary })
  })()`)
  let api = {}
  try { api = JSON.parse(body) } catch (e) { api = {} }
  check('接口返回 diagnosis.rootCause = budget', api.rootCause === 'budget', String(api.rootCause))
  check('无匹配也返回 recordId（已落库）', typeof api.recordId === 'number' && api.recordId > 0, 'recordId=' + api.recordId)
  check('接口 summary 与诊断口径一致', /最低价/.test(api.summary || ''), (api.summary || '').slice(0, 80))

  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.resolve('match-empty-result.png'), Buffer.from(shot.data, 'base64'))

  console.log('\n=== 控制台错误 ===')
  if (errors.length) errors.slice(0, 6).forEach((e) => console.log('  ! ' + e.slice(0, 160)))
  else console.log('  无')

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('FAILED: ' + e.message)
  chrome.kill()
  process.exit(1)
})
