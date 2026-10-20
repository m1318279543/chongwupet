/**
 * 取消预约功能端到端交互测试（真实浏览器点击，非接口测试）
 * 用法: node cdp_test_cancel.mjs <baseUrl> <adminToken>
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = (process.argv[2] || 'http://localhost:82').replace(/\/$/, '')
const TOKEN = process.argv[3]
const PORT = 9344
if (!TOKEN) { console.error('缺少 token 参数'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cancel-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--ignore-certificate-errors',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

let client
const errors = []
const netLog = []
const ok = (s) => console.log('  [PASS] ' + s)
const bad = (s) => console.log('  [FAIL] ' + s)

async function evaluate(expr) {
  const r = await client.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') }
  return r.result.value
}

try {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break } catch { }
    await sleep(250)
  }
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = await new Promise((res, rej) => {
    const w = new WebSocket(tab.webSocketDebuggerUrl)
    w.addEventListener('open', () => res(w)); w.addEventListener('error', () => rej(new Error('ws fail')))
  })
  let id = 0; const pending = new Map(); const listeners = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) }
    else if (m.method) listeners.forEach((f) => f(m))
  })
  client = {
    send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })) }),
    on: (f) => listeners.push(f),
  }
  client.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('未捕获异常: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''))
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map((a) => a.description || a.value).join(' '))
    } else if (m.method === 'Network.requestWillBeSent' && /cancel/i.test(m.params.request.url)) {
      netLog.push(`发起 ${m.params.request.method} ${m.params.request.url}`)
    } else if (m.method === 'Network.responseReceived' && /cancel/i.test(m.params.response.url)) {
      netLog.push(`响应 ${m.params.response.status} ${m.params.response.url.slice(-60)}`)
    } else if (m.method === 'Network.loadingFailed' && /cancel/i.test(m.params.requestId + '')) {
      netLog.push(`失败 ${m.params.errorText}`)
    }
  })

  await client.send('Runtime.enable')
  await client.send('Network.enable')
  await client.send('Page.enable')
  await client.send('Network.setCookie', { name: 'Admin-Token', value: TOKEN, url: BASE + '/', path: '/' })

  console.log(`目标: ${BASE}/shop/appointment`)
  console.log('─'.repeat(60))

  await client.send('Page.navigate', { url: BASE + '/shop/appointment' })
  await sleep(7000)

  const before = await evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.innerText.includes('取消预约'));
    const tags = [...document.querySelectorAll('.el-tag')].map(t => t.innerText.trim());
    const cards = document.querySelectorAll('.el-card, .appointment-item, .apt-card').length;
    return JSON.stringify({ cancelButtons: btns.length, tags: tags, cards: cards });
  })()`)
  console.log('页面初始状态: ' + (before?.__err ? '取值失败 ' + before.__err : before))
  const b = JSON.parse(before?.__err ? '{}' : (before || '{}'))
  b.cancelButtons > 0 ? ok(`找到 ${b.cancelButtons} 个「取消预约」按钮`) : bad('页面上没有「取消预约」按钮')

  const clicked = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].filter(x => x.innerText.includes('取消预约'))[0];
    if (!b) return 'no-button';
    b.click();
    return 'clicked';
  })()`)
  console.log('点击按钮: ' + clicked)
  await sleep(1500)

  const dlg = await evaluate(`(() => {
    const box = document.querySelector('.el-message-box');
    const input = document.querySelector('.el-message-box__input input');
    return JSON.stringify({ dialog: !!box, hasInput: !!input, title: box ? box.innerText.split('\\n')[0] : null });
  })()`)
  console.log('弹窗状态: ' + dlg)
  const d = JSON.parse(dlg?.__err ? '{}' : (dlg || '{}'))
  d.dialog ? ok('取消确认弹窗正常弹出') : bad('点击后没有弹出确认框（功能不可用）')

  if (d.dialog) {
    const filled = await evaluate(`(() => {
      const box = document.querySelector('.el-message-box');
      const btns = [...box.querySelectorAll('button')].map((b, i) => i + ':' + b.innerText.trim() + ':' + (b.className || ''));
      const input = box.querySelector('input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '自动化测试：时间冲突');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return JSON.stringify({ buttons: btns, inputValue: input ? input.value : null });
    })()`)
    console.log('弹窗内部按钮: ' + filled)

    const clickRes = await evaluate(`(() => {
      const box = document.querySelector('.el-message-box');
      const btn = [...box.querySelectorAll('button')].find(b => b.innerText.includes('确认取消'));
      if (!btn) return 'not-found';
      btn.click();
      return 'clicked';
    })()`)
    console.log('点击确认按钮: ' + clickRes)
    await sleep(1000)

    const still = await evaluate(`(() => {
      const box = document.querySelector('.el-message-box');
      return JSON.stringify({ stillOpen: !!box, err: box ? (box.querySelector('.el-message-box__errormsg') || {}).innerText : null });
    })()`)
    console.log('点击后弹窗状态: ' + still)
    await sleep(1500)

    const after = await evaluate(`(() => {
      const msgs = [...document.querySelectorAll('.el-message')].map(x => x.innerText.trim());
      const tags = [...document.querySelectorAll('.el-tag')].map(t => t.innerText.trim());
      const btns = [...document.querySelectorAll('button')].filter(b => b.innerText.includes('取消预约')).length;
      return JSON.stringify({ messages: msgs, tags: tags, cancelButtons: btns });
    })()`)
    console.log('提交后状态: ' + after)
    const a = JSON.parse(after?.__err ? '{}' : (after || '{}'))
    const canceled = (a.tags || []).filter((t) => t === '已取消').length
    canceled > 0 ? ok(`列表已出现「已取消」状态（共 ${canceled} 条）`) : bad('列表状态未更新为已取消')
    a.cancelButtons < b.cancelButtons ? ok(`可取消项从 ${b.cancelButtons} 减为 ${a.cancelButtons}`) : bad('可取消按钮数量未变化')
  }

  console.log('─'.repeat(60))
  if (netLog.length) { console.log('取消请求网络记录:'); netLog.slice(0, 10).forEach((l) => console.log('  > ' + l)) }
  else console.log('取消请求网络记录: 无（说明请求根本没发出去）')
  if (errors.length) { console.log('页面运行时错误:'); errors.slice(0, 8).forEach((e) => console.log('  ! ' + e.slice(0, 200))) }
  else console.log('页面控制台无任何错误')

  ws.close()
} catch (e) {
  console.error('脚本错误: ' + e.message)
} finally {
  try { chrome.kill() } catch { }
  await sleep(400)
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch { }
  process.exit(0)
}
