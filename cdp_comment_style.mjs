/**
 * E2E：评论区 B 站样式改版 + 评论按条点赞
 *   1) 宠物详情页评论区渲染出：等级徽章 / 彩色昵称 / 相对时间 / 点赞拇指按钮
 *   2) 评论点赞切换：点一下变红计数+1，再点取消还原
 *   3) 造 1 顶楼 + 3 条回复：楼中楼折叠为「共 3 条回复，点击查看」，展开可见全部
 *   4) 收尾清理测试评论（走 API 删除，不留脏数据）
 * 用法: node cdp_comment_style.mjs [BASE]   默认 http://127.0.0.1:82
 */
import { spawn, execSync, execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9399
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loginAs(username, password) {
  const cap = execSync(`node -e "fetch('${BASE}/dev-api/captchaImage').then(r=>r.json()).then(j=>console.log(JSON.stringify({uuid:j.uuid})))"`).toString().trim()
  const uuid = JSON.parse(cap).uuid
  let code
  if (BASE.includes('47.116.73.25')) {
    code = execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET captcha_codes:${uuid}`], { encoding: 'utf8' })
  } else {
    code = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', `captcha_codes:${uuid}`], { encoding: 'utf8' })
  }
  code = code.replace(/[\\"]/g, '').trim()
  return fetch(BASE + '/dev-api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid })
  }).then(r => r.json()).then(j => {
    if (!j.token) throw new Error('登录失败(' + username + '): ' + JSON.stringify(j).slice(0, 140))
    return j.token
  })
}
const login = () => loginAs('ry', 'admin123')

const TOKEN = await login()
const api = async (url, opts = {}) => {
  const r = await fetch(BASE + '/dev-api' + url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  return r.json()
}

let pass = 0, fail = 0
const check = (n, c, d = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + d + ']' : '')); c ? pass++ : fail++ }

const TARGET_PET = 1          // 种子评论最多的宠物
const MARK = 'E2E点评' + Date.now()

// ---------- 启动无头 Chrome ----------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cmtstyle-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

await waitCdp()
const tab = await newTab()
const ws = await connect(tab.webSocketDebuggerUrl)
let id = 0; const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2400) }
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Network.setCookie', { name: 'Shop-Token', value: TOKEN, url: BASE + '/', path: '/' })

async function waitFor(expr, ms = 10000, step = 250) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(expr)) return true; await sleep(step) }
  return false
}

// ---------- 1) 样式要素 ----------
await goto(`${BASE}/shop/pet/${TARGET_PET}`)
const socialOk = await waitFor('!!document.querySelector(".pet-social .list .cmt")')
check('评论区渲染出 B 站式条目', socialOk)

const badgeInfo = await evaluate(`(() => {
  const c = document.querySelector('.pet-social .list .cmt')
  const badge = c?.querySelector('.cmt__badge')
  return badge ? badge.innerText.trim() : ''
})()`)
check('昵称旁有等级徽章（LV/管理员）', /LV\d|管理员/.test(badgeInfo), badgeInfo)

const nameStyled = await evaluate(`(() => {
  const n = document.querySelector('.pet-social .list .cmt .cmt__name')
  if (!n) return false
  return n.style.color && n.style.color !== ''
})()`)
check('昵称按用户稳定着色', nameStyled === true)

const timeFmt = await evaluate(`(() => {
  const t = document.querySelector('.pet-social .list .cmt .cmt__time')
  return t ? t.innerText.trim() : ''
})()`)
check('时间展示为相对时间', /刚刚|分钟前|小时前|天前|^\d{4}-/.test(timeFmt), timeFmt)

const thumbOk = await evaluate('!!document.querySelector(".pet-social .list .cmt .cmt__op .thumb")')
check('操作行有点赞拇指按钮', thumbOk === true)
await shot('shot-comment-bili.png')

// ---------- 2) 评论点赞切换（取当前用户自己的顶楼测试评论之外的第一条） ----------
const firstCmt = await evaluate(`(() => {
  const c = document.querySelector('.pet-social .list .cmt')
  if (!c) return null
  const likeBtn = c.querySelector('.cmt__foot .cmt__op .thumb')?.closest('button')
  const cntEl = likeBtn?.querySelector('span')
  return { cnt: cntEl ? Number(cntEl.innerText) : 0, hasOn: likeBtn.classList.contains('on') }
})()`)
check('读取首条评论点赞基线', !!firstCmt, firstCmt ? `count=${firstCmt.cnt} on=${firstCmt.hasOn}` : '无')

const likeOnce = await evaluate(`(() => {
  const btn = document.querySelector('.pet-social .list .cmt .cmt__foot .cmt__op .thumb')?.closest('button')
  if (!btn) return false; btn.click(); return true
})()`)
await sleep(700)
const afterOn = await evaluate(`(() => {
  const btn = document.querySelector('.pet-social .list .cmt .cmt__foot .cmt__op .thumb')?.closest('button')
  const cntEl = btn?.querySelector('span')
  return { cnt: cntEl ? Number(cntEl.innerText) : 0, hasOn: btn.classList.contains('on') }
})()`)
check('点赞后按钮高亮且计数 +1', likeOnce && afterOn.hasOn && afterOn.cnt === firstCmt.cnt + 1,
  `${firstCmt.cnt} -> ${afterOn.cnt} on=${afterOn.hasOn}`)

await evaluate(`(() => { document.querySelector('.pet-social .list .cmt .cmt__foot .cmt__op .thumb')?.closest('button').click(); return true })()`)
await sleep(700)
const afterOff = await evaluate(`(() => {
  const btn = document.querySelector('.pet-social .list .cmt .cmt__foot .cmt__op .thumb')?.closest('button')
  const cntEl = btn?.querySelector('span')
  return { cnt: cntEl ? Number(cntEl.innerText) : 0, hasOn: btn.classList.contains('on') }
})()`)
check('再点取消还原', !afterOff.hasOn && afterOff.cnt === firstCmt.cnt, `${afterOn.cnt} -> ${afterOff.cnt} on=${afterOff.hasOn}`)

// ---------- 3) 造 1 顶楼 + 3 条回复 → 楼中楼折叠/展开 ----------
const added = await api('/pet/comment', {
  method: 'POST', body: JSON.stringify({ petId: TARGET_PET, targetType: 'pet', content: MARK + ' 顶楼内容', parentId: 0, score: null })
})
check('接口发表测试顶楼评论', added.code === 200, added.code === 200 ? '' : JSON.stringify(added).slice(0, 100))
const listRes = await api(`/pet/comment/list?petId=${TARGET_PET}&targetType=pet&pageNum=1&pageSize=20`)
const mine = (listRes.rows || []).find((r) => (r.content || '').includes(MARK))
check('顶楼出现在列表（likeCount=0）', !!mine && Number(mine.likeCount || 0) === 0, mine ? `commentId=${mine.commentId}` : '未找到')

for (let i = 1; i <= 3; i++) {
  await api('/pet/comment', {
    method: 'POST', body: JSON.stringify({ petId: TARGET_PET, targetType: 'pet', content: MARK + ' 回复' + i, parentId: mine.commentId, replyUser: mine.userName })
  })
}
await goto(`${BASE}/shop/pet/${TARGET_PET}`)
await waitFor('!!document.querySelector(".pet-social .list .cmt")')
const found = await waitFor(`(() => {
  const names = [...document.querySelectorAll('.pet-social .list .cmt')]
  return names.some(c => c.innerText.includes('${MARK}'))
})()`)
check('刷新后顶楼与回复都在', found === true)

const topRow = await evaluate(`(() => {
  const c = [...document.querySelectorAll('.pet-social .list .cmt')].find(x => x.innerText.includes('${MARK}'))
  if (!c) return null
  const expand = c.querySelector('.cmt__expand')
  const vis = c.querySelectorAll('.rcmt').length
  return { expandText: expand ? expand.innerText.trim() : '', visible: vis }
})()`)
check('楼中楼折叠为「共 3 条回复，点击查看」', topRow && topRow.expandText.includes('共 3 条回复') && topRow.visible === 2,
  JSON.stringify(topRow))

await evaluate(`(() => {
  const c = [...document.querySelectorAll('.pet-social .list .cmt')].find(x => x.innerText.includes('${MARK}'))
  c?.querySelector('.cmt__expand')?.click(); return true
})()`)
await sleep(500)
const expanded = await evaluate(`(() => {
  const c = [...document.querySelectorAll('.pet-social .list .cmt')].find(x => x.innerText.includes('${MARK}'))
  const vis = c ? c.querySelectorAll('.rcmt').length : 0
  const btn = c?.querySelector('.cmt__expand')?.innerText.trim() || ''
  return { vis, btn }
})()`)
check('点击后 3 条回复全部展开、按钮变「收起回复」', expanded.vis === 3 && expanded.btn.includes('收起'), JSON.stringify(expanded))

const replyAva = await evaluate(`(() => {
  const c = [...document.querySelectorAll('.pet-social .list .cmt')].find(x => x.innerText.includes('${MARK}'))
  const a = c?.querySelector('.rcmt__ava')
  return a ? a.getBoundingClientRect().width : 0
})()`)
check('楼中楼小头像（26px）', Math.round(replyAva) === 26, String(replyAva))

// 顶楼点赞一次（保留为 +1 后清理，同时验证后端 like_count 落库）
await api('/pet/comment/like/' + mine.commentId, { method: 'POST' })
const mine2 = (await api(`/pet/comment/list?petId=${TARGET_PET}&targetType=pet&pageNum=1&pageSize=20`)).rows.find((r) => r.commentId === mine.commentId)
check('点赞后 like_count 落库', mine2 && Number(mine2.likeCount) === 1, mine2 ? 'likeCount=' + mine2.likeCount : '未找到')

// ---------- 4) 收尾：删除测试评论与回复 ----------
const delIds = [mine.commentId]
const children = (await api(`/pet/comment/list?petId=${TARGET_PET}&targetType=pet&pageNum=1&pageSize=50`)).rows
  .filter((r) => Number(r.parentId) === Number(mine.commentId)).map((r) => r.commentId)
delIds.push(...children)
let delOk = true
for (const cid of delIds) { const r = await api('/pet/comment/' + cid, { method: 'DELETE' }); if (r.code !== 200) delOk = false }
check('清理测试评论（顶楼+回复）', delOk && delIds.length === 4, delIds.join(','))

console.log(`\n===== ${pass} passed, ${fail} failed =====`)
await shot('shot-comment-reply.png')
chrome.kill()
process.exit(fail ? 1 : 0)
