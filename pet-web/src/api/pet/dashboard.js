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

/**
 * 可视化大屏专属数据：客户增长 / 转化漏斗 / 门店对比 / 评分满意度 / 服务模式 / 最新评价
 * 与 /all（数据看板）内容错开
 */
export function getDashboardBigscreen(days) {
  return request({
    url: '/pet/dashboard/bigscreen',
    method: 'get',
    params: { days },
    timeout: 30000,
  })
}

/**
 * AI 经营诊断官：经营健康分 + 五维雷达 + 自动诊断结论 + 上期环比
 * 结论由后端规则引擎基于真实业务数据生成，AI 深度解读在前端流式调用助手接口
 */
export function getDashboardDiagnosis(days) {
  return request({
    url: '/pet/dashboard/diagnosis',
    method: 'get',
    params: { days },
    timeout: 30000,
  })
}

/**
 * 门店展示大屏（游客可读）：好评 / 复购 / 评论口碑聚合数据
 */
export function getDisplayScreen() {
  return request({
    url: '/pet/dashboard/display',
    method: 'get',
    timeout: 30000,
  })
}
