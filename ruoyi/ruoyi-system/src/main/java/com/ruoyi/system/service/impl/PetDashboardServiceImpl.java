package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.mapper.PetDashboardMapper;
import com.ruoyi.system.service.IPetDashboardService;

/**
 * 数据看板统计 Service 实现
 *
 * 设计要点：
 * 1. 所有数据来自业务表实时聚合（pet_appointment / pet_cart / pet_consult ...），
 *    前端不保存任何历史快照，切换时间范围即重新查询真实历史数据；
 * 2. 按天补零，保证趋势折线在无数据日期上连续；
 * 3. 一次请求返回看板全部区块，减少公网隧道下的往返次数。
 *
 * @author ruoyi
 */
@Service
public class PetDashboardServiceImpl implements IPetDashboardService
{
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final String[] APPOINTMENT_LABELS = { "待处理", "已确认", "已完成", "已取消" };
    private static final String[] ORDER_LABELS = { "正常", "已取消" };

    @Autowired
    private PetDashboardMapper dashboardMapper;

    @Override
    public Map<String, Object> all(int days)
    {
        int span = Math.max(1, Math.min(days, 365));
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(span - 1L);
        LocalDate prevStartDate = startDate.minusDays(span);

        String start = startDate.atStartOfDay().format(DATETIME_FMT);
        String end = today.plusDays(1L).atStartOfDay().format(DATETIME_FMT);
        String prevStart = prevStartDate.atStartOfDay().format(DATETIME_FMT);
        String prevEnd = startDate.atStartOfDay().format(DATETIME_FMT);

        Map<String, Object> current = dashboardMapper.selectSummary(start, end);
        Map<String, Object> previous = dashboardMapper.selectSummary(prevStart, prevEnd);
        Map<String, Object> todayStat = dashboardMapper.selectToday();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt", LocalDateTime.now().format(DATETIME_FMT));
        result.put("range", range(span, startDate, today));
        result.put("overview", overview(current, previous));
        result.put("today", normalize(todayStat));
        result.put("trend", trend(startDate, today, start, end));
        result.put("distribution", distribution(start, end));
        result.put("ranking", ranking(start, end));
        result.put("hourly", hourly(start, end));
        return result;
    }

    @Override
    public Map<String, Object> realtime()
    {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt", LocalDateTime.now().format(DATETIME_FMT));
        result.put("today", normalize(dashboardMapper.selectToday()));
        result.put("feed", normalizeFeed(dashboardMapper.selectRealtimeFeed()));
        return result;
    }

    @Override
    public Map<String, Object> bigscreen(int days)
    {
        int span = Math.max(1, Math.min(days, 365));
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(span - 1L);
        String start = startDate.atStartOfDay().format(DATETIME_FMT);
        String end = today.plusDays(1L).atStartOfDay().format(DATETIME_FMT);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt", LocalDateTime.now().format(DATETIME_FMT));
        result.put("range", range(span, startDate, today));
        result.put("kpi", bigscreenKpi(start, end));
        result.put("userTrend", newUserTrend(startDate, today, start, end));
        result.put("funnel", normalize(dashboardMapper.selectFunnel(start, end)));
        result.put("storeCompare", normalize(dashboardMapper.selectStoreCompare(start, end)));
        result.put("rating", rating(start, end));
        result.put("serviceMode", serviceMode(start, end));
        result.put("wallet", normalize(dashboardMapper.selectWallet()));
        result.put("latestComments", normalize(dashboardMapper.selectLatestComments()));
        Map<String, Object> rankOnly = new LinkedHashMap<>();
        rankOnly.put("services", normalize(dashboardMapper.selectTopServices(start, end)));
        result.put("ranking", rankOnly);
        return result;
    }

