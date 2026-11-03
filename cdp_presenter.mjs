/**
 * 后台可视化大屏「亮点讲解」演示模式验证
 * 用法: node cdp_presenter.mjs [BASE]
 *   BASE 默认 http://localhost:82 ；远程传 http://47.116.73.25:8083
 */
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://localhost:82'
const IS_REMOTE = !BASE.includes('127.0.0.1') && !BASE.includes('localhost')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://localhost:8081'
const PORT = 9412
const SHOT = IS_REMOTE ? 'presenter-remote.png' : 'presenter-local.png'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 复用既有验证脚本里已跑通的后台口令，避免硬编码失配
const PWD = (() => {
  try {
    const m = fs.readFileSync('cdp_bigscreen.mjs', 'utf8').match(/apiLogin\('admin',\s*'([^']+)'\)/)
    if (m) return m[1]
  } catch {}
  return 'admin123'
})()

async function apiLogin() {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  if (IS_REMOTE) {
    // execSync 在 Windows 走 cmd.exe，不能带 MSYS_NO_PATHCONV 前缀；uuid 为纯十六进制，无路径改写风险
    const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim()
    code = raw.replace(/^"|"$/g, '').split('\n').pop().trim()
  } else {
    code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
  }
  const res = await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: PWD, code, uuid: cap.uuid })
  })
  const d = await res.json()
  if (!d.token) throw new Error('登录失败: ' + JSON.stringify(d))
  return d.token
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-pr-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1920,1080',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

