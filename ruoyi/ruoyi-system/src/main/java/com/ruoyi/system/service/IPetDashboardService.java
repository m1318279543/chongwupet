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
}
