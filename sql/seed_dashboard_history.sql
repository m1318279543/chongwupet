-- =====================================================================
-- 数据看板演示历史数据（近 90 天）
-- 说明：看板接口本身 100% 查询真实业务表，本脚本只是把业务表补足到
--       可观察趋势的规模，方便演示「历史趋势 / 环比 / 时段分布」。
-- 标记：create_by = 'seed'（pet_doctor_consult 用 source='seed'）
-- 清理：见文件末尾注释。
-- 用法：mysql -uroot -p123456 --default-character-set=utf8mb4 ry-pet < seed_dashboard_history.sql
-- =====================================================================
SET SESSION cte_max_recursion_depth = 1000;

DROP TEMPORARY TABLE IF EXISTS tmp_user;
CREATE TEMPORARY TABLE tmp_user (id INT PRIMARY KEY, uid BIGINT, uname VARCHAR(64));
INSERT INTO tmp_user VALUES
  (1,1,'admin'),(2,2,'ry'),(3,100,'md123'),(4,102,'demo'),
  (5,103,'test01'),(6,104,'mxd111'),(7,105,'杨玉婷'),(8,106,'041');

DROP TEMPORARY TABLE IF EXISTS tmp_goods;
CREATE TEMPORARY TABLE tmp_goods (id INT PRIMARY KEY, name VARCHAR(128), image VARCHAR(255), spec VARCHAR(128), price DECIMAL(10,2));
INSERT INTO tmp_goods VALUES
  (1,'幼猫成长无谷猫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp','1.5kg / 袋',128.00),
  (2,'全价成猫鲜肉猫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp','2kg / 袋',158.00),
  (3,'小型犬幼犬粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp','1.5kg / 袋',119.00),
  (4,'大型犬全价犬粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp','10kg / 袋',328.00),
  (5,'兔用提摩西草粒','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp','1kg / 袋',69.00),
  (6,'兔用果蔬混合粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp','800g / 袋',59.00),
  (7,'仓鼠综合营养粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp','500g / 袋',39.00),
  (8,'金丝熊增艳粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp','500g / 袋',45.00),
  (9,'鹦鹉滋养丸','/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp','500g / 罐',79.00),
  (10,'鸣禽种子混合粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp','400g / 袋',35.00),
  (11,'热带鱼缓沉颗粒','/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp','100g / 瓶',29.00),
  (12,'水龟全价龟粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp','250g / 罐',49.00),
  (13,'蜥蜴爬虫粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp','200g / 袋',55.00),
  (14,'守宫专用粮','/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp','150g / 罐',52.00);

-- ---------------------------------------------------------------------
-- 1. 预约（90 天 × 5 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_appointment (user_id, pet_id, appointment_date, contact_phone, status, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 449
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + FLOOR(n / 5)) DAY) AS d,
         RAND() AS r1, RAND() AS r2, RAND() AS r3,
         RAND() AS r4, RAND() AS r5, RAND() AS r6, RAND() AS r7
  FROM seq
)
SELECT
  ELT(1 + FLOOR(r1 * 8), 1, 2, 100, 102, 103, 104, 105, 106),
  1 + FLOOR(r2 * 96),
  DATE_ADD(DATE_ADD(d, INTERVAL (1 + FLOOR(r3 * 7)) DAY), INTERVAL (9 + FLOOR(r4 * 10)) HOUR),
  CONCAT('13', LPAD(FLOOR(r5 * 100000000), 8, '0')),
  ELT(1 + FLOOR(r6 * 10), '0','0','0','0','0','1','1','1','2','3'),
  'seed',
  DATE_ADD(d, INTERVAL (
    CASE WHEN DATEDIFF(d, CURDATE()) = 0
         THEN 8 + FLOOR(r7 * GREATEST(1, HOUR(NOW()) - 8))
         ELSE 8 + FLOOR(r7 * 13) END) HOUR)
FROM gen;

-- ---------------------------------------------------------------------
-- 2. 订单（90 天 × 4 条，约 9% 已取消）
-- ---------------------------------------------------------------------
INSERT INTO pet_cart (user_id, user_name, goods_name, goods_image, goods_spec, price, qty, amount, status, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 359
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + FLOOR(n / 4)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + MOD(n * 3, 14) AS gid,
         1 + FLOOR(RAND() * 3) AS qty,
         RAND() AS rs, RAND() AS rh
  FROM seq
)
SELECT u.uid,
       u.uname,
       g.name,
       g.image,
       g.spec,
       g.price,
       gen.qty,
       g.price * gen.qty,
       IF(gen.rs < 0.09, '3', '0'),
       'seed',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 14) END) HOUR)
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx
JOIN tmp_goods g ON g.id = gen.gid;

