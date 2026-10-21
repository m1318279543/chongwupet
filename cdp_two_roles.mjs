/**
 * 前后台账号隔离实测
 * 覆盖：前台普通用户 + 后台 admin 并存、互不覆盖、切区重置、退出互不影响、非管理员 token 进后台被拦
 * 用法: node cdp_two_roles.mjs [BASE]
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const HOST = new URL(BASE).hostname
const W = 1280, H = 900
const PORT = 9381
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const REMOTE = BASE.includes('47.116.73.25')

function freshToken(user, file) {
  execSync(`node ${REMOTE ? 'remote_token.mjs' : 'get_token.mjs'} ${BASE} ${user} admin123 ${file}`, { stdio: 'ignore' })
  return fs.readFileSync(file, 'utf8').trim()
}
const SHOP_TOKEN = freshToken('ry', '.tok_ry')
let ADMIN_TOKEN = freshToken('admin', '.admintoken')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-2r-'))
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

  const cookie = async (name, value) => send('Network.setCookie', { name, value, domain: HOST, path: '/', url: BASE + '/' })
  const delCookie = async (name) => send('Network.deleteCookies', { name, domain: HOST })
  const cookies = async () => {
    const r = await send('Network.getCookies', { urls: [BASE + '/'] })
    const out = {}
    for (const c of (r.cookies || [])) out[c.name] = c.value
    return out
  }
  const go = async (p, wait = 4200) => { await send('Page.navigate', { url: BASE + p }); await sleep(wait) }
  const info = async () => JSON.parse(await evaluate(`(() => {
    const nameEl = document.querySelector('.pf-name') || document.querySelector('.desk-user .uname') || document.querySelector('.header .name')
    return JSON.stringify({
      path: location.pathname,
      name: (nameEl?.textContent || '').trim(),
      isAdminLayout: !!document.querySelector('.admin-layout'),
      menuCount: document.querySelectorAll('.sidebar .el-menu-item').length
    })
  })()`) || '{}')
  const confirmBox = async () => {
    await sleep(700)
    return evaluate(`(() => { const b=document.querySelector('.el-message-box__btns .el-button--primary'); if(!b) return 0; b.click(); return 1 })()`)
  }

  let pass = 0, fail = 0
  const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + '  ' + (d ?? '')); c ? pass++ : fail++ }

  // 清空浏览器环境
  await go('/shop/home', 1500)
  await delCookie('Shop-Token'); await delCookie('Admin-Token')

  // ============ 1. 前台登录普通用户 ============
  console.log('\n--- 1. 前台普通用户 ry ---')
  await cookie('Shop-Token', SHOP_TOKEN)
  await go('/shop/profile')
  let s = await info()
  console.log('  ', JSON.stringify(s))
  check('前台显示普通用户资料', s.name === '睿睿铲屎官', `name=${s.name}`)

  // ============ 2. 同浏览器直接访问后台（无后台登录态） ============
  console.log('\n--- 2. 同一浏览器访问后台 ---')
  await go('/admin/dashboard')
  s = await info()
  console.log('  ', JSON.stringify(s))
  check('无后台登录态时不复用前台 token', s.path === '/admin/login', `path=${s.path}`)
  check('未进入后台布局', !s.isAdminLayout, `isAdminLayout=${s.isAdminLayout}`)

  // ============ 3. 后台登录 admin ============
  console.log('\n--- 3. 后台登录 admin ---')
  await cookie('Admin-Token', ADMIN_TOKEN)
  await go('/admin/dashboard', 5600)
  s = await info()
  console.log('  ', JSON.stringify(s))
  check('admin 进入后台看板', s.isAdminLayout && s.path === '/admin/dashboard', `path=${s.path}`)
  check('后台显示管理员本人昵称（非前台用户）', !!s.name && s.name !== '睿睿铲屎官', `name=${s.name}`)
  check('后台侧栏菜单已加载', s.menuCount >= 8, `menu=${s.menuCount}`)

  // ============ 4. 前台保持普通用户（不被 admin 覆盖） ============
  console.log('\n--- 4. 回前台检查是否被顶号 ---')
  await go('/shop/profile')
  s = await info()
  check('前台仍是普通用户', s.name === '睿睿铲屎官', `name=${s.name}`)
  const ck = await cookies()
  check('两套登录态同时存在且互相独立', !!ck['Shop-Token'] && !!ck['Admin-Token'] && ck['Shop-Token'] !== ck['Admin-Token'],
    `shop存在=${!!ck['Shop-Token']} admin存在=${!!ck['Admin-Token']}`)

  // ============ 5. 后台退出不影响前台 ============
  console.log('\n--- 5. 后台退出登录 ---')
  await go('/admin/dashboard', 5200)
  await evaluate(`(() => { const u=document.querySelector('.header .user'); if(u) u.click(); return 1 })()`)
  await sleep(700)
  await evaluate(`(() => { const i=[...document.querySelectorAll('.el-dropdown-menu__item')].find(x=>x.textContent.includes('退出登录')); if(i) i.click(); return 1 })()`)
  const confirmed5 = await confirmBox()
  await sleep(1600)
  const ck2 = await cookies()
  check('后台退出后 Admin-Token 已清除', !ck2['Admin-Token'], `admin存在=${!!ck2['Admin-Token']}`)
  check('后台退出不影响前台 Shop-Token', !!ck2['Shop-Token'], `shop存在=${!!ck2['Shop-Token']}`)
  s = await info()
  check('后台退出后落在后台登录页', s.path === '/admin/login', `path=${s.path} 确认框=${confirmed5}`)
  await go('/shop/profile')
  s = await info()
  check('前台仍保持登录', s.name === '睿睿铲屎官', `name=${s.name}`)

  // ============ 6. 前台退出不影响后台 ============
  console.log('\n--- 6. 前台退出登录 ---')
  ADMIN_TOKEN = freshToken('admin', '.admintoken')
  await cookie('Admin-Token', ADMIN_TOKEN)
  await go('/shop/home', 4600)
  const opened = await evaluate(`(() => {
    const el = document.querySelector('.desk-user .user') || document.querySelector('.desk-user .el-dropdown')
    if (el) { el.click(); return 1 }
    return 0
  })()`)
  await sleep(700)
  const clicked = await evaluate(`(() => { const i=[...document.querySelectorAll('.el-dropdown-menu__item')].find(x=>x.textContent.includes('退出登录')); if(i){i.click(); return 1} return 0 })()`)
  const confirmed6 = await confirmBox()
  await sleep(1800)
  const c3 = await cookies()
  check('前台退出后 Shop-Token 已清除', !c3['Shop-Token'], `shop存在=${!!c3['Shop-Token']} 点击=${opened}/${clicked}/${confirmed6}`)
  check('前台退出不清除 Admin-Token', !!c3['Admin-Token'], `admin存在=${!!c3['Admin-Token']}`)
  await go('/admin/dashboard', 5200)
  s = await info()
  check('前台退出后后台仍正常可用', s.isAdminLayout && s.path === '/admin/dashboard' && s.name !== '睿睿铲屎官', `path=${s.path} name=${s.name}`)

  // ============ 7. 普通用户 token 放进后台 Cookie ============
  console.log('\n--- 7. 普通用户 token 放进后台 Cookie ---')
  // 第 6 步已把前台退出，这里重新登录一个前台普通用户，验证后台拦截不会波及前台
  const shop2 = freshToken('ry', '.tok_ry2')
  await cookie('Shop-Token', shop2)
  await delCookie('Admin-Token')
  await cookie('Admin-Token', shop2)
  await go('/admin/dashboard', 5000)
  s = await info()
  const c4 = await cookies()
  check('非管理员后台 token 被拦截', s.path === '/admin/login' && !s.isAdminLayout, `path=${s.path}`)
  check('被拦截后清掉无效后台 token', !c4['Admin-Token'], `admin存在=${!!c4['Admin-Token']}`)
  check('前台账号不受影响', !!c4['Shop-Token'], `shop存在=${!!c4['Shop-Token']}`)

  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
