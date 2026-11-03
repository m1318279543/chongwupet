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
     * 支付方式分布（已支付且有效的商城订单）
     */
    @Select("SELECT IFNULL(pay_method,'other') AS name, COUNT(*) AS value, IFNULL(SUM(pay_amount),0) AS amount "
            + "FROM pet_order WHERE pay_status = '1' AND status <> '3' "
            + "AND create_time >= #{start} AND create_time < #{end} "
            + "GROUP BY pay_method ORDER BY value DESC")
    List<Map<String, Object>> selectPayMethod(@Param("start") String start, @Param("end") String end);

    /**
     * 服务项目热度榜（门店服务工单）
     */
    @Select("SELECT item_name AS name, COUNT(*) AS value, IFNULL(SUM(total_amount),0) AS amount "
            + "FROM pet_service_order WHERE status <> '3' "
            + "AND create_time >= #{start} AND create_time < #{end} "
            + "GROUP BY item_name ORDER BY value DESC LIMIT 8")
    List<Map<String, Object>> selectTopServices(@Param("start") String start, @Param("end") String end);

    /**
     * 取消原因 TOP（取消记录快照）
     */
    @Select("SELECT LEFT(IFNULL(NULLIF(TRIM(reason),''),'未填写'), 12) AS name, COUNT(*) AS value "
            + "FROM pet_cancel_record WHERE del_flag = '0' "
            + "AND create_time >= #{start} AND create_time < #{end} "
            + "GROUP BY name ORDER BY value DESC LIMIT 6")
    List<Map<String, Object>> selectCancelReasons(@Param("start") String start, @Param("end") String end);

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

    // ------------------------------------------------------------------ 大屏专属（与看板内容错开）

    /**
     * 大屏 KPI：新增客户 / 复购率 / 好评率 / 服务完成率 / 客单价（区间）
     */
    @Select("SELECT "
            + "(SELECT COUNT(*) FROM sys_user WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end}) AS newUsers, "
            + "(SELECT COUNT(*) FROM (SELECT user_id FROM pet_order WHERE pay_status = '1' AND status <> '3' AND user_id IS NOT NULL "
            + "   AND create_time >= #{start} AND create_time < #{end} GROUP BY user_id HAVING COUNT(DISTINCT order_no) >= 2) t) AS repeatUsers, "
            + "(SELECT COUNT(DISTINCT user_id) FROM pet_order WHERE pay_status = '1' AND status <> '3' AND user_id IS NOT NULL "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS paidUsers, "
            + "(SELECT IFNULL(SUM(CASE WHEN score >= 4 THEN 1 ELSE 0 END),0) FROM pet_comment WHERE score IS NOT NULL AND status = '0' AND del_flag = '0' "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS goodComments, "
            + "(SELECT COUNT(*) FROM pet_comment WHERE score IS NOT NULL AND status = '0' AND del_flag = '0' "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS scoreComments, "
            + "(SELECT IFNULL(AVG(pay_amount),0) FROM pet_order WHERE pay_status = '1' AND status <> '3' "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS avgOrderAmount, "
            + "(SELECT IFNULL(SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END),0) FROM pet_service_order WHERE status <> '3' "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS serviceFinished, "
            + "(SELECT COUNT(*) FROM pet_service_order WHERE status <> '3' "
            + "   AND create_time >= #{start} AND create_time < #{end}) AS serviceTotal")
    Map<String, Object> selectBigscreenKpi(@Param("start") String start, @Param("end") String end);

    /**
     * 新增客户按天趋势（大屏：客户增长）
     */
    @Select("SELECT DATE(create_time) AS d, COUNT(*) AS c FROM sys_user "
            + "WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end} "
            + "GROUP BY DATE(create_time) ORDER BY d")
    List<Map<String, Object>> selectNewUserTrend(@Param("start") String start, @Param("end") String end);

    /**
     * 会员钱包：会员数与总余额（大屏：会员资产）
     */
    @Select("SELECT COUNT(*) AS users, IFNULL(SUM(balance),0) AS balance FROM pet_wallet")
    Map<String, Object> selectWallet();

    /**
     * 经营转化漏斗：咨询 → 下单 → 支付成交（区间）
     */
    @Select("SELECT "
            + "(SELECT COUNT(*) FROM pet_consult WHERE del_flag = '0' AND create_time >= #{start} AND create_time < #{end}) AS consults, "
            + "(SELECT COUNT(*) FROM pet_order WHERE status <> '3' AND create_time >= #{start} AND create_time < #{end}) AS orders, "
            + "(SELECT COUNT(*) FROM pet_order WHERE pay_status = '1' AND status <> '3' AND create_time >= #{start} AND create_time < #{end}) AS paidOrders")
    Map<String, Object> selectFunnel(@Param("start") String start, @Param("end") String end);

    /**
     * 门店经营对比：各门店营业额 / 订单 / 预约 / 服务工单（大屏专属）
     */
    @Select("SELECT s.store_id AS storeId, s.store_name AS storeName, "
            + "(SELECT IFNULL(SUM(o.pay_amount),0) FROM pet_order o WHERE o.store_id = s.store_id AND o.pay_status = '1' AND o.status <> '3' "
            + "   AND o.create_time >= #{start} AND o.create_time < #{end}) AS revenue, "
            + "(SELECT COUNT(*) FROM pet_order o WHERE o.store_id = s.store_id AND o.status <> '3' "
            + "   AND o.create_time >= #{start} AND o.create_time < #{end}) AS orders, "
            + "(SELECT COUNT(*) FROM pet_appointment a WHERE a.store_id = s.store_id "
            + "   AND a.create_time >= #{start} AND a.create_time < #{end}) AS appointments, "
            + "(SELECT COUNT(*) FROM pet_service_order so WHERE so.store_id = s.store_id "
            + "   AND so.create_time >= #{start} AND so.create_time < #{end}) AS serviceOrders "
            + "FROM pet_store s WHERE s.del_flag = '0' ORDER BY revenue DESC")
    List<Map<String, Object>> selectStoreCompare(@Param("start") String start, @Param("end") String end);

    /**
     * 评分满意度分布（1~5 星，区间）
     */
    @Select("SELECT score, COUNT(*) AS c FROM pet_comment WHERE score IS NOT NULL AND status = '0' AND del_flag = '0' "
            + "AND create_time >= #{start} AND create_time < #{end} GROUP BY score")
    List<Map<String, Object>> selectRatingDist(@Param("start") String start, @Param("end") String end);

    /**
     * 服务模式占比：到店 / 上门（区间）
     */
    @Select("SELECT IFNULL(service_mode, '1') AS mode, COUNT(*) AS c FROM pet_service_order "
            + "WHERE create_time >= #{start} AND create_time < #{end} GROUP BY service_mode")
    List<Map<String, Object>> selectServiceMode(@Param("start") String start, @Param("end") String end);

    /**
     * 最新顾客评价（全类型顶级评论，大屏滚动展示）
     */
    @Select("SELECT c.score AS score, c.content AS content, c.create_time AS createTime, "
            + "c.target_type AS targetType, IFNULL(u.nick_name, u.user_name) AS userName, p.pet_name AS petName "
            + "FROM pet_comment c "
            + "LEFT JOIN sys_user u ON u.user_id = c.user_id "
            + "LEFT JOIN pet_info p ON p.pet_id = c.pet_id "
            + "WHERE c.status = '0' AND c.del_flag = '0' AND c.parent_id = 0 "
            + "ORDER BY c.comment_id DESC LIMIT 12")
    List<Map<String, Object>> selectLatestComments();

    /**
     * 门店展示大屏：最新好评（4~5 星顶级评论）
     */
    @Select("SELECT c.score AS score, c.content AS content, c.create_time AS createTime, "
            + "IFNULL(u.nick_name, u.user_name) AS userName, p.pet_name AS petName "
            + "FROM pet_comment c "
            + "LEFT JOIN sys_user u ON u.user_id = c.user_id "
            + "LEFT JOIN pet_info p ON p.pet_id = c.pet_id "
            + "WHERE c.status = '0' AND c.del_flag = '0' AND c.parent_id = 0 AND c.score >= 4 "
            + "ORDER BY c.comment_id DESC LIMIT 10")
    List<Map<String, Object>> selectTopGoodComments();

    /**
     * 展示大屏：评分走势（近 12 周，每周平均分 + 评价数）
     */
    @Select("SELECT MIN(DATE(create_time)) AS startDate, ROUND(AVG(score), 2) AS avgScore, COUNT(*) AS total "
            + "FROM pet_comment WHERE score IS NOT NULL AND status = '0' AND del_flag = '0' "
            + "AND create_time >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK) "
            + "GROUP BY YEARWEEK(create_time, 1) ORDER BY startDate")
    List<Map<String, Object>> selectRatingTrend();

    /**
     * 展示大屏：按宠物品类的评分排行
     */
    @Select("SELECT cat.category_name AS name, ROUND(AVG(c.score), 1) AS score, COUNT(*) AS total "
            + "FROM pet_comment c JOIN pet_info p ON p.pet_id = c.pet_id "
            + "JOIN pet_category cat ON cat.category_id = p.category_id "
            + "WHERE c.score IS NOT NULL AND c.status = '0' AND c.del_flag = '0' AND c.target_type = 'pet' "
            + "GROUP BY cat.category_id, cat.category_name ORDER BY score DESC, total DESC LIMIT 6")
    List<Map<String, Object>> selectCategoryRating();

    /**
     * 展示大屏：客户下单次数分布（1 单 / 2 单 / 3 单及以上）
     */
    @Select("SELECT t.cnt AS orders, COUNT(*) AS users FROM ("
            + "SELECT user_id, COUNT(*) AS cnt FROM pet_order "
            + "WHERE pay_status = '1' AND status <> '3' AND user_id IS NOT NULL GROUP BY user_id"
            + ") t GROUP BY t.cnt ORDER BY t.cnt")
    List<Map<String, Object>> selectRepeatDist();

    /**
     * 展示大屏：门店评分排行
     */
    @Select("SELECT s.store_name AS name, ROUND(AVG(c.score), 1) AS score, COUNT(*) AS total "
            + "FROM pet_comment c JOIN pet_info p ON p.pet_id = c.pet_id "
            + "JOIN pet_store s ON s.store_id = p.store_id "
            + "WHERE c.score IS NOT NULL AND c.status = '0' AND c.del_flag = '0' AND c.target_type = 'pet' "
            + "GROUP BY s.store_id, s.store_name ORDER BY score DESC, total DESC LIMIT 6")
    List<Map<String, Object>> selectStoreRating();

    /**
     * 展示大屏：好评关键词命中次数（固定词典，真实统计评论内容）
     */
    @Select("SELECT '健康' AS word, COUNT(*) AS hits FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%健康%' "
            + "UNION ALL SELECT '亲人', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%亲人%' "
            + "UNION ALL SELECT '活泼', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%活泼%' "
            + "UNION ALL SELECT '状态好', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%状态%' "
            + "UNION ALL SELECT '客服及时', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%及时%' "
            + "UNION ALL SELECT '解答清楚', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%解答%' "
            + "UNION ALL SELECT '体验不错', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%体验%' "
            + "UNION ALL SELECT '会回购', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%回购%' "
            + "UNION ALL SELECT '品相一致', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%品相%' "
            + "UNION ALL SELECT '包装用心', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%用心%' "
            + "UNION ALL SELECT '值得信赖', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%信赖%' "
            + "UNION ALL SELECT '专业', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%专业%' "
            + "UNION ALL SELECT '干净', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%干净%' "
            + "UNION ALL SELECT '热情', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%热情%' "
            + "UNION ALL SELECT '耐心', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%耐心%' "
            + "UNION ALL SELECT '满意', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%满意%' "
            + "UNION ALL SELECT '推荐', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%推荐%' "
            + "UNION ALL SELECT '划算', COUNT(*) FROM pet_comment WHERE status='0' AND del_flag='0' AND content LIKE '%划算%'")
    List<Map<String, Object>> selectKeywordHits();

    /**
     * 展示大屏：复购客户统计（总客户数 / 复购客户数 / 人均下单次数）
     */
    @Select("SELECT COUNT(*) AS users, IFNULL(SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END), 0) AS repeatUsers, "
            + "IFNULL(ROUND(AVG(cnt), 1), 0) AS avgOrders FROM ("
            + "SELECT user_id, COUNT(*) AS cnt FROM pet_order "
            + "WHERE pay_status = '1' AND status <> '3' AND user_id IS NOT NULL GROUP BY user_id"
            + ") t")
    Map<String, Object> selectRepeatStats();

    /**
     * 展示大屏：近 7 天新增评价数
     */
    @Select("SELECT COUNT(*) AS c FROM pet_comment WHERE status = '0' AND del_flag = '0' "
            + "AND create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    Map<String, Object> selectRecentCommentCount();
}
