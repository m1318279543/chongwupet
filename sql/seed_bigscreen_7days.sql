-- =====================================================================
-- 可视化大屏演示数据（近 7 天）
-- 目标：让 /admin/bigscreen 的 12 个面板都有像样的数据——
--       趋势柱线 / 订单·预约·支付方式分布 / 热销商品·预约热度·服务热度 /
--       取消原因 TOP / 24 小时活跃 / 今日实时动态
-- 标记：pet_order / pet_order_item / pet_appointment / pet_service_order /
--       pet_consult / pet_cancel_record / pet_favorite / pet_comment
--       统一 create_by = 'seed7'（pet_like 无该列，按 create_time 清理）
-- 清理：见文件末尾注释。
-- 用法：mysql -u<user> -p --default-character-set=utf8mb4 ry-pet < seed_bigscreen_7days.sql
-- =====================================================================
SET SESSION cte_max_recursion_depth = 1000;

DROP TEMPORARY TABLE IF EXISTS tmp_user7;
CREATE TEMPORARY TABLE tmp_user7 (id INT PRIMARY KEY, uid BIGINT, uname VARCHAR(64));
INSERT INTO tmp_user7 VALUES
  (1,1,'宠物管理员'),(2,2,'睿睿铲屎官'),(3,100,'md123'),(4,102,'demo'),
  (5,103,'test01'),(6,104,'mxd111'),(7,105,'杨玉婷'),(8,106,'041');

DROP TEMPORARY TABLE IF EXISTS tmp_goods7;
CREATE TEMPORARY TABLE tmp_goods7 (id INT PRIMARY KEY, name VARCHAR(128), image VARCHAR(255), spec VARCHAR(128), price DECIMAL(10,2));
INSERT INTO tmp_goods7 VALUES
  (1,'幼猫成长无谷猫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp','1.5kg / 袋',128.00),
  (2,'全价成猫鲜肉猫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp','2kg / 袋',158.00),
  (3,'小型犬幼犬粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp','1.5kg / 袋',119.00),
  (4,'大型犬全价犬粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp','10kg / 袋',328.00),
  (5,'兔用提摩西草粒','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp','1kg / 袋',69.00),
  (6,'兔用果蔬混合粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp','800g / 袋',59.00),
  (7,'仓鼠综合营养粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp','500g / 袋',39.00),
  (8,'金丝熊增艳粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp','500g / 袋',45.00),
  (9,'鹦鹉滋养丸','/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp','500g / 罐',79.00),
  (10,'热带鱼缓沉颗粒','/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp','100g / 瓶',29.00),
  (11,'水龟全价龟粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp','250g / 罐',49.00),
  (12,'蜥蜴爬虫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp','200g / 袋',55.00);

-- ---------------------------------------------------------------------
-- 0. 订单生成表（7 天 × 26 单 = 182 单，约 9% 取消）
--    支付方式：alipay 45% / wechat 35% / balance 20%
--    下单时段：9:00-20:00（今日按当前小时截断）
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS gen_orders7;
CREATE TEMPORARY TABLE gen_orders7 (
  n INT PRIMARY KEY, uid BIGINT, uname VARCHAR(64),
  gid INT, gname VARCHAR(128), gimage VARCHAR(255), gspec VARCHAR(128),
  price DECIMAL(10,2), qty INT, amount DECIMAL(10,2),
  is_cancel TINYINT, pay_method VARCHAR(16),
  ct DATETIME, pay_time DATETIME, cancel_reason VARCHAR(255)
);
INSERT INTO gen_orders7
SELECT gen.n,
       u.uid, u.uname,
       g.id, g.name, g.image, g.spec,
       g.price, gen.qty, g.price * gen.qty,
       IF(gen.rc < 0.09, 1, 0),
       CASE WHEN gen.rc < 0.09 THEN NULL
            WHEN gen.rm < 0.45 THEN 'alipay'
            WHEN gen.rm < 0.80 THEN 'wechat'
            ELSE 'balance' END,
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR) + INTERVAL FLOOR(gen.rmm * 60) MINUTE,
       IF(gen.rc < 0.09, NULL,
          DATE_ADD(gen.d, INTERVAL (
            CASE WHEN gen.d = CURDATE()
                 THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
                 ELSE 9 + FLOOR(gen.rh * 11) END) HOUR)
          + INTERVAL FLOOR(gen.rmm * 60) MINUTE + INTERVAL (2 + FLOOR(gen.rc * 45)) MINUTE),
       IF(gen.rc < 0.09,
          ELT(1 + FLOOR(gen.rm * 10),
              '超时未支付，系统自动取消','超时未支付，系统自动取消','超时未支付，系统自动取消','超时未支付，系统自动取消',
              '不想买了','拍错了，重新下单','地址填错了','重复下单','犹豫了一下，先不买了','临时有事，改天再买'),
          NULL)
