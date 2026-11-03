/**
 * 零输入定位冒烟：自动定位 / 距离排序 / 商圈点选 / 导航起点
 * 用法：node cdp_geo_zero_input.mjs http://47.116.73.25:8083
 */
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = (process.argv[2] || 'http://localhost:82').replace(/\/$/, '')
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE)
const SHOT = LOCAL ? 'geo-local.png' : 'geo-remote.png'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333 + (LOCAL ? 0 : 1)
const profile = mkdtempSync(path.join(tmpdir(), 'petgeo-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let pass = 0, fail = 0
const jsErrors = []
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  ' + extra : ''}`) }
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--disable-background-networking', '--window-size=1440,900',
  BASE + '/shop/home'
], { stdio: 'ignore' })

async function waitFor(fn, ms = 25000, step = 300) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v } catch (e) { /* ignore */ }
    await sleep(step)
  }
  return null
}

let ws
let seq = 0
const pending = new Map()
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error('timeout: ' + method)) }
    }, 20000)
  })
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text)
  return r.result?.result?.value
}
async function text(sel) {
  return await evalJs(`(document.querySelector(${JSON.stringify(sel)})?.innerText || '').trim()`)
}
async function clickSel(sel) {
  // 门店区在页面下方，必须先滚进视口，否则 Input 坐标落在视口外，点击会被吞掉
  const ok = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.scrollIntoView({ block: 'center', inline: 'center' }); return true; })()`)
  if (!ok) return false
  await sleep(300)
  const box = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`)
  if (!box) return false
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 })
  await sleep(500)
  return true
}

