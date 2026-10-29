// 服务预约独立下单端到端检查：选项目 → 上门服务 → 填地址/联系人 → 提交 → 收银台支付 → 列表状态 + 落库校验
// 用法: node cdp_booking_flow.mjs [base]
import { spawn, execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const IS_REMOTE = BASE.includes('47.116.73.25')
const API = IS_REMOTE ? BASE + '/dev-api' : 'http://127.0.0.1:8081'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9486
const MYSQL = IS_REMOTE
  ? (sql) => execSync(`python deploy/ssh_run.py "mysql -upet -pPetShop2026 --default-character-set=utf8mb4 -N -B pet -e \\"${sql}\\""`, { encoding: 'utf8' }).trim()
  : (sql) => execSync(`"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" -uroot -p123456 --default-character-set=utf8mb4 -N -B ry-pet -e "${sql}"`, { encoding: 'utf8' }).trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  PASS ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  FAIL ${name}${extra ? '  ' + extra : ''}`) }
}

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

const PHONE = '1390000' + String(Date.now()).slice(-4)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-booking-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', '--window-size=1380,960',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch {} await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch {} } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result?.value }
  await send('Page.enable'); await send('Runtime.enable')
  async function goto(url, ms = 6000) { await send('Page.navigate', { url }); await sleep(ms) }

  // 前置：登录 ry
  const T = await apiLogin('ry', 'admin123')
  await send('Network.setCookie', { name: 'Shop-Token', value: T, url: BASE + '/', path: '/' })

  await goto(BASE + '/shop/appointment', 7000)
  await ev(`window.scrollTo(0, 0)`)

  const navText = await ev(`document.querySelector('.ui-title')?.textContent || ''`)
  check('预约页标题为「预约服务」', navText.includes('预约服务'), navText)

  const svcN = await ev(`document.querySelectorAll('.svc-item').length`)
  check('服务项目卡片渲染', (svcN || 0) >= 1, 'items=' + svcN)

  const bookBtn = await ev(`document.querySelectorAll('.svc-item .ui-linkbtn')[0]?.textContent.trim() || ''`)
  check('卡片按钮为「立即预约」', bookBtn === '立即预约', bookBtn)

  // 打开下单弹窗：优先挑一个收费项目（有价才能验证真实扣款链路）
  const picked = await ev(`(() => {
    const items = [...document.querySelectorAll('.svc-item')]
    const idx = items.findIndex(x => { const t = x.querySelector('.svc-item__price')?.textContent || ''; const n = Number(t.replace(/[^0-9.]/g, '')); return n > 0 })
    const i = idx >= 0 ? idx : 0
    items[i].querySelector('.ui-linkbtn').click()
    return { idx: i, text: items[i].innerText.replace(/\\s+/g, ' ') }
  })()`)
  console.log('  pick ->', picked && picked.text)
  await sleep(700)
  const dlgOpen = await ev(`!!document.querySelector('.bkd-body')`)
  check('下单弹窗打开', dlgOpen)
  if (!dlgOpen) throw new Error('弹窗未打开')

  // 切「上门服务」
  await ev(`(() => { const b = [...document.querySelectorAll('.bkd-field .el-radio-button')].find(x => x.textContent.includes('上门')); if (b) b.querySelector('input,label,span').click(); return !!b })()`)
  await sleep(300)
  const addrShown = await ev(`!!document.querySelector('.bkd-field textarea')`)
  check('切上门服务后出现地址输入', addrShown)

  // 填表单：联系人 / 手机 / 地址 / 备注
  await ev(`(() => {
    const setVal = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const inputs = document.querySelectorAll('.bkd-row input')
    setVal(inputs[0], '预约E2E')
    setVal(inputs[1], '${PHONE}')
    const ta = document.querySelector('.bkd-field textarea')
    if (ta) setVal(ta, '测试市测试区测试路 88 号 3 栋 501')
    return inputs.length
  })()`)
  await sleep(200)
  await ev(`document.querySelectorAll('.bkd-slot')[0].click()`)
  await sleep(200)
  const timeVal = await ev(`document.querySelector('.bkd-field .el-date-editor input')?.value || ''`)
  check('预约时间已填充', /\d{4}-\d{2}-\d{2}/.test(timeVal), timeVal)

  const sumText = await ev(`document.querySelector('.bkd-foot__sum')?.textContent || ''`)
  check('弹窗底部显示应付金额', /¥\d/.test(sumText), sumText.trim())

  // 提交
  await ev(`[...document.querySelectorAll('.bkd-foot__btns .ui-btn')].find(b => b.textContent.includes('提交并支付')).click()`)
  await sleep(2500)

  const cashier = await ev(`document.body.innerText.includes('收银台')`)
  check('提交后弹出收银台', cashier)
  if (!cashier) throw new Error('收银台未出现')

  const amount = await ev(`document.querySelector('.cashier-amount .num')?.textContent || ''`)
  check('收银台显示支付金额', /¥\d/.test(amount), amount.trim())

  // 用余额通道支付（更贴近真实扣款链路）
  await ev(`(() => { const it = [...document.querySelectorAll('.pay-item')].find(x => x.textContent.includes('平台余额')); if (it) it.click(); return !!it })()`)
  await sleep(300)
  const balTip = await ev(`document.querySelector('.balance-tip')?.textContent || ''`)
  const shortMoney = balTip.includes('余额不足')
  if (shortMoney) {
    await ev(`(() => { const it = [...document.querySelectorAll('.pay-item')].find(x => x.textContent.includes('支付宝')); it.click() })()`)
    await sleep(200)
  }
  check('余额通道有可用余额提示或已回退支付宝', !!balTip, balTip.replace(/\s+/g, ' ').slice(0, 60))

  await ev(`[...document.querySelectorAll('.cashier-actions .ui-btn')].find(b => b.textContent.includes('立即支付')).click()`)
  await sleep(3000)

  const okText = await ev(`document.querySelector('.cashier-success')?.innerText || ''`)
  check('支付成功页出现', okText.includes('支付成功'), okText.replace(/\s+/g, ' ').slice(0, 40))

  await ev(`[...document.querySelectorAll('.cashier-success .ui-btn')][0]?.click()`)
  await sleep(1500)

  const card = await ev(`(() => {
    const c = [...document.querySelectorAll('.bk-card')].find(x => x.innerText.includes('${PHONE}'))
    return c ? c.innerText.replace(/\\s+/g, ' ') : ''
  })()`)
  check('列表出现已支付的服务预约', card.includes('上门服务') && card.includes('已支付'), card.slice(0, 140))

  // ⑦ 取消已支付预约 → 金额退回平台余额
  const userId = MYSQL(`SELECT user_id FROM sys_user WHERE user_name='ry'`)
  const balBefore = Number(MYSQL(`SELECT balance FROM pet_wallet WHERE user_id=${userId}`))
  const paidId = MYSQL(`SELECT service_id FROM pet_service_order WHERE contact_phone='${PHONE}' AND pay_status='1' ORDER BY service_id DESC LIMIT 1`)
  const paidAmt = Number(MYSQL(`SELECT total_amount FROM pet_service_order WHERE service_id=${paidId}`))
  const rc = await fetch(`${API}/pet/service/order/cancel/${paidId}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + T },
    body: JSON.stringify({ cancelReason: 'E2E 退款校验' })
  }).then(r => r.json())
  check('已支付预约可取消', rc.code === 200, JSON.stringify(rc.msg))
  const stPaid = MYSQL(`SELECT CONCAT_WS('|', status, IFNULL(cancel_reason,'')) FROM pet_service_order WHERE service_id=${paidId}`)
  check('取消后写入状态与原因', stPaid.startsWith('4|'), stPaid)
  const balAfter = Number(MYSQL(`SELECT balance FROM pet_wallet WHERE user_id=${userId}`))
  check('取消退款回到平台余额', Math.abs(balAfter - (balBefore + paidAmt)) < 0.001, `${balBefore} -> ${balAfter} (+${paidAmt})`)

  // 落库校验：不绑定宠物、地址/联系人/金额齐全
  const row = MYSQL(`SELECT CONCAT_WS('|', IFNULL(pet_id,'NULL'), service_mode, contact_phone, total_amount, pay_status, IFNULL(pay_method,''), IFNULL(address,'')) FROM pet_service_order WHERE contact_phone='${PHONE}' ORDER BY service_id DESC LIMIT 1`)
  const [petId, mode, phone, total, payStatus, payMethod, address] = row.split('|')
  check('预约单未绑定宠物（pet_id 为空）', petId === 'NULL', 'petId=' + petId)
  check('服务方式=上门', mode === '2', 'mode=' + mode)
  check('联系人手机落库', phone === PHONE, phone)
  check('应付总额 > 0', Number(total) > 0, 'total=' + total)
  check('支付状态已支付', payStatus === '1', 'payStatus=' + payStatus)
  check('支付方式已记录', ['alipay', 'wechat', 'balance'].includes(payMethod), payMethod)
  check('上门地址已保存', (address || '').includes('测试路'), address)

  // ⑧ 到店 + 免费项目：不填地址也能下单，且无需真实支付
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + T }
  const opts = await fetch(`${API}/pet/service/item/options`).then(r => r.json())
  const freeItem = (opts.data || []).find((i) => Number(i.price) === 0)
  const d = new Date(Date.now() + 86400000)
  const p2 = (n) => String(n).padStart(2, '0')
  const when = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} 15:00:00`
  if (freeItem) {
    const r1 = await fetch(`${API}/pet/service/order/booking`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ itemId: freeItem.itemId, serviceMode: '1', appointTime: when, qty: 1, contactName: '到店E2E', contactPhone: PHONE })
    }).then(r => r.json())
    check('到店免费项目可下单（无需地址）', r1.code === 200 && !r1.data?.address, JSON.stringify(r1.data?.address || null))
    const no = r1.data?.serviceNo
    const r2 = await fetch(`${API}/pet/service/order/pay/${no}`, { method: 'POST', headers: H, body: JSON.stringify({ payMethod: 'free' }) }).then(r => r.json())
    check('免费项目免支付直接确认', r2.code === 200 && r2.data?.payStatus === '1', JSON.stringify(r2.data?.payMethod))
    const row2 = MYSQL(`SELECT CONCAT_WS('|', service_mode, IFNULL(NULLIF(address,''),'NULL'), total_amount, pay_status, IFNULL(pay_method,'')) FROM pet_service_order WHERE service_no='${no}'`)
    check('免费单落库：到店/无地址/0元/免费', row2 === '1|NULL|0.00|1|free', row2)
    const r3 = await fetch(`${API}/pet/service/order/cancel/${r1.data.serviceId}`, { method: 'POST', headers: H, body: JSON.stringify({ cancelReason: 'E2E 清理' }) }).then(r => r.json())
    check('客户可取消自己的到店预约', r3.code === 200, JSON.stringify(r3.msg))
    const st = MYSQL(`SELECT status FROM pet_service_order WHERE service_no='${no}'`)
    check('取消后状态为已取消', st === '4', 'status=' + st)
  } else {
    check('存在免费项目用于验证（可跳过）', true, 'skip')
  }

  // 清理：把测试单逻辑删除（保留日志表不动，便于排查）
  MYSQL(`UPDATE pet_service_order SET del_flag='2' WHERE contact_phone='${PHONE}'`)
  MYSQL(`DELETE FROM pet_payment_log WHERE order_no IN (SELECT service_no FROM (SELECT service_no FROM pet_service_order WHERE contact_phone='${PHONE}') t)`)

  console.log(`\n结果: ${pass} pass / ${fail} fail  @ ${BASE}`)
  chrome.kill()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('CHECK ERROR:', e.message); try { chrome.kill() } catch {}; process.exit(1) })