    /**
     * AI 经营诊断官
     *
     * 创新点：不再只把指标平铺出来，而是把「拉新 / 复购 / 口碑 / 履约 / 门店均衡」
     * 五个维度的真实数据融合成一个经营健康分，并由规则引擎自动生成带具体数字、
     * 等级与可执行建议的诊断结论。前端可把 narrative / metrics 交给 AI 助手做流式解读。
     *
     * 所有输入都来自业务表实时聚合，与上一个等长周期做环比，无任何写死数据。
     */
    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> diagnosis(int days)
    {
        int span = Math.max(1, Math.min(days, 365));
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(span - 1L);
        LocalDate prevStartDate = startDate.minusDays(span);
        String start = startDate.atStartOfDay().format(DATETIME_FMT);
        String end = today.plusDays(1L).atStartOfDay().format(DATETIME_FMT);
        String prevStart = prevStartDate.atStartOfDay().format(DATETIME_FMT);
        String prevEnd = startDate.atStartOfDay().format(DATETIME_FMT);

        Map<String, Object> cur = bigscreenKpi(start, end);
        Map<String, Object> pre = bigscreenKpi(prevStart, prevEnd);
        Map<String, Object> rating = rating(start, end);
        List<Map<String, Object>> stores = normalize(dashboardMapper.selectStoreCompare(start, end));
        Map<String, Object> funnel = normalize(dashboardMapper.selectFunnel(start, end));

        long newUsers = num(cur.get("newUsers")).longValue();
        long prevNewUsers = num(pre.get("newUsers")).longValue();
        long paidUsers = num(cur.get("paidUsers")).longValue();
        long scoreComments = num(cur.get("scoreComments")).longValue();
        long serviceTotal = num(cur.get("serviceTotal")).longValue();
        double repeatRate = num(cur.get("repeatRate")).doubleValue();
        double prevRepeat = num(pre.get("repeatRate")).doubleValue();
        double goodRate = num(cur.get("goodRate")).doubleValue();
        double prevGood = num(pre.get("goodRate")).doubleValue();
        double finishRate = num(cur.get("serviceFinishRate")).doubleValue();
        double avgOrder = num(cur.get("avgOrderAmount")).doubleValue();

        // 1~2 星差评占比
        long lowStar = 0L;
        long totalScore = 0L;
        for (Map<String, Object> item : (List<Map<String, Object>>) rating.get("dist"))
        {
            long v = num(item.get("value")).longValue();
            int star = Integer.parseInt(String.valueOf(item.get("name")).replace(" 星", ""));
            totalScore += v;
            if (star <= 2) lowStar += v;
        }
        double lowRate = totalScore == 0 ? 0 : round(lowStar * 100.0 / totalScore, 1);

        // 门店集中度：TOP1 门店成交额占比
        double totalRev = 0D;
        double topRev = 0D;
        String topStore = "";
        for (Map<String, Object> s : stores)
        {
            double r = num(s.get("revenue")).doubleValue();
            totalRev += r;
            if (r > topRev)
            {
                topRev = r;
                topStore = String.valueOf(s.get("storeName"));
            }
        }
        double topShare = totalRev == 0 ? 0 : round(topRev * 100.0 / totalRev, 1);

        // 下单 → 成交的支付转化
        long orders = num(funnel.get("orders")).longValue();
        long paidOrders = num(funnel.get("paidOrders")).longValue();
        double payRate = orders == 0 ? 0 : round(paidOrders * 100.0 / orders, 1);

        // 拉新环比（上期为 0 时按 100% 增长处理，避免除零）
        double growth = prevNewUsers == 0
                ? (newUsers > 0 ? 100D : 0D)
                : round((newUsers - prevNewUsers) * 100.0 / prevNewUsers, 1);

        // ---- 五维健康分（0~100）----
        int acquisition = clampScore(50 + growth * 1.2);
        int repurchase = clampScore(repeatRate / 40D * 100D);
        int reputation = clampScore(goodRate - lowRate * 1.5);
        int fulfillment = clampScore(finishRate);
        int balance = clampScore(100 - Math.max(0D, topShare - 25D) * 1.5);

        int score = clampScore(acquisition * 0.22 + repurchase * 0.20 + reputation * 0.22
                + fulfillment * 0.20 + balance * 0.16);
        String grade = score >= 85 ? "优秀" : score >= 70 ? "良好" : score >= 55 ? "待提升" : "需关注";

        List<Map<String, Object>> radar = new ArrayList<>();
        radar.add(radarItem("拉新", acquisition, "新增客户环比"));
        radar.add(radarItem("复购", repurchase, "成交客户二次购买"));
        radar.add(radarItem("口碑", reputation, "好评率与低星惩罚"));
        radar.add(radarItem("履约", fulfillment, "服务工单完成率"));
        radar.add(radarItem("均衡", balance, "门店成交额集中度"));

        // ---- 诊断结论（按严重度排序）----
        List<Map<String, Object>> findings = new ArrayList<>();
        if (growth <= -10)
        {
            finding(findings, "warn", "拉新放缓",
                    "近 " + span + " 天新增客户 " + newUsers + " 人，较上期 " + prevNewUsers + " 人下降 " + Math.abs(growth) + "%",
                    "复盘投放渠道，推出新客首单券或老带新奖励", "环比 " + growth + "%");
        }
        else if (growth >= 10)
        {
            finding(findings, "good", "拉新提速",
                    "近 " + span + " 天新增客户 " + newUsers + " 人，较上期增长 " + growth + "%",
                    "趁势扩大投放，同步检查新客首单转化是否跟上", "环比 +" + growth + "%");
        }
        else
        {
            finding(findings, "info", "拉新平稳",
                    "近 " + span + " 天新增客户 " + newUsers + " 人，环比 " + growth + "%",
                    "保持现有节奏，重点关注新客 7 日留存", "环比 " + growth + "%");
        }

        if (repeatRate < 20)
        {
            finding(findings, "warn", "复购偏低",
                    "复购率仅 " + repeatRate + "%，" + paidUsers + " 位成交客户中回头客偏少",
                    "对已成交客户做二次触达，上线会员积分与回访提醒", "复购率 " + repeatRate + "%");
        }
        else if (repeatRate >= 35)
        {
            finding(findings, "good", "复购稳健",
                    "复购率 " + repeatRate + "%，高于上期 " + prevRepeat + "%",
                    "把高复购客户的偏好沉淀为标签，做精准推荐", "复购率 " + repeatRate + "%");
        }
        else
        {
            finding(findings, "info", "复购中等",
                    "复购率 " + repeatRate + "%（上期 " + prevRepeat + "%）",
                    "针对首单客户设计 30 天内二次到店激励", "复购率 " + repeatRate + "%");
        }

        if (goodRate < 80)
        {
            finding(findings, "alert", "口碑风险",
                    "好评率仅 " + goodRate + "%（共 " + scoreComments + " 条有效评分）",
                    "逐条排查低星评价，48 小时内回访并闭环", "好评率 " + goodRate + "%");
        }
        else if (lowRate > 10)
        {
            finding(findings, "alert", "低星评价集中",
                    "1~2 星占比 " + lowRate + "%，好评率虽为 " + goodRate + "% 但差评仍有集中",
                    "定位差评集中的门店与服务项目，专项整改", "低星 " + lowRate + "%");
        }
        else
        {
            finding(findings, "good", "口碑良好",
                    "好评率 " + goodRate + "%（上期 " + prevGood + "%），低星仅占 " + lowRate + "%",
                    "把优质评价同步到前台展示大屏，形成正向循环", "好评率 " + goodRate + "%");
        }

        if (finishRate < 85)
        {
            finding(findings, "warn", "服务履约待提升",
                    "服务完成率 " + finishRate + "%，区间内共 " + serviceTotal + " 张工单",
                    "检查待处理工单堆积情况，优化高峰时段排班", "完成率 " + finishRate + "%");
        }
        else
        {
            finding(findings, "good", "履约顺畅",
                    "服务完成率 " + finishRate + "%，" + serviceTotal + " 张工单基本闭环",
                    "保持排班节奏，可尝试扩充高热度服务项目", "完成率 " + finishRate + "%");
        }

        if (topShare > 45)
        {
            finding(findings, "warn", "门店依赖度偏高",
                    stores.size() + " 家门店中「" + topStore + "」贡献 " + topShare + "% 成交额",
                    "把头部门店的服务组合与活动复制到其余门店", "TOP1 " + topShare + "%");
        }
        else
        {
            finding(findings, "good", "门店经营较均衡",
                    stores.size() + " 家门店，TOP1「" + topStore + "」占比 " + topShare + "%",
                    "持续跟踪尾部门店，避免差距扩大", "TOP1 " + topShare + "%");
        }

        if (orders > 0 && payRate < 70)
        {
            finding(findings, "warn", "支付环节流失",
                    "下单 " + orders + " 单、成交 " + paidOrders + " 单，支付转化 " + payRate + "%",
                    "优化收银台流程，对未支付订单做站内提醒", "支付转化 " + payRate + "%");
        }
        else if (orders > 0)
        {
            finding(findings, "good", "支付转化顺畅",
                    "下单 " + orders + " 单、成交 " + paidOrders + " 单，支付转化 " + payRate + "%",
                    "可针对高客单价订单增加组合优惠", "支付转化 " + payRate + "%");
        }

        final Map<String, Integer> rank = new HashMap<>();
        rank.put("alert", 0); rank.put("warn", 1); rank.put("info", 2); rank.put("good", 3);
        findings.sort((a, b) -> Integer.compare(
                rank.getOrDefault(String.valueOf(a.get("level")), 9),
                rank.getOrDefault(String.valueOf(b.get("level")), 9)));

        // 最弱 / 最强维度，用于一句话总结
        Map<String, Object> weakest = radar.get(0);
        Map<String, Object> strongest = radar.get(0);
        for (Map<String, Object> r : radar)
        {
            if (num(r.get("value")).intValue() < num(weakest.get("value")).intValue()) weakest = r;
            if (num(r.get("value")).intValue() > num(strongest.get("value")).intValue()) strongest = r;
        }
        String narrative = "近 " + span + " 天经营健康分 " + score + " 分（" + grade + "）。"
                + "五维中「" + strongest.get("name") + "」表现最好（" + strongest.get("value") + " 分），"
                + "「" + weakest.get("name") + "」最需关注（" + weakest.get("value") + " 分）。"
                + "本期新增客户 " + newUsers + " 人（环比 " + growth + "%）、复购率 " + repeatRate
                + "%、好评率 " + goodRate + "%、服务完成率 " + finishRate + "%、平均客单价 ¥" + avgOrder + "。"
                + "系统共生成 " + findings.size() + " 条诊断结论，建议优先处理高等级项。";

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("newUsers", newUsers);
        metrics.put("prevNewUsers", prevNewUsers);
        metrics.put("growth", growth);
        metrics.put("paidUsers", paidUsers);
        metrics.put("repeatRate", repeatRate);
        metrics.put("prevRepeatRate", prevRepeat);
        metrics.put("goodRate", goodRate);
        metrics.put("prevGoodRate", prevGood);
        metrics.put("lowStarRate", lowRate);
        metrics.put("scoreComments", scoreComments);
        metrics.put("serviceFinishRate", finishRate);
        metrics.put("serviceTotal", serviceTotal);
        metrics.put("avgOrderAmount", avgOrder);
        metrics.put("topStore", topStore);
        metrics.put("topStoreShare", topShare);
        metrics.put("storeCount", stores.size());
        metrics.put("payRate", payRate);
        metrics.put("orders", orders);
        metrics.put("paidOrders", paidOrders);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt", LocalDateTime.now().format(DATETIME_FMT));
        result.put("range", range(span, startDate, today));
        result.put("score", score);
        result.put("grade", grade);
        result.put("radar", radar);
        result.put("findings", findings);
        result.put("metrics", metrics);
        result.put("narrative", narrative);
        return result;
    }

