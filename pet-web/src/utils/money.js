/**
 * 金额格式化：全站唯一的写法。
 *  - 千分位：1280 → 1,280
 *  - 默认整数不带小数；有角分时最多两位：128.50 → 128.5
 *  - digits = 2 时固定两位小数（订单 / 退款 / 采购等账目表）：128.5 → 128.50
 *  - 非数字统一回 '0'，避免页面出现 NaN
 *
 * 只负责数字本身，货币符号由模板写（¥ 与价格色、字号由 .ui-money 控制）。
 */
export function money(v, digits) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  const options = digits === 2
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 2 }
  return n.toLocaleString('zh-CN', options)
}

export default money
