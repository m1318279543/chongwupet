-- ============================================================
-- 服务工单演示数据（可选）
-- 目的：让「今日工单 / 服务中 / 今日营收」这些数字在演示时不是全 0。
-- 做法：取最新的 4 张工单，分别置为 已完成 / 服务中 / 已接单 / 待接单，
--       并换成真实服务项目与价格，同时补上状态流水。
-- 注意：仅用于演示环境，生产环境不要执行。
-- ============================================================

-- ① 最新一张：已完成（基础洗护 88 元，今天完成）
SET @a := (SELECT service_id FROM pet_service_order WHERE del_flag = '0' ORDER BY service_id DESC LIMIT 1);
UPDATE pet_service_order SET item_id = 2, item_name = '基础洗护（犬）', item_type = '1', price = 88.00,
       status = '3', pay_status = '1', staff_id = 2, staff_name = '周雪',
       start_time = DATE_SUB(NOW(), INTERVAL 70 MINUTE), finish_time = NOW(),
       score = 5, comment = '洗得很干净，服务态度好'
WHERE service_id = @a;

-- ② 第二张：服务中（精致美容 168 元）
SET @b := (SELECT service_id FROM pet_service_order WHERE del_flag = '0' AND service_id < @a ORDER BY service_id DESC LIMIT 1);
UPDATE pet_service_order SET item_id = 3, item_name = '精致美容造型', item_type = '2', price = 168.00,
       status = '2', pay_status = '0', staff_id = 2, staff_name = '周雪',
       start_time = DATE_SUB(NOW(), INTERVAL 25 MINUTE)
WHERE service_id = @b;

-- ③ 第三张：已接单（基础洗护 · 猫 98 元）
SET @c := (SELECT service_id FROM pet_service_order WHERE del_flag = '0' AND service_id < @b ORDER BY service_id DESC LIMIT 1);
UPDATE pet_service_order SET item_id = 4, item_name = '基础洗护（猫）', item_type = '1', price = 98.00,
       status = '1', pay_status = '0', staff_id = 3, staff_name = '李婷'
WHERE service_id = @c;

-- ④ 给 ①②③ 补状态流水，详情抽屉里的时间线才有内容
INSERT INTO pet_service_log (service_id, from_status, to_status, operator, remark, create_time)
SELECT @a, '1', '2', '周雪', '开始服务', DATE_SUB(NOW(), INTERVAL 70 MINUTE)
WHERE @a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pet_service_log WHERE service_id = @a AND to_status = '2');
INSERT INTO pet_service_log (service_id, from_status, to_status, operator, remark, create_time)
SELECT @a, '2', '3', '周雪', '服务完成，已收费 88 元', NOW()
WHERE @a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pet_service_log WHERE service_id = @a AND to_status = '3');
INSERT INTO pet_service_log (service_id, from_status, to_status, operator, remark, create_time)
SELECT @b, '0', '1', '陈明', '派工给 周雪', DATE_SUB(NOW(), INTERVAL 40 MINUTE)
WHERE @b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pet_service_log WHERE service_id = @b AND to_status = '1');
INSERT INTO pet_service_log (service_id, from_status, to_status, operator, remark, create_time)
SELECT @b, '1', '2', '周雪', '开始服务', DATE_SUB(NOW(), INTERVAL 25 MINUTE)
WHERE @b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pet_service_log WHERE service_id = @b AND to_status = '2');
INSERT INTO pet_service_log (service_id, from_status, to_status, operator, remark, create_time)
SELECT @c, '0', '1', '陈明', '派工给 李婷', DATE_SUB(NOW(), INTERVAL 20 MINUTE)
WHERE @c IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pet_service_log WHERE service_id = @c AND to_status = '1');

-- ⑤ 让这几张工单的到店时间落在今天，今日概览才统计得到
UPDATE pet_service_order SET appoint_time = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE service_id IN (@a);
UPDATE pet_service_order SET appoint_time = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE service_id IN (@b);
UPDATE pet_service_order SET appoint_time = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE service_id IN (@c);
