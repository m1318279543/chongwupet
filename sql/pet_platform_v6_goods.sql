-- ============================================================
-- 平台化第六步：商品与库存（把"前端定价格"改成"后端定价格 + 真实库存"）
-- 依赖：pet_platform_v1.sql（门店/客户）、pet_platform_v5_service.sql（可选）
-- 说明：
--   1. 宠物粮从「前端常量」搬进 pet_goods，价格、库存、上下架都由后台维护；
--   2. 每个商品至少一个 SKU（pet_goods_sku），库存记在 SKU 上，商品上的 stock 是汇总；
--   3. 每次库存变动写 pet_stock_log，能回答"这袋粮什么时候少的、被谁卖的"；
--   4. 订单明细（pet_cart）挂 goods_id / sku_id，结算时价格一律以库里的为准。
-- ============================================================

-- ① 商品主表
CREATE TABLE IF NOT EXISTS `pet_goods` (
  `goods_id`    bigint       NOT NULL AUTO_INCREMENT COMMENT '商品ID',
  `goods_code`  varchar(32)  NOT NULL                COMMENT '商品编码（前台业务ID，如 cat-1）',
  `goods_name`  varchar(120) NOT NULL                COMMENT '商品名称',
  `cat`         varchar(16)  DEFAULT NULL            COMMENT '适用宠物分类（cat/dog/rabbit/hamster/bird/fish/reptile）',
  `goods_type`  char(1)      DEFAULT '1'             COMMENT '类型（1宠物粮 2用品 3玩具 4保健）',
  `spec`        varchar(120) DEFAULT NULL            COMMENT '默认规格',
  `price`       decimal(10,2) DEFAULT 0.00           COMMENT '售价',
  `origin_price` decimal(10,2) DEFAULT NULL          COMMENT '划线价',
  `stock`       int          DEFAULT 0               COMMENT '库存汇总（SKU 之和）',
  `unit`        varchar(16)  DEFAULT '件'            COMMENT '单位',
  `image`       varchar(500) DEFAULT NULL            COMMENT '主图',
  `stage`       varchar(64)  DEFAULT NULL            COMMENT '适用阶段',
  `description` varchar(500) DEFAULT NULL            COMMENT '简介',
  `tags`        varchar(255) DEFAULT NULL            COMMENT '卖点标签（逗号分隔）',
  `nutrition`   varchar(255) DEFAULT NULL            COMMENT '营养指标',
  `feeding`     varchar(500) DEFAULT NULL            COMMENT '喂食建议',
  `storage`     varchar(255) DEFAULT NULL            COMMENT '储存方式',
  `status`      char(1)      DEFAULT '0'             COMMENT '状态（0上架 1下架）',
  `sort`        int          DEFAULT 0               COMMENT '排序',
  `del_flag`    char(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  `create_by`   varchar(64)  DEFAULT NULL,
  `create_time` datetime     DEFAULT NULL,
  `update_by`   varchar(64)  DEFAULT NULL,
  `update_time` datetime     DEFAULT NULL,
  `remark`      varchar(500) DEFAULT NULL,
  PRIMARY KEY (`goods_id`),
  UNIQUE KEY `uk_goods_code` (`goods_code`),
  KEY `idx_cat` (`cat`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品';

-- ② 商品 SKU（库存记在这一层）
CREATE TABLE IF NOT EXISTS `pet_goods_sku` (
  `sku_id`      bigint       NOT NULL AUTO_INCREMENT COMMENT 'SKU ID',
  `goods_id`    bigint       NOT NULL                COMMENT '商品ID',
  `sku_name`    varchar(64)  NOT NULL                COMMENT 'SKU 名称（如 1.5kg/袋）',
  `spec`        varchar(120) DEFAULT NULL            COMMENT '规格',
  `price`       decimal(10,2) DEFAULT 0.00           COMMENT 'SKU 售价',
  `stock`       int          DEFAULT 0               COMMENT '可用库存',
  `status`      char(1)      DEFAULT '0'             COMMENT '状态（0正常 1停用）',
  `del_flag`    char(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  `create_time` datetime     DEFAULT NULL,
  `update_time` datetime     DEFAULT NULL,
  PRIMARY KEY (`sku_id`),
  KEY `idx_goods` (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU';

-- ③ 库存流水
CREATE TABLE IF NOT EXISTS `pet_stock_log` (
  `log_id`      bigint      NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `goods_id`    bigint      NOT NULL                COMMENT '商品ID',
  `sku_id`      bigint      DEFAULT NULL            COMMENT 'SKU ID',
  `goods_name`  varchar(120) DEFAULT NULL           COMMENT '商品名称（快照）',
  `sku_name`    varchar(64) DEFAULT NULL            COMMENT 'SKU 名称（快照）',
  `change_type` char(1)     NOT NULL                COMMENT '类型（1入库 2销售出库 3退货入库 4盘亏）',
  `qty`         int         NOT NULL                COMMENT '变动数量（正数）',
  `before_qty`  int         DEFAULT NULL            COMMENT '变动前库存',
  `after_qty`   int         DEFAULT NULL            COMMENT '变动后库存',
  `biz_no`      varchar(32) DEFAULT NULL            COMMENT '关联单号（订单号等）',
  `operator`    varchar(64) DEFAULT NULL            COMMENT '操作人',
  `remark`      varchar(255) DEFAULT NULL           COMMENT '备注',
  `create_time` datetime    DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_goods` (`goods_id`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水';

-- ④ 订单明细挂上商品与 SKU
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `pet_cart` ADD COLUMN `goods_id` bigint DEFAULT NULL COMMENT ''商品ID'' AFTER `customer_id`', 'SELECT 1')
             FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_cart' AND column_name = 'goods_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `pet_cart` ADD COLUMN `sku_id` bigint DEFAULT NULL COMMENT ''SKU ID'' AFTER `goods_id`', 'SELECT 1')
             FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_cart' AND column_name = 'sku_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ⑤ 后台菜单
DELETE FROM `sys_menu` WHERE `menu_id` BETWEEN 2090 AND 2099;

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
 (2090, '商品管理', 2000, 5, 'goods', 'admin/goods/index', 1, 0, 'C', '0', '0', 'pet:goods:list', 'GoodsFilled', 'admin', sysdate(), '商品与库存'),
 (2091, '库存流水', 2090, 1, '', '', 1, 0, 'F', '0', '0', 'pet:stock:list', '#', 'admin', sysdate(), ''),
 (2092, '商品编辑', 2090, 2, '', '', 1, 0, 'F', '0', '0', 'pet:goods:edit', '#', 'admin', sysdate(), ''),
 (2093, '库存调整', 2090, 3, '', '', 1, 0, 'F', '0', '0', 'pet:stock:edit', '#', 'admin', sysdate(), '');

-- 店长：可以看商品与库存、可以入库/出库、不能改价格
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2090, 2091, 2093)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 3 AND rm.menu_id = m.menu_id);

-- ⑥ 把前台写死的 14 款宠物粮迁进商品表（goods_code 沿用前端业务ID，便于评论/点赞继续按 fid 关联）
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'cat-1', '幼猫成长无谷猫粮', 'cat', '1', '1.5kg / 袋', 128, 154, 86, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp', '离乳—12 月龄', '高肉含量配方，添加 DHA 助脑眼发育，无谷低敏易吸收。', '无谷低敏,高肉含量,添加 DHA', '粗蛋白 ≥38% · 粗脂肪 ≥16% · 钙磷比 1.2:1', '幼猫每日 40-60g，分 3-4 次喂食；按 7 日过渡法逐步替换旧粮。', '阴凉干燥处密封保存，开封后请于 4 周内用完。', '0', 1, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'cat-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'cat-2', '全价成猫鲜肉猫粮', 'cat', '1', '2kg / 袋', 158, 190, 64, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-51.webp', '成年猫', '鲜鸡肉为主，低镁配方呵护泌尿系统，毛色亮泽。', '鲜鸡肉,低镁护泌尿,美毛亮泽', '粗蛋白 ≥32% · 粗脂肪 ≥15% · 牛磺酸 0.2%', '成猫每日 50-70g，自由采食或定时定量，保证充足饮水。', '避光密封，置于干燥处，避免受潮结块。', '0', 2, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'cat-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'dog-1', '小型犬幼犬粮', 'dog', '1', '1.5kg / 袋', 119, 143, 120, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp', '幼犬', '小颗粒易咀嚼，高能量密度满足小型犬成长需求。', '小颗粒,高能量,易消化', '粗蛋白 ≥30% · 粗脂肪 ≥18% · DHA 添加', '按体重 4-6%，每天分 3 次；泡软后喂食更佳。', '密封防潮，常温保存，开封后尽快食用。', '0', 3, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'dog-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'dog-2', '大型犬全价犬粮', 'dog', '1', '10kg / 袋', 328, 394, 42, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-48.webp', '成年犬', '添加氨糖与软骨素，呵护关节，均衡钙磷助骨骼。', '关节养护,大包装,均衡钙磷', '粗蛋白 ≥26% · 粗脂肪 ≥14% · 氨糖 + 软骨素', '按体重 2-3%，每天分 2 次，搭配充足运动与饮水。', '阴凉通风处，避免阳光直射与高温。', '0', 4, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'dog-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'rabbit-1', '兔用提摩西草粒', 'rabbit', '1', '1kg / 袋', 69, 83, 58, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp', '全龄', '无限量主草，高纤维助消化磨牙，无添加蔗糖。', '高纤维,磨牙,无蔗糖', '粗纤维 ≥30% · 蛋白质 ≥14%', '作为主草无限量提供，搭配少量兔粮与新鲜蔬菜。', '干燥通风处，防止霉变，切勿沾水。', '0', 5, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'rabbit-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'rabbit-2', '兔用果蔬混合粮', 'rabbit', '1', '800g / 袋', 59, 71, 12, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-47.webp', '全龄', '冻干果蔬 + 维生素，补充营养，挑食兔也爱吃。', '冻干果蔬,多维,挑食友好', '粗纤维 ≥18% · 维生素 A/D/E 强化', '每日 30-50g 搭配主草，作为营养补充。', '密封冷藏更佳，开封后 1 个月内用完。', '0', 6, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'rabbit-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'hamster-1', '仓鼠综合营养粮', 'hamster', '1', '500g / 袋', 39, 47, 74, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp', '全龄', '五谷 + 面包虫均衡配比，磨牙补钙一举两得。', '五谷均衡,面包虫,磨牙补钙', '蛋白质 ≥16% · 脂肪 ≥6%', '每日 10-15g，搭配磨牙石与清洁饮水。', '阴凉干燥密封，防虫防潮。', '0', 7, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'hamster-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'hamster-2', '金丝熊增艳粮', 'hamster', '1', '500g / 袋', 45, 54, 36, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-14-42.webp', '全龄', '富含虾青素与亚麻酸，助毛色鲜亮、皮肤健康。', '虾青素,美毛,亚麻酸', '蛋白质 ≥17% · 富含不饱和脂肪酸', '每日 10-15g，可与主粮混合喂食。', '密封避光，置于阴凉处。', '0', 8, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'hamster-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'bird-1', '鹦鹉滋养丸', 'bird', '1', '500g / 罐', 79, 95, 90, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp', '全龄', '全价均衡营养，替代单一种子粮，羽粉更少更健康。', '全价均衡,替代种子粮,少羽粉', '蛋白质 ≥14% · 维生素矿物质全谱', '每日 15-25g 为主食，搭配新鲜果蔬。', '密封冷藏，避免受潮结块。', '0', 9, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'bird-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'bird-2', '鸣禽种子混合粮', 'bird', '1', '400g / 袋', 35, 42, 8, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-13-19.webp', '全龄', '多种谷物 + 草籽搭配，丰富口感，满足啄食天性。', '多谷物,草籽,口感丰富', '蛋白质 ≥12% · 天然谷物', '每日 10-20g 自由取食，补充墨鱼骨补钙。', '干燥处密封，防虫。', '0', 10, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'bird-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'fish-1', '热带鱼缓沉颗粒', 'fish', '1', '100g / 瓶', 29, 35, 46, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp', '小型鱼', '缓沉不浑水，高蛋白易吸收，体色更鲜艳。', '缓沉不浑水,高蛋白,增色', '粗蛋白 ≥45% · 缓沉型', '每日 2-3 次，每次以 3 分钟内吃完为宜。', '密封防潮，远离高温与阳光。', '0', 11, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'fish-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'fish-2', '水龟全价龟粮', 'fish', '1', '250g / 罐', 49, 59, 52, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-01-05.webp', '水龟', '钙磷平衡配方，添加螺旋藻，龟壳坚硬有光泽。', '钙磷平衡,螺旋藻,硬壳', '粗蛋白 ≥40% · 钙 ≥2%', '幼龟每日、成龟隔日，投喂量以龟头部大小为宜。', '阴凉干燥密封保存，避免受潮。', '0', 12, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'fish-2');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'reptile-1', '蜥蜴爬虫粮', 'reptile', '1', '200g / 袋', 55, 66, 30, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp', '蜥蜴', '蟋蟀粉 + 脱水果蔬，高钙低磷，符合食虫习性。', '蟋蟀粉,高钙低磷,食虫配方', '粗蛋白 ≥42% · 钙磷比 2:1', '每日少量，搭配活体昆虫与 UVB 光照。', '密封干燥，避免阳光直射。', '0', 13, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'reptile-1');
INSERT INTO `pet_goods` (`goods_code`, `goods_name`, `cat`, `goods_type`, `spec`, `price`, `origin_price`, `stock`, `unit`, `image`, `stage`, `description`, `tags`, `nutrition`, `feeding`, `storage`, `status`, `sort`, `create_by`, `create_time`)
SELECT 'reptile-2', '守宫专用粮', 'reptile', '1', '150g / 罐', 52, 62, 24, '袋', '/images/food/Professional_e_commerce_produc_2026-10-12T12-00-52.webp', '守宫', '细腻颗粒易吞咽，强化维生素 D3，助力钙吸收。', '细腻易咽,VD3 强化,助钙吸收', '粗蛋白 ≥40% · 维生素 D3 强化', '隔日喂食，晚间投喂更符合其夜行习性。', '阴凉密封，防潮。', '0', 14, 'admin', sysdate()
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods` WHERE `goods_code` = 'reptile-2');

-- ⑦ 每个商品一个默认 SKU，库存与售价下沉到 SKU
INSERT INTO `pet_goods_sku` (`goods_id`, `sku_name`, `spec`, `price`, `stock`, `status`, `create_time`)
SELECT g.`goods_id`, g.`spec`, g.`spec`, g.`price`, g.`stock`, '0', sysdate() FROM `pet_goods` g
WHERE NOT EXISTS (SELECT 1 FROM `pet_goods_sku` s WHERE s.`goods_id` = g.`goods_id`);

-- ⑧ 期初入库流水，库存不是凭空来的
INSERT INTO `pet_stock_log` (`goods_id`, `sku_id`, `goods_name`, `sku_name`, `change_type`, `qty`, `before_qty`, `after_qty`, `operator`, `remark`, `create_time`)
SELECT s.`goods_id`, s.`sku_id`, g.`goods_name`, s.`sku_name`, '1', s.`stock`, 0, s.`stock`, 'admin', '期初入库', sysdate() FROM `pet_goods_sku` s JOIN `pet_goods` g ON g.`goods_id` = s.`goods_id`
WHERE NOT EXISTS (SELECT 1 FROM `pet_stock_log` l WHERE l.`sku_id` = s.`sku_id`);

-- ⑨ 存量订单明细按商品名回挂 goods_id
UPDATE `pet_cart` c JOIN `pet_goods` g ON g.`goods_name` = c.`goods_name`
SET c.`goods_id` = g.`goods_id`, c.`sku_id` = (SELECT s.`sku_id` FROM `pet_goods_sku` s WHERE s.`goods_id` = g.`goods_id` ORDER BY s.`sku_id` LIMIT 1)
WHERE c.`goods_id` IS NULL;
