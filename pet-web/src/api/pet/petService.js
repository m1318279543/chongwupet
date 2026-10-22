import request from '@/utils/request'

// ---------------- 服务工单 ----------------

// 后台工单列表
export function listServiceOrder(query) {
  return request({ url: '/pet/service/order/list', method: 'get', params: query })
}

// 工单详情（含流转记录）
export function getServiceOrder(serviceId) {
  return request({ url: '/pet/service/order/' + serviceId, method: 'get' })
}

// 我的工单（前台）
export function listMyServiceOrders() {
  return request({ url: '/pet/service/order/mine', method: 'get' })
}

// 今日概览
export function getServiceStats() {
  return request({ url: '/pet/service/order/stats', method: 'get' })
}

// 派工/接单
export function dispatchServiceOrder(serviceId, data) {
  return request({ url: '/pet/service/order/dispatch/' + serviceId, method: 'put', data })
}

// 开始服务
export function startServiceOrder(serviceId) {
  return request({ url: '/pet/service/order/start/' + serviceId, method: 'put' })
}

// 完成服务
export function finishServiceOrder(serviceId, remark) {
  return request({ url: '/pet/service/order/finish/' + serviceId, method: 'put', params: { remark } })
}

// 取消工单
export function cancelServiceOrder(serviceId, reason) {
  return request({ url: '/pet/service/order/cancel/' + serviceId, method: 'put', params: { reason } })
}

// 客户评价
export function evaluateServiceOrder(serviceId, data) {
  return request({ url: '/pet/service/order/evaluate/' + serviceId, method: 'post', data })
}

// ---------------- 服务项目 ----------------

export function listServiceItem(query) {
  return request({ url: '/pet/service/item/list', method: 'get', params: query })
}

export function getServiceItem(itemId) {
  return request({ url: '/pet/service/item/' + itemId, method: 'get' })
}

export function addServiceItem(data) {
  return request({ url: '/pet/service/item', method: 'post', data })
}

export function updateServiceItem(data) {
  return request({ url: '/pet/service/item', method: 'put', data })
}

export function delServiceItem(itemIds) {
  return request({ url: '/pet/service/item/' + itemIds, method: 'delete' })
}

export function serviceItemOptions() {
  return request({ url: '/pet/service/item/options', method: 'get' })
}
