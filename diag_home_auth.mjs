// 诊断：登录态下首页宠物列表是否为空（复现用户「一只都看不见」）
// 用法: node diag_home_auth.mjs <base>
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://47.116.73.25'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9461
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
  }).then(r => r.json())
  if (!res.token) throw new Error('登录失败: ' + JSON.stringify(res))
  return res.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-diag-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1280,900',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  const responses = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response
      if (r.url.includes('/pet/info/list') || r.url.includes('/pet/goods/list'))
        responses.push({ url: r.url.replace(BASE, ''), status: r.status })
    }
  })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')

  async function goto(url, ms = 8000) {
    await send('Page.navigate', { url })
    await sleep(ms)
  }
  const cards = () => ev(`document.querySelectorAll('.grid .pet-card, .grid a[href*="/pet/"]').length`)

  // ① 游客
  await goto(BASE + '/shop/home')
  console.log('游客 cards =', await cards(), JSON.stringify(responses))

  // ② 登录 ry
  const token = await apiLogin('ry', 'admin123')
  await send('Network.setCookie', { name: 'Shop-Token', value: token, url: BASE + '/', path: '/' })
  responses.length = 0
  await goto(BASE + '/shop/home')
  const logged = await ev(`document.body.innerText.slice(0, 300)`)
  console.log('登录 ry cards =', await cards(), JSON.stringify(responses))
  console.log('页面文本头300字:', JSON.stringify(logged))

  // ③ 坏 token（模拟会话过期）
  await send('Network.setCookie', { name: 'Shop-Token', value: 'garbage-token-xxx', url: BASE + '/', path: '/' })
  responses.length = 0
  await goto(BASE + '/shop/home')
  console.log('坏token cards =', await cards(), JSON.stringify(responses))

  chrome.kill()
  process.exit(0)
})().catch(e => { console.error('DIAG ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(1) })
