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
