-- ============================================================
-- 平台化第十步：采购入库
-- 依赖：pet_platform_v6_goods.sql（pet_goods / pet_goods_sku / pet_stock_log）
-- 说明：
--   以前补货只能到商品页手改数字，没有采购单、没有进价、没有单据留痕。
--   这一版补上「缺货 → 采购 → 入库 → 库存增加」的闭环：
--     pet_purchase       采购单头（供应商、状态、总额、入库时间）
--     pet_purchase_item  采购明细（商品快照、进价、数量）
--   入库时逐条走 IPetGoodsService.changeStock(change_type=1)，
--   库存流水 biz_no 记采购单号，可对账。
-- 可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS `pet_purchase` (
  `purchase_id`  bigint       NOT NULL AUTO_INCREMENT COMMENT '采购单ID',
  `purchase_no`  varchar(32)  NOT NULL                COMMENT '采购单号',
  `store_id`     bigint       DEFAULT NULL            COMMENT '门店ID',
  `supplier`     varchar(64)  DEFAULT NULL            COMMENT '供应商',
  `status`       char(1)      DEFAULT '0'             COMMENT '状态（0待入库 1已入库 2已取消）',
  `item_count`   int          DEFAULT 0               COMMENT '商品种数',
  `total_qty`    int          DEFAULT 0               COMMENT '采购总件数',
  `total_amount` decimal(10,2) DEFAULT 0.00           COMMENT '采购总额',
  `expect_time`  date         DEFAULT NULL            COMMENT '预计到货日期',
  `inbound_time` datetime     DEFAULT NULL            COMMENT '实际入库时间',
  `inbound_by`   varchar(64)  DEFAULT NULL            COMMENT '入库操作人',
  `remark`       varchar(255) DEFAULT NULL            COMMENT '备注',
  `create_by`    varchar(64)  DEFAULT NULL,
  `create_time`  datetime     DEFAULT NULL,
  `update_by`    varchar(64)  DEFAULT NULL,
  `update_time`  datetime     DEFAULT NULL,
  PRIMARY KEY (`purchase_id`),
  UNIQUE KEY `uk_purchase_no` (`purchase_no`),
  KEY `idx_store_status` (`store_id`, `status`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单';

CREATE TABLE IF NOT EXISTS `pet_purchase_item` (
  `item_id`      bigint       NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `purchase_id`  bigint       NOT NULL                COMMENT '采购单ID',
  `purchase_no`  varchar(32)  NOT NULL                COMMENT '采购单号',
  `goods_id`     bigint       NOT NULL                COMMENT '商品ID',
  `sku_id`       bigint       DEFAULT NULL            COMMENT 'SKU ID（空则入库到默认规格）',
  `goods_name`   varchar(120) DEFAULT NULL            COMMENT '商品名称（快照）',
  `goods_image`  varchar(500) DEFAULT NULL            COMMENT '商品图（快照）',
  `spec`         varchar(120) DEFAULT NULL            COMMENT '规格（快照）',
  `cost_price`   decimal(10,2) DEFAULT 0.00           COMMENT '采购单价',
  `qty`          int          DEFAULT 0               COMMENT '采购数量',
  `amount`       decimal(10,2) DEFAULT 0.00           COMMENT '小计',
  `stock_before` int          DEFAULT NULL            COMMENT '入库前库存（入库时写）',
  `create_time`  datetime     DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_purchase` (`purchase_id`),
  KEY `idx_no` (`purchase_no`),
  KEY `idx_goods` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购明细';

-- ------------------------------------------------------------
-- 后台菜单
-- ------------------------------------------------------------
DELETE FROM `sys_menu` WHERE `menu_id` BETWEEN 2100 AND 2101;

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
(2100, '采购管理', 2000, 12, 'purchase', 'admin/purchase/index', 1, 0, 'C', '0', '0', 'pet:purchase:list', 'shopping', 'admin', sysdate(), '采购单与入库'),
(2101, '采购入库', 2100, 1, '', NULL, 1, 0, 'F', '0', '0', 'pet:purchase:inbound', '#', 'admin', sysdate(), '确认入库加库存');

INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2100, 2101)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 1 AND rm.menu_id = m.menu_id);

INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2100, 2101)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 3 AND rm.menu_id = m.menu_id);

-- ------------------------------------------------------------
-- 校验
-- ------------------------------------------------------------
-- SELECT purchase_no, supplier, status, total_amount FROM pet_purchase ORDER BY purchase_id DESC;