-- ---------------------------------------------------------------------
-- 3. 在线咨询（90 天 × 2 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_consult (user_id, user_name, contact, question, reply, reply_by, reply_time, status, del_flag, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 179
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + FLOOR(n / 2)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 8) AS qidx,
         RAND() AS rs, RAND() AS rh
  FROM seq
)
SELECT u.uid,
       u.uname,
       CONCAT('13', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
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
       DATE_ADD(gen.d, INTERVAL (10 + FLOOR(gen.rh * 10)) HOUR),
       IF(gen.rs < 0.7, '1', '0'),
       '0',
       'seed',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 13) END) HOUR)
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 4. 宠物医生在线问答（90 天 × 4 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_doctor_consult (user_id, user_name, question, answer, source, model, match_count, ip, del_flag, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 359
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + FLOOR(n / 4)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 8) AS qidx,
         1 + FLOOR(RAND() * 5) AS mc,
         RAND() AS rh
  FROM seq
)
SELECT u.uid,
       u.uname,
       ELT(gen.qidx,
           '猫咪呕吐毛球怎么办？',
           '狗狗食欲下降但精神正常？',
           '兔子耳朵发烫是发烧吗？',
           '仓鼠掉毛露出皮肤正常吗？',
           '鹦鹉粪便变稀需要用药吗？',
           '热带鱼白点病怎么处理？',
           '幼犬疫苗接种间隔多久？',
           '猫咪频繁抓耳朵是耳螨吗？'),
       '根据描述，建议先做基础观察并记录症状变化；保持环境通风、饮食清淡。若 24 小时内无缓解，请尽快到线下宠物医院做进一步检查。',
       'seed',
       'openai',
       gen.mc,
       '127.0.0.1',
       '0',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 14) END) HOUR)
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 5. 收藏（90 天 × 2 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_favorite (user_id, pet_id, create_by, create_time)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 179
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + FLOOR(n / 2)) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 96) AS pid,
         RAND() AS rh
  FROM seq
)
SELECT u.uid,
       gen.pid,
       'seed',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 13) END) HOUR)
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 6. 评论（90 天 × 1 条）
-- ---------------------------------------------------------------------
INSERT INTO pet_comment (pet_id, user_id, parent_id, content, status, del_flag, create_by, create_time, target_type)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 89
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + n) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 96) AS pid,
         1 + FLOOR(RAND() * 6) AS cidx,
         RAND() AS rh
  FROM seq
)
SELECT gen.pid,
       u.uid,
       0,
       ELT(gen.cidx,
           '小家伙到家很健康，性格也特别亲人！',
           '包装很用心，商家还附了喂养说明。',
           '品相和照片一致，家里人都很喜欢。',
           '第一次在这买，体验不错，会回购。',
           '客服回复很及时，问题都解答清楚了。',
           '已经养了两周，状态一直很好。'),
       '0',
       '0',
       'seed',
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 13) END) HOUR),
       'pet'
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 7. 点赞（90 天 × 1 条，唯一键冲突自动跳过）
-- ---------------------------------------------------------------------
INSERT IGNORE INTO pet_like (pet_id, user_id, create_time, target_type)
WITH RECURSIVE seq AS (
  SELECT 0 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 89
), gen AS (
  SELECT n,
         DATE_ADD(CURDATE(), INTERVAL (-89 + n) DAY) AS d,
         1 + MOD(n * 5, 8) AS uid_idx,
         1 + FLOOR(RAND() * 96) AS pid,
         RAND() AS rh
  FROM seq
)
SELECT gen.pid,
       u.uid,
       DATE_ADD(gen.d, INTERVAL (
         CASE WHEN DATEDIFF(gen.d, CURDATE()) = 0
              THEN 8 + FLOOR(gen.rh * GREATEST(1, HOUR(NOW()) - 8))
              ELSE 8 + FLOOR(gen.rh * 13) END) HOUR),
       'pet'
FROM gen
JOIN tmp_user u ON u.id = gen.uid_idx;

-- ---------------------------------------------------------------------
-- 8. 取消记录（为 seed 的已取消数据补记录）
-- ---------------------------------------------------------------------
INSERT INTO pet_cancel_record (target_type, ref_id, user_id, user_name, target_name, detail, reason, del_flag, create_by, create_time)
SELECT 'order', c.cart_id, c.user_id, c.user_name, c.goods_name,
       CONCAT(c.goods_name, ' ×', c.qty, '，¥', FORMAT(c.amount, 2)),
       ELT(1 + FLOOR(RAND() * 4), '临时不需要了', '下错单了', '想换一款', '预算调整'),
       '0', 'seed', DATE_ADD(c.create_time, INTERVAL 2 HOUR)
FROM pet_cart c
WHERE c.create_by = 'seed' AND c.status = '3';

INSERT INTO pet_cancel_record (target_type, ref_id, user_id, user_name, target_name, detail, reason, del_flag, create_by, create_time)
SELECT 'appointment', a.appointment_id, a.user_id, IFNULL(u.nick_name, '用户'), p.pet_name,
       CONCAT('预约时间 ', DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i')),
       ELT(1 + FLOOR(RAND() * 3), '时间冲突', '临时有事', '想改约其他时间'),
       '0', 'seed', DATE_ADD(a.create_time, INTERVAL 3 HOUR)
FROM pet_appointment a
LEFT JOIN pet_info p ON p.pet_id = a.pet_id
LEFT JOIN sys_user u ON u.user_id = a.user_id
WHERE a.create_by = 'seed' AND a.status = '3';

DROP TEMPORARY TABLE IF EXISTS tmp_goods;
DROP TEMPORARY TABLE IF EXISTS tmp_user;

-- =====================================================================
-- 清理演示数据（需要时手动执行）：
-- DELETE FROM pet_appointment WHERE create_by = 'seed';
-- DELETE FROM pet_cart WHERE create_by = 'seed';
-- DELETE FROM pet_consult WHERE create_by = 'seed';
-- DELETE FROM pet_doctor_consult WHERE source = 'seed';
-- DELETE FROM pet_favorite WHERE create_by = 'seed';
-- DELETE FROM pet_comment WHERE create_by = 'seed';
-- DELETE FROM pet_cancel_record WHERE create_by = 'seed';
-- 点赞无标记字段，按导入时间范围删除需自行确认。
-- =====================================================================
