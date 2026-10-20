import request from '@/utils/request'

/**
 * 数据看板：汇总 + 按天趋势 + 分布 + 排行 + 时段分布
 * days：统计天数（含今天）
 */
export function getDashboardAll(days) {
  return request({
    url: '/pet/dashboard/all',
    method: 'get',
    params: { days },
    timeout: 30000,
  })
}

/**
 * 数据看板：实时数据（今日指标 + 最新业务动态）
 */
export function getDashboardRealtime() {
  return request({
    url: '/pet/dashboard/realtime',
    method: 'get',
    timeout: 30000,
  })
}
