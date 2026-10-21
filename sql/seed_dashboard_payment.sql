-- =====================================================================
-- 数据看板补充种子：支付维度（为 create_by='seed' 的订单补支付闭环）
-- 背景：seed_dashboard_history.sql 生成的订单 pay_status 全部为空，
--       导致看板「支付金额 / 支付成功率 / 支付趋势 / 订单支付状态」几乎无数据。
-- 本脚本：①为 seed 订单补 order_no（防历史订单兜底）②约 72% 非取消订单标记已支付
--         ③生成对应成功流水 + 部分失败流水（先失败后重试成功 / 用户取消 / 超时）
-- 原则：只用微信/支付宝通道，不伪造余额支付（保证 pet_wallet 余额真实性）
-- 标记：仍挂在 create_by='seed' 上；清理见文件末尾。
-- 用法：mysql -uroot -p123456 --default-character-set=utf8mb4 ry-pet < seed_dashboard_payment.sql
-- =====================================================================

-- 1) 补 order_no（幂等）
UPDATE pet_cart
SET order_no = CONCAT('SD', DATE_FORMAT(create_time, '%Y%m%d%H%i%s'), cart_id)
WHERE create_by = 'seed' AND (order_no IS NULL OR order_no = '');

-- 2) 约 72% 的非取消种子订单标记已支付（幂等：只动未支付的）
UPDATE pet_cart
SET pay_status = '1',
    pay_method = ELT(1 + MOD(cart_id * 7, 2), 'wechat', 'alipay'),
    pay_time = LEAST(DATE_ADD(create_time, INTERVAL (5 + MOD(cart_id * 13, 50)) MINUTE), NOW())
WHERE create_by = 'seed' AND status <> '3'
  AND (pay_status IS NULL OR pay_status = '0')
  AND MOD(cart_id * 17, 100) < 72;

-- 3) 成功流水：与已支付订单一一对应（幂等）
INSERT INTO pet_payment_log (order_no, user_id, user_name, pay_method, amount, items, result, reason, create_time)
SELECT c.order_no, c.user_id, c.user_name, c.pay_method, c.amount, c.qty, 'success', '支付成功', c.pay_time
FROM pet_cart c
WHERE c.create_by = 'seed' AND c.status <> '3' AND c.pay_status = '1' AND c.pay_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'success');

-- 4) 先失败后重试成功：约 6% 的已支付订单补一条前置失败（体现真实支付尝试）
INSERT INTO pet_payment_log (order_no, user_id, user_name, pay_method, amount, items, result, reason, create_time)
SELECT c.order_no, c.user_id, c.user_name, c.pay_method, c.amount, c.qty, 'fail', '用户取消支付，稍后重试',
       LEAST(DATE_ADD(c.create_time, INTERVAL 2 MINUTE), c.pay_time)
FROM pet_cart c
WHERE c.create_by = 'seed' AND c.status <> '3' AND c.pay_status = '1' AND c.pay_time IS NOT NULL
  AND MOD(c.cart_id * 29, 100) < 6
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'fail');

-- 5) 未支付订单：约 35% 补失败流水（用户取消 / 支付超时 / 通道繁忙），可能多次尝试
INSERT INTO pet_payment_log (order_no, user_id, user_name, pay_method, amount, items, result, reason, create_time)
SELECT c.order_no, c.user_id, c.user_name,
       ELT(1 + MOD(c.cart_id * 7, 2), 'wechat', 'alipay'),
       c.amount, c.qty, 'fail',
       ELT(1 + MOD(c.cart_id * 11, 3), '用户取消支付', '支付超时，订单未完成', '支付通道繁忙，请稍后重试'),
       DATE_ADD(c.create_time, INTERVAL (10 + MOD(c.cart_id * 7, 40)) MINUTE)
FROM pet_cart c
WHERE c.create_by = 'seed' AND c.status <> '3'
  AND (c.pay_status IS NULL OR c.pay_status = '0')
  AND MOD(c.cart_id * 23, 100) < 35
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'fail');

-- 6) 其中一半再补第二条失败（多次尝试仍未付，让失败率曲线更自然）
INSERT INTO pet_payment_log (order_no, user_id, user_name, pay_method, amount, items, result, reason, create_time)
SELECT c.order_no, c.user_id, c.user_name,
       ELT(1 + MOD(c.cart_id * 5, 2), 'alipay', 'wechat'),
       c.amount, c.qty, 'fail',
       ELT(1 + MOD(c.cart_id * 3, 3), '支付超时，订单未完成', '用户取消支付', '支付通道繁忙，请稍后重试'),
       DATE_ADD(c.create_time, INTERVAL (45 + MOD(c.cart_id * 7, 30)) MINUTE)
FROM pet_cart c
WHERE c.create_by = 'seed' AND c.status <> '3'
  AND (c.pay_status IS NULL OR c.pay_status = '0')
  AND MOD(c.cart_id * 23, 100) < 18
  AND (SELECT COUNT(*) FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'fail') = 1;

-- =====================================================================
-- 清理（需要时手动执行）：
-- 1) DELETE FROM pet_payment_log WHERE order_no LIKE 'SD%' OR
--    order_no IN (SELECT order_no FROM (SELECT order_no FROM pet_cart WHERE create_by='seed') t);
-- 2) UPDATE pet_cart SET pay_status='0', pay_method=NULL, pay_time=NULL
--    WHERE create_by='seed' AND status <> '3' AND order_no LIKE 'SD%';
-- =====================================================================
