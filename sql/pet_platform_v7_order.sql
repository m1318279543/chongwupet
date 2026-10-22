-- ============================================================
-- 平台化第七步：订单主表（订单头 + 订单明细）
-- 依赖：pet_platform_v6_goods.sql（goods_id/sku_id）
-- 说明：
--   以前 pet_cart 一张表既当购物车又当订单，一单多品只能靠 order_no 字符串拼起来，
--   没有金额快照、没有订单状态、没法对账。这一版拆成：
--     pet_order       订单头（金额、支付、状态、收货信息、取消原因）
--     pet_order_item  订单明细（商品快照、单价、数量、小计）
--   pet_cart 保留为历史数据，不再写入。
-- ============================================================

CREATE TABLE IF NOT EXISTS `pet_order` (
  `order_id`       bigint       NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no`       varchar(32)  NOT NULL                COMMENT '订单号',
  `store_id`       bigint       DEFAULT NULL            COMMENT '门店ID',
  `customer_id`    bigint       DEFAULT NULL            COMMENT '客户ID',
  `user_id`        bigint       DEFAULT NULL            COMMENT '下单账号ID',
  `user_name`      varchar(64)  DEFAULT NULL            COMMENT '下单账号',
  `item_count`     int          DEFAULT 0               COMMENT '商品件数',
  `total_amount`   decimal(10,2) DEFAULT 0.00           COMMENT '商品总额',
  `pay_amount`     decimal(10,2) DEFAULT 0.00           COMMENT '实付金额',
  `pay_status`     char(1)      DEFAULT '0'             COMMENT '支付状态（0未付 1已付 2已退款）',
  `pay_method`     varchar(16)  DEFAULT NULL            COMMENT '支付方式',
  `pay_time`       datetime     DEFAULT NULL            COMMENT '支付时间',
  `status`         char(1)      DEFAULT '0'             COMMENT '订单状态（0待付款 1待发货 2已完成 3已取消）',
  `delivery_type`  char(1)      DEFAULT '1'             COMMENT '履约方式（1到店自提 2配送）',
  `receiver`       varchar(32)  DEFAULT NULL            COMMENT '收货人',
  `receiver_phone` varchar(20)  DEFAULT NULL            COMMENT '收货电话',
  `receiver_address` varchar(255) DEFAULT NULL          COMMENT '收货地址',
  `cancel_reason`  varchar(255) DEFAULT NULL            COMMENT '取消原因',
  `cancel_time`    datetime     DEFAULT NULL            COMMENT '取消时间',
  `remark`         varchar(500) DEFAULT NULL            COMMENT '备注',
  `del_flag`       char(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  `create_by`      varchar(64)  DEFAULT NULL,
  `create_time`    datetime     DEFAULT NULL,
  `update_by`      varchar(64)  DEFAULT NULL,
  `update_time`    datetime     DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user` (`user_id`),
  KEY `idx_store_status` (`store_id`, `status`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单';

CREATE TABLE IF NOT EXISTS `pet_order_item` (
  `item_id`     bigint       NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id`    bigint       NOT NULL                COMMENT '订单ID',
  `order_no`    varchar(32)  NOT NULL                COMMENT '订单号',
  `goods_id`    bigint       DEFAULT NULL            COMMENT '商品ID',
  `sku_id`      bigint       DEFAULT NULL            COMMENT 'SKU ID',
  `goods_name`  varchar(120) DEFAULT NULL            COMMENT '商品名称（快照）',
  `goods_image` varchar(500) DEFAULT NULL            COMMENT '商品图（快照）',
  `goods_spec`  varchar(120) DEFAULT NULL            COMMENT '规格（快照）',
  `price`       decimal(10,2) DEFAULT 0.00           COMMENT '成交单价（快照）',
  `qty`         int          DEFAULT 1               COMMENT '数量',
  `amount`      decimal(10,2) DEFAULT 0.00           COMMENT '小计',
  `create_time` datetime     DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_goods` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细';

-- ① 历史数据补订单号：以前按 cart_id 单条成单
UPDATE `pet_cart` SET `order_no` = CONCAT('ORDH', LPAD(`cart_id`, 8, '0')) WHERE `order_no` IS NULL;

-- ② 订单头回填（按订单号聚合）
INSERT INTO `pet_order`
  (`order_no`, `store_id`, `customer_id`, `user_id`, `user_name`, `item_count`,
   `total_amount`, `pay_amount`, `pay_status`, `pay_method`, `pay_time`, `status`,
   `delivery_type`, `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
SELECT c.`order_no`,
       MAX(c.`store_id`),
       MAX(c.`customer_id`),
       MAX(c.`user_id`),
       MAX(c.`user_name`),
       COUNT(*),
       IFNULL(SUM(c.`amount`), 0),
       IFNULL(SUM(c.`amount`), 0),
       MAX(IFNULL(c.`pay_status`, '0')),
       MAX(c.`pay_method`),
       MAX(c.`pay_time`),
       CASE WHEN MAX(IFNULL(c.`status`, '0')) = '3' THEN '3'
            WHEN MAX(IFNULL(c.`pay_status`, '0')) = '1' THEN '1'
            ELSE '0' END,
       '1',
       MAX(c.`create_by`),
       MIN(c.`create_time`),
       MAX(c.`update_by`),
       MAX(c.`update_time`),
       MAX(c.`remark`)
FROM `pet_cart` c
WHERE c.`order_no` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `pet_order` o WHERE o.`order_no` = c.`order_no`)
GROUP BY c.`order_no`;

-- ③ 订单明细回填
INSERT INTO `pet_order_item`
  (`order_id`, `order_no`, `goods_id`, `sku_id`, `goods_name`, `goods_image`, `goods_spec`,
   `price`, `qty`, `amount`, `create_time`)
SELECT o.`order_id`, c.`order_no`, c.`goods_id`, c.`sku_id`, c.`goods_name`, c.`goods_image`, c.`goods_spec`,
       c.`price`, c.`qty`, c.`amount`, c.`create_time`
FROM `pet_cart` c
JOIN `pet_order` o ON o.`order_no` = c.`order_no`
WHERE NOT EXISTS (SELECT 1 FROM `pet_order_item` i WHERE i.`order_no` = c.`order_no`);

-- ④ 后台菜单：购物车管理 → 订单管理
UPDATE `sys_menu`
SET `menu_name` = '订单管理', `path` = 'order', `component` = 'admin/order/index',
    `perms` = 'pet:order:list', `icon` = 'Tickets', `remark` = '订单主表与履约'
WHERE `menu_id` = 2070;

DELETE FROM `sys_menu` WHERE `menu_id` BETWEEN 2096 AND 2099;
INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
 (2096, '订单发货', 2070, 1, '', '', 1, 0, 'F', '0', '0', 'pet:order:ship', '#', 'admin', sysdate(), ''),
 (2097, '订单取消', 2070, 2, '', '', 1, 0, 'F', '0', '0', 'pet:order:cancel', '#', 'admin', sysdate(), '');

-- 店长沿用购物车菜单授权，补发货权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2096, 2097)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 3 AND rm.menu_id = m.menu_id);
