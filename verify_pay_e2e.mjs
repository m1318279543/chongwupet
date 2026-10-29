// 合并后支付闭环接口验证：钱包余额扣减 / 库存支付时扣减 / 支付流水 / 取消回补
// 用法: node verify_pay_e2e.mjs [apiBase]
import { execSync } from 'node:child_process'

const API = process.argv[2] || 'http://127.0.0.1:8081'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let pass = 0, fail = 0
const check = (n, ok, extra = '') => { ok ? (pass++, console.log(`  PASS ${n}${extra ? '  ' + extra : ''}`)) : (fail++, console.log(`  FAIL ${n}${extra ? '  ' + extra : ''}`)) }

async function login(username, password) {
  const cap = await (await fetch(`${API}/captchaImage`)).json()
  let code = ''
  for (let i = 0; i < 20; i++) {
    code = execSync(`D:/Redis/redis-cli.exe GET captcha_codes:${cap.uuid}`, { encoding: 'utf8' }).trim().replace(/"/g, '')
    if (code) break
    await sleep(200)
  }
  const r = await (await fetch(`${API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, code, uuid: cap.uuid })
  })).json()
  if (!r.token) throw new Error('登录失败 ' + JSON.stringify(r))
  return r.token
}
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t })
const jget = async (p, t) => (await fetch(API + p, { headers: H(t) })).json()
const jpost = async (p, t, body) => (await fetch(API + p, { method: 'POST', headers: H(t), body: body == null ? undefined : JSON.stringify(body) })).json()

;(async () => {
  const t = await login('ry', 'admin123')

  // 选一个有库存的商品
  const goods = await jget('/pet/goods/list?pageNum=1&pageSize=50&status=0', t)
  const g = (goods.rows || []).find((x) => Number(x.stock) > 2)
  if (!g) throw new Error('无可用商品')
  const skuId = g.skus && g.skus.length ? g.skus[0].skuId : null
  const stock0 = Number(g.stock)
  console.log(`商品: ${g.goodsName} (id=${g.goodsId}, sku=${skuId}) 库存=${stock0}`)

  // 演示充值，保证余额足够走通（前一单可能占用余额）
  await jpost('/pet/wallet/recharge', t, { amount: 500 })
  const w0 = await jget('/pet/wallet/mine', t)
  const bal0 = Number(w0.data?.balance ?? 0)
  console.log('钱包余额(支付前):', bal0)

  // 下单（不扣库存）
  const sub = await jpost('/pet/cart/submit', t, [{
    itemType: '1', goodsId: g.goodsId, skuId,
    goodsName: g.goodsName, goodsSpec: g.spec || '', price: Number(g.price), qty: 1
  }])
  check('下单成功', sub.code === 200 && !!sub.data?.orderNo, sub.data?.orderNo || sub.msg)
  const orderNo = sub.data?.orderNo
  const g1 = await jget(`/pet/goods/list?pageNum=1&pageSize=50&status=0`, t)
  const stockAfterCreate = Number((g1.rows || []).find((x) => x.goodsId === g.goodsId)?.stock)
  check('下单不扣库存（main 语义保留）', stockAfterCreate === stock0, `${stock0} -> ${stockAfterCreate}`)

  // 余额支付（扣款 + 扣库存 + 写流水）
  await sleep(300)
  const paid = await jpost(`/pet/cart/pay/${orderNo}`, t, { payMethod: 'balance' })
  check('余额支付成功', paid.code === 200, paid.msg)
  await sleep(500)

  const g2 = await jget(`/pet/goods/list?pageNum=1&pageSize=50&status=0`, t)
  const stockPaid = Number((g2.rows || []).find((x) => x.goodsId === g.goodsId)?.stock)
  check('支付后库存 -1', stockPaid === stock0 - 1, `${stock0} -> ${stockPaid}`)

  const w1 = await jget('/pet/wallet/mine', t)
  const bal1 = Number(w1.data?.balance ?? 0)
  check('余额真实扣减', bal1 === bal0 - Number(g.price), `${bal0} -> ${bal1}（单价 ${g.price}）`)

  // 流水与退款取消是后台权限：用管理员令牌验证
  const at = await login('admin', 'admin123')
  const logs = await jget('/pet/payment/list?pageNum=1&pageSize=20', at)
  const rows = (logs.rows || []).filter((r) => r.orderNo === orderNo)
  check('支付流水已落库', rows.length >= 1 && rows[0].result === 'success', `rows=${rows.length} result=${rows[0]?.result}`)

  // 取消已支付订单（管理员）→ 回补库存 + 退款
  const cancel = await jpost(`/pet/order/cancel/${orderNo}?reason=`, at, null)
  check('取消已支付订单成功', cancel.code === 200, cancel.msg)
  await sleep(600)
  const g3 = await jget(`/pet/goods/list?pageNum=1&pageSize=50&status=0`, t)
  const stockCancel = Number((g3.rows || []).find((x) => x.goodsId === g.goodsId)?.stock)
  const w2 = await jget('/pet/wallet/mine', t)
  const bal2 = Number(w2.data?.balance ?? 0)
  check('取消后库存回补', stockCancel === stock0, `${stockPaid} -> ${stockCancel}`)
  // 余额退款走后台「退款管理」，取消本身不退余额（main 既有口径）
  check('取消不改动余额（退款走退款管理）', bal2 === bal1, `${bal1} -> ${bal2}`)

  console.log(`\n结果: ${pass} pass / ${fail} fail`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
