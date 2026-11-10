/**
 * 预约状态机 —— 页面唯一的「后端状态 → UI 状态」映射入口
 *
 * 背景（业务逻辑冲突的根源）：
 *   旧版宠物预约接口返回 0/1/2/3 = 待处理/已确认/已完成/已取消
 *   服务工单接口返回     0/1/2/3/4 = 待接单/已接单/服务中/已完成/已取消
 * 同一个数字 2 在两个接口里分别是「已完成」和「服务中」，3 分别是「已取消」和「已完成」。
 * 直接按数字取文案就会出现「已完成显示成服务中」「已取消显示成已完成」。
 *
 * 因此这里按数据来源分表映射，对外只暴露 4 个 UI 状态：
 *   PENDING    待处理（含「待接单 / 待处理 / 待支付」）→ 橙色
 *   PROCESSING 服务中（含「已确认 / 已接单」）           → 品牌绿
 *   DONE       已完成                                   → 绿色
 *   CANCELED   已取消                                   → 灰色
 */

export const APPT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  CANCELED: 'CANCELED'
}

/** UI 文案 + Badge 色调，页面/卡片只读这里，不再各自写 if-else */
export const STATUS_META = {
  [APPT_STATUS.PENDING]: { label: '待处理', tone: 'warn' },
  [APPT_STATUS.PROCESSING]: { label: '服务中', tone: 'brand' },
  [APPT_STATUS.DONE]: { label: '已完成', tone: 'ok' },
  [APPT_STATUS.CANCELED]: { label: '已取消', tone: 'muted' }
}

/** 文案别名：后端不同接口/历史数据里同一状态叫法不一样，先按文案归一 */
const TEXT_ALIAS = {
  待接单: APPT_STATUS.PENDING,
  待处理: APPT_STATUS.PENDING,
  待支付: APPT_STATUS.PENDING,
  未支付: APPT_STATUS.PENDING,
  pending: APPT_STATUS.PENDING,

  已确认: APPT_STATUS.PROCESSING,
  已接单: APPT_STATUS.PROCESSING,
  服务中: APPT_STATUS.PROCESSING,
  进行中: APPT_STATUS.PROCESSING,
  processing: APPT_STATUS.PROCESSING,

  已完成: APPT_STATUS.DONE,
  完成: APPT_STATUS.DONE,
  done: APPT_STATUS.DONE,
  completed: APPT_STATUS.DONE,

  已取消: APPT_STATUS.CANCELED,
  取消: APPT_STATUS.CANCELED,
  canceled: APPT_STATUS.CANCELED,
  cancelled: APPT_STATUS.CANCELED
}

/** 数字码按来源分表 —— 这就是上面说的冲突点 */
const CODE_BY_SOURCE = {
  // 旧版宠物预约：0 待处理 / 1 已确认 / 2 已完成 / 3 已取消
  LEGACY: {
    0: APPT_STATUS.PENDING,
    1: APPT_STATUS.PROCESSING,
    2: APPT_STATUS.DONE,
    3: APPT_STATUS.CANCELED
  },
  // 服务工单：0 待接单 / 1 已接单 / 2 服务中 / 3 已完成 / 4 已取消
  ORDER: {
    0: APPT_STATUS.PENDING,
    1: APPT_STATUS.PROCESSING,
    2: APPT_STATUS.PROCESSING,
    3: APPT_STATUS.DONE,
    4: APPT_STATUS.CANCELED
  }
}

/**
 * 把后端返回的状态收敛成 4 个 UI 状态
 * @param {string|number} rawStatus 后端状态（数字码或中文/英文文案）
 * @param {'ORDER'|'LEGACY'} source 数据来源，决定数字码含义
 */
export function normalizeStatus(rawStatus, source = 'ORDER') {
  if (rawStatus === null || rawStatus === undefined || rawStatus === '') {
    return APPT_STATUS.PENDING
  }
  const key = String(rawStatus).trim()
  if (TEXT_ALIAS[key]) return TEXT_ALIAS[key]
  if (TEXT_ALIAS[key.toLowerCase()]) return TEXT_ALIAS[key.toLowerCase()]

  const table = CODE_BY_SOURCE[source] || CODE_BY_SOURCE.ORDER
  const code = String(Number.isFinite(Number(key)) ? Number(key) : key)
  return table[code] || APPT_STATUS.PENDING
}

/* ------------------------------------------------------------------
 * 手机号：脱敏 + 脏数据校验
 * 后端历史数据里存在 'uygtfffffffffff'、'12345' 这类非手机号，直接展示既难看
 * 也容易误导用户以为这是自己的号码。统一走 phoneView() 产出展示值。
 * ---------------------------------------------------------------- */

const PHONE_RE = /^1[3-9]\d{9}$/

/** 只保留数字并去掉 +86 / 86 国家码，兼容 134-1234-1234、+86 134 1234 1234 */
export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('86')) return digits.slice(2)
  return digits
}

/** 是否合法大陆手机号 */
export function isValidPhone(raw) {
  return PHONE_RE.test(normalizePhone(raw))
}

/**
 * 手机号展示模型
 * @returns {{ text: string, valid: boolean, masked: boolean, digits: string }}
 *   valid=false 时 text 为「无效号码」/「未填写」，页面据此加警示样式或隐藏
 */
export function phoneView(raw) {
  // 先判「有没有填」：串本身非空但一个数字都没有（如 uygtfffffffffff）属于脏数据，
  // 不能因为清洗后变成空串就误判成「未填写」。
  const hasInput = String(raw ?? '').trim().length > 0
  const digits = normalizePhone(raw)
  if (!hasInput) return { text: '未填写', valid: false, masked: false, digits: '' }
  if (!PHONE_RE.test(digits)) return { text: '无效号码', valid: false, masked: false, digits: '' }
  return {
    text: `${digits.slice(0, 3)}****${digits.slice(7)}`,
    valid: true,
    masked: true,
    digits
  }
}

/* ------------------------------------------------------------------
 * 时间
 * ---------------------------------------------------------------- */

/** 兼容 '2026-11-09T10:30:00'、'2026-11-09 10:30:00'、时间戳 */
export function toTimestamp(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  const normalized = String(value).trim().replace('T', ' ').replace(/-/g, '/').replace(/\.\d+$/, '')
  const time = new Date(normalized).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** 统一展示成 YYYY-MM-DD HH:mm（后端有时带 T、有时带秒） */
export function formatAppointTime(value) {
  if (!value) return '时间待定'
  const text = String(value).trim().replace('T', ' ')
  return text.length >= 16 ? text.slice(0, 16) : text
}
