/**
 * E2E：结算支付后购物车必须清空（服务端消费 + 前端时序双修复验证）
 * 用法: node verify_cart_clear.mjs [baseUrl]
 * 默认打线上 http://47.116.73.25/dev-api，账号 ry/admin123
 */
const BASE = process.argv[2] || 'http://47.116.73.25/dev-api'

let passed = 0, failed = 0
function ok(cond, name, extra = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`) }
  else { failed++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`) }
}

import { execFileSync } from 'node:child_process'

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let json = null
  try { json = await res.json() } catch (e) { /* ignore */ }
  return { status: res.status, json }
}

/** 从 Redis 取验证码答案：本地走 redis-cli，线上经 ssh_run.py */
function readCaptcha(uuid) {
  const key = 'captcha_codes:' + uuid
  let out
  if (BASE.includes('47.116.73.25')) {
    out = execFileSync('python', ['deploy/ssh_run.py', `redis-cli --no-raw GET ${key}`], { encoding: 'utf8' })
  } else {
    out = execFileSync('D:/Redis/redis-cli.exe', ['--no-raw', 'GET', key], { encoding: 'utf8' })
  }
  // Redis 值是 FastJson 序列化的带引号字符串（"9"），redis-cli 显示为 \"9\"，去掉引号与反斜杠
  return out.replace(/[\\"]/g, '').trim()
}

async function main() {
  console.log(`\n=== 购物车结算清空 E2E @ ${BASE} ===\n`)

  // 1. 登录（带验证码：captchaImage → Redis 取答案）
  let loginBody = { username: 'ry', password: 'admin123' }
  const cap = await api('/captchaImage')
  if (cap.json?.captchaEnabled !== false && cap.json?.uuid) {
    loginBody.code = readCaptcha(cap.json.uuid)
    loginBody.uuid = cap.json.uuid
  }
  const login = await api('/login', { method: 'POST', body: loginBody })
  ok(login.json?.token, 'ry 登录成功', login.json?.msg || '')
  const token = login.json?.token
  if (!token) process.exit(1)

  // 2. 记录购物车基线
  const base = await api('/pet/shopcart/items', { token })
  const baseRows = base.json?.data || []
  console.log(`  购物车基线：${baseRows.length} 条`)
  ok(Array.isArray(baseRows), 'GET /pet/shopcart/items 可用', `status=${base.status}`)

  // 3. 挑一件在售宠物粮
  const goods = await api('/pet/goods/list?pageNum=1&pageSize=5&status=0', { token })
  const g = (goods.json?.rows || []).find(x => x.goodsId && Number(x.price) > 0)
  ok(!!g, '找到在售宠物粮', g ? `${g.goodsId} ${g.goodsName} ¥${g.price}` : '')
  if (!g) process.exit(1)

  // 4. 加入购物车（同款合并），确认在车
  const add = await api('/pet/shopcart/items', { method: 'POST', token, body: {
    itemType: '1', goodsId: g.goodsId, skuId: g.skuId || null,
    goodsName: g.goodsName, goodsImage: g.image || '', goodsSpec: g.spec || '', price: Number(g.price), qty: 2
  } })
  const afterAdd = (add.json?.data || []).filter(r => r.goodsId === g.goodsId && r.itemType === '1')
  ok(afterAdd.length > 0, '加入购物车后条目存在', `${afterAdd.length} 条同款`)
  const addQty = afterAdd.reduce((s, r) => s + (r.qty || 0), 0)

  // 5. 结算成单（不调用任何删除/清空接口，直接验服务端消费）
  const submit = await api('/pet/cart/submit', { method: 'POST', token, body: [{
    itemType: '1', goodsId: g.goodsId, skuId: g.skuId || null,
    goodsName: g.goodsName, price: Number(g.price), qty: 2
  }] })
  const orderNo = submit.json?.data?.orderNo
  ok(!!orderNo, '结算成单', orderNo || submit.json?.msg || `qty基线=${addQty}`)

  // 6. 支付
  const pay = await api(`/pet/cart/pay/${orderNo}`, { method: 'POST', token, body: { payMethod: 'alipay' } })
  ok(pay.json?.code === 200, '支付成功', pay.json?.msg || '')

  // 7. 关键断言：不调用 DELETE，购物车里同款必须已被服务端消费掉
  const after = await api('/pet/shopcart/items', { token })
  const rows = after.json?.data || []
  const left = rows.filter(r => r.goodsId === g.goodsId && r.itemType === '1')
  ok(left.length === 0, '支付后购物车已清空（同款条目=0）', left.length ? `残留 ${left.length} 条` : `剩余 ${rows.length} 条其他条目`)

  // 8. 旧残留兜底断言：购物车里不应存在「已支付订单里同款且早于支付时间」的条目（历史脏数据清理效果）
  const orders = await api('/pet/order/mine', { token })
  const paidNos = new Set((orders.json?.data || []).filter(o => o.payStatus === '1').map(o => o.orderNo))
  const stale = rows.filter(r => r.itemType === '1' && r.goodsId &&
    (orders.json?.data || []).some(o => paidNos.has(o.orderNo) &&
      (o.items || []).some(it => it.itemType === '1' && it.goodsId === r.goodsId)))
  ok(stale.length === 0, '无「已购同款」残留条目', stale.length ? stale.map(s => s.goodsName).join('、') : '')

  console.log(`\n=== 结果：${passed} 通过 / ${failed} 失败 ===\n`)
  process.exit(failed ? 1 : 0)
}

main().catch(e => { console.error('E2E 异常:', e); process.exit(1) })
