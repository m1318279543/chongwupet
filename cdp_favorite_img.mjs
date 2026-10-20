/**
 * 「我的收藏」图片显示验证
 * 用法: node cdp_favorite_img.mjs [base] [api]
 * 校验：登录 ry → /shop/favorite → 卡片 <img> 真实加载（naturalWidth > 0）、不是 emoji 占位
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const API = process.argv[3] || 'http://127.0.0.1:8081'
const PORT = 9367
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 10; i++) {
    try {
      if (/dev-api|47\.116\./.test(API)) {
        // 远程环境：验证码在服务器 Redis 里，用 ssh_run.py 到服务器上取
        code = execSync(
          `python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`,
          { encoding: 'utf8', cwd: process.cwd() }
        ).trim().replace(/"/g, '').split('\n').filter((l) => l && !l.startsWith('[')).pop() || ''
      } else {
        code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
      }
      if (code) break
    } catch {}
    await sleep(300)
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })
  const data = await res.json()
  if (!data.token) throw new Error('登录失败: ' + JSON.stringify(data))
  return data.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-fav-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1440,1100',
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

let pass = 0, fail = 0
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

;(async () => {
  const token = await login('ry', 'admin123')
  await waitCdp()
  const tab = await newTab()
  const ws = await new Promise((res, rej) => {
    const w = new WebSocket(tab.webSocketDebuggerUrl)
    w.addEventListener('open', () => res(w)); w.addEventListener('error', rej)
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return { err: r.exceptionDetails.exception?.description || r.exceptionDetails.text }
    return r.result?.value
  }

  const errors = []
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || '')
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.description || a.value).join(' '))
  })

  // 前端 cookie 名（RuoYi 默认 Admin-Token）
  const host = BASE.includes('localhost') ? 'localhost' : (BASE.includes('127.0.0.1') ? '127.0.0.1' : new URL(BASE).hostname)
  await send('Network.setCookie', { name: 'Admin-Token', value: token, domain: host, path: '/' })
  await send('Page.navigate', { url: BASE + '/shop/favorite' })
  await sleep(6000)

  const cards = await evaluate(`JSON.stringify((() => {
    const cards = [...document.querySelectorAll('.grid .card')]
    return cards.map(c => {
      const img = c.querySelector('img.avatar-photo')
      const av = c.querySelector('.avatar')
      return {
        name: c.querySelector('.name')?.innerText.trim(),
        hasImg: !!img,
        src: img?.getAttribute('src') || '',
        natural: img?.naturalWidth || 0,
        complete: img ? img.complete : null,
        emoji: av && !img ? av.innerText.trim() : ''
      }
    })
  })())`)
  let list = []
  try { list = JSON.parse(cards) } catch (e) {}
  check('收藏列表已渲染', list.length > 0, list.length + ' 张卡片')
  // 先滚到底部触发懒加载，再统计真实加载结果
  await evaluate(`window.scrollTo(0, document.body.scrollHeight)`)
  await sleep(2500)
  const loadedInfo = await evaluate(`JSON.stringify([...document.querySelectorAll('.grid .card')].map(c => {
    const img = c.querySelector('img.avatar-photo')
    return { name: c.querySelector('.name')?.innerText.trim(), natural: img?.naturalWidth || 0, src: img?.getAttribute('src') || '' }
  }))`)
  let all = []
  try { all = JSON.parse(loadedInfo) } catch (e) {}

  const withImg = all.filter((x) => x.src)
  check('卡片渲染了 <img> 而不是 emoji 占位', withImg.length === all.length, `${withImg.length}/${all.length} 有 img`)
  const loaded = all.filter((x) => x.natural > 0)
  check('图片真实加载成功（naturalWidth > 0）', loaded.length === all.length, `${loaded.length}/${all.length} 已加载`)
  const broken = all.filter((x) => x.natural === 0)
  if (broken.length) console.log('  未加载: ' + broken.map((b) => b.name + ' ' + b.src).join(' | '))
  const srcs = all.slice(0, 3).map((x) => x.src)
  check('图片地址为宠物图片路径', srcs.every((s) => /\/images\/pets\/|profile/.test(s)), srcs.join(' , '))

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.resolve('favorite-images.png'), Buffer.from(shot.data, 'base64'))

  console.log('\n=== 控制台错误 ===')
  console.log(errors.length ? errors.slice(0, 5).map((e) => '  ! ' + e.slice(0, 160)).join('\n') : '  无')
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
