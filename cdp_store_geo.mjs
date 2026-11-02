/**
 * 门店地图定位验证（线上）
 * 1) 未定位：只显示门店信息，无距离
 * 2) 选地标「解放碑」：每家显示距您 xx，按距离升序，最近的排第一
 * 3) 导航链接指向高德 URI（含门店坐标）
 * 4) 换「大学城」：排序随之变化
 * 5) 预约页门店下拉带距离 + 导航到店
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const OUT = 'D:/AI/WorkBuddy/2026-09-21-20-38-15'
const PORT = 9379
const API = BASE + '/dev-api'
const PY = String.raw`C://Users//asus//.workbuddy//binaries//python//versions//3.13.12//python.exe`

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-geo-'))
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
  async function pickSpot(name) {
    await evalJs(`document.querySelector('.loc-sel .el-select__wrapper')?.click()`)
    await sleep(600)
    return evalJs(`(() => {
      const items = [...document.querySelectorAll('.el-select-dropdown__item')].filter(i => i.offsetParent !== null)
      const el = items.find(i => i.innerText.trim() === ${JSON.stringify(name)})
      if (!el) return false
      el.click()
      return true
    })()`)
  }
  const cards = () => evalJs(`[...document.querySelectorAll('.store')].map(c => ({
    name: c.querySelector('h4')?.innerText.trim(),
    dist: c.querySelector('.store-dist')?.innerText.trim() || '',
    nav: c.querySelector('a[href*="uri.amap.com"]')?.getAttribute('href') || ''
  }))`)

  await send('Page.enable')
  await send('Runtime.enable')

  try {
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4500)
    const before = await cards()
    check('门店卡片渲染', before.length >= 3, `${before.length} 家`)
    check('未定位时不显示距离', before.every((c) => !c.dist))

    const picked = await pickSpot('解放碑')
    check('选择地标成功', picked)
    await sleep(900)
    const atJfb = await cards()
    check('每家都显示距您', atJfb.every((c) => /距您/.test(c.dist)), atJfb.map((c) => c.dist).join(' | '))
    check('最近的排第一（总店·解放碑）', atJfb[0]?.name?.includes('总店'), atJfb[0]?.name || '')
    const nums = atJfb.map((c) => {
      const t = c.dist.replace('距您', '').trim()
      return t.includes('km') ? parseFloat(t) * 1000 : parseFloat(t)
    })
    check('距离按升序排列', nums.every((n, i) => i === 0 || n >= nums[i - 1]), nums.join(','))
    check('导航链接指向高德', /uri\.amap\.com\/navigation/.test(atJfb[0]?.nav || '') &&
      /to=106\.577315,29\.557666/.test(atJfb[0]?.nav || ''))
    await shot('geo-1-home-jfb.png')

    const picked2 = await pickSpot('大学城熙街')
    check('切换地标成功', picked2)
    await sleep(900)
    const atDxc = await cards()
    check('排序随位置变化（大学城店第一）', atDxc[0]?.name?.includes('大学城'), atDxc[0]?.name || '')
    await shot('geo-2-home-dxc.png')

    // http 站点：点「定位」应给出降级提示
    await evalJs(`localStorage.removeItem('pet-my-spot')`)
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4200)
    await evalJs(`document.querySelector('.loc-btn')?.click()`)
    await sleep(700)
    const locState = await evalJs(`document.querySelector('.loc-state')?.innerText.trim() || ''`)
    check('http 下定位给出降级提示', /不可用/.test(locState), locState)

    // 预约页：门店下拉带距离、导航到店（预约弹窗需登录）
    const T = await apiLogin('admin', 'admin123')
    await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
    await send('Page.navigate', { url: `${BASE}/shop/appointment` })
    await sleep(4500)
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === '立即预约')?.click()`)
    await sleep(1600)
    const dialogOpen = await evalJs(`!!document.querySelector('.bkd-loc')`)
    check('预约弹窗内定位条存在', dialogOpen)
    // 弹窗里选地标 → 门店下拉的距离随之出现
    await evalJs(`document.querySelector('.bkd-loc__sel .el-select__wrapper')?.click()`)
    await sleep(700)
    await evalJs(`(() => {
      const items = [...document.querySelectorAll('.el-select-dropdown__item')].filter(i => i.offsetParent !== null)
      items.find(i => i.innerText.trim() === '解放碑')?.click()
      return true
    })()`)
    await sleep(900)
    await evalJs(`(() => {
      const f = [...document.querySelectorAll('.bkd-field')].find(x => x.querySelector('label')?.innerText.includes('服务门店'))
      f?.querySelector('.el-select__wrapper')?.click()
      return true
    })()`)
    await sleep(800)
    const distInOptions = await evalJs(`[...document.querySelectorAll('.el-select-dropdown__item')]
      .filter(i => i.offsetParent !== null).some(i => /距您/.test(i.innerText))`)
    check('门店下拉显示距离', distInOptions)
    const navHref = await evalJs(`document.querySelector('.bkd-loc__nav')?.getAttribute('href') || ''`)
    check('预约页有导航到店链接', /uri\.amap\.com\/navigation/.test(navHref), navHref.slice(0, 70))
    await shot('geo-3-booking.png')

    // 手机
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await send('Page.navigate', { url: `${BASE}/shop/home` })
    await sleep(4200)
    const mobileOk = await evalJs(`!!document.querySelector('.loc') && document.querySelectorAll('.store').length >= 3`)
    check('手机端定位条正常', mobileOk)
    await shot('geo-3-mobile.png')
  } finally {
    chrome.kill()
  }
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FATAL', e); chrome.kill(); process.exit(1) })
