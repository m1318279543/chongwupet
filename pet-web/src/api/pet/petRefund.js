import request from '@/utils/request'

// 我的退款记录（前台）
export function listMyRefunds() {
  return request({ url: '/pet/refund/mine', method: 'get' })
}

// 申请退款（前台）
export function applyRefund(data) {
  return request({ url: '/pet/refund/apply', method: 'post', data })
}

// 后台退款单列表
export function listRefunds(query) {
  return request({ url: '/pet/refund/list', method: 'get', params: query })
}

// 今日概览
export function refundStats() {
  return request({ url: '/pet/refund/stats', method: 'get' })
}

// 审核（pass=true 同意退款）
export function auditRefund(refundId, pass, remark) {
  return request({ url: '/pet/refund/audit/' + refundId, method: 'put', data: { pass, remark } })
}
