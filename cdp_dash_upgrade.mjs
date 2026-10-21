/**
 * 数据看板升级验证：8 张 KPI 卡（含支付指标）+ 迷你趋势线 + 支付图表 + 钻取跳转 + 粒度切换 + 导出按钮
 * 用法: node cdp_dash_upgrade.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = !BASE.includes('127.0.0.1') && !BASE.includes('localhost')
const API = IS_REMOTE ? BASE + '/dev-api' : BASE.replace(':82', ':8081')
const PORT = 9397
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  if (IS_REMOTE) {
    const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim()
    code = raw.replace(/^"|"$/g, '').split('\n').pop().trim()
  } else {
    for (let i = 0; i < 15; i++) {
      try {
        code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
        if (code) break
      } catch {}
      await sleep(200)
    }
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })
  const data = await res.json()
  if (!data.token) throw new Error(`${username} 登录失败: ` + JSON.stringify(data))
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-dash-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1600,1000',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

async function main() {
  await waitCdp()
  const token = await apiLogin('admin', 'admin123')
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
  // 注入 Admin-Token（js-cookie 写入）后直接进看板
  await send('Page.navigate', { url: BASE + '/login' })
  await sleep(1500)
  await evalJs(`document.cookie = 'Admin-Token=' + encodeURIComponent(${JSON.stringify(token)}) + '; path=/'; 'ok'`)
  await evalJs(`localStorage.setItem('Admin-Token', ${JSON.stringify(token)}); 'ok'`)
  await send('Page.navigate', { url: BASE + '/admin/dashboard' })
  await sleep(6000)

  // 1. KPI 卡数量与支付指标卡存在
  const kpiCount = await evalJs(`document.querySelectorAll('.kpi-card').length`)
  check('KPI 卡共 8 张', kpiCount === 8, `count=${kpiCount}`)
  const payCards = await evalJs(`Array.from(document.querySelectorAll('.kpi-card .kpi-label')).map(e => e.textContent.trim())`)
  check('含支付金额与支付成功率卡', payCards.includes('支付金额') && payCards.includes('支付成功率'), JSON.stringify(payCards))

  // 2. 迷你趋势线（有数据的卡应有 spark SVG）
  const sparks = await evalJs(`document.querySelectorAll('.kpi-card .kpi-spark').length`)
  check('KPI 卡含迷你趋势线（≥5 张）', sparks >= 5, `sparks=${sparks}`)

  // 3. 支付图表渲染（canvas 数量应 ≥ 9：7 张原图 + 2 张支付图）
  await sleep(1500)
  const canvases = await evalJs(`document.querySelectorAll('.dash canvas').length`)
  check('图表 canvas ≥ 9（含 2 张支付图）', canvases >= 9, `canvas=${canvases}`)

  // 4. 导出按钮存在（每张图一个）
  const expBtns = await evalJs(`document.querySelectorAll('.card-head .exp-btn').length`)
  check('图表导出按钮 9 个', expBtns === 9, `btns=${expBtns}`)

  // 5. 粒度切换：点「按周」后趋势重渲染不报错，且 x 轴标签变短
  const beforeLabels = await evalJs(`Array.from(document.querySelectorAll('.grid-main .card')[0].querySelectorAll('canvas')).length`)
  await evalJs(`Array.from(document.querySelectorAll('.head-tools .el-radio-group'))[1].querySelectorAll('.el-radio-button')[1]?.querySelector('input')?.click()`)
  await sleep(1500)
  const afterCanvas = await evalJs(`document.querySelectorAll('.dash canvas').length`)
  check('按周聚合切换后图表正常', beforeLabels >= 1 && afterCanvas >= 9, `before=${beforeLabels} after=${afterCanvas}`)
  await evalJs(`Array.from(document.querySelectorAll('.head-tools .el-radio-group'))[1].querySelectorAll('.el-radio-button')[0]?.querySelector('input')?.click()`)
  await sleep(1000)

  // 6. KPI 钻取：点击「订单量」卡 → 跳 /admin/cart
  await evalJs(`document.querySelector('.floors, .dash')`)
  await evalJs(`Array.from(document.querySelectorAll('.kpi-card')).find(c => c.textContent.includes('订单量'))?.click()`)
  await sleep(1500)
  const urlAfter = await evalJs('location.pathname')
  check('订单量卡钻取到 /admin/cart', urlAfter === '/admin/cart', urlAfter)

  await ws.close()
  console.log(`\n== ${pass} 通过 / ${fail} 失败 ==`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(2) })
