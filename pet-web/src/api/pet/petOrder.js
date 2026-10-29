import request from '@/utils/request'

// 我的订单（含明细）
export function listMyOrders() {
  return request({ url: '/pet/order/mine', method: 'get' })
}

// 后台订单列表
export function listOrders(query) {
  return request({ url: '/pet/order/list', method: 'get', params: query })
}

// 订单详情
export function getOrder(orderNo) {
  return request({ url: '/pet/order/' + orderNo, method: 'get' })
}

// 今日概览
export function orderStats() {
  return request({ url: '/pet/order/stats', method: 'get' })
}

// 宠物下单（一只一单，下单即锁定该宠物）
export function createPetOrder(petId) {
  return request({ url: '/pet/order/pet/' + petId, method: 'post' })
}

// 取消订单（前台用户取消自己的待支付订单、后台取消订单共用，后端会写入取消记录）
export function cancelOrder(orderNo, reason) {
  return request({ url: '/pet/order/cancel/' + orderNo, method: 'post', params: { reason } })
}

// 发货 / 完成
export function shipOrder(orderNo) {
  return request({ url: '/pet/order/ship/' + orderNo, method: 'put' })
}
