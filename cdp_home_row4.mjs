/**
 * 首页楼层「一行四张」验证：每个分类楼层恰 4 张卡片 + 查看更多跳到该分类完整列表
 * 用法: node cdp_home_row4.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9395
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-row4-'))
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
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(4000)

  // 断言1：楼层模式生效（有分类楼层）
  const floors = await evalJs(`document.querySelectorAll('.floors .floor').length`)
  check('楼层模式渲染（有分类楼层）', floors > 0, `floors=${floors}`)

  // 断言2：每个楼层恰好 4 张宠物卡片（一行四张）
  const counts = await evalJs(`Array.from(document.querySelectorAll('.floors .floor')).map(f => f.querySelectorAll('.pet-card').length)`)
  check('每个楼层恰好 4 张卡片', counts.length > 0 && counts.every(c => c === 4), JSON.stringify(counts))

  // 断言3：每个楼层都有「查看更多」入口
  const mores = await evalJs(`Array.from(document.querySelectorAll('.floors .floor .floor-more')).filter(a => a.textContent.includes('查看更多')).length`)
  check('每个楼层有「查看更多」入口', mores === floors, `${mores}/${floors}`)

  // 断言4：点击第一个「查看更多」→ 进入该分类完整列表（卡片数 ≥ 4）
  const firstTitle = await evalJs(`document.querySelector('.floors .floor h2')?.textContent.trim()`)
  await evalJs(`document.querySelector('.floors .floor .floor-more').click()`)
  await sleep(1500)
  const urlAfter = await evalJs(`(document.querySelector('.floors .floor-head h2')?.textContent || '').trim()`)
  const resultCount = await evalJs(`document.querySelectorAll('.floors .pet-card').length`)
  check('查看更多进入分类完整列表', !!urlAfter && !urlAfter.includes('专区') && resultCount >= 4, `${urlAfter} cards=${resultCount}`)
  void firstTitle

  await ws.close()
  console.log(`\n== ${pass} 通过 / ${fail} 失败 ==`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(2) })
