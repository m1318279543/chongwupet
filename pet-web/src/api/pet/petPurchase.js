import request from '@/utils/request'

// 采购单列表
export function listPurchases(query) {
  return request({ url: '/pet/purchase/list', method: 'get', params: query })
}

// 采购单详情（含明细）
export function getPurchase(purchaseNo) {
  return request({ url: '/pet/purchase/' + purchaseNo, method: 'get' })
}

// 今日概览
export function purchaseStats() {
  return request({ url: '/pet/purchase/stats', method: 'get' })
}

// 新建采购单
export function addPurchase(data) {
  return request({ url: '/pet/purchase', method: 'post', data })
}

// 确认入库（加库存）
export function inboundPurchase(purchaseNo) {
  return request({ url: '/pet/purchase/inbound/' + purchaseNo, method: 'put' })
}

// 取消采购单
export function cancelPurchase(purchaseNo) {
  return request({ url: '/pet/purchase/cancel/' + purchaseNo, method: 'put' })
}