FROM (
  -- LIMIT 强制物化派生表：否则 CTE 合并后 RAND() 每次引用重新求值，
  -- 会出现「is_cancel=1 但 cancel_reason=NULL」的错位
  WITH RECURSIVE seq AS (
    SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 181
  )
  SELECT s.n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(s.n / 26)) DAY) AS d,
         1 + MOD(s.n * 5, 8) AS uid_idx,
         1 + MOD(s.n * 7, 12) AS gid,
         1 + FLOOR(RAND() * 3) AS qty,
         RAND() AS rc, RAND() AS rm, RAND() AS rh, RAND() AS rmm
  FROM seq s LIMIT 182
) gen
JOIN tmp_user7 u ON u.id = gen.uid_idx
JOIN tmp_goods7 g ON g.id = gen.gid;

-- ---------------------------------------------------------------------
-- 1. 订单主表
-- ---------------------------------------------------------------------
INSERT INTO pet_order (order_no, order_type, user_id, user_name, item_count, total_amount, pay_amount,
                       pay_status, pay_method, pay_time, status, delivery_type, receiver, receiver_phone,
                       receiver_address, cancel_reason, cancel_time, del_flag, create_by, create_time)
SELECT CONCAT('SD7', LPAD(n, 6, '0')),
       '1', uid, uname, 1, amount, amount,
       IF(is_cancel = 1, '0', '1'), pay_method, pay_time,
       IF(is_cancel = 1, '3', '0'), '1', uname,
       CONCAT('13', LPAD((n * 7919) % 100000000, 8, '0')),
       CONCAT('重庆市渝中区', ELT(1 + MOD(n, 6), '民生路', '邹容路', '五四路', '青年路', '中山一路', '大同路'), FLOOR(RAND() * 120) + 1, '号'),
       cancel_reason,
       IF(is_cancel = 1, DATE_ADD(ct, INTERVAL 30 MINUTE), NULL),
       '0', 'seed7', ct
FROM gen_orders7;

-- ---------------------------------------------------------------------
-- 2. 订单明细（一单一品）
-- ---------------------------------------------------------------------
INSERT INTO pet_order_item (order_id, order_no, item_type, goods_id, goods_name, goods_image, goods_spec, price, qty, amount, create_time)
SELECT o.order_id, o.order_no, '1', g.gid, g.gname, g.gimage, g.gspec, g.price, g.qty, g.amount, o.create_time
FROM pet_order o
JOIN gen_orders7 g ON CONCAT('SD7', LPAD(g.n, 6, '0')) = o.order_no
WHERE o.create_by = 'seed7';

-- ---------------------------------------------------------------------
-- 3. 预约（7 天 × 9 = 63 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_appointment (user_id, pet_id, appointment_date, contact_phone, status, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 62
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(n / 9)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 11, 96) AS pid,
         RAND() AS rs, RAND() AS rh
  FROM seq
)
SELECT u.uid,
       gen.pid,
       DATE_ADD(DATE_ADD(gen.d, INTERVAL (1 + FLOOR(gen.rs * 5)) DAY), INTERVAL (9 + FLOOR(gen.rs * 9)) HOUR),
       CONCAT('13', LPAD((gen.n * 104729) % 100000000, 8, '0')),
       ELT(1 + FLOOR(gen.rs * 9), '0','0','1','1','1','2','2','2','3'),
       'seed7',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR)
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 4. 服务工单（7 天 × 6 = 42 单）
-- ---------------------------------------------------------------------
INSERT INTO pet_service_order (service_no, store_id, user_id, customer_name, contact_name, contact_phone,
                               pet_id, pet_name, item_id, item_name, item_type, service_mode,
                               price, qty, total_amount, status, pay_status, pay_method, pay_time,
                               appoint_time, source, del_flag, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 41
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(n / 6)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 3, 7) AS iid,
         1 + MOD(n * 11, 96) AS pid,
         RAND() AS rs, RAND() AS rm, RAND() AS rh
  FROM seq
)
SELECT CONCAT('SV7', LPAD(n, 6, '0')),
       1,
       u.uid, u.uname, u.uname,
       CONCAT('13', LPAD((gen.n * 15487) % 100000000, 8, '0')),
       gen.pid,
       IFNULL((SELECT p.pet_name FROM pet_info p WHERE p.pet_id = gen.pid), '毛孩'),
       i.item_id, i.item_name, i.item_type,
       ELT(1 + FLOOR(gen.rs * 4), '1','1','1','2'),
       i.price, 1, i.price,
       ELT(1 + FLOOR(gen.rs * 6), '1','2','2','2','2','0'),
       '1',
       CASE WHEN gen.rm < 0.45 THEN 'alipay' WHEN gen.rm < 0.80 THEN 'wechat' ELSE 'balance' END,
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR) + INTERVAL 40 MINUTE,
       DATE_ADD(DATE_ADD(gen.d, INTERVAL 1 DAY), INTERVAL (9 + FLOOR(gen.rs * 9)) HOUR),
       '1', '0', 'seed7',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR)
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx
JOIN pet_service_item i ON i.item_id = gen.iid;

