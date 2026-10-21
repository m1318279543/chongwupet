import request from '@/utils/request'

// 支付流水列表
export function listPaymentLog(query) {
  return request({
    url: '/pet/payment/list',
    method: 'get',
    params: query
  })
}

// 订单维度总览（已支付/待支付/支付失败/已取消）
export function paymentOverview() {
  return request({
    url: '/pet/payment/overview',
    method: 'get'
  })
}

// 近 N 天支付趋势
export function paymentTrend(days = 7) {
  return request({
    url: '/pet/payment/trend',
    method: 'get',
    params: { days }
  })
}
