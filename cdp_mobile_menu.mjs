/**
 * 手机端导航下拉菜单实测：汉堡展开 / 服务保障折叠 / 跳转收菜单 / 登录入口
 * 用法: node cdp_mobile_menu.mjs [BASE] [宽] [高]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const W = Number(process.argv[3] || 390)
const H = Number(process.argv[4] || 844)
const PORT = 9361
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-menu-'))

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

async function waitCdp() {
  for (let i = 0; i < 80; i++) {
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
const connect = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.addEventListener('open', () => res(ws))
  ws.addEventListener('error', rej)
})

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value ?? a.description).join(' '))
    }
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    fs.writeFileSync(path.resolve(`mobile-menu-${W}-${name}.png`), Buffer.from(s.data, 'base64'))
  }
  // 用真实坐标点击（模拟手指），避免 el.click() 触发不了 touch 逻辑
  const tap = async (rect) => {
    const x = rect.x + rect.w / 2, y = rect.y + rect.h / 2
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(450)
  }
  const rectOf = (sel) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(sel)});
    if(!el) return null; const r=el.getBoundingClientRect();
    const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') return null;
    return { x:r.x, y:r.y, w:r.width, h:r.height }; })()`)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(3000)

  // 1) 折叠状态：桌面导航隐藏，汉堡可见
  const collapsed = await evaluate(`(() => {
    const nav=document.querySelector('.topbar .nav'), hb=document.querySelector('.hamburger'),
          cart=document.querySelector('.m-cart'), desk=document.querySelector('.desk-user');
    const vis=el=>{ if(!el) return false; const cs=getComputedStyle(el);
      return cs.display!=='none' && cs.visibility!=='hidden' && el.getBoundingClientRect().width>0 };
    return { nav:vis(nav), hb:vis(hb), cart:vis(cart), desk:vis(desk),
      hbRect: hb? hb.getBoundingClientRect().width : 0 };
  })()`)
  check('桌面导航已折叠', collapsed.nav === false, `nav.display=${collapsed.nav}`)
  check('汉堡按钮可见', collapsed.hb === true)
  check('购物车快捷入口可见', collapsed.cart === true)
  check('桌面用户区已隐藏', collapsed.desk === false)
  await shot('1-collapsed')

  // 2) 点开菜单
  const hbRect = await rectOf('.hamburger')
  await tap(hbRect)
  const opened = await evaluate(`(() => {
    const m=document.querySelector('.m-menu');
    if(!m) return { open:false };
    const r=m.getBoundingClientRect(), cs=getComputedStyle(m);
    const items=[...m.querySelectorAll('.m-item')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim().replace(/\\s+/g,' '));
    return { open: cs.display!=='none' && r.height>100, top:Math.round(r.top), h:Math.round(r.height),
      w:Math.round(r.width), items, bodyLock: document.body.style.overflow,
      mask: !!document.querySelector('.m-mask'), scrollW: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth };
  })()`)
  check('点击汉堡展开下拉菜单', opened.open === true, `top=${opened.top} 高=${opened.h} 宽=${opened.w}`)
  check('菜单紧贴顶栏下方', opened.top <= 58 && opened.top >= 50, `top=${opened.top}`)
  check('展开时锁定页面滚动', opened.bodyLock === 'hidden', `overflow=${opened.bodyLock}`)
  check('遮罩层出现', opened.mask === true)
  check('菜单无横向溢出', opened.scrollW <= opened.vw + 1, `scrollW=${opened.scrollW} vw=${opened.vw}`)
  check('菜单项完整', ['首页', 'AI 选宠', '服务保障', '宠物医生', '联系客服', '宠物粮', '购物车'].every(t => opened.items.some(i => i.includes(t))),
    opened.items.join(' / '))
  await shot('2-opened')

  // 3) 服务保障折叠
  const tog = await rectOf('.m-toggle')
  await tap(tog)
  const sub = await evaluate(`(() => {
    const s=document.querySelector('.m-sub');
    const links=[...document.querySelectorAll('.m-sub-item')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim());
    return { visible: !!s && getComputedStyle(s).display!=='none', count: links.length, links,
      arrow: getComputedStyle(document.querySelector('.m-toggle .caret')).transform };
  })()`)
  check('服务保障可展开子菜单', sub.visible && sub.count === 4, sub.links.join(','))
  check('展开箭头翻转', sub.arrow && sub.arrow !== 'none' && sub.arrow !== 'matrix(1, 0, 0, 1, 0, 0)', sub.arrow)
  await shot('3-service-open')

  // 4) 未登录：登录/注册按钮 + 打开对话框
  const auth = await evaluate(`(() => {
    const b=document.querySelector('.m-auth');
    return { has: !!b, btns: b ? [...b.querySelectorAll('button')].map(x=>x.textContent.trim()) : [] };
  })()`)
  check('未登录显示登录/注册', auth.has && auth.btns.length === 2, auth.btns.join('/'))
  const loginBtn = await rectOf('.m-auth .m-btn-primary')
  await tap(loginBtn)
  await sleep(600)
  const dlg = await evaluate(`(() => {
    const d=document.querySelector('.el-dialog, .el-overlay');
    return { open: !!d && getComputedStyle(d).display!=='none',
      menuClosed: !document.querySelector('.m-menu'),
      maskGone: !document.querySelector('.m-mask'),
      title: document.querySelector('.el-dialog__title')?.textContent?.trim() || '' };
  })()`)
  check('登录对话框正常弹出', dlg.open === true, `title=${dlg.title}`)
  check('弹窗时菜单已收起', dlg.menuClosed === true)
  await shot('4-login-dialog')
  // 关掉对话框
  await evaluate(`document.querySelector('.el-dialog__headerbtn')?.click()`)
  await sleep(500)

  // 5) 点菜单项跳转并自动收起
  const hb2 = await rectOf('.hamburger')
  await tap(hb2)
  const foodLink = await evaluate(`(() => { const els=[...document.querySelectorAll('.m-menu .m-item')];
    const el=els.find(e=>e.textContent.includes('宠物粮')); if(!el) return null;
    const r=el.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; })()`)
  await tap(foodLink)
  await sleep(1600)
  const after = await evaluate(`(() => ({
    path: location.pathname,
    menuClosed: !document.querySelector('.m-menu'),
    maskGone: !document.querySelector('.m-mask'),
    unlocked: document.body.style.overflow === '',
    deskNavHidden: getComputedStyle(document.querySelector('.topbar .nav')).display === 'none'
  }))()`)
  check('点击导航项完成跳转', after.path === '/shop/food', after.path)
  check('跳转后菜单自动收起', after.menuClosed === true)
  check('跳转后遮罩消失', after.maskGone === true)
  check('跳转后页面滚动解锁', after.unlocked === true)

  // 6) 再开一次，点遮罩关闭
  const hb3 = await rectOf('.hamburger')
  await tap(hb3)
  const maskRect = await evaluate(`(() => { const m=document.querySelector('.m-mask'); if(!m) return null;
    const r=m.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; })()`)
  await tap({ x: maskRect.x + 20, y: maskRect.y + maskRect.h - 60, w: 10, h: 10 })
  await sleep(500)
  const closed = await evaluate(`(() => ({
    menuClosed: !document.querySelector('.m-menu'),
    unlocked: document.body.style.overflow === ''
  }))()`)
  check('点遮罩可关闭菜单', closed.menuClosed === true)
  check('关闭后滚动解锁', closed.unlocked === true)
  await shot('5-closed')

  const real = errors.filter(e => e && !/favicon|ERR_|net::/i.test(e))
  check('无 JS 报错', real.length === 0, real.slice(0, 3).join(' | '))

  const fail = results.filter(r => !r.pass)
  console.log(`\n== ${W}px 结果: ${results.length - fail.length}/${results.length} 通过 ==`)
  if (fail.length) console.log('失败项: ' + fail.map(f => f.name).join(', '))
  fs.writeFileSync(path.resolve(`mobile-menu-report-${W}.json`), JSON.stringify(results, null, 2))
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail.length ? 1 : 0), 300)
})().catch((e) => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
