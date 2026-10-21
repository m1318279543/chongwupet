/**
 * 真实登录流程实测：前台弹窗登录普通用户 → 后台页面登录 admin → 两边账号各自独立
 * 验证 token 写入不同 Cookie（Shop-Token / Admin-Token）
 * 用法: node cdp_login_flow.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const HOST = new URL(BASE).hostname
const W = 1280, H = 900
const PORT = 9383
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const REDIS = 'D:/Redis/redis-cli.exe'
const REMOTE = BASE.includes('47.116.73.25')
// 本地直接调 redis-cli，公网环境通过 ssh 读服务器 Redis
const redisCmd = (cmd) => REMOTE
  ? execSync(`python deploy/ssh_run.py "redis-cli ${cmd}"`, { encoding: 'utf8' })
  : execSync(`"${REDIS}" ${cmd}`, { encoding: 'utf8' })

const keys = () => {
  try {
    return redisCmd('KEYS "captcha_codes:*"').split(/\r?\n/).filter(Boolean)
  } catch { return [] }
}
const codeOf = (key) => {
  try {
    return redisCmd(`GET ${key}`).trim().split(/\r?\n/).pop().replace(/^"|"$/g, '')
  } catch { return '' }
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-lf-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch { } await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch { } } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  const cookies = async () => {
    const r = await send('Network.getCookies', { urls: [BASE + '/'] })
    const out = {}; for (const c of (r.cookies || [])) out[c.name] = c.value
    return out
  }
  const go = async (p, wait = 4200) => { await send('Page.navigate', { url: BASE + p }); await sleep(wait) }

  // 用原生 setter 触发 v-model
  const fill = async (values) => evaluate(`(() => {
    const inputs = [...document.querySelectorAll('.el-dialog input.el-input__inner, .admin-login input.el-input__inner, .login-card input.el-input__inner')]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    const vals = ${JSON.stringify(values)}
    inputs.slice(0, vals.length).forEach((el, i) => { setter.call(el, vals[i]); el.dispatchEvent(new Event('input', { bubbles: true })) })
    return inputs.length
  })()`)

  let pass = 0, fail = 0
  const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + '  ' + (d ?? '')); c ? pass++ : fail++ }

  // 清空登录态
  await go('/shop/home', 2000)
  await send('Network.clearBrowserCookies')

  // ============ 1. 前台弹窗登录普通用户 ============
  console.log('\n--- 1. 前台弹窗登录 ry ---')
  await go('/shop/home', 4200)
  const before = new Set(keys())
  await evaluate(`(() => { const b=[...document.querySelectorAll('.desk-user .el-button')].find(x=>x.textContent.trim()==='登录'); if(b) b.click(); return 1 })()`)
  await sleep(1800)
  await sleep(500)
  const newKey = keys().find(k => !before.has(k)) || keys()[0]
  const code1 = codeOf(newKey)
  console.log('  验证码已取到:', !!code1, ' 输入框数:', await fill(['ry', 'admin123', code1]))
  await evaluate(`(() => { const b=document.querySelector('.submit-btn'); if(b) b.click(); return 1 })()`)
  await sleep(3200)
  const st1 = JSON.parse(await evaluate(`(() => {
    const dlg = document.querySelector('.el-dialog')
    const uname = document.querySelector('.desk-user .uname')
    return JSON.stringify({ dialogOpen: !!(dlg && dlg.offsetParent), name: (uname?.textContent||'').trim() })
  })()`) || '{}')
  console.log('  ', JSON.stringify(st1))
  const ck1 = await cookies()
  check('前台登录成功（弹窗关闭+显示昵称）', !st1.dialogOpen && st1.name === '睿睿铲屎官', `dialog=${st1.dialogOpen} name=${st1.name}`)
  check('前台 token 写入 Shop-Token 而非 Admin-Token', !!ck1['Shop-Token'] && !ck1['Admin-Token'],
    `shop存在=${!!ck1['Shop-Token']} admin存在=${!!ck1['Admin-Token']}`)

  // ============ 2. 后台登录 admin ============
  console.log('\n--- 2. 后台登录 admin ---')
  const before2 = new Set(keys())
  await go('/admin/login', 4500)
  await sleep(800)
  const newKey2 = keys().find(k => !before2.has(k)) || keys()[0]
  const code2 = codeOf(newKey2)
  console.log('  验证码已取到:', !!code2, ' 输入框数:', await fill(['admin', 'admin123', code2]))
  await evaluate(`(() => {
    const btns=[...document.querySelectorAll('.admin-login .el-button')]
    const b=btns.find(x=>x.textContent.includes('登录')) || btns[0]
    if(b) b.click(); return 1
  })()`)
  await sleep(4000)
  const st2 = JSON.parse(await evaluate(`(() => JSON.stringify({
    path: location.pathname,
    name: (document.querySelector('.header .name')?.textContent || '').trim(),
    isAdminLayout: !!document.querySelector('.admin-layout')
  }))()`) || '{}')
  console.log('  ', JSON.stringify(st2))
  const ck2 = await cookies()
  check('后台登录 admin 成功', st2.isAdminLayout && !!st2.name && st2.name !== '睿睿铲屎官', `path=${st2.path} name=${st2.name}`)
  check('后台 token 写入 Admin-Token 且前台 token 仍在', !!ck2['Admin-Token'] && !!ck2['Shop-Token'],
    `shop存在=${!!ck2['Shop-Token']} admin存在=${!!ck2['Admin-Token']}`)

  // ============ 3. 回前台不被顶号 ============
  console.log('\n--- 3. 回前台 ---')
  await go('/shop/home', 4500)
  const st3 = JSON.parse(await evaluate(`(() => JSON.stringify({
    name: (document.querySelector('.desk-user .uname')?.textContent || '').trim(),
    avatar: document.querySelector('.desk-user .avatar img')?.getAttribute('src') || ''
  }))()`) || '{}')
  check('前台仍是普通用户（未被 admin 顶号）', st3.name === '睿睿铲屎官', `name=${st3.name}`)

  // ============ 4. 再回后台仍是 admin ============
  await go('/admin/dashboard', 5200)
  const st4 = JSON.parse(await evaluate(`(() => JSON.stringify({
    path: location.pathname,
    name: (document.querySelector('.header .name')?.textContent || '').trim()
  }))()`) || '{}')
  check('后台仍是 admin（未被前台顶号）', st4.path === '/admin/dashboard' && !!st4.name && st4.name !== '睿睿铲屎官', `path=${st4.path} name=${st4.name}`)

  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
