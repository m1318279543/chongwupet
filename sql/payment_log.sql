-- 支付流水：记录每一次支付尝试（成功/失败），供后台订单与支付管理查看
-- 2026-10-21
CREATE TABLE IF NOT EXISTS `pet_payment_log` (
  `log_id`      BIGINT        NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `order_no`    VARCHAR(64)   NOT NULL COMMENT '订单号',
  `user_id`     BIGINT        DEFAULT NULL COMMENT '用户ID',
  `user_name`   VARCHAR(64)   DEFAULT NULL COMMENT '用户昵称',
  `pay_method`  VARCHAR(20)   DEFAULT NULL COMMENT '支付通道 alipay/wechat/balance',
  `amount`      DECIMAL(10,2) DEFAULT 0.00 COMMENT '订单金额',
  `items`       INT           DEFAULT 0 COMMENT '商品件数',
  `result`      VARCHAR(10)   NOT NULL COMMENT '结果 success/fail',
  `reason`      VARCHAR(255)  DEFAULT NULL COMMENT '失败原因或成功摘要',
  `create_time` DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  PRIMARY KEY (`log_id`),
  KEY `idx_order` (`order_no`),
  KEY `idx_result_time` (`result`, `create_time`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付流水';

-- 演示数据：给最近若干笔订单补一些失败记录（演示数据清理：DELETE FROM pet_payment_log WHERE log_id <= 12）
INSERT INTO `pet_payment_log` (`order_no`, `user_id`, `user_name`, `pay_method`, `amount`, `items`, `result`, `reason`, `create_time`)
SELECT c.order_no, c.user_id, c.user_name, 'wechat', c.amount, 1, 'fail', '微信支付通道返回：余额不足', DATE_ADD(c.create_time, INTERVAL 3 MINUTE)
FROM pet_cart c
WHERE c.order_no IS NOT NULL AND c.status = '0' AND (c.pay_status IS NULL OR c.pay_status = '0')
  AND c.cart_id IN (SELECT cart_id FROM (SELECT cart_id FROM pet_cart WHERE order_no IS NOT NULL AND status = '0' AND (pay_status IS NULL OR pay_status = '0') ORDER BY cart_id DESC LIMIT 4) t)
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'fail');

INSERT INTO `pet_payment_log` (`order_no`, `user_id`, `user_name`, `pay_method`, `amount`, `items`, `result`, `reason`, `create_time`)
SELECT c.order_no, c.user_id, c.user_name, c.pay_method, c.amount, 1, 'success', '支付成功', c.pay_time
FROM pet_cart c
WHERE c.order_no IS NOT NULL AND c.pay_status = '1' AND c.pay_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'success')
LIMIT 8;

-- 演示补充：把 ry 的两笔订单标为已支付，便于后台"已支付"统计与前台订单状态都有数据
-- （如需还原：UPDATE pet_cart SET pay_status='0',pay_method=NULL,pay_time=NULL WHERE ... ）
UPDATE pet_cart
SET pay_status = '1', pay_method = 'alipay', pay_time = DATE_ADD(create_time, INTERVAL 6 MINUTE)
WHERE user_name = 'ry' AND status = '0' AND (pay_status IS NULL OR pay_status = '0')
ORDER BY cart_id ASC LIMIT 2;

INSERT INTO `pet_payment_log` (`order_no`, `user_id`, `user_name`, `pay_method`, `amount`, `items`, `result`, `reason`, `create_time`)
SELECT c.order_no, c.user_id, c.user_name, c.pay_method, c.amount, 1, 'success', '通过支付宝支付成功', c.pay_time
FROM pet_cart c
WHERE c.order_no IS NOT NULL AND c.pay_status = '1' AND c.pay_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pet_payment_log l WHERE l.order_no = c.order_no AND l.result = 'success');