-- ---------------------------------------------------------------------
-- 5. 在线咨询（7 天 × 4 = 28 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_consult (user_id, user_name, contact, question, reply, reply_by, reply_time, status, del_flag, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 27
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(n / 4)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 8) AS qidx,
         RAND() AS rs, RAND() AS rh
  FROM seq
)
SELECT u.uid, u.uname,
       CONCAT('13', LPAD((gen.n * 31337) % 100000000, 8, '0')),
       ELT(gen.qidx,
           '猫咪最近频繁打喷嚏，需要去医院吗？',
           '狗狗换粮后软便两天了，怎么过渡比较好？',
           '兔子需要定期剪指甲吗？多久一次？',
           '仓鼠夏天可以用浴沙吗？',
           '鹦鹉突然拔毛是什么原因？',
           '新买的鱼缸需要养水多久才能放鱼？',
           '幼猫三个月可以打狂犬疫苗吗？',
           '狗狗掉毛特别严重，是皮肤病吗？'),
       '已收到您的问题，建议先观察精神状态与饮食；如持续超过 48 小时请及时到院检查。',
       'admin',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR) + INTERVAL 20 MINUTE,
       IF(gen.rs < 0.7, '1', '0'),
       '0', 'seed7',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR)
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 6. 取消记录（已取消订单 + 已取消预约，各补一条快照）
-- ---------------------------------------------------------------------
INSERT INTO pet_cancel_record (target_type, ref_id, user_id, user_name, target_name, detail, reason, del_flag, create_by, create_time)
SELECT 'order', o.order_id, o.user_id, o.user_name, i.goods_name,
       CONCAT('订单 ', o.order_no, '（¥', o.pay_amount, '）'),
       o.cancel_reason, '0', 'seed7', o.cancel_time
FROM pet_order o
LEFT JOIN pet_order_item i ON i.order_no = o.order_no
WHERE o.create_by = 'seed7' AND o.status = '3';

INSERT INTO pet_cancel_record (target_type, ref_id, user_id, user_name, target_name, detail, reason, del_flag, create_by, create_time)
SELECT 'appointment', a.appointment_id, a.user_id,
       IFNULL(u.nick_name, '用户'),
       IFNULL(p.pet_name, '宠物'),
       CONCAT('预约看宠 ', IFNULL(p.pet_name, '')),
       ELT(1 + FLOOR(RAND(a.appointment_id) * 5),
           '临时有事，改期再约','时间冲突，换个时段','路途太远，先不去了','已在线下完成看宠','暂无'),
       '0', 'seed7', a.create_time
FROM pet_appointment a
LEFT JOIN pet_info p ON p.pet_id = a.pet_id
LEFT JOIN sys_user u ON u.user_id = a.user_id
WHERE a.create_by = 'seed7' AND a.status = '3';

-- ---------------------------------------------------------------------
-- 7. 收藏 / 评论 / 点赞（少量，喂饱互动指标）
-- ---------------------------------------------------------------------
INSERT INTO pet_favorite (user_id, pet_id, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 13
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(n / 2)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 13, 96) AS pid,
         RAND() AS rh
  FROM seq
)
SELECT u.uid, gen.pid, 'seed7',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR)
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx;

INSERT INTO pet_comment (pet_id, user_id, parent_id, content, score, status, del_flag, create_by, create_time, target_type)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 6
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + n) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 17, 96) AS pid,
         RAND() AS rh
  FROM seq
)
SELECT gen.pid, u.uid, 0,
       ELT(1 + MOD(gen.n, 6),
           '小家伙到家很健康，性格也特别亲人！',
           '包装很用心，商家还附了喂养说明。',
           '品相和照片一致，家里人都很喜欢。',
           '第一次在这买，体验不错，会回购。',
           '客服回复很及时，问题都解答清楚了。',
           '已经养了两周，状态一直很好。'),
       4 + MOD(gen.n, 2),
       '0', '0', 'seed7',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR),
       'pet'
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx;

INSERT IGNORE INTO pet_like (pet_id, user_id, create_time, target_type)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 20
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-6 + FLOOR(n / 3)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 19, 96) AS pid,
         RAND() AS rh
  FROM seq
)
SELECT gen.pid, u.uid,
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN gen.d = CURDATE()
              THEN 9 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 9))
              ELSE 9 + FLOOR(gen.rh * 11) END) HOUR),
       'pet'
FROM gen
JOIN tmp_user7 u ON u.id = gen.uid_idx;

-- =====================================================================
-- 清理（如需撤掉这批演示数据）：
--   DELETE i FROM pet_order_item i JOIN pet_order o ON o.order_no=i.order_no WHERE o.create_by='seed7';
--   DELETE FROM pet_order WHERE create_by='seed7';
--   DELETE FROM pet_appointment WHERE create_by='seed7';
--   DELETE FROM pet_service_order WHERE create_by='seed7';
--   DELETE FROM pet_consult WHERE create_by='seed7';
--   DELETE FROM pet_cancel_record WHERE create_by='seed7';
--   DELETE FROM pet_favorite WHERE create_by='seed7';
--   DELETE FROM pet_comment WHERE create_by='seed7';
--   DELETE FROM pet_like WHERE target_type='pet' AND user_id IN (1,2,100,102,103,104,105,106)
--     AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);
-- =====================================================================
