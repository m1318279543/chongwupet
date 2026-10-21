/**
 * 商城增强五件套 UI 回归：支付闭环 / 通知铃铛 / 列表筛选 / 评分聚合 / AI 流式
 * 用法: node cdp_shop_v5.mjs [BASE]
 * 需要本地 redis（取验证码）与 .tok_ry（get_token.mjs 生成，可自动重建）
 */
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9381
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 登录凭证 ----------
function shopToken() {
  if (fs.existsSync('.tok_ry') && fs.statSync('.tok_ry').size > 50) {
    return fs.readFileSync('.tok_ry', 'utf8').trim()
  }
  console.log('生成前台凭证…')
  execSync('node get_token.mjs ' + BASE + ' ry admin123 .tok_ry', { stdio: 'inherit' })
  return fs.readFileSync('.tok_ry', 'utf8').trim()
}
const SHOP_TOKEN = shopToken()

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-v5-'))
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/version`);if(r.ok)return}catch{}await sleep(250)}throw new Error('CDP 未就绪')}
async function newTab(){for(const m of['PUT','GET']){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:m});if(r.ok)return await r.json()}catch{}}throw new Error('tab fail')}
const connect=(url)=>new Promise((res,rej)=>{const ws=new WebSocket(url);ws.addEventListener('open',()=>res(ws));ws.addEventListener('error',rej)})

let pass=0, fail=0
const check=(n,c,d='')=>{console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+d+']':''));c?pass++:fail++}

;(async()=>{
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Network.setCookie', { name: 'Shop-Token', value: SHOP_TOKEN, url: BASE + '/', path: '/' })
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(name, Buffer.from(s.data, 'base64')); console.log('  📷', name) }

  // 预置一笔待支付订单（走 API）
  const api = async (url, opts = {}) => {
    const r = await fetch(BASE + '/dev-api' + url, { ...opts, headers: { Authorization: 'Bearer ' + SHOP_TOKEN, 'Content-Type': 'application/json', ...(opts.headers || {}) } })
    return r.json()
  }
  const sub = await api('/pet/cart/submit', { method: 'POST', body: JSON.stringify([{ goodsName: 'UI测试成猫粮', goodsImage: '', goodsSpec: '2kg', price: 129, qty: 1 }]) })
  const PAY_NO = sub?.data?.orderNo
  check('预置待支付订单', !!PAY_NO, PAY_NO || JSON.stringify(sub))

  // ============ 1. 订单页 + 模拟收银台 ============
  console.log('\n--- 1. 支付闭环 ---')
  await send('Page.navigate', { url: BASE + '/shop/order' }); await sleep(3800)
  const o1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    hasPayBtn: [...document.querySelectorAll('.el-button')].some(b => b.textContent.includes('去支付')),
    hasOrderNo: document.body.innerText.includes('${PAY_NO}'),
    filterBtns: [...document.querySelectorAll('.el-radio-button')].map(b => b.textContent.trim()).filter(t => ['待支付','已支付','已取消'].includes(t)).length,
    unpaidTag: document.body.innerText.includes('待支付')
  }))()`) || '{}')
  check('订单页显示订单号', o1.hasOrderNo)
  check('待支付订单有去支付按钮', o1.hasPayBtn)
  check('订单状态筛选按钮', o1.filterBtns >= 3, o1.filterBtns + '个')
  await shot('v5-order-unpaid.png')

  // 打开收银台
  await evaluate(`[...document.querySelectorAll('.el-button')].find(b => b.textContent.includes('去支付'))?.click()`)
  await sleep(1200)
  const c1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    open: !!document.querySelector('.cashier-dialog'),
    amount: document.querySelector('.cashier-amount .num')?.textContent || '',
    methods: [...document.querySelectorAll('.pay-item')].length,
    tip: document.body.innerText.includes('模拟支付')
  }))()`) || '{}')
  check('收银台弹出', c1.open)
  check('显示支付金额', c1.amount.includes('129'), c1.amount)
  check('三种支付方式', c1.methods === 3, c1.methods + '个')
  check('演示提示可见', c1.tip)
  await shot('v5-cashier.png')

  // 选微信支付 → 立即支付
  await evaluate(`[...document.querySelectorAll('.pay-item')].find(x => x.textContent.includes('微信'))?.click()`)
  await sleep(300)
  await evaluate(`[...document.querySelectorAll('.cashier-actions .el-button')].find(b => b.textContent.includes('立即支付'))?.click()`)
  await sleep(2500)
  const c2 = JSON.parse(await evaluate(`(() => JSON.stringify({
    success: !!document.querySelector('.cashier-success'),
    text: document.querySelector('.cashier-success')?.textContent || ''
  }))()`) || '{}')
  check('支付成功动画', c2.success)
  check('成功页含金额', c2.text.includes('129'), c2.text.slice(0, 60))
  await shot('v5-pay-success.png')
  await evaluate(`[...document.querySelectorAll('.cashier-success .el-button')].find(b => b.textContent.includes('完成'))?.click()`)
  await sleep(1500)
  const c3 = JSON.parse(await evaluate(`(() => JSON.stringify({
    paidTag: document.body.innerText.includes('已支付'),
    unpaidGone: ![...document.querySelectorAll('.el-button')].some(b => b.textContent.includes('去支付') && b.offsetParent)
  }))()`) || '{}')
  check('订单变为已支付', c3.paidTag)

  // ============ 2. 通知铃铛 ============
  console.log('\n--- 2. 站内通知 ---')
  const b1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    bell: !!document.querySelector('.notify-bell .bell-btn'),
    badge: document.querySelector('.notify-bell .badge')?.textContent || ''
  }))()`) || '{}')
  check('顶栏铃铛可见', b1.bell)
  check('未读角标 >0', Number(b1.badge) > 0, 'badge=' + b1.badge)
  await evaluate(`document.querySelector('.notify-bell .bell-btn')?.click()`)
  await sleep(1000)
  const b2 = JSON.parse(await evaluate(`(() => JSON.stringify({
    panel: !!document.querySelector('.np-panel'),
    items: [...document.querySelectorAll('.np-item')].length,
    payItem: document.body.innerText.includes('订单支付成功'),
    readAll: [...document.querySelectorAll('.np-head .el-button')].some(b => b.textContent.includes('全部已读'))
  }))()`) || '{}')
  check('通知面板打开', b2.panel)
  check('有通知条目', b2.items > 0, b2.items + '条')
  check('支付通知在内', b2.payItem)
  check('全部已读按钮', b2.readAll)
  await shot('v5-notify.png')
  await evaluate(`[...document.querySelectorAll('.np-head .el-button')].find(b => b.textContent.includes('全部已读'))?.click()`)
  await sleep(1200)
  const b3 = await evaluate(`document.querySelector('.notify-bell .badge')?.textContent || ''`)
  check('已读后角标清零', !b3, 'badge=' + (b3 || '无'))

  // ============ 3. 首页筛选 + 评分角标 ============
  console.log('\n--- 3. 列表筛选 + 评分 ---')
  await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4000)
  // 触发结果模式：点一个分类
  await evaluate(`[...document.querySelectorAll('.cat-tab')].find(t => t.textContent.trim() !== '全部')?.click()`)
  await sleep(1200)
  const f1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    bar: !!document.querySelector('.filter-bar'),
    gender: !!document.querySelector('.filter-bar .el-radio-group'),
    sort: document.body.innerText.includes('价格低→高'),
    onSale: document.body.innerText.includes('仅看在售')
  }))()`) || '{}')
  check('筛选条出现', f1.bar)
  check('性别筛选', f1.gender)
  check('价格排序选项', f1.sort)
  check('仅看在售', f1.onSale)
  // 选"母"验证数量变化
  const before = await evaluate(`document.querySelectorAll('.pet-card').length`)
  await evaluate(`[...document.querySelectorAll('.filter-bar .el-radio-button')].find(b => b.textContent.trim() === '母')?.click()`)
  await sleep(900)
  const after = await evaluate(`document.querySelectorAll('.pet-card').length`)
  check('性别筛选生效（数量变化）', before !== undefined && after !== undefined && before !== after, before + '→' + after)
  await evaluate(`[...document.querySelectorAll('.filter-bar a.el-button, .filter-bar .el-button')].find(b => b.textContent.includes('清除筛选'))?.click()`)
  await sleep(700)
  const restored = await evaluate(`document.querySelectorAll('.pet-card').length`)
  check('清除筛选恢复', Number(restored) === Number(before), restored + '==' + before)

  // 评分角标（宠物1 已有 5 分评论）
  const r1 = await evaluate(`(() => { const t = [...document.querySelectorAll('.rating-tag')]; return JSON.stringify({ n: t.length, sample: t[0]?.textContent || '' }) })()`)
  const r1o = JSON.parse(r1 || '{}')
  check('评分角标渲染', r1o.n > 0, r1o.n + '个 ' + (r1o.sample || ''))
  check('角标含均分', (r1o.sample || '').includes('5'), r1o.sample)

  // ============ 4. 详情页评分汇总 ============
  console.log('\n--- 4. 详情页评分汇总 ---')
  await send('Page.navigate', { url: BASE + '/shop/pet/1' }); await sleep(4200)
  await evaluate(`document.querySelector('.pet-social')?.scrollIntoView()`)
  await sleep(1500)
  const s1 = JSON.parse(await evaluate(`(() => JSON.stringify({
    summary: !!document.querySelector('.rating-summary'),
    avg: document.querySelector('.rating-summary .big')?.textContent || '',
    bars: [...document.querySelectorAll('.bar-row')].length,
    editor: !!document.querySelector('.score-pick .el-rate'),
    stars: document.querySelectorAll('.c-score .el-rate').length
  }))()`) || '{}')
  check('评分汇总区', s1.summary)
  check('均分显示 5', s1.avg === '5', 'avg=' + s1.avg)
  check('星级分布 5 行', s1.bars === 5, s1.bars + '行')
  check('发表框有打星', s1.editor)
  check('带分评论显示星', s1.stars > 0, s1.stars + '条')
  await shot('v5-rating.png')

  // ============ 5. AI 流式 ============
  console.log('\n--- 5. AI 流式输出 ---')

  // 5.1 接口层：直接读 SSE，统计增量帧数与首字延迟
  const apiStream = await evaluate(`(async () => {
    const t0 = Date.now()
    const resp = await fetch('/dev-api/pet/ai/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '仓鼠的寿命大概多久？简单说说' }], scene: 'shop' })
    })
    const reader = resp.body.getReader(); const dec = new TextDecoder()
    let buf = '', deltas = 0, chars = 0, ttft = 0, total = 0, source = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i
      while ((i = buf.indexOf('\\n\\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2)
        for (const line of chunk.split('\\n')) {
          if (!line.startsWith('data:')) continue
          try {
            const j = JSON.parse(line.slice(5).trim())
            if (j.delta) { deltas++; chars += j.delta.length; if (!ttft) ttft = Date.now() - t0 }
            if (j.done) { source = j.source; total = (j.final || '').length }
          } catch (e) {}
        }
      }
    }
    return JSON.stringify({ deltas, chars, ttft, total, source, elapsed: Date.now() - t0 })
  })()`)
  const as = JSON.parse(apiStream || '{}')
  console.log('  流式指标:', JSON.stringify(as))
  check('SSE 增量帧 >= 5', as.deltas >= 5, as.deltas + ' 帧')
  check('内容非空', as.total > 10, as.total + ' 字')
  check('来源标记正确', ['ai', 'rule'].includes(as.source), as.source)
  check('增量逐字下发（chars≈total）', Math.abs(as.chars - as.total) <= 3, as.chars + '≈' + as.total)

  // 5.2 UI 层：思考动画 → 出字 → 光标消失
  await evaluate(`window.scrollTo(0,0)`)
  await evaluate(`(() => { document.querySelector('.ai-fab')?.click(); return 1 })()`)
  await sleep(900)
  await evaluate(`(() => {
    const ta = document.querySelector('.ai-input textarea')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, '新手养猫要注意什么')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return 1
  })()`)
  await sleep(300)
  await evaluate(`[...document.querySelectorAll('.ai-send')].find(b => !b.disabled)?.click()`)
  await sleep(900)
  const thinking = await evaluate(`!!document.querySelector('.bubble.thinking') || !!document.querySelector('.msg.assistant .cursor')`)
  check('等待期显示思考动画', !!thinking)

  // 轮询到出字完成（最长 40s）
  let tl = [], lastLen = -1
  for (let i = 0; i < 160; i++) {
    const st = JSON.parse(await evaluate(`(() => JSON.stringify({
      len: [...document.querySelectorAll('.msg.assistant .bubble')].slice(-1)[0]?.textContent.length || 0,
      cursor: !!document.querySelector('.msg.assistant .bubble .cursor'),
      thinking: !!document.querySelector('.bubble.thinking')
    }))()`) || '{}')
    if (st.len !== lastLen) { tl.push({ t: i * 250, len: st.len }); lastLen = st.len }
    if (st.len > 0 && !st.cursor && !st.thinking) break
    await sleep(250)
  }
  const fin = await evaluate(`(() => { const b = [...document.querySelectorAll('.msg.assistant .bubble')].slice(-1)[0]; return b ? b.textContent.length : 0 })()`)
  console.log('  渲染时间线:', tl.slice(0, 8).map(x => x.t + 'ms/' + x.len).join(' '))
  check('AI 回复渲染完成', fin > 10, fin + ' 字')
  check('出字后光标消失', !(await evaluate(`!!document.querySelector('.msg.assistant .bubble .cursor')`)))
  await shot('v5-ai-stream.png')

  console.log(`\n===== 结果: ${pass} PASS / ${fail} FAIL =====`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
