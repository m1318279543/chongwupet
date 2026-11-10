/**
 * 预约列表视图模型
 * 把两个来源（旧版宠物预约 / 服务工单）的原始字段，适配成卡片直接消费的同一个结构，
 * 并在这里统一做排序、Tab 过滤、关键词过滤 —— 页面组件不再持有业务判断。
 */
import {
  APPT_STATUS,
  formatAppointTime,
  normalizeStatus,
  phoneView,
  toTimestamp
} from './appointmentStatus'

export const TAB_ALL = 'ALL'
export const TAB_PENDING = 'PENDING'
export const TAB_DONE = 'DONE'

export const TABS = [
  { key: TAB_ALL, label: '全部' },
  { key: TAB_PENDING, label: '待处理' },
  { key: TAB_DONE, label: '已完成' }
]

/**
 * Tab 对应的状态集合。
 * 「待处理」不只含 PENDING：已接单/服务中同样没结束，运营和用户都当成未完成看待；
 * 已取消只在「全部」里出现，避免取消单占用常用筛选。
 */
const TAB_STATUS = {
  [TAB_ALL]: null,
  [TAB_PENDING]: [APPT_STATUS.PENDING, APPT_STATUS.PROCESSING],
  [TAB_DONE]: [APPT_STATUS.DONE]
}

/**
 * 原始记录 → 卡片视图模型
 * @param {object} raw 后端原始记录（两种来源字段不同）
 * @param {number} index 兜底 key 用
 */
export function adaptAppointment(raw = {}, index = 0) {
  const source = raw.source === 'LEGACY' ? 'LEGACY' : 'ORDER'
  const status = normalizeStatus(raw.status, source)
  const phone = phoneView(raw.contactPhone)
  const appointTime = raw.appointTime || raw.appointmentDate || ''
  const orderNo = raw.orderNo || raw.serviceNo || raw.appointmentNo || (raw.appointmentId ? `AP${raw.appointmentId}` : '—')

  return {
    id: `${source}-${raw.serviceId ?? raw.appointmentId ?? index}`,
    source,
    status,
    petName: String(raw.petName || '').trim() || '未登记宠物',
    serviceName: String(raw.serviceName || raw.itemName || '到店服务').trim(),
    appointTime,
    timeValue: toTimestamp(appointTime),
    timeText: formatAppointTime(appointTime),
    storeName: String(raw.storeName || '').trim(),
    phone,
    orderNo: String(orderNo),
    canCancel: status === APPT_STATUS.PENDING,
    canPay: source === 'ORDER' && raw.payStatus === '0' && status !== APPT_STATUS.CANCELED,
    canEvaluate: source === 'ORDER' && status === APPT_STATUS.DONE && !raw.score,
    raw
  }
}

/** 按预约时间倒序（最新的/最近的排最前） */
export function sortByAppointTimeDesc(list = []) {
  return [...list].sort((a, b) => b.timeValue - a.timeValue)
}

/** 某个 Tab 下的条数（不受关键词影响，用于 Tab 角标） */
export function countByTab(list = [], tab = TAB_ALL) {
  const allow = TAB_STATUS[tab]
  if (!allow) return list.length
  return list.filter((item) => allow.includes(item.status)).length
}

/**
 * Tab + 搜索框联合过滤
 * 关键词匹配：宠物名称（忽略大小写）、手机号（按纯数字匹配，输入 1234 也能命中 134****1234）
 */
export function filterAppointments(list = [], tab = TAB_ALL, keyword = '') {
  const allow = TAB_STATUS[tab]
  const rawKeyword = String(keyword || '').trim().toLowerCase()
  const digitsKeyword = rawKeyword.replace(/\D/g, '')

  return list.filter((item) => {
    if (allow && !allow.includes(item.status)) return false
    if (!rawKeyword) return true

    if (item.petName.toLowerCase().includes(rawKeyword)) return true
    if (digitsKeyword && item.phone.digits.includes(digitsKeyword)) return true
    return false
  })
}
