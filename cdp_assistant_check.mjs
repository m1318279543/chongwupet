/**
 * AI 数字人悬浮球 + 悬浮窗验证（线上）
 * 1) 桌面：球在右下、点击开窗、窗口是 400x~620 浮层而非全高侧栏、头部可拖动
 * 2) 拖拽球后位置写进 localStorage
 * 3) 手机：球在标签栏上方、点击后全屏面板
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://47.116.73.25'
const OUT = 'D:/AI/WorkBuddy/2026-09-21-20-38-15'
const PORT = 9361
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-as-'))
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

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r?.result?.value
  }
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const p = path.join(OUT, name)
    fs.writeFileSync(p, Buffer.from(s.data, 'base64'))
    console.log('  →', name)
  }
  // 用 CDP 鼠标事件点击（pointerdown/up 由浏览器合成为 pointer 事件）
  const clickAt = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, pointerType: 'mouse' })
    await sleep(60)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  }
  const drag = async (x1, y1, x2, y2, steps = 12) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1, pointerType: 'mouse' })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps, button: 'left', buttons: 1, pointerType: 'mouse' })
      await sleep(24)
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1, pointerType: 'mouse' })
  }

  await send('Page.enable')
  await send('Runtime.enable')

  /* ================= 桌面 1440x900 ================= */
  console.log('\n[桌面 1440x900]')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(4200)
  await evalJs(`localStorage.removeItem('pet-assistant-orb-pos'); sessionStorage.removeItem('pet-assistant-tip-shown'); location.reload(); 1`)
  await sleep(4600)

  const orb = await evalJs(`(() => {
    const el = document.querySelector('.as-orb')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      radius: cs.borderRadius, hasBot: !!el.querySelector('svg.bot-face'), txt: (el.querySelector('.as-orb-txt')||{}).textContent,
      tip: !!el.querySelector('.as-orb-tip') }
  })()`)
  check('悬浮球渲染', !!orb, JSON.stringify(orb))
  if (orb) {
    check('尺寸 68×68', orb.w === 68 && orb.h === 68, `${orb.w}×${orb.h}`)
    check('圆形', orb.radius.includes('50%') || parseFloat(orb.radius) >= orb.w / 2, orb.radius)
    check('数字人脸存在', orb.hasBot)
    check('默认贴右下', orb.x > 1440 - 68 - 40 && orb.y > 900 - 68 - 60, `left=${orb.x} top=${orb.y}`)
  }
  await sleep(2600) // 等招呼气泡
  await shot('as-desktop-1-orb.png')
  const tip = await evalJs(`(() => {
    const el = document.querySelector('.as-orb-tip'); if (!el) return null
    const r = el.getBoundingClientRect()
    return { text: el.textContent, x: Math.round(r.left), y: Math.round(r.top), right: Math.round(r.right), visible: r.width > 0 && r.right <= window.innerWidth && r.left >= 0 }
  })()`)
  check('招呼气泡在屏幕内可见', !!tip && tip.visible, JSON.stringify(tip))

  // 点击球 → 浮窗
  await clickAt(orb.x + orb.w / 2, orb.y + orb.h / 2)
  await sleep(1200)
  const panel = await evalJs(`(() => {
    const el = document.querySelector('.as-panel')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      radius: cs.borderTopLeftRadius, shadow: cs.boxShadow.slice(0, 30), pos: cs.position,
      headCursor: getComputedStyle(document.querySelector('.as-head')).cursor,
      orbGone: !document.querySelector('.as-orb'),
      title: (document.querySelector('.as-name strong')||{}).textContent }
  })()`)
  check('点击悬浮球打开面板', !!panel, JSON.stringify(panel))
  if (panel) {
    check('是浮窗不是全高侧栏', panel.w === 400 && panel.h < 700 && panel.h > 400, `${panel.w}×${panel.h}`)
    check('圆角卡片', parseFloat(panel.radius) >= 6, panel.radius)
    check('有投影', panel.shadow !== 'none')
    check('固定定位', panel.pos === 'fixed')
    check('头部可拖拽', panel.headCursor === 'move', panel.headCursor)
    check('打开后球隐藏', panel.orbGone)
    check('标题为宠物之家助手', panel.title === '宠物之家助手', panel.title)
  }
  await shot('as-desktop-2-panel.png')

  // 拖动面板头部
  if (panel) {
    const hx = panel.x + 120, hy = panel.y + 30
    await drag(hx, hy, hx - 260, hy - 120)
    await sleep(500)
    const moved = await evalJs(`(() => { const r = document.querySelector('.as-panel').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) } })()`)
    check('头部拖动生效', Math.abs(moved.x - panel.x) > 100 && Math.abs(moved.y - panel.y) > 60, `→ ${moved.x},${moved.y}`)
    await shot('as-desktop-3-panel-moved.png')
  }

  // 关闭 → 拖球 → 位置记忆
  await evalJs(`document.querySelector('.as-close').click(); 1`)
  await sleep(700)
  const orb2 = await evalJs(`(() => { const r = document.querySelector('.as-orb').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) } })()`)
  await drag(orb2.x + 34, orb2.y + 34, 260, 300)
  await sleep(600)
  const after = await evalJs(`(() => {
    const r = document.querySelector('.as-orb').getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), saved: localStorage.getItem('pet-assistant-orb-pos'),
      panelStillOpen: !!document.querySelector('.as-panel') }
  })()`)
  check('球被拖到新位置', Math.abs(after.x - (260 - 34)) < 24 && Math.abs(after.y - (300 - 34)) < 24, `${after.x},${after.y}`)
  check('拖拽不误开窗', !after.panelStillOpen)
  check('位置写入 localStorage', !!after.saved, String(after.saved))
  await shot('as-desktop-4-orb-moved.png')

  await evalJs(`location.reload(); 1`)
  await sleep(4200)
  const restored = await evalJs(`(() => { const r = document.querySelector('.as-orb').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) } })()`)
  check('刷新后位置记忆生效', Math.abs(restored.x - after.x) < 6 && Math.abs(restored.y - after.y) < 6, `${restored.x},${restored.y}`)

  // 悬浮球位置在左半屏时，窗口应跟着球走
  await clickAt(restored.x + 34, restored.y + 34)
  await sleep(900)
  const near = await evalJs(`(() => { const r = document.querySelector('.as-panel').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) } })()`)
  check('浮窗贴着球所在侧展开', near.x <= restored.x + 68 && near.x + 400 >= restored.x, JSON.stringify(near))
  await shot('as-desktop-5-panel-left.png')

  /* ================= 手机 390x844 ================= */
  console.log('\n[手机 390x844]')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(4500)
  await evalJs(`localStorage.removeItem('pet-assistant-orb-pos'); sessionStorage.removeItem('pet-assistant-tip-shown'); location.reload(); 1`)
  await sleep(4600)
  const morb = await evalJs(`(() => {
    const el = document.querySelector('.as-orb'); if (!el) return null
    const r = el.getBoundingClientRect(); const tab = document.querySelector('.tabbar')
    const tr = tab ? tab.getBoundingClientRect() : null
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      orbBottom: Math.round(r.bottom), tabTop: tr ? Math.round(tr.top) : null,
      overflowX: r.right > window.innerWidth }
  })()`)
  check('手机悬浮球渲染', !!morb, JSON.stringify(morb))
  if (morb) {
    check('手机尺寸收小', morb.w === 58, String(morb.w))
    check('不压住底部标签栏', morb.tabTop == null || morb.orbBottom <= morb.tabTop + 2, `orbBottom=${morb.orbBottom} tabTop=${morb.tabTop}`)
    check('未溢出屏幕', !morb.overflowX)
  }
  await shot('as-mobile-1-orb.png')

  await clickAt(morb.x + morb.w / 2, morb.y + morb.h / 2)
  await sleep(1200)
  const mpanel = await evalJs(`(() => {
    const el = document.querySelector('.as-panel'); if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  })()`)
  check('手机打开全屏面板', mpanel && mpanel.x === 0 && mpanel.y === 0 && mpanel.w === 390 && mpanel.h === 844, JSON.stringify(mpanel))
  await shot('as-mobile-2-panel.png')

  // 输入一句话看数字人说话态
  await evalJs(`(() => { const t = document.querySelector('.as-foot textarea'); t.value = '新手养猫要准备什么'; t.dispatchEvent(new Event('input', { bubbles: true })); return 1 })()`)
  await sleep(200)
  await evalJs(`document.querySelector('.as-send').click(); 1`)
  await sleep(2500)
  const talking = await evalJs(`(() => ({ talking: !!document.querySelector('.as-orb'), msgs: document.querySelectorAll('.as-row').length, typing: !!document.querySelector('.as-typing') }))()`)
  check('发送后对话区有内容', talking.msgs >= 2, JSON.stringify(talking))
  await shot('as-mobile-3-chat.png')

  ws.close(); chrome.kill()
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
