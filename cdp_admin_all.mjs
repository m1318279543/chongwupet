/**
 * 自研后台全量页面巡检（22+ 路由）
 * 用法: node cdp_admin_all.mjs [baseUrl]
 * 校验：每页有标题/主内容渲染、无控制台错误、无 404/500 接口
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const API = 'http://localhost:8081'
const PORT = 9351
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 10; i++) {
    try {
      code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      if (code) break
    } catch {}
    await sleep(200)
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })
  const data = await res.json()
  if (!data.token) throw new Error('登录失败: ' + JSON.stringify(data))
  return data.token
}

const PAGES = [
  ['/admin/dashboard', '数据看板'],
  ['/admin/category', '宠物分类'],
  ['/admin/info', '宠物信息'],
  ['/admin/health', '健康档案'],
  ['/admin/preference', '宠物喜好'],
  ['/admin/issue', '健康百科'],
  ['/admin/appointment', '预约管理'],
  ['/admin/cart', '购物车'],
  ['/admin/favorite', '收藏管理'],
  ['/admin/like', '点赞管理'],
  ['/admin/comment', '评论管理'],
  ['/admin/consult', '客服管理'],
  ['/admin/doctor', '医生咨询'],
  ['/admin/cancel', '取消记录'],
  ['/admin/match', '智能匹配'],
  ['/admin/system/user', '用户管理'],
  ['/admin/system/role', '角色管理'],
  ['/admin/system/menu', '菜单管理'],
  ['/admin/system/dept', '部门管理'],
  ['/admin/system/post', '岗位管理'],
  ['/admin/system/dict', '字典管理'],
  ['/admin/system/config', '参数设置'],
  ['/admin/system/notice', '通知公告'],
  ['/admin/system/log', '系统日志'],
  ['/admin/system/online', '在线用户'],
  ['/admin/monitor/server', '服务监控'],
  ['/admin/monitor/cache', '缓存监控'],
]

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-adminall-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1000',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('CDP 未就绪')
}
async function newTab() {
  for (const method of ['PUT', 'GET']) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method }); if (r.ok) return await r.json() } catch {}
  }
  throw new Error('无法新建标签页')
}

;(async () => {
  const token = await login('admin', 'admin123')
  console.log('admin 登录成功')

  await waitCdp()
  const tab = await newTab()
  const ws = await new Promise((res, rej) => {
    const w = new WebSocket(tab.webSocketDebuggerUrl)
    w.addEventListener('open', () => res(w)); w.addEventListener('error', rej)
  })
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    else if (m.method) listeners.forEach((f) => f(m))
  })
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result?.value
  }

  let errors = []
  let badNet = []
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      const u = m.params.response.url
      if (!/favicon|\.map$/.test(u)) badNet.push(m.params.response.status + ' ' + u.split('8081').pop())
    }
  })

  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: 'localhost', path: '/' })
  await send('Page.navigate', { url: BASE + '/admin/dashboard' })
  await sleep(6000)

  const rows = []
  for (const [p, expect] of PAGES) {
    errors = []
    badNet = []
    const nav = await evaluate(`(() => {
      history.pushState({}, '', '${p}');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return location.pathname
    })()`)
    await sleep(1600)
    const info = await evaluate(`(() => {
      const title = document.querySelector('.page-title')?.innerText.trim() || ''
      const tableRows = document.querySelectorAll('.el-table__body tr').length
      const cards = document.querySelectorAll('.el-card').length
      const canvases = document.querySelectorAll('canvas').length
      const empty = document.querySelectorAll('.el-empty, .el-table__empty-block').length
      const bodyText = (document.querySelector('.main')?.innerText || '').trim()
      return JSON.stringify({ title, tableRows, cards, canvases, empty, len: bodyText.length })
    })()`)
    const d = JSON.parse(info)
    const ok = d.title.includes(expect) && d.len > 20 && errors.length === 0 && badNet.length === 0
    rows.push({ p, expect, ...d, errors: [...errors], badNet: [...badNet], ok })
    console.log(`${ok ? '✓' : '✗'} ${p.padEnd(26)} 标题=${d.title} 行=${d.tableRows} 卡=${d.cards} 图=${d.canvases} 文本=${d.len}` +
      (errors.length ? ` 错误=${errors.join(' | ').slice(0, 160)}` : '') +
      (badNet.length ? ` 网络=${badNet.join(' | ').slice(0, 120)}` : ''))
  }

  const failed = rows.filter((r) => !r.ok)
  console.log(`\n总计 ${rows.length} 页，通过 ${rows.length - failed.length}，失败 ${failed.length}`)
  if (failed.length) {
    failed.forEach((f) => console.log('  失败: ' + f.p + ' ' + JSON.stringify({ title: f.title, err: f.errors, net: f.badNet })))
  }

  // 截图四张关键新页面
  const shots = [
    ['/admin/system/post', 'admin-post-shot.png'],
    ['/admin/system/notice', 'admin-notice-shot.png'],
    ['/admin/monitor/server', 'admin-server-shot.png'],
    ['/admin/monitor/cache', 'admin-cache-shot.png'],
  ]
  for (const [p, file] of shots) {
    await evaluate(`(() => { history.pushState({}, '', '${p}'); window.dispatchEvent(new PopStateEvent('popstate')) })()`)
    await sleep(2200)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.resolve(file), Buffer.from(shot.data, 'base64'))
  }
  console.log('截图: ' + shots.map((s) => s[1]).join(', '))

  chrome.kill()
  process.exit(failed.length ? 1 : 0)
})().catch((e) => {
  console.error('测试异常:', e)
  chrome.kill()
  process.exit(2)
})