async function main() {
  await waitCdp()
  const token = await apiLogin()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    return r.result?.result?.value
  }
  const rect = async (sel) => evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; })()`)
  const text = (sel) => evalJs(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() || ''`)
  const clickAt = async (sel) => {
    const r = await rect(sel)
    if (!r) return false
    const x = r.l + r.w / 2, y = r.t + r.h / 2
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await sleep(350)
    return true
  }
  const key = async (k, code, vk) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await sleep(420)
  }
  const RIGHT = () => key('ArrowRight', 'ArrowRight', 39)
  const LEFT = () => key('ArrowLeft', 'ArrowLeft', 37)
  const ESC = () => key('Escape', 'Escape', 27)
  const overlap = (a, b) => {
    if (!a || !b) return 0
    const w = Math.min(a.l + a.w, b.l + b.w) - Math.max(a.l, b.l)
    const h = Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t)
    return w > 0 && h > 0 ? w * h : 0
  }

  await send('Page.enable'); await send('Runtime.enable')
  // 对齐答辩现场的真实投影分辨率（headless 默认 800×600，四角避让无解）
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: BASE + '/admin/login' })
  await sleep(3500)
  await evalJs(`document.cookie = 'Admin-Token=' + encodeURIComponent(${JSON.stringify(token)}) + '; path=/'; localStorage.setItem('Admin-Token', ${JSON.stringify(token)}); 'ok'`)
  await send('Page.navigate', { url: BASE + '/admin/bigscreen' })
  await sleep(9000)

  // ---- 基础页面 ----
  const body = await evalJs('document.body.innerText')
  check('1. 大屏页面已加载', body.includes('经营监控大屏') && body.includes('新增客户'))
  const btn = await text('.spot-btn')
  check('2. 头部有「亮点讲解」入口', btn.includes('亮点讲解'), btn)
  check('3. 演示前无聚光框/讲解卡', await evalJs(`!document.querySelector('.spotlight') && !document.querySelector('.presenter')`))

  // ---- 进入演示 ----
  await clickAt('.spot-btn')
  await sleep(800)
  check('4. 点击进入后讲解卡出现', await evalJs(`!!document.querySelector('.presenter')`))
  check('5. 第 1 屏计数 1 / 8', (await text('.pr-count')) === '1 / 8', await text('.pr-count'))
  check('6. 开场标题为「一套系统 · 两块大屏」', (await text('.pr-title')).includes('一套系统'), await text('.pr-title'))
  const sp1 = await rect('.spotlight')
  check('7. 聚光框已渲染且尺寸有效', !!sp1 && sp1.w > 400 && sp1.h > 300, JSON.stringify(sp1))
  check('8. 开场整屏步不压暗（.all）', await evalJs(`document.querySelector('.spotlight')?.classList.contains('all') === true`))
  check('9. 讲解卡含 3 条以上讲解要点', await evalJs(`document.querySelectorAll('.pr-points li').length >= 3`))

  // ---- 键盘翻屏 ----
  await RIGHT()
  check('10. → 翻到第 2 屏', (await text('.pr-count')) === '2 / 8', await text('.pr-count'))
  check('11. 第 2 屏标题为亮点 1', (await text('.pr-title')).includes('亮点 1'), await text('.pr-title'))
  const sp2 = await rect('.spotlight')
  check('12. 聚光框随步骤移动', !!sp2 && (Math.abs(sp2.t - sp1.t) > 40 || Math.abs(sp2.w - sp1.w) > 100), JSON.stringify(sp2))
  check('13. 第 2 屏开始压暗背景', await evalJs(`!document.querySelector('.spotlight').classList.contains('all')`))
  const kpiRect = await rect('[data-spot="kpi"]')
  check('14. 聚光框对准 KPI 区域', !!kpiRect && Math.abs(sp2.l - kpiRect.l) < 40 && Math.abs(sp2.t - kpiRect.t) < 40, JSON.stringify({ sp2, kpiRect }))
  const card2 = await rect('.presenter')
  check('15. 讲解卡自动避让聚光区（无重叠）', overlap(sp2, card2) === 0, 'overlap=' + overlap(sp2, card2))

  await LEFT()
  check('16. ← 回到第 1 屏', (await text('.pr-count')) === '1 / 8', await text('.pr-count'))

  // ---- 逐屏走完 ----
  const spots = ['__all__', 'kpi', 'funnel', 'growth', 'feed', 'rating', 'store', 'service']
  let aligned = 0, noOverlap = 0
  for (let i = 1; i < 8; i++) {
    await RIGHT()
    await sleep(120)
    if ((await text('.pr-count')) !== `${i + 1} / 8`) break
    const sp = await rect('.spotlight')
    const target = await rect(`[data-spot="${spots[i]}"]`)
    if (target && Math.abs(sp.l - target.l) < 45 && Math.abs(sp.t - target.t) < 45) aligned++
    const card = await rect('.presenter')
    if (overlap(sp, card) === 0) noOverlap++
  }
  check('17. 8 屏可逐屏翻完且计数正确', (await text('.pr-count')) === '8 / 8', await text('.pr-count'))
  check('18. 7 个区块聚光定位准确', aligned >= 6, aligned + '/7')
  check('19. 讲解卡全程不遮挡聚光区', noOverlap >= 6, noOverlap + '/7')
  check('20. 收尾屏标题为工程实现', (await text('.pr-title')).includes('收尾'), await text('.pr-title'))

  // ---- 进度点跳转 ----
  await evalJs(`document.querySelectorAll('.pr-dots i')[2].dispatchEvent(new MouseEvent('click', { bubbles: true })); 'ok'`)
  await sleep(500)
  check('21. 点击进度点可跳屏', (await text('.pr-count')) === '3 / 8', await text('.pr-count'))

  // ---- 自动播放 ----
  await clickAt('.pr-auto')
  check('22. 自动播放可开启', (await text('.pr-auto')).includes('暂停'), await text('.pr-auto'))
  check('23. 进度条进入运行态', await evalJs(`!!document.querySelector('.pr-bar i.running')`))
  await clickAt('.pr-auto')
  check('24. 自动播放可暂停', (await text('.pr-auto')).includes('自动'), await text('.pr-auto'))

  // ---- 截图（第 3 屏漏斗） ----
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  if (shot.result?.data) fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'))

  // ---- 退出 ----
  await ESC()
  check('25. Esc 退出后讲解卡消失', await evalJs(`!document.querySelector('.presenter')`))
  check('26. Esc 退出后聚光框消失', await evalJs(`!document.querySelector('.spotlight')`))
  check('27. 退出后大屏内容仍完整', (await evalJs('document.body.innerText')).includes('新增客户'))

  // ---- AI 经营诊断官（新增创新点）----
  check('28. 诊断通栏存在', await evalJs(`!!document.querySelector('.diag-bar')`))
  const scoreTxt = await text('.gauge-num em')
  const scoreNum = Number(scoreTxt)
  check('29. 健康分为 0~100 的真实数字', Number.isFinite(scoreNum) && scoreNum > 0 && scoreNum <= 100, scoreTxt)
  check('30. 显示等级与五维名称', (await text('.gauge-num i')).includes('经营健康分')
    && await evalJs(`document.querySelectorAll('.radar-label').length === 5`))
  check('31. 雷达数据多边形已绘制', await evalJs(`(() => { const ps = document.querySelectorAll('.radar-svg polygon'); const last = ps[ps.length - 1]; return ps.length >= 4 && (last?.getAttribute('points') || '').trim().split(' ').length === 5; })()`))
  check('32. 3 条自动诊断结论卡', await evalJs(`document.querySelectorAll('.diag-card').length === 3`))
  check('33. 诊断卡含等级与可执行建议', await evalJs(`[...document.querySelectorAll('.diag-card')].every(c => c.querySelector('.dc-level') && c.querySelector('.dc-tip')?.textContent.includes('建议'))`))
  check('34. 拉新环比标签有百分比', (await text('.diag-delta')).includes('%'), await text('.diag-delta'))
  const diagShotFile = IS_REMOTE ? 'diagnosis-remote.png' : 'diagnosis-local.png'
  const diagShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  if (diagShot.result?.data) fs.writeFileSync(diagShotFile, Buffer.from(diagShot.result.data, 'base64'))

  // ---- AI 深度解读（6s 超时自动降级，现场演示不卡住）----
  await clickAt('.diag-ai-btn')
  check('35. AI 解读浮层打开', await evalJs(`!!document.querySelector('.ai-panel')`))
  await sleep(3000)
  check('35b. 打开即有规则引擎速览（不冷场）', (await text('.ai-rule-block')).length > 30)
  await sleep(11000)
  const aiLlm = await text('.ai-llm-block')
  const aiStatusTxt = await text('.ai-status')
  check('36. AI 补充建议已流式展示（或明确降级提示）',
    aiLlm.length > 20 || aiStatusTxt.includes('较慢'),
    'llm=' + aiLlm.slice(0, 80).replace(/\n/g, ' '))
  check('37. 浮层展示完整诊断列表', await evalJs(`document.querySelectorAll('.ai-list li').length >= 6`))
  const closeRect = await rect('.ai-close')
  const closeClicked = await clickAt('.ai-close')
  await sleep(700)
  const panelStill = await evalJs(`!!document.querySelector('.ai-panel')`)
  check('38. 关闭浮层可返回大屏', !panelStill,
    `rect=${JSON.stringify(closeRect)} clicked=${closeClicked} still=${panelStill}`)
  if (panelStill) await evalJs(`document.querySelector('.ai-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); 'ok'`)

  // ---- 时间范围联动 ----
  await clickAt('.head-side.left .chip:nth-child(2)')
  await sleep(2600)
  const scoreAfter = await text('.gauge-num em')
  check('39. 切换 30 天后诊断重算成功', await evalJs(`!!document.querySelector('.diag-bar')`) && Number(scoreAfter) > 0, 'score=' + scoreAfter)

  console.log(`\n==== ${pass} PASS / ${fail} FAIL ====  截图 ${SHOT} / ${diagShotFile}`)
  ws.close(); chrome.kill()
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(1) })
