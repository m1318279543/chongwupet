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

    /**
     * 门店展示大屏（游客可读）：好评 / 复购 / 评论口碑汇总，供顾客在店查看
     */
    Map<String, Object> display();

    /**
     * AI 经营诊断官：把多源指标融合为经营健康分、五维雷达得分与自动诊断结论。
     * 结论由规则引擎基于真实业务数据生成（不依赖外部模型），
     * 返回的 narrative / metrics 可交给 AI 助手做进一步的流式解读。
     *
     * @param days 统计天数（含今天），并自动与上一个等长周期做环比
     */
    Map<String, Object> diagnosis(int days);
}
