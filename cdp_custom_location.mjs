/**
 * 顾客自定义位置验证（线上）
 * 1) 弹窗打开：常用地标 + 自定义名称/坐标
 * 2) 填「公司 + 106.55,29.56」保存 → 顶栏显示我的位置，门店按距离重排
 * 3) 刷新后位置仍在（localStorage）
 * 4) 倒序坐标「29.56,106.55」同样解析正确（最近门店一致）
 * 5) 非法坐标给错误提示
 * 6) 清除位置 → 距离消失
 * 7) 预约弹窗读到同一位置
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
const PORT = 9385
const PY = String.raw`C:\Users\asus\.workbuddy\binaries\python\versions\3.13.12\python.exe`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-loc-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,950',
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
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(r.data, 'base64'))
  }
  const setInput = async (index, value) => evalJs(`(() => {
    const input = document.querySelectorAll('.lp-input input')[${index}]
    if (!input) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, ${JSON.stringify(value)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  const clickText = async (text) => evalJs(`(() => {
    const el = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === ${JSON.stringify(text)} && b.offsetParent !== null)
    if (!el) return false
    el.click(); return true
  })()`)
  const cards = () => evalJs(`[...document.querySelectorAll('.store')].map(c => ({
    name: c.querySelector('h4')?.innerText.trim(),
    dist: c.querySelector('.store-dist')?.innerText.trim() || ''
  }))`)

  await send('Page.enable')
  await send('Runtime.enable')

  try {
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4500)
    await evalJs(`localStorage.removeItem('pet-my-spot')`)
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4200)

    const opened = await clickText('设置我的位置')
    await sleep(1000)
    const dlg = await evalJs(`!!document.querySelector('.lp')`)
    check('打开设置位置弹窗', opened && dlg)
    const spotCount = await evalJs(`document.querySelectorAll('.lp-spot').length`)
    check('常用地标可选', spotCount >= 6, `${spotCount} 个`)

    await setInput(0, '公司')
    await setInput(1, '106.55,29.56')
    await sleep(300)
    await clickText('保存并使用')
    await sleep(1200)
    const stateText = await evalJs(`document.querySelector('.loc .loc-state')?.innerText.trim() || ''`)
    check('顶栏显示自定义位置', /我的位置：公司/.test(stateText), stateText)
    const c1 = await cards()
    check('门店出现距离', c1.every((c) => /距您/.test(c.dist)), c1.map((c) => `${c.name}:${c.dist}`).join(' | '))
    const nearest1 = c1[0]?.name
    check('按自定义位置重排', /江北/.test(nearest1 || ''), nearest1 || '')
    await shot('loc-1-custom.png')

    // 刷新后仍生效
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4200)
    const afterReload = await evalJs(`document.querySelector('.loc .loc-state')?.innerText.trim() || ''`)
    check('刷新后位置保留', /我的位置：公司/.test(afterReload), afterReload)

    // 倒序坐标（纬度,经度）也应解析正确
    await clickText('更改')
    await sleep(900)
    await setInput(1, '29.56,106.55')
    await clickText('保存并使用')
    await sleep(1200)
    const c2 = await cards()
    check('倒序坐标解析正确', c2[0]?.name === nearest1, `${c2[0]?.name} vs ${nearest1}`)

    // 非法坐标
    await clickText('更改')
    await sleep(900)
    await setInput(1, 'abc')
    await clickText('保存并使用')
    await sleep(700)
    const errText = await evalJs(`document.querySelector('.lp-err')?.innerText.trim() || ''`)
    check('非法坐标给提示', /请填写正确的经纬度/.test(errText), errText)
    await shot('loc-2-dialog.png')

    // 清除
    await clickText('清除位置')
    await sleep(1000)
    const cleared = await cards()
    check('清除后不再显示距离', cleared.every((c) => !c.dist))

    // 预约弹窗读到同一位置（登录后打开）
    const T = await apiLogin('admin', 'admin123')
    await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
    await send('Page.navigate', { url: `${BASE}/shop/appointment` })
    await sleep(4200)
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === '立即预约')?.click()`)
    await sleep(1500)
    await clickText('设置我的位置')
    await sleep(900)
    const hasSpots = await evalJs(`document.querySelectorAll('.lp-spot').length >= 6`)
    check('预约弹窗可设置同样位置', hasSpots)
    await evalJs(`[...document.querySelectorAll('.lp-foot button, .el-dialog__footer button')].find(b => b.innerText.trim() === '取消')?.click()`)
    await sleep(600)
    await shot('loc-3-booking.png')

    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4000)
    await clickText('设置我的位置')
    await sleep(900)
    const mob = await evalJs(`!!document.querySelector('.lp') && document.querySelectorAll('.lp-spot').length >= 6`)
    check('手机端弹窗正常', mob)
    await shot('loc-4-mobile.png')
  } finally {
    chrome.kill()
  }
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FATAL', e); chrome.kill(); process.exit(1) })
