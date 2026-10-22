-- ============================================================
-- 平台化第八步：宠物进入订单主线
-- 依赖：pet_platform_v7_order.sql（pet_order / pet_order_item）
-- 说明：
--   以前订单只收商品，宠物详情页只有「立即预约」，宠物本身买不了，
--   项目名里的「宠物交易」断在预约这一步。这一版让宠物也能下单：
--     pet_order.order_type    1 商品单  2 宠物单
--     pet_order_item.item_type 1 商品   2 宠物
--     pet_order_item.pet_id   指向 pet_info
--   下单即用 CAS 抢占 pet_info.status（0 在售 -> 1 已售），
--   抢不到说明刚被别人订走；取消订单时回滚为在售。
-- 可重复执行。
-- ============================================================

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_order` ADD COLUMN `order_type` char(1) DEFAULT ''1'' COMMENT ''订单类型（1商品 2宠物）'' AFTER `order_no`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_order' AND column_name = 'order_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_order_item` ADD COLUMN `item_type` char(1) DEFAULT ''1'' COMMENT ''明细类型（1商品 2宠物）'' AFTER `order_no`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_order_item' AND column_name = 'item_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_order_item` ADD COLUMN `pet_id` bigint DEFAULT NULL COMMENT ''宠物ID（item_type=2 时有值）'' AFTER `item_type`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_order_item' AND column_name = 'pet_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_order_item` ADD KEY `idx_pet` (`pet_id`)',
    'SELECT 1')
    FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pet_order_item' AND index_name = 'idx_pet');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 存量数据都是商品单
UPDATE `pet_order`      SET `order_type` = '1' WHERE `order_type` IS NULL;
UPDATE `pet_order_item` SET `item_type`  = '1' WHERE `item_type`  IS NULL;

-- ------------------------------------------------------------
-- 校验
-- ------------------------------------------------------------
-- 1) 字段是否就位
-- SELECT column_name, column_type, column_comment FROM information_schema.columns
--  WHERE table_schema = DATABASE() AND table_name = 'pet_order_item' AND column_name IN ('item_type','pet_id');
-- 2) 订单类型分布
-- SELECT order_type, count(*) FROM pet_order GROUP BY order_type;
