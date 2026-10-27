package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 数据看板统计 Mapper
 *
 * 所有指标均由业务表实时聚合得出，不做任何硬编码；
 * 时间区间统一使用 [start, end) 左闭右开，便于按天/按小时分组。
 *
 * @author ruoyi
 */
public interface PetDashboardMapper
{
    /**
     * 区间汇总指标（含上期对比所需的原始值）
     */
    @Select("SELECT "
            + "(SELECT COUNT(*) FROM pet_info) AS totalPets, "
            + "(SELECT COUNT(*) FROM pet_category) AS totalCategories, "
            + "(SELECT COUNT(*) FROM sys_user WHERE del_flag = '0') AS totalUsers, "
            + "(SELECT COUNT(*) FROM pet_appointment WHERE create_time >= #{start} AND create_time < #{end}) AS appointments, "
            + "(SELECT COUNT(*) FROM pet_appointment WHERE create_time >= #{start} AND create_time < #{end} AND status = '3') AS cancelledAppointments, "
            + "(SELECT COUNT(*) FROM pet_order WHERE create_time >= #{start} AND create_time < #{end}) AS orders, "
            + "(SELECT COUNT(*) FROM pet_order WHERE create_time >= #{start} AND create_time < #{end} AND status = '3') AS cancelledOrders, "
            + "(SELECT IFNULL(SUM(pay_amount),0) FROM pet_order WHERE create_time >= #{start} AND create_time < #{end} AND status <> '3') AS revenue, "
            + "(SELECT COUNT(*) FROM pet_consult WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end}) AS consults, "
            + "(SELECT COUNT(*) FROM pet_favorite WHERE create_time >= #{start} AND create_time < #{end}) AS favorites, "
            + "(SELECT COUNT(*) FROM pet_comment WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end}) AS comments, "
            + "(SELECT COUNT(*) FROM pet_like WHERE create_time >= #{start} AND create_time < #{end}) AS likes, "
            + "(SELECT COUNT(*) FROM pet_cancel_record WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end}) AS cancels, "
            + "(SELECT COUNT(DISTINCT uid) FROM ( "
            + "   SELECT user_id AS uid FROM pet_order WHERE create_time >= #{start} AND create_time < #{end} AND user_id IS NOT NULL "
            + "   UNION ALL SELECT user_id FROM pet_appointment WHERE create_time >= #{start} AND create_time < #{end} "
            + "   UNION ALL SELECT user_id FROM pet_consult WHERE create_time >= #{start} AND create_time < #{end} "
            + ") u) AS activeUsers, "
            + "(SELECT IFNULL(AVG(pay_amount),0) FROM pet_order WHERE create_time >= #{start} AND create_time < #{end} AND status <> '3') AS avgOrderAmount, "
            + "(SELECT COUNT(*) FROM pet_appointment WHERE status = '0') AS pendingAppointments, "
            + "(SELECT COUNT(*) FROM pet_consult WHERE status = '0' AND del_flag = '0') AS pendingConsults, "
            + "(SELECT COUNT(*) FROM pet_order WHERE status IN ('0','1')) AS pendingOrders")
    Map<String, Object> selectSummary(@Param("start") String start, @Param("end") String end);

    /**
     * 今日实时指标
     */
    @Select("SELECT "
            + "(SELECT COUNT(*) FROM pet_appointment WHERE DATE(create_time) = CURDATE()) AS todayAppointments, "
            + "(SELECT COUNT(*) FROM pet_order WHERE DATE(create_time) = CURDATE()) AS todayOrders, "
            + "(SELECT IFNULL(SUM(pay_amount),0) FROM pet_order WHERE DATE(create_time) = CURDATE() AND status <> '3') AS todayRevenue, "
            + "(SELECT COUNT(*) FROM pet_consult WHERE DATE(create_time) = CURDATE() AND del_flag = '0') AS todayConsults, "
            + "(SELECT COUNT(*) FROM pet_favorite WHERE DATE(create_time) = CURDATE()) AS todayFavorites, "
            + "(SELECT COUNT(*) FROM pet_cancel_record WHERE DATE(create_time) = CURDATE() AND del_flag = '0') AS todayCancels")
    Map<String, Object> selectToday();

    /**
     * 按天趋势（多指标一次查回，避免多次往返）
     */
    @Select("SELECT DATE(t.create_time) AS d, "
            + "SUM(t.apt) AS appointments, SUM(t.aptValid) AS validAppointments, "
            + "SUM(t.ord) AS orders, SUM(t.rev) AS revenue, SUM(t.cancelOrd) AS cancelledOrders, "
            + "SUM(t.cons) AS consults, "
            + "SUM(t.fav) AS favorites, SUM(t.cmt) AS comments, SUM(t.lk) AS likes "
            + "FROM ( "
            + "  SELECT create_time, 1 AS apt, IF(status <> '3', 1, 0) AS aptValid, 0 AS ord, 0 AS rev, 0 AS cancelOrd, 0 AS cons, 0 AS fav, 0 AS cmt, 0 AS lk "
            + "    FROM pet_appointment WHERE create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT create_time, 0, 0, 1, IF(status <> '3', IFNULL(pay_amount,0), 0), IF(status = '3', 1, 0), 0, 0, 0, 0 "
            + "    FROM pet_order WHERE create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT create_time, 0, 0, 0, 0, 0, 1, 0, 0, 0 "
            + "    FROM pet_consult WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT create_time, 0, 0, 0, 0, 0, 0, 1, 0, 0 "
            + "    FROM pet_favorite WHERE create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT create_time, 0, 0, 0, 0, 0, 0, 0, 1, 0 "
            + "    FROM pet_comment WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT create_time, 0, 0, 0, 0, 0, 0, 0, 0, 1 "
            + "    FROM pet_like WHERE create_time >= #{start} AND create_time < #{end} "
            + ") t GROUP BY DATE(t.create_time) ORDER BY d")
    List<Map<String, Object>> selectDailyTrend(@Param("start") String start, @Param("end") String end);

