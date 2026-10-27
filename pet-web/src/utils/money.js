/**
 * 金额格式化：全站唯一的写法。
 *  - 千分位：1280 → 1,280
 *  - 整数不带小数；有角分时最多两位：128.50 → 128.5
 *  - 非数字统一回 '0'，避免页面出现 NaN
 *
 * 只负责数字本身，货币符号由模板写（¥ 与价格色、字号由 .ui-price 控制）。
 */
export function money(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default money
