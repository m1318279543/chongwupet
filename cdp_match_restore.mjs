/**
 * E2E：智能选宠「看完推荐宠物返回，不用重新答题」
 *   1) 答完 10 题出推荐
 *   2) 点「查看详情」进宠物页 → 详情页「返回」回到选宠页：仍是那批推荐（不是问卷第 1 步）
 *   3) 再从结果列表进详情 → 浏览器后退：同样回到推荐结果
 *   4) 从导航重新进入 /shop/match：干净的新问卷（不误恢复旧结果）
 * 用法: node cdp_match_restore.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9400
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-match-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

await waitCdp()
const tab = await newTab()
const ws = await connect(tab.webSocketDebuggerUrl)
let id = 0; const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (e) => {
  const r = (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })) || {}
  return r.result?.value
}
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2200) }
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }
async function waitFor(expr, ms = 15000, step = 250) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(expr)) return true; await sleep(step) }
  return false
}
const quizVisible = '(() => { const w = document.querySelector(".wz"); return !!w && getComputedStyle(w).display !== "none" })()'
const resultVisible = '!!document.querySelector(".result") && document.querySelectorAll(".rrow, .tp-act").length > 0'
const snapshot = `(() => ({
  url: location.pathname + location.search,
  top: (document.querySelector(".tp-name, .tp .nm b, .result h2")?.innerText || "").trim(),
  names: [...document.querySelectorAll(".rrow .nm b")].map(n => n.innerText.trim()),
  rest: document.querySelectorAll(".rrow").length,
  quiz: (() => { const w = document.querySelector(".wz"); return !!w && getComputedStyle(w).display !== "none" })(),
  stepLabel: document.querySelector(".qfoot .btn--solid")?.innerText.trim() || ""
}))()`

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
// 抓坏参请求：恢复链路上任何 petId=undefined 的调用都会在这里现形
ws.addEventListener('message', (ev2) => { const m = JSON.parse(ev2.data); if (m.method === 'Network.requestWillBeSent' && /undefined/.test(m.params.request.url)) console.log('  ⚠ BAD REQ:', m.params.request.url) })
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

// ---------- 1) 干净进入 → 答题 ----------
await goto(`${BASE}/shop/match`)
const fresh = await waitFor('!!document.querySelector(".wz .q")')
check('初次进入是问卷（不是上次的结果）', fresh && (await evaluate(quizVisible)))
const q0 = await evaluate('document.querySelectorAll(".wz .q").length')
check('第一步渲染出题目', q0 > 0, String(q0))

let steps = 0
for (let s = 0; s < 8; s++) {
  await waitFor('!!document.querySelector(".wz .q .opt")', 5000)
  // 每组：没选的题都点第一个选项
  await evaluate(`(() => {
    document.querySelectorAll('.wz .q').forEach(q => { if (!q.querySelector('.opt.on')) q.querySelector('.opt')?.click() })
    return true
  })()`)
  await sleep(400)
  const label = (await evaluate('document.querySelector(".qfoot .btn--solid")?.innerText.trim() || ""')) || ''
  console.log('  · 第', s + 1, '轮，按钮文案:', label)
  const clicked = await evaluate('(() => { const b = document.querySelector(".qfoot .btn--solid"); if (!b) return false; b.click(); return true })()')
  steps++
  if (!clicked) break
  if (/生成匹配结果/.test(label)) { await waitFor('!!document.querySelector(".result")', 25000); break }
  await sleep(800)
}
const ok1 = await waitFor(resultVisible, 20000)
check('答完题生成推荐结果', ok1, `点了 ${steps} 步`)
const before = await evaluate(snapshot)
check('结果里有推荐宠物', before.quiz === false && (before.rest > 0 || before.names.length >= 0), `其余 ${before.rest} 只`)
await shot('shot-match-result.png')

// ---------- 2) 查看详情 → 详情页「返回」→ 应回到同一批推荐 ----------
const toDetail = await evaluate(`(() => {
  const b = [...document.querySelectorAll('.tp-act .btn, .rrow')].find(x => /查看详情|查看/.test(x.innerText))
  if (!b) return false; b.click(); return true
})()`)
check('点「查看详情」进入宠物页', toDetail === true)
const atDetail = await waitFor('/^\\/shop\\/pet\\/\\d+/.test(location.pathname)', 8000)
// 详情页是懒加载组件，路径先变、DOM 后到，必须等返回按钮渲染出来再点
await waitFor('!!document.querySelector(".back-row")', 8000)
check('已在宠物详情页', atDetail && (await evaluate('!!document.querySelector(".back-row")')), await evaluate('location.pathname'))
const backClick = await evaluate('(() => { const b = document.querySelector(".back-row"); if (!b) return false; b.click(); return true })()')
check('详情页点「返回智能选宠」', backClick === true)
await sleep(1600)
const after = await evaluate(snapshot)
check('返回到 /shop/match 且带 restore=1', after.url.startsWith('/shop/match?restore=1'), after.url)
check('返回后仍是推荐结果（不是问卷）', after.quiz === false && (await evaluate(resultVisible)), `quiz=${after.quiz}`)
check('推荐批次与离开前一致', JSON.stringify(after.names) === JSON.stringify(before.names),
  `${before.names.length} 只 → ${after.names.length} 只`)
await shot('shot-match-restored.png')

// ---------- 3) 浏览器后退：从结果列表再进一次详情 ----------
await evaluate(`(() => {
  const row = document.querySelector('.rrow') || [...document.querySelectorAll('.tp-act .btn')].find(b => /查看详情/.test(b.innerText))
  row?.click(); return true
})()`)
await waitFor('/^\\/shop\\/pet\\/\\d+/.test(location.pathname)', 8000)
const atDetail2 = await evaluate('/^\\/shop\\/pet\\/\\d+/.test(location.pathname)')
check('第二次进入宠物详情页', atDetail2, await evaluate('location.pathname'))
await evaluate('history.back()')
await sleep(1800)
const afterBack = await evaluate(snapshot)
check('浏览器后退回到推荐结果（不是重新答题）', afterBack.quiz === false && (await evaluate(resultVisible)), afterBack.url)
check('后退后推荐批次仍一致', JSON.stringify(afterBack.names) === JSON.stringify(before.names))

// ---------- 4) 从导航重新进入：干净问卷 ----------
await goto(`${BASE}/shop/match`)
const cleanAgain = await waitFor('!!document.querySelector(".wz .q")')
check('导航重新进入是干净问卷（不误恢复旧结果）', cleanAgain && (await evaluate(quizVisible)) && !(await evaluate(resultVisible)),
  await evaluate('document.querySelector(".qfoot .btn--solid")?.innerText || ""'))

console.log(`\n===== ${pass} passed, ${fail} failed =====`)
chrome.kill()
process.exit(fail ? 1 : 0)
