/**
 * E2E：首页宠物粮卡片「详情」直达对应宠物粮详情弹窗（?gid=）
 * 断言：1) 卡片 href/点击跳到 /shop/food?gid=<id>  2) 落地即弹详情，名称与首页卡片一致
 *       3) 关闭弹窗清掉 gid  4) 直接访问 /shop/food?gid= 也能直开
 * 用法: node cdp_food_gid.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9399
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-foodgid-'))
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
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2400) }

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }
async function waitFor(expr, ms = 10000, step = 250) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(expr)) return true; await sleep(step) }
  return false
}

await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

// 1) 首页：宠物粮板块渲染 + 点第一张卡
await goto(`${BASE}/shop/home`)
const ok = await waitFor('document.querySelectorAll(".food-card").length > 0')
check('首页宠物粮板块有卡片', ok, String(await evaluate('document.querySelectorAll(".food-card").length')))
const cardName = (await evaluate('document.querySelector(".food-card .name")?.innerText.trim() || ""')) || ''
await evaluate('document.querySelector(".food-card").click()')
await sleep(1600)
const url1 = await evaluate('location.pathname + location.search')
check('点击卡片跳到 /shop/food?gid=', url1.startsWith('/shop/food') && /[?&]gid=\d+/.test(url1), url1)
const gid1 = (url1.match(/gid=(\d+)/) || [])[1] || ''

// 2) 落地即弹详情，名称一致
const dialogOk = await waitFor('!!document.querySelector(".food-detail-dialog .detail-name")', 6000)
const detailName = (await evaluate('document.querySelector(".food-detail-dialog .detail-name")?.innerText.trim() || ""')) || ''
check('落地直开对应详情弹窗', dialogOk, detailName)
check('弹窗名称与首页卡片一致', detailName === cardName, `${detailName} vs ${cardName}`)

// 3) 关闭弹窗 → gid 清掉
await evaluate(`(() => { const b = document.querySelector(".food-detail-dialog .el-dialog__headerbtn"); if (b) b.click() })()`)
await sleep(900)
const url2 = await evaluate('location.pathname + location.search')
check('关闭弹窗后 URL 不再带 gid', !url2.includes('gid='), url2)

// 4) 直接访问带 gid 的 URL 也能直开（换一款，用当前 gid 也行）
await goto(`${BASE}/shop/food?gid=${gid1}`)
const reopen = await waitFor('!!document.querySelector(".food-detail-dialog .detail-name")', 6000)
check('直达 URL /shop/food?gid= 直开详情', reopen, (await evaluate('document.querySelector(".food-detail-dialog .detail-name")?.innerText || ""')).trim())

console.log(`\n===== ${pass} passed, ${fail} failed =====`)
chrome.kill()
process.exit(fail ? 1 : 0)