    /**
     * 预约状态分布
     */
    @Select("SELECT status, COUNT(*) AS c FROM pet_appointment "
            + "WHERE create_time >= #{start} AND create_time < #{end} GROUP BY status")
    List<Map<String, Object>> selectAppointmentStatus(@Param("start") String start, @Param("end") String end);

    /**
     * 订单状态分布
     */
    @Select("SELECT status, COUNT(*) AS c FROM pet_order "
            + "WHERE create_time >= #{start} AND create_time < #{end} GROUP BY status")
    List<Map<String, Object>> selectOrderStatus(@Param("start") String start, @Param("end") String end);

    /**
     * 宠物分类库存分布
     */
    @Select("SELECT c.category_name AS name, COUNT(p.pet_id) AS value "
            + "FROM pet_category c LEFT JOIN pet_info p ON p.category_id = c.category_id "
            + "GROUP BY c.category_id, c.category_name ORDER BY c.sort")
    List<Map<String, Object>> selectCategoryDistribution();

    /**
     * 预约热度榜（宠物）
     */
    @Select("SELECT p.pet_name AS name, COUNT(*) AS value, MAX(p.price) AS price "
            + "FROM pet_appointment a JOIN pet_info p ON p.pet_id = a.pet_id "
            + "WHERE a.create_time >= #{start} AND a.create_time < #{end} "
            + "GROUP BY p.pet_id, p.pet_name ORDER BY value DESC, p.pet_id LIMIT 8")
    List<Map<String, Object>> selectTopPets(@Param("start") String start, @Param("end") String end);

    /**
     * 热销商品榜（按成交金额）
     */
    @Select("SELECT i.goods_name AS name, IFNULL(SUM(i.amount),0) AS amount, COUNT(DISTINCT i.order_no) AS orders, IFNULL(SUM(i.qty),0) AS qty "
            + "FROM pet_order_item i JOIN pet_order o ON o.order_no = i.order_no "
            + "WHERE o.status <> '3' AND o.create_time >= #{start} AND o.create_time < #{end} "
            + "GROUP BY i.goods_name ORDER BY amount DESC LIMIT 8")
    List<Map<String, Object>> selectTopGoods(@Param("start") String start, @Param("end") String end);

    /**
     * 24 小时活跃分布（下单 + 预约）
     */
    @Select("SELECT t.h AS hour, SUM(t.ord) AS orders, SUM(t.apt) AS appointments FROM ( "
            + "  SELECT HOUR(create_time) AS h, 1 AS ord, 0 AS apt FROM pet_order "
            + "    WHERE create_time >= #{start} AND create_time < #{end} "
            + "  UNION ALL "
            + "  SELECT HOUR(create_time) AS h, 0, 1 FROM pet_appointment "
            + "    WHERE create_time >= #{start} AND create_time < #{end} "
            + ") t GROUP BY t.h ORDER BY hour")
    List<Map<String, Object>> selectHourly(@Param("start") String start, @Param("end") String end);

    /**
     * 实时动态：最近业务事件（预约 / 订单 / 咨询 / 医生问答 / 取消）
     */
    @Select("SELECT * FROM ( "
            + "  (SELECT 'appointment' AS type, CONCAT('新预约 · ', IFNULL(p.pet_name,'宠物')) AS title, "
            + "          a.create_time AS event_time, a.status AS status, NULL AS amount "
            + "     FROM pet_appointment a LEFT JOIN pet_info p ON p.pet_id = a.pet_id "
            + "     ORDER BY a.create_time DESC LIMIT 8) "
            + "  UNION ALL "
            + "  (SELECT 'order' AS type, CONCAT('新订单 · ', IFNULL(i.goods_name, CONCAT(o.item_count, ' 件商品'))) AS title, "
            + "          o.create_time AS event_time, o.status AS status, o.pay_amount AS amount "
            + "     FROM pet_order o LEFT JOIN pet_order_item i ON i.order_no = o.order_no AND i.item_id = (SELECT MIN(item_id) FROM pet_order_item WHERE order_no = o.order_no) "
            + "     ORDER BY o.create_time DESC LIMIT 8) "
            + "  UNION ALL "
            + "  (SELECT 'consult' AS type, CONCAT('在线咨询 · ', LEFT(question, 20)) AS title, "
            + "          create_time AS event_time, status AS status, NULL AS amount "
            + "     FROM pet_consult WHERE del_flag = '0' ORDER BY create_time DESC LIMIT 8) "
            + "  UNION ALL "
            + "  (SELECT 'cancel' AS type, CONCAT('取消', IF(target_type = 'order', '订单', '预约'), ' · ', IFNULL(target_name,'')) AS title, "
            + "          create_time AS event_time, '3' AS status, NULL AS amount "
            + "     FROM pet_cancel_record WHERE del_flag = '0' ORDER BY create_time DESC LIMIT 8) "
            + ") t ORDER BY event_time DESC LIMIT 14")
    List<Map<String, Object>> selectRealtimeFeed();
}