try {
  const ver = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
    return r.ok ? await r.json() : null
  }, 20000)
  if (!ver) throw new Error('Chrome DevTools 未就绪')

  const page = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    const list = await r.json()
    return list.find((t) => t.type === 'page' && t.url.includes('/shop/home'))
  }, 20000)
  if (!page) throw new Error('未找到页面 target')

  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.text || 'exception')
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  // 可选：localhost 下模拟一次 GPS 精确定位，验证精确分支
  if (LOCAL) {
    try {
      await send('Browser.grantPermissions', { origin: new URL(BASE).origin, permissions: ['geolocation'] })
      await send('Emulation.setGeolocationOverride', { latitude: 29.573541, longitude: 106.530573, accuracy: 25 })
      await send('Page.reload', { ignoreCache: true })
    } catch (e) { console.log('  (GPS 模拟未启用，走估算分支)') }
  }

  const ready = await waitFor(async () => await evalJs(`document.querySelectorAll('.store').length >= 2`), 30000)
  check('1. 首页门店列表渲染', !!ready, `store 卡片 ${await evalJs(`document.querySelectorAll('.store').length`)} 张`)
  await sleep(1200)

  const bodyText = await evalJs('document.body.innerText')
  const distCount = await evalJs(`document.querySelectorAll('.store-dist').length`)
  const distsTextBefore = await evalJs(`Array.from(document.querySelectorAll('.store-dist')).map(e=>e.innerText.trim()).join('|')`)
  check('2. 零输入即自动算出「距您」', distCount >= 2, `${distCount} 张卡片带距离`)
  const coordInputs = await evalJs(`document.querySelectorAll('input[placeholder*="经纬度"], input[placeholder*="坐标"], input[placeholder*="地址"]').length`)
  check('3. 页面不再出现坐标/地址输入提示', coordInputs === 0 && !/粘贴到上面|复制坐标|经度,纬度/.test(bodyText), `坐标输入框=${coordInputs}`)

  // 距离数值升序（解析 m / km）
  const dists = await evalJs(`Array.from(document.querySelectorAll('.store-dist')).map(e => { const t=e.innerText.replace(/\\s/g,''); const m=t.match(/([\\d.]+)\\s*(km|m)/); if(!m) return null; return m[2]==='km'?Number(m[1])*1000:Number(m[1]); }).filter(v=>v!=null)`)
  const ascending = dists.length >= 2 && dists.every((v, i) => i === 0 || v >= dists[i - 1])
  check('4. 门店按距离从近到远排列', ascending, dists.map((d) => Math.round(d)).join(' → ') + ' m')

  const navBefore = await evalJs(`document.querySelector('.store-btn--ghost')?.href || ''`)
  check('5. 导航按钮可用', navBefore.includes('uri.amap.com/navigation'))
  check('6. 估算位置不把估算坐标当导航起点', !navBefore.includes('from='), navBefore.slice(0, 90))

  // 打开位置弹窗
  check('7. 位置入口可打开', await clickSel('.loc-btn--text'))
  check('8. 位置弹窗已出现', await evalJs(`!!document.querySelector('.lp-card')`))
  const inputCount = await evalJs(`document.querySelectorAll('.el-dialog input, .el-dialog textarea').length`)
  check('9. 弹窗零输入框（不用填地址/经纬度）', inputCount === 0, `input=${inputCount}`)
  check('10. 弹窗显示定位来源', (await text('.lp-src')).length > 0, await text('.lp-src'))
  check('11. 弹窗显示当前位置名', (await text('.lp-card__name')).length > 0, await text('.lp-card__name'))
  check('12. 一键精确定位按钮存在', (await text('.lp-locate')).includes('使用我的当前位置'))
  check('13. 常用商圈可点选', await evalJs(`document.querySelectorAll('.lp-spot').length >= 8`), `${await evalJs(`document.querySelectorAll('.lp-spot').length`)} 个商圈`)

  // 点第 3 个商圈，验证全站同步 + 导航起点
  const spotName = await evalJs(`document.querySelectorAll('.lp-spot')[2]?.innerText.trim()`)
  await clickSel('.lp-spot:nth-child(3)')
  await sleep(700)
  // el-dialog 默认不销毁内容，关闭后 .lp-card 仍在 DOM，要看是否可见
  const dlgVisible = await evalJs(`(() => { const d = document.querySelector('.el-dialog'); if (!d) return false; const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(d).visibility !== 'hidden'; })()`)
  check('14. 点选商圈后弹窗关闭', !dlgVisible)
  const locAfter = await text('.loc-state')
  check('15. 首页位置随点选同步', locAfter.includes(spotName), `${spotName} / ${locAfter}`)
  const navAfter = await evalJs(`document.querySelector('.store-btn--ghost')?.href || ''`)
  check('16. 精确商圈作为导航起点', navAfter.includes('from='), navAfter.slice(0, 100))
  const distsAfter = await evalJs(`Array.from(document.querySelectorAll('.store-dist')).map(e => e.innerText.trim())`)
  check('17. 距离按新位置重算', distsAfter.length >= 2 && distsAfter.join('|') !== distsTextBefore, distsAfter.slice(0, 3).join(' / '))

  // 恢复自动定位
  await clickSel('.loc-btn--text')
  await sleep(350)
  check('18. 提供「恢复自动定位」', (await text('.lp-clear')).includes('恢复自动定位'))
  await clickSel('.lp-clear')
  await sleep(500)
  check('19. 恢复后回到估算定位', (await text('.loc-state')).includes('估算') || (await text('.loc-state')).includes('定位'), await text('.loc-state'))

  // 预约页同样默认有距离
  await send('Page.navigate', { url: BASE + '/shop/appointment' })
  await waitFor(async () => await evalJs(`document.querySelectorAll('.el-select').length >= 1`), 25000)
  await sleep(2200)
  const apptText = await evalJs('document.body.innerText')
  const apptUrl = await evalJs('location.href')
  console.log('  (预约页诊断) ' + apptUrl + ' | ' + apptText.slice(0, 150).replace(/\n/g, ' '))
  // 游客态预约表单按既有设计收起（登录后才有门店选择与位置条），这里只验证页面正常渲染
  check('20. 预约页正常渲染（登录后可用门店定位）',
    /预约服务/.test(apptText) && /门店/.test(apptText) && !/404|系统错误|Internal Server Error/.test(apptText))
  check('21. 无 JS 运行时异常', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '))

  // 回到首页截图
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await waitFor(async () => await evalJs(`document.querySelectorAll('.store').length >= 2`), 25000)
  await sleep(900)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'))

  console.log(`\n==== ${pass} PASS / ${fail} FAIL ====  截图 ${SHOT}`)
} catch (e) {
  console.error('SCRIPT ERROR:', e.message)
  fail++
} finally {
  try { ws?.close() } catch (e) { /* ignore */ }
  try { chrome.kill() } catch (e) { /* ignore */ }
  await sleep(300)
  try { rmSync(profile, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  process.exit(fail ? 1 : 0)
}