    private static int clampScore(double value)
    {
        return (int) Math.max(0, Math.min(100, Math.round(value)));
    }

    private static Map<String, Object> radarItem(String name, int value, String desc)
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("value", value);
        m.put("desc", desc);
        return m;
    }

    private static void finding(List<Map<String, Object>> list, String level, String title,
                                String detail, String suggestion, String metric)
    {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("level", level);
        f.put("title", title);
        f.put("detail", detail);
        f.put("suggestion", suggestion);
        f.put("metric", metric);
        list.add(f);
    }

    /**
     * 门店展示大屏（游客可读）：累计口径的好评 / 复购 / 口碑数据
     */
    public Map<String, Object> display()
    {
        LocalDate today = LocalDate.now();
        String start = "2000-01-01 00:00:00";
        String end = today.plusDays(1L).atStartOfDay().format(DATETIME_FMT);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt", LocalDateTime.now().format(DATETIME_FMT));
        result.put("kpi", bigscreenKpi(start, end));
        result.put("funnel", normalize(dashboardMapper.selectFunnel(start, end)));
        result.put("wallet", normalize(dashboardMapper.selectWallet()));

        Map<String, Object> rating = rating(start, end);
        long weighted = 0;
        long total = 0;
        for (Map<String, Object> item : (List<Map<String, Object>>) rating.get("dist"))
        {
            long v = num(item.get("value")).longValue();
            int score = Integer.parseInt(String.valueOf(item.get("name")).replace(" 星", ""));
            weighted += v * score;
            total += v;
        }
        rating.put("avgScore", total == 0 ? 0 : round(weighted * 1.0 / total, 1));
        result.put("rating", rating);
        result.put("goodComments", normalize(dashboardMapper.selectTopGoodComments()));

        // 评分走势 / 品类评分 / 门店评分
        result.put("ratingTrend", normalize(dashboardMapper.selectRatingTrend()));
        result.put("categoryRating", normalize(dashboardMapper.selectCategoryRating()));
        result.put("storeRating", normalize(dashboardMapper.selectStoreRating()));

        // 复购客户统计
        result.put("repeatStats", normalize(dashboardMapper.selectRepeatStats()));

        // 服务项目热度 TOP（顾客最关心的服务）
        result.put("services", normalize(dashboardMapper.selectTopServices(start, end)));

        // 好评关键词（过滤 0 命中，按命中次数降序）
        List<Map<String, Object>> keywords = new ArrayList<>();
        for (Map<String, Object> row : dashboardMapper.selectKeywordHits())
        {
            long hits = num(row.get("hits")).longValue();
            if (hits <= 0) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("word", row.get("word"));
            item.put("hits", hits);
            keywords.add(item);
        }
        keywords.sort((a, b) -> Long.compare(num(b.get("hits")).longValue(), num(a.get("hits")).longValue()));
        result.put("keywords", keywords);

        Map<String, Object> recent = normalize(dashboardMapper.selectRecentCommentCount());
        result.put("recentCommentCount", num(recent.get("c")).longValue());
        return result;
    }

    // ------------------------------------------------------------------ 大屏

    private Map<String, Object> bigscreenKpi(String start, String end)
    {
        Map<String, Object> raw = normalize(dashboardMapper.selectBigscreenKpi(start, end));
        long newUsers = num(raw.get("newUsers")).longValue();
        long repeatUsers = num(raw.get("repeatUsers")).longValue();
        long paidUsers = num(raw.get("paidUsers")).longValue();
        long goodComments = num(raw.get("goodComments")).longValue();
        long scoreComments = num(raw.get("scoreComments")).longValue();
        long serviceFinished = num(raw.get("serviceFinished")).longValue();
        long serviceTotal = num(raw.get("serviceTotal")).longValue();

        Map<String, Object> k = new LinkedHashMap<>();
        k.put("newUsers", newUsers);
        k.put("repeatRate", paidUsers == 0 ? 0 : round(repeatUsers * 100.0 / paidUsers, 1));
        k.put("paidUsers", paidUsers);
        k.put("goodRate", scoreComments == 0 ? 0 : round(goodComments * 100.0 / scoreComments, 1));
        k.put("scoreComments", scoreComments);
        k.put("avgOrderAmount", round(num(raw.get("avgOrderAmount")).doubleValue(), 2));
        k.put("serviceFinishRate", serviceTotal == 0 ? 0 : round(serviceFinished * 100.0 / serviceTotal, 1));
        k.put("serviceTotal", serviceTotal);
        return k;
    }

    private Map<String, Object> newUserTrend(LocalDate startDate, LocalDate endDate, String start, String end)
    {
        List<Map<String, Object>> rows = dashboardMapper.selectNewUserTrend(start, end);
        Map<String, Map<String, Object>> byDate = new HashMap<>();
        for (Map<String, Object> row : rows)
        {
            byDate.put(String.valueOf(row.get("d")), row);
        }
        List<String> dates = new ArrayList<>();
        List<Long> newUsers = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1))
        {
            String key = d.format(DATE_FMT);
            Map<String, Object> row = byDate.get(key);
            dates.add(key);
            newUsers.add(row == null ? 0L : num(row.get("c")).longValue());
        }
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("dates", dates);
        t.put("newUsers", newUsers);
        return t;
    }

    private Map<String, Object> rating(String start, String end)
    {
        List<Map<String, Object>> rows = dashboardMapper.selectRatingDist(start, end);
        Map<Integer, Long> byScore = new HashMap<>();
        for (Map<String, Object> row : rows)
        {
            byScore.put(num(row.get("score")).intValue(), num(row.get("c")).longValue());
        }
        List<Map<String, Object>> list = new ArrayList<>();
        long total = 0;
        for (int score = 5; score >= 1; score--)
        {
            long c = byScore.getOrDefault(score, 0L);
            total += c;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", score + " 星");
            item.put("value", c);
            list.add(item);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("dist", list);
        r.put("total", total);
        return r;
    }

    private List<Map<String, Object>> serviceMode(String start, String end)
    {
        List<Map<String, Object>> rows = dashboardMapper.selectServiceMode(start, end);
        Map<String, String> labels = new HashMap<>();
        labels.put("1", "到店服务");
        labels.put("2", "上门服务");
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map<String, Object> row : rows)
        {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", labels.getOrDefault(String.valueOf(row.get("mode")), "其他"));
            item.put("value", num(row.get("c")).longValue());
            list.add(item);
        }
        return list;
    }

    // ------------------------------------------------------------------ 汇总

    private Map<String, Object> overview(Map<String, Object> cur, Map<String, Object> prev)
    {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("totalPets", num(cur.get("totalPets")).longValue());
        o.put("totalCategories", num(cur.get("totalCategories")).longValue());
        o.put("totalUsers", num(cur.get("totalUsers")).longValue());

        long appointments = num(cur.get("appointments")).longValue();
        long orders = num(cur.get("orders")).longValue();
        double revenue = round(num(cur.get("revenue")).doubleValue(), 2);
        long consults = num(cur.get("consults")).longValue();
        long favorites = num(cur.get("favorites")).longValue();
        long comments = num(cur.get("comments")).longValue();
        long likes = num(cur.get("likes")).longValue();
        long cancels = num(cur.get("cancels")).longValue();
        long cancelledAppointments = num(cur.get("cancelledAppointments")).longValue();
        long cancelledOrders = num(cur.get("cancelledOrders")).longValue();

        o.put("appointments", appointments);
        o.put("orders", orders);
        o.put("revenue", revenue);
        o.put("consults", consults);
        o.put("favorites", favorites);
        o.put("comments", comments);
        o.put("likes", likes);
        o.put("cancels", cancels);
        o.put("cancelledAppointments", cancelledAppointments);
        o.put("cancelledOrders", cancelledOrders);
        o.put("activeUsers", num(cur.get("activeUsers")).longValue());
        o.put("avgOrderAmount", round(num(cur.get("avgOrderAmount")).doubleValue(), 2));
        o.put("pendingAppointments", num(cur.get("pendingAppointments")).longValue());
        o.put("pendingConsults", num(cur.get("pendingConsults")).longValue());
        o.put("pendingOrders", num(cur.get("pendingOrders")).longValue());

        long totalBusiness = appointments + orders;
        o.put("cancelRate", totalBusiness == 0 ? 0
                : round((cancelledAppointments + cancelledOrders) * 100.0 / totalBusiness, 1));

        Map<String, Object> growth = new LinkedHashMap<>();
        growth.put("appointments", growth(appointments, num(prev.get("appointments")).doubleValue()));
        growth.put("orders", growth(orders, num(prev.get("orders")).doubleValue()));
        growth.put("revenue", growth(revenue, num(prev.get("revenue")).doubleValue()));
        growth.put("consults", growth(consults, num(prev.get("consults")).doubleValue()));
        growth.put("favorites", growth(favorites, num(prev.get("favorites")).doubleValue()));
        growth.put("comments", growth(comments, num(prev.get("comments")).doubleValue()));
        o.put("growth", growth);
        return o;
    }

    private Map<String, Object> range(int days, LocalDate start, LocalDate end)
    {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("days", days);
        r.put("start", start.format(DATE_FMT));
        r.put("end", end.format(DATE_FMT));
        return r;
    }

    // ------------------------------------------------------------------ 趋势

    private Map<String, Object> trend(LocalDate startDate, LocalDate endDate, String start, String end)
    {
        List<Map<String, Object>> rows = dashboardMapper.selectDailyTrend(start, end);
        Map<String, Map<String, Object>> byDate = new HashMap<>();
        for (Map<String, Object> row : rows)
        {
            byDate.put(String.valueOf(row.get("d")), row);
        }

        List<String> dates = new ArrayList<>();
        List<Long> appointments = new ArrayList<>();
        List<Long> validAppointments = new ArrayList<>();
        List<Long> orders = new ArrayList<>();
        List<Double> revenue = new ArrayList<>();
        List<Long> cancelledOrders = new ArrayList<>();
        List<Long> consults = new ArrayList<>();
        List<Long> favorites = new ArrayList<>();
        List<Long> comments = new ArrayList<>();
        List<Long> likes = new ArrayList<>();

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1))
        {
            String key = d.format(DATE_FMT);
            Map<String, Object> row = byDate.get(key);
            dates.add(key);
            appointments.add(row == null ? 0L : num(row.get("appointments")).longValue());
            validAppointments.add(row == null ? 0L : num(row.get("validAppointments")).longValue());
            orders.add(row == null ? 0L : num(row.get("orders")).longValue());
            revenue.add(row == null ? 0D : round(num(row.get("revenue")).doubleValue(), 2));
            cancelledOrders.add(row == null ? 0L : num(row.get("cancelledOrders")).longValue());
            consults.add(row == null ? 0L : num(row.get("consults")).longValue());
            favorites.add(row == null ? 0L : num(row.get("favorites")).longValue());
            comments.add(row == null ? 0L : num(row.get("comments")).longValue());
            likes.add(row == null ? 0L : num(row.get("likes")).longValue());
        }

        Map<String, Object> t = new LinkedHashMap<>();
        t.put("dates", dates);
        t.put("appointments", appointments);
        t.put("validAppointments", validAppointments);
        t.put("orders", orders);
        t.put("revenue", revenue);
        t.put("cancelledOrders", cancelledOrders);
        t.put("consults", consults);
        t.put("favorites", favorites);
        t.put("comments", comments);
        t.put("likes", likes);
        t.put("peakRevenue", revenue.stream().mapToDouble(Double::doubleValue).max().orElse(0D));
        return t;
    }

    // ------------------------------------------------------------------ 分布

    private Map<String, Object> distribution(String start, String end)
    {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("appointmentStatus", statusList(dashboardMapper.selectAppointmentStatus(start, end),
                new String[] { "0", "1", "2", "3" }, APPOINTMENT_LABELS));
        d.put("orderStatus", statusList(dashboardMapper.selectOrderStatus(start, end),
                new String[] { "0", "3" }, ORDER_LABELS));
        d.put("category", normalize(dashboardMapper.selectCategoryDistribution()));
        d.put("payMethods", normalize(dashboardMapper.selectPayMethod(start, end)));
        d.put("cancelReasons", normalize(dashboardMapper.selectCancelReasons(start, end)));
        return d;
    }

    private List<Map<String, Object>> statusList(List<Map<String, Object>> rows, String[] codes, String[] labels)
    {
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : rows)
        {
            counts.put(String.valueOf(row.get("status")), num(row.get("c")).longValue());
        }
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < codes.length; i++)
        {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", labels[i]);
            item.put("value", counts.getOrDefault(codes[i], 0L));
            list.add(item);
        }
        return list;
    }

    // ------------------------------------------------------------------ 排行

    private Map<String, Object> ranking(String start, String end)
    {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("pets", normalize(dashboardMapper.selectTopPets(start, end)));
        r.put("goods", normalize(dashboardMapper.selectTopGoods(start, end)));
        r.put("services", normalize(dashboardMapper.selectTopServices(start, end)));
        return r;
    }

    private Map<String, Object> hourly(String start, String end)
    {
        List<Map<String, Object>> rows = dashboardMapper.selectHourly(start, end);
        Map<Integer, Map<String, Object>> byHour = new HashMap<>();
        for (Map<String, Object> row : rows)
        {
            byHour.put(num(row.get("hour")).intValue(), row);
        }
        List<Integer> hours = new ArrayList<>();
        List<Long> orders = new ArrayList<>();
        List<Long> appointments = new ArrayList<>();
        for (int h = 0; h < 24; h++)
        {
            Map<String, Object> row = byHour.get(h);
            hours.add(h);
            orders.add(row == null ? 0L : num(row.get("orders")).longValue());
            appointments.add(row == null ? 0L : num(row.get("appointments")).longValue());
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hours", hours);
        result.put("orders", orders);
        result.put("appointments", appointments);
        return result;
    }

    // ------------------------------------------------------------------ 工具

    private List<Map<String, Object>> normalizeFeed(List<Map<String, Object>> rows)
    {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map<String, Object> row : rows)
        {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", row.get("type"));
            item.put("title", row.get("title"));
            item.put("status", row.get("status"));
            item.put("amount", row.get("amount") == null ? null : round(num(row.get("amount")).doubleValue(), 2));
            Object time = row.get("event_time");
            item.put("time", time == null ? "" : String.valueOf(time).substring(0, Math.min(19, String.valueOf(time).length())));
            list.add(item);
        }
        return list;
    }

    private List<Map<String, Object>> normalize(List<Map<String, Object>> rows)
    {
        List<Map<String, Object>> list = new ArrayList<>();
        if (rows == null)
        {
            return list;
        }
        for (Map<String, Object> row : rows)
        {
            Map<String, Object> item = new LinkedHashMap<>();
            for (Map.Entry<String, Object> e : row.entrySet())
            {
                Object v = e.getValue();
                item.put(e.getKey(), v instanceof BigDecimal ? ((BigDecimal) v).doubleValue() : v);
            }
            list.add(item);
        }
        return list;
    }

    private Map<String, Object> normalize(Map<String, Object> row)
    {
        Map<String, Object> item = new LinkedHashMap<>();
        if (row != null)
        {
            for (Map.Entry<String, Object> e : row.entrySet())
            {
                Object v = e.getValue();
                item.put(e.getKey(), v instanceof BigDecimal ? ((BigDecimal) v).doubleValue() : v);
            }
        }
        return item;
    }

    private Number num(Object value)
    {
        if (value == null)
        {
            return 0;
        }
        if (value instanceof Number)
        {
            return (Number) value;
        }
        try
        {
            return new BigDecimal(String.valueOf(value));
        }
        catch (NumberFormatException e)
        {
            return 0;
        }
    }

    private Double growth(double current, double previous)
    {
        if (previous == 0D)
        {
            // 上期无数据时无法计算环比，返回 null 让前端不展示环比徽标
            return current == 0D ? 0D : null;
        }
        return round((current - previous) * 100D / previous, 1);
    }

    private double round(double value, int scale)
    {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }
}
