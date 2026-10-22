-- ============================================================
-- 平台化第九步：售后退款
-- 依赖：pet_platform_v7_order.sql（pet_order）、v8（宠物单）
-- 说明：
--   订单表早就定义了 pay_status='2 已退款'，但一直没人写。
--   这一版补上售后：用户对已支付订单发起申请 → 门店审核 →
--   通过后走退款：订单置「已退款/已取消」、回补库存（或放回宠物）、
--   写库存流水（change_type=5 退款入库，与取消回补的 3 区分）。
--   演示环境是模拟支付，审核通过即视为退款到账。
-- 可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS `pet_refund` (
  `refund_id`     bigint       NOT NULL AUTO_INCREMENT COMMENT '退款单ID',
  `refund_no`     varchar(32)  NOT NULL                COMMENT '退款单号',
  `order_no`      varchar(32)  NOT NULL                COMMENT '订单号',
  `order_id`      bigint       DEFAULT NULL            COMMENT '订单ID',
  `store_id`      bigint       DEFAULT NULL            COMMENT '门店ID（数据隔离）',
  `user_id`       bigint       DEFAULT NULL            COMMENT '申请账号ID',
  `user_name`     varchar(64)  DEFAULT NULL            COMMENT '申请账号',
  `amount`        decimal(10,2) DEFAULT 0.00           COMMENT '退款金额',
  `reason`        varchar(255) DEFAULT NULL            COMMENT '退款原因',
  `status`        char(1)      DEFAULT '0'             COMMENT '状态（0待审核 1已退款 2已拒绝 3已撤销）',
  `refund_method` varchar(16)  DEFAULT NULL            COMMENT '退款渠道（原路退回）',
  `audit_by`      varchar(64)  DEFAULT NULL            COMMENT '审核人',
  `audit_time`    datetime     DEFAULT NULL            COMMENT '审核时间',
  `audit_remark`  varchar(255) DEFAULT NULL            COMMENT '审核意见',
  `finish_time`   datetime     DEFAULT NULL            COMMENT '退款完成时间',
  `create_by`     varchar(64)  DEFAULT NULL,
  `create_time`   datetime     DEFAULT NULL,
  `update_by`     varchar(64)  DEFAULT NULL,
  `update_time`   datetime     DEFAULT NULL,
  PRIMARY KEY (`refund_id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  KEY `idx_order` (`order_no`),
  KEY `idx_store_status` (`store_id`, `status`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款单';

-- ------------------------------------------------------------
-- 后台菜单
-- ------------------------------------------------------------
DELETE FROM `sys_menu` WHERE `menu_id` BETWEEN 2098 AND 2099;

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
(2098, '退款管理', 2000, 11, 'refund', 'admin/refund/index', 1, 0, 'C', '0', '0', 'pet:refund:list', 'money', 'admin', sysdate(), '售后退款审核'),
(2099, '退款审核', 2098, 1, '', NULL, 1, 0, 'F', '0', '0', 'pet:refund:audit', '#', 'admin', sysdate(), '同意/拒绝退款');

-- 管理员自动拥有
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2098, 2099)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 1 AND rm.menu_id = m.menu_id);

-- 店长拥有查看与审核（退款是门店售后职责）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2098, 2099)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 3 AND rm.menu_id = m.menu_id);

-- ------------------------------------------------------------
-- 校验
-- ------------------------------------------------------------
-- SELECT refund_no, order_no, amount, status FROM pet_refund ORDER BY refund_id DESC LIMIT 5;
