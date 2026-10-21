-- 用户钱包：平台余额通道的真实余额来源（2026-10-21）
-- 余额支付会真实扣减；余额不足时支付失败并写入 pet_payment_log，后台可见"余额不足（可用 ¥x，本单需 ¥y）"
CREATE TABLE IF NOT EXISTS `pet_wallet` (
  `user_id`     BIGINT        NOT NULL COMMENT '用户ID',
  `balance`     DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '可用余额',
  `update_time` DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户钱包';

-- 初始余额：全部用户 1000 元；ry 留 200 元，便于演示"余额不足"（其订单多为 35 元，高额订单会失败）
INSERT INTO `pet_wallet` (`user_id`, `balance`, `update_time`)
SELECT `user_id`, 1000.00, NOW() FROM `sys_user` WHERE `del_flag` = '0'
ON DUPLICATE KEY UPDATE `balance` = `pet_wallet`.`balance`;

UPDATE `pet_wallet` w
JOIN `sys_user` u ON u.`user_id` = w.`user_id`
SET w.`balance` = 200.00
WHERE u.`user_name` = 'ry' AND w.`balance` = 1000.00;

-- 如需给某个账号加余额（充值的 SQL 版）：UPDATE pet_wallet SET balance = balance + 500 WHERE user_id = 2;
