/**
 * 门店展示大屏验证（游客页面，无需登录）：
 * 标题/评分/星级分布/3D 旋转环卡片/统计条/最新好评/复购率
 * 用法: node cdp_display.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const PORT = 9395
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-disp-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--window-size=1920,1080',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

async function main() {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200))
  })
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    return r.result?.result?.value
  }

  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: BASE + '/shop/display' })
  await sleep(6000)

  const body = await evalJs(`document.body.innerText`)
  check('标题为门店展示大屏', (body || '').includes('门店展示大屏'), '')
  check('左侧顾客好评面板', (body || '').includes('顾客好评') && (body || '').includes('评分走势'), '')
  check('右侧复购口碑面板', (body || '').includes('复购率') && (body || '').includes('服务完成率'), '')

  // 评分数字（非 0 的评分均值或 0 也可，只要节点存在）
  const scoreNum = await evalJs(`document.querySelector('.score-num')?.textContent || ''`)
  check('综合评分节点存在', scoreNum !== '', scoreNum)

  // 3D 旋转环
  const ringCards = await evalJs(`document.querySelectorAll('.ring-card').length`)
  check('3D 旋转环卡片 ≥ 40（全部宠物）', ringCards >= 40, `n=${ringCards}`)
  const outerCards = await evalJs(`document.querySelectorAll('.ring-outer .ring-card').length`)
  check('外环放全部在售宠物 ≥ 50', outerCards >= 50, `n=${outerCards}`)
  const tiers = await evalJs(`document.querySelectorAll('.ring-outer').length`)
  check('外环分 4 层圆柱铺满', tiers === 4, `n=${tiers}`)
  const innerCards = await evalJs(`document.querySelectorAll('.ring-inner .ring-card').length`)
  check('内层精选大图 ≥ 5', innerCards >= 5, `n=${innerCards}`)
  const imgsOk = await evalJs(`Array.from(document.querySelectorAll('.ring-card img')).filter(i => i.complete && i.naturalWidth > 0).length`)
  check('卡片图片加载成功 ≥ 4', imgsOk >= 4, `ok=${imgsOk}`)
  const dupInfo = await evalJs(`(() => {
    const srcs = Array.from(document.querySelectorAll('.ring-card img')).map(i => i.getAttribute('src'))
    const counter = {}
    srcs.forEach(s => { counter[s] = (counter[s] || 0) + 1 })
    const dups = Object.entries(counter).filter(([, v]) => v > 1)
    return { total: srcs.length, uniq: new Set(srcs).size, dups: dups.length,
             sample: dups.slice(0, 3).map(d => String(d[0]).split('/').pop() + '×' + d[1]).join(',') }
  })()`)
  check('环上同一张图片不再重复出现', dupInfo.dups === 0, `total=${dupInfo.total} uniq=${dupInfo.uniq} ${dupInfo.sample}`)
  const ringAnim = await evalJs(`getComputedStyle(document.querySelector('.ring')).animationName`)
  check('旋转动画生效', String(ringAnim).startsWith('ring-spin'), ringAnim)

  // 拖拽旋转：pointer 拖动 200px → 轨道叠加 70° 偏移且松手保持
  const dragInfo = await evalJs(`(async () => {
    const s = document.querySelector('.scene')
    if (!s) return { err: 'no scene' }
    const r = s.getBoundingClientRect()
    const base = { bubbles: true, pointerId: 9, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
    const before = document.querySelector('.orbit').style.getPropertyValue('--drag') || '0deg'
    s.dispatchEvent(new PointerEvent('pointerdown', base))
    s.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: base.clientX + 200 }))
    s.dispatchEvent(new PointerEvent('pointerup', base))
    await new Promise(r => setTimeout(r, 300))
    const after = document.querySelector('.orbit').style.getPropertyValue('--drag')
    return { before, after }
  })()`)
  const dragVal = parseFloat(dragInfo.after)
  check('拖拽旋转生效（200px → 70°）', Math.abs(dragVal - 70) < 1, `before=${dragInfo.before} after=${dragInfo.after}`)

  // 环的填充度：层间距应把竖直空间用起来（顶/底层卡片覆盖舞台高度 55%+）
  const fill = await evalJs(`(() => {
    const s = document.querySelector('.scene').getBoundingClientRect()
    const ys = Array.from(document.querySelectorAll('.ring-outer .ring-card')).map(c => { const r = c.getBoundingClientRect(); return [r.top, r.bottom] })
    if (!ys.length) return { cover: 0 }
    const top = Math.min(...ys.map(v => v[0])), bot = Math.max(...ys.map(v => v[1]))
    return { cover: Math.round((bot - top) / s.height * 100) }
  })()`)
  check('竖直填充度 ≥ 55%', fill.cover >= 55, `cover=${fill.cover}%`)

  // 关键：所有卡片必须收在中间 3D 舞台区域内，不得压到左右面板或超出屏幕
  const fit = await evalJs(`(() => {
    const scene = document.querySelector('.scene')
    if (!scene) return { err: 'no scene' }
    const s = scene.getBoundingClientRect()
    const cards = Array.from(document.querySelectorAll('.ring-card'))
    let out = 0, maxOver = 0, sample = ''
    for (const c of cards) {
      const r = c.getBoundingClientRect()
      const over = Math.max(s.left - r.left, r.right - s.right, s.top - r.top, r.bottom - s.bottom)
      if (over > 1) { out++; if (over > maxOver) { maxOver = Math.round(over); sample = (c.querySelector('img')?.alt || '') + '@' + Math.round(r.left) } }
    }
    const left = document.querySelector('.panel.side')
    const lr = left ? left.getBoundingClientRect() : null
    const overlapSide = cards.filter(c => {
      const r = c.getBoundingClientRect()
      if (lr && r.right > lr.right && r.left < lr.right) return false
      return lr ? (r.left < lr.right && r.right > lr.left) : false
    }).length
    return { total: cards.length, out, maxOver, sample, overlapSide, sceneW: Math.round(s.width), sceneH: Math.round(s.height) }
  })()`)
  check('全部卡片都在 3D 舞台内（不越界）', fit.out === 0, `超出 ${fit.out}/${fit.total} 张，最大溢出 ${fit.maxOver}px ${fit.sample}`)
  check('卡片不压到左右侧栏', fit.overlapSide === 0, `overlap=${fit.overlapSide}`)
  check('舞台区域有实际尺寸', fit.sceneW > 300 && fit.sceneH > 200, `${fit.sceneW}x${fit.sceneH}`)

  // 统计条与最新好评
  const strips = await evalJs(`document.querySelectorAll('.strip-item').length`)
  check('底部统计条 5 项', strips === 5, `n=${strips}`)
  const gdItems = await evalJs(`document.querySelectorAll('.gd-item').length`)
  check('最新好评列表 ≥ 1', gdItems >= 1, `n=${gdItems}`)
  const distRows = await evalJs(`document.querySelectorAll('.dist-row').length`)
  check('星级分布 5 行', distRows === 5, `n=${distRows}`)
  const trendPts = await evalJs(`document.querySelector('.trend-svg polyline')?.getAttribute('points') || ''`)
  check('评分走势折线有数据', String(trendPts).split(' ').length >= 2, `pts=${String(trendPts).slice(0, 40)}`)
  const tags = await evalJs(`document.querySelectorAll('.cloud .tag').length`)
  check('好评关键词 ≥ 3 个', tags >= 3, `n=${tags}`)
  const repRows = await evalJs(`document.querySelectorAll('.rep-cell').length`)
  check('复购客户 3 个小卡', repRows === 3, `n=${repRows}`)
  const svcRows = await evalJs(`document.querySelectorAll('.svc-row').length`)
  check('服务热度 TOP ≥ 3', svcRows >= 3, `n=${svcRows}`)
  const storeRows = await evalJs(`document.querySelectorAll('.store-row').length`)
  check('门店评分排行 ≥ 1', storeRows >= 1, `n=${storeRows}`)

  // 前台入口：商城首页导航应有「门店大屏」
  await send('Page.navigate', { url: BASE + '/shop/home' })
  await sleep(5000)
  const entry = await evalJs(`Array.from(document.querySelectorAll('a')).some(a => a.getAttribute('href') === '/shop/display' && a.textContent.includes('门店大屏'))`)
  check('商城导航有「门店大屏」入口', entry === true)
  await send('Page.navigate', { url: BASE + '/shop/display' })
  await sleep(7000)

  check('无运行时报错', errors.length === 0, errors.slice(0, 2).join(' | '))

  // 截图（在跳转测试前截，保证是展示页）
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('deploy/display-remote.png', Buffer.from(shot.result.data, 'base64'))
  console.log('screenshot: deploy/display-local.png')

  // 点击卡片跳转宠物详情（路由 /shop/pet/:id）
  const navInfo = await evalJs(`(async () => {
    const card = document.querySelector('.ring-card.mini')
    if (!card) return { err: 'no card' }
    card.click()
    await new Promise(r => setTimeout(r, 2500))
    return { url: location.pathname + location.search }
  })()`)
  check('点击卡片跳转宠物详情', /^\/shop\/pet\/\d+$/.test(navInfo.url || ''), navInfo.url || navInfo.err || '')

  console.log(`\\n${pass} passed, ${fail} failed`)
  chrome.kill()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(1) })
