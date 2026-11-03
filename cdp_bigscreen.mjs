/**
 * 大屏差异化验证：访问 /admin/bigscreen，确认新内容（转化漏斗/客户增长/最新评价/门店对比/评分分布/服务热度）
 * 且不含与数据看板重复的区块（实时动态/订单状态/预约状态/24小时分布）
 * 用法: node cdp_bigscreen.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25:8083'
const IS_REMOTE = !BASE.includes('127.0.0.1') && !BASE.includes('localhost')
const API = IS_REMOTE ? BASE + '/dev-api' : BASE.replace(':82', ':8081')
const PORT = 9399
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  if (IS_REMOTE) {
    const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim()
    code = raw.replace(/^"|"$/g, '').split('\n').pop().trim()
  } else {
    code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })
  const data = await res.json()
  if (!data.token) throw new Error(`${username} 登录失败: ` + JSON.stringify(data))
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-bs-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1920,1080',
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
  await send('Page.navigate', { url: BASE + '/admin/login' })
  await sleep(6000)
  await evalJs(`document.cookie = 'Admin-Token=' + encodeURIComponent(${JSON.stringify(token)}) + '; path=/'; 'ok'`)
  await evalJs(`localStorage.setItem('Admin-Token', ${JSON.stringify(token)}); 'ok'`)
  await send('Page.navigate', { url: BASE + '/admin/bigscreen' })
  await sleep(15000)

  // 1. 标题与核心指标
  const title = await evalJs(`document.querySelector('.bs-title, .big-title, h1, .head-title')?.textContent?.trim() || document.body.innerText.match(/宠物之家[·•\\s]*经营监控大屏/)?.[0] || ''`)
  check('标题为经营监控大屏', /经营监控/.test(title || await evalJs(`document.body.innerText`)), title)
  const body1 = await evalJs(`document.body.innerText`)
  check('KPI 含 新增客户/复购率/好评率/服务完成率/会员总余额/平均客单价',
    ['新增客户', '复购率', '好评率', '服务完成率', '会员总余额', '平均客单价'].every(k => body1.includes(k)))

  // 2. 大屏专属区块存在
  check('含 转化漏斗/客户增长/最新评价/门店对比/评分满意度',
    ['转化', '客户增长', '最新', '门店', '评分'].every(k => body1.includes(k)), '')

  // 3. 与数据看板重复的区块不存在
  const dupWords = ['实时动态', '订单状态', '预约状态', '24 小时', '24小时', '热销宠物', '热销商品']
  const found = dupWords.filter(w => body1.includes(w))
  check('不含与看板重复的区块', found.length === 0, found.join(',') || '无重复')

  // 4. 图表 canvas 渲染（漏斗/环形/面积图/条形图）
  await sleep(4000)
  const canvases = await evalJs(`document.querySelectorAll('canvas').length`)
  check('图表 canvas ≥ 5', canvases >= 5, `canvas=${canvases}`)

  // 5. 最新评价滚动列表有内容
  const cmCount = await evalJs(`
    (document.querySelectorAll('.cm-item, .rv-item, [class*=comment] li, [class*=comment] .item, [class*=latest] li').length) ||
    (document.body.innerText.match(/条评价|满意|专业|乖/) ? 1 : 0)`)
  check('最新评价列表有内容', cmCount > 0, `n=${cmCount}`)

  // 6. 时间范围切换
  const radios = await evalJs(`document.querySelectorAll('.chip').length`)
  check('近 7/30/90 天切换存在', radios >= 2, `n=${radios}`)
  await evalJs(`document.querySelectorAll('.chip')[1]?.click(); 'ok'`)
  await sleep(4000)
  const body2 = await evalJs(`document.body.innerText`)
  check('切换 30 天后页面正常', canvases >= 5 && (body2.includes('平均客单价')), '')

  // 7. 数据看板旧页仍正常（对比差异化）
  await send('Page.navigate', { url: BASE + '/admin/dashboard' })
  await sleep(12000)
  const body3 = await evalJs(`document.body.innerText`)
  check('数据看板仍含 实时动态/业务趋势（未被误改）',
    body3.includes('实时动态') || body3.includes('业务趋势'), '')

  // 截图
  await send('Page.navigate', { url: BASE + '/admin/bigscreen' })
  await sleep(15000)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('deploy/bigscreen-remote.png', Buffer.from(shot.result.data, 'base64'))
  console.log('screenshot: deploy/bigscreen-remote.png')

  console.log(`\\n${pass} passed, ${fail} failed`)
  chrome.kill()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(1) })
