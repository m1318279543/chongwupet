/**
 * 门店展示大屏验证（游客页面，无需登录）：
 * 标题/评分/星级分布/3D 旋转环卡片/统计条/最新好评/复购率
 * 用法: node cdp_display.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const PORT = 9395
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-disp-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--window-size=1920,1080',
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
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200))
  })
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    return r.result?.result?.value
  }

  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: BASE + '/shop/display' })
  await sleep(6000)

  const body = await evalJs(`document.body.innerText`)
  check('标题为门店展示大屏', (body || '').includes('门店展示大屏'), '')
  check('左侧顾客好评面板', (body || '').includes('顾客好评') && (body || '').includes('好评率'), '')
  check('右侧复购口碑面板', (body || '').includes('复购率') && (body || '').includes('服务完成率'), '')

  // 评分数字（非 0 的评分均值或 0 也可，只要节点存在）
  const scoreNum = await evalJs(`document.querySelector('.score-num')?.textContent || ''`)
  check('综合评分节点存在', scoreNum !== '', scoreNum)

  // 3D 旋转环
  const ringCards = await evalJs(`document.querySelectorAll('.ring-card').length`)
  check('3D 旋转环卡片 ≥ 6', ringCards >= 6, `n=${ringCards}`)
  const imgsOk = await evalJs(`Array.from(document.querySelectorAll('.ring-card img')).filter(i => i.complete && i.naturalWidth > 0).length`)
  check('卡片图片加载成功 ≥ 4', imgsOk >= 4, `ok=${imgsOk}`)
  const ringAnim = await evalJs(`getComputedStyle(document.querySelector('.ring')).animationName`)
  check('旋转动画生效', String(ringAnim).startsWith('ring-spin'), ringAnim)

  // 统计条与最新好评
  const strips = await evalJs(`document.querySelectorAll('.strip-item').length`)
  check('底部统计条 4 项', strips === 4, `n=${strips}`)
  const gdItems = await evalJs(`document.querySelectorAll('.gd-item').length`)
  check('最新好评列表 ≥ 1', gdItems >= 1, `n=${gdItems}`)
  const distRows = await evalJs(`document.querySelectorAll('.dist-row').length`)
  check('星级分布 5 行', distRows === 5, `n=${distRows}`)

  check('无运行时报错', errors.length === 0, errors.slice(0, 2).join(' | '))

  // 截图
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('deploy/display-remote.png', Buffer.from(shot.result.data, 'base64'))
  console.log('screenshot: deploy/display-local.png')

  console.log(`\\n${pass} passed, ${fail} failed`)
  chrome.kill()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(1) })
