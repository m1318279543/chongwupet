/**
 * 门店服务评价（顾客打分 + 评论）前端验证（线上）
 * 1) 游客：星星可点、点星弹登录、评价弹窗可看列表
 * 2) 登录：显示「您的评分」、改分不新增记录、写文字评价成功
 * 3) 手机：控件正常显示
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const API = BASE + '/dev-api'
const OUT = 'D:/AI/WorkBuddy/2026-09-21-20-38-15'
const PORT = 9373
const PY = String.raw`C:\Users\asus\.workbuddy\binaries\python\versions\3.13.12\python.exe`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-rv-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,900',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('无法新建标签页') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('  ✓', name, extra) } else { fail++; console.log('  ✗', name, extra) }
}

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 15; i++) {
    try {
      const raw = execSync(`${PY} deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim()
      code = raw.replace(/^"|"$/g, '').split('\n').pop().trim()
      if (code) break
    } catch {}
    await sleep(200)
  }
  if (!code) throw new Error('取不到验证码')
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  }).then((r) => r.json())
  if (!res.token) throw new Error('登录失败: ' + JSON.stringify(res))
  return res.token
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return r?.result?.value
  }
  const click = async (expr) => evalJs(`(() => { const el = ${expr}; if (!el) return false; el.click(); return true })()`)
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(r.data, 'base64'))
  }
  await send('Page.enable')
  await send('Runtime.enable')

  try {
    /* ---------- 游客视角 ---------- */
    await send('Page.navigate', { url: `${BASE}/shop/appointment` })
    await sleep(4200)
    const stars = await evalJs(`document.querySelectorAll('.as-rate__star').length`)
    check('五星控件渲染', stars === 5, `stars=${stars}`)
    const linkTxt = await evalJs(`document.querySelector('.as-rate__link')?.innerText.trim() || ''`)
    check('评价入口显示', /写评价|条评价/.test(linkTxt), linkTxt)

    await click(`document.querySelectorAll('.as-rate__star')[3]`)
    await sleep(900)
    const authShown = await evalJs(`!!document.querySelector('.el-dialog') && document.body.innerText.includes('登录宠物之家')`)
    check('游客点星弹登录', authShown)
    await shot('rv-1-guest-login.png')
    await evalJs(`document.querySelector('.el-dialog__headerbtn')?.click()`)
    await sleep(600)

    await click(`document.querySelector('.as-rate__link')`)
    await sleep(1400)
    const dlgShown = await evalJs(`!!document.querySelector('.rv-box')`)
    check('评价弹窗打开', dlgShown)
    const loginNote = await evalJs(`document.querySelector('.rv-login') ? true : false`)
    check('弹窗内提示登录', loginNote)
    const listCount = await evalJs(`document.querySelectorAll('.rv-item').length`)
    check('评价列表加载', listCount >= 1, `items=${listCount}`)
    const hasText = await evalJs(`[...document.querySelectorAll('.rv-item__content')].some(el => el.innerText.trim().length > 0 && !el.innerText.includes('未填写'))`)
    check('列表含文字评价', hasText)
    await shot('rv-2-guest-dialog.png')
    await evalJs(`[...document.querySelectorAll('.el-dialog__headerbtn')].pop()?.click()`)
    await sleep(600)

    /* ---------- 登录视角（admin 已有 5 星评价） ---------- */
    const T = await apiLogin('admin', 'admin123')
    await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
    await send('Page.navigate', { url: `${BASE}/shop/appointment` })
    await sleep(4200)
    const label = await evalJs(`document.querySelector('.as-rate__label')?.innerText.trim()`)
    check('显示您的评分', label === '您的评分', label || '无')
    const mineOn = await evalJs(`[...document.querySelectorAll('.as-rate__star')].filter(s => s.classList.contains('is-mine')).length`)
    check('我的星级点亮', mineOn === 5, `on=${mineOn}`)
    await shot('rv-3-mine.png')

    // 改分为 3 星：应更新而非新增（count 不变由接口层保证，这里看交互反馈）
    await click(`document.querySelectorAll('.as-rate__star')[2]`)
    await sleep(1400)
    const changed = await evalJs(`[...document.querySelectorAll('.as-rate__star')].filter(s => s.classList.contains('is-mine')).length`)
    check('点星改分成功', changed === 3, `on=${changed}`)

    // 弹窗写文字评价
    await click(`document.querySelector('.as-rate__link')`)
    await sleep(1400)
    const prefill = await evalJs(`document.querySelector('.rv-box .el-rate').__vue__ ? true : true`)
    await evalJs(`
      (() => {
        const stars = document.querySelectorAll('.rv-form .el-rate__item')
        stars[4]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        const ta = document.querySelector('.rv-form textarea')
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
        setter.call(ta, '环境干净，技师手法轻柔，下次还来')
        ta.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      })()
    `)
    await sleep(300)
    await click(`[...document.querySelectorAll('.rv-form button')].find(b => b.innerText.includes('更新'))`)
    await sleep(1800)
    // 提交成功后弹窗自动关闭，重开弹窗核对列表
    await click(`document.querySelector('.as-rate__link')`)
    await sleep(1600)
    const afterTxt = await evalJs(`document.body.innerText.includes('下次还来')`)
    check('文字评价提交并出现在列表', afterTxt)
    const stillAdminRow = await evalJs(`document.querySelectorAll('.rv-item').length`)
    check('改评不新增记录', stillAdminRow === 1, `items=${stillAdminRow}`)
    await shot('rv-4-submitted.png')

    /* ---------- 手机 ---------- */
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await sleep(1600)
    const mob = await evalJs(`!!document.querySelector('.as-rate') && document.querySelectorAll('.as-rate__star').length === 5`)
    check('手机端控件正常', mob)
    await shot('rv-5-mobile.png')
  } finally {
    chrome.kill()
  }
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FATAL', e); chrome.kill(); process.exit(1) })
