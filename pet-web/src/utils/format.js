/**
 * 日期 / 枚举文案格式化：替代各页面本地散写的 fmt / statusText。
 *
 * 全站时间列只有两种形态，不要再出现第三种 slice 写法：
 *   fmtShort —— 'MM-DD HH:mm'   列表里的紧凑时间列
 *   fmtFull  —— 'YYYY-MM-DD HH:mm:ss'  详情 / 对话气泡
 * 金额格式化在 utils/money.js（唯一来源），此处转发便于一次性 import。
 */

/** 'MM-DD HH:mm'；空值返回占位符 */
export function fmtShort(v) {
  if (!v) return '—'
  const s = String(v).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s
}

/** 'YYYY-MM-DD HH:mm:ss'；空值返回占位符 */
export function fmtFull(v) {
  if (!v) return '—'
  const s = String(v).replace('T', ' ').replace(/\.\d+$/, '')
  return s.length >= 19 ? s.slice(0, 19) : s
}

/** 'YYYY-MM-DD'；空值返回占位符 */
export function fmtDay(v) {
  if (!v) return '—'
  const s = String(v).replace('T', ' ')
  return s.length >= 10 ? s.slice(0, 10) : s
}

/**
 * 枚举文案查找：替代每个页面各写一遍的
 * `(OPTIONS.find(x => x.value === s) || {}).label || '未知'`。
 * @param {Array<{value,label}>} options
 * @param {*} value
 * @param {string} [fallback='未知']
 */
export function enumText(options, value, fallback = '未知') {
  const hit = (options || []).find((x) => String(x.value) === String(value))
  return hit ? hit.label : fallback
}

export { money } from './money'
