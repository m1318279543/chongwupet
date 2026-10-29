// platform-v2 合并后新功能检查：AI 助手（游客可用）/ 购物车落库 / 我的宠物 / 后台知识库
// 用法: node cdp_pv2_features.mjs <base>
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9483
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`  PASS ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  FAIL ${name}${extra ? '  ' + extra : ''}`) }
}

async function apiLogin(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 15; i++) {
    try {
      code = IS_REMOTE
        ? (() => { const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim(); return raw.replace(/^"|"$/g, '').split('\n').pop().trim() })()
        : execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-pv2-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1380,960',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await new Promise((res, rej) => { const w = new WebSocket(tab.webSocketDebuggerUrl); w.addEventListener('open', () => res(w)); w.addEventListener('error', rej) })
  let id = 0; const pending = new Map(); const errs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception?.description || '').slice(0, 160))
  })
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  const goto = async (url, ms = 6000) => { await send('Page.navigate', { url }); await sleep(ms) }

  // ① 游客首页：AI 助手入口存在，点开抽屉，能发消息拿到回复
  await goto(BASE + '/shop/home')
  check('前台顶栏有 AI 助手入口', await ev(`!!document.querySelector('.as-entry')`))
  await ev(`document.querySelector('.as-entry').click()`)
  await sleep(1200)
  check('助手抽屉已打开', await ev(`!!document.querySelector('.assistant-dock .as-panel, .assistant-dock .as-body')`))
  await ev(`(() => { const t = document.querySelector('.as-foot textarea'); if (!t) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(t, '店里有什么猫粮'); t.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await sleep(400)
  await ev(`(() => { const b = document.querySelector('.as-foot .as-send'); if (b) b.click() })()`)
  await sleep(6000)
  const reply = await ev(`(document.querySelector('.assistant-dock')?.innerText || '').length`)
  check('助手返回了回复内容', (reply || 0) > 40, 'textLen=' + reply)

  // ② 购物车落库：登录后加购，服务端应该出现 pet_cart_item 记录
  const T = await apiLogin('ry', 'admin123')
  await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })
  await goto(BASE + '/shop/food')
  await ev(`document.querySelector('.quick-cart')?.click()`)
  await sleep(1500)
  const serverItems = await ev(`fetch('${API}/pet/shopcart/items', { headers: { 'Authorization': 'Bearer ' + (document.cookie.match(/Shop-Token=([^;]+)/) || [])[1] } })
    .then(r => r.json()).then(d => (d.data || []).length).catch(() => -1)`)
  check('加入购物车已落库（服务端有明细）', (serverItems || 0) >= 1, 'items=' + serverItems)

  // ③ 购物车页（pv2 新版：分区标签 + 订单记录）
  await goto(BASE + '/shop/cart')
  check('购物车页渲染', await ev(`document.body.innerText.includes('购物车')`))
  check('购物车页有订单记录分区', await ev(`document.body.innerText.includes('订单')`))

  // ④ 我的宠物页（pv2 新增）
  await goto(BASE + '/shop/mypet')
  check('/shop/mypet 可访问且非 404', await ev(`!document.body.innerText.includes('页面不存在') && document.body.innerText.length > 30`), (await ev(`document.body.innerText.slice(0,40).replace(/\\n/g,' ')`)) || '')

  // ⑤ 后台：知识库页（pv2 新增）
  const AT = await apiLogin('admin', 'admin123')
  await send('Network.setCookie', { name: 'Admin-Token', value: AT, url: BASE + '/', path: '/' })
  await goto(BASE + '/admin/knowledge')
  check('后台 AI 知识库页渲染', await ev(`!document.body.innerText.includes('页面不存在') && document.body.innerText.length > 30`), (await ev(`document.body.innerText.slice(0,40).replace(/\\n/g,' ')`)) || '')

  check('页面无未捕获异常', errs.length === 0, errs.slice(0, 1).join(''))

  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  ws.close(); chrome.kill(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
