package com.ruoyi.system.service;

import java.util.Map;

/**
 * 数据看板统计 Service
 *
 * @author ruoyi
 */
public interface IPetDashboardService
{
    /**
     * 看板全量数据（汇总 + 趋势 + 分布 + 排行 + 时段分布）
     *
     * @param days 统计天数（含今天）
     */
    Map<String, Object> all(int days);

    /**
     * 实时数据（轻量）：今日指标 + 最新业务动态
     */
    Map<String, Object> realtime();

    /**
     * 可视化大屏专属数据（与看板内容错开）：
     * 客户增长 / 转化漏斗 / 门店对比 / 评分满意度 / 服务模式 / 最新评价 / 会员资产
     *
     * @param days 统计天数（含今天）
     */
    Map<String, Object> bigscreen(int days);
}
