-- ============================================================
-- 商城增强（2026-10-21）：模拟支付闭环 + 站内通知 + 评论评分
-- 库名：ry-pet（本地 root；服务器 DDL 用 root socket）
-- ============================================================

-- ① pet_cart 支付字段：order_no 一单多品共享；pay_status 0待支付 1已支付
ALTER TABLE pet_cart
  ADD COLUMN order_no   VARCHAR(32)  DEFAULT NULL COMMENT '订单号（同次结算共享）',
  ADD COLUMN pay_status CHAR(1)      DEFAULT '0'  COMMENT '支付状态（0待支付 1已支付）',
  ADD COLUMN pay_method VARCHAR(16)  DEFAULT NULL COMMENT '支付方式（alipay/wechat/balance）',
  ADD COLUMN pay_time   DATETIME     DEFAULT NULL COMMENT '支付时间',
  ADD KEY idx_order_no (order_no);

-- ② 站内消息通知表
CREATE TABLE IF NOT EXISTS pet_notification (
  notify_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  user_id     BIGINT       NOT NULL                COMMENT '接收用户ID',
  user_name   VARCHAR(64)  DEFAULT ''              COMMENT '接收用户账号（冗余）',
  type        VARCHAR(20)  DEFAULT 'system'        COMMENT '类型（order/appointment/consult/system）',
  title       VARCHAR(100) DEFAULT ''              COMMENT '标题',
  content     VARCHAR(500) DEFAULT ''              COMMENT '内容',
  ref_id      BIGINT       DEFAULT NULL            COMMENT '关联业务ID',
  is_read     CHAR(1)      DEFAULT '0'             COMMENT '是否已读（0未读 1已读）',
  create_time DATETIME     DEFAULT NULL            COMMENT '创建时间',
  PRIMARY KEY (notify_id),
  KEY idx_user_read (user_id, is_read),
  KEY idx_user_time (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内消息通知表';

-- ③ pet_comment 评分（仅顶级评论评分 1-5，回复不评分）
ALTER TABLE pet_comment
  ADD COLUMN score TINYINT DEFAULT NULL COMMENT '评分（1-5，仅顶级评论）';

-- ④ 评分演示种子：给已有顶级评论补评分（4-5 星，可按需清除 score=NULL 还原）
UPDATE pet_comment SET score = CASE WHEN comment_id % 3 = 0 THEN 4 ELSE 5 END
WHERE parent_id = 0 AND status = '0' AND del_flag = '0' AND target_type = 'pet' AND score IS NULL;
UPDATE pet_comment SET score = CASE WHEN comment_id % 4 = 0 THEN 4 ELSE 5 END
WHERE parent_id = 0 AND status = '0' AND del_flag = '0' AND target_type = 'food' AND score IS NULL;

-- ⑤ 历史订单补单号（早期 pet_cart 行没有 order_no，导致订单页"去支付"打到 /pay/undefined）
-- 按 create_time + cart_id 生成，保证唯一且可读
UPDATE pet_cart
SET order_no = CONCAT('ORD', DATE_FORMAT(IFNULL(create_time, NOW()), '%Y%m%d%H%i%s'), LPAD(cart_id, 4, '0'))
WHERE order_no IS NULL OR order_no = '';
