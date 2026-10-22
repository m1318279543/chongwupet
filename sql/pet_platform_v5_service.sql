-- ============================================================
-- 平台化第五步：服务工单（把「预约」升级为可履约的工单）
-- 依赖：pet_platform_v1.sql（门店/员工/客户/归属）
-- 说明：预约只是「客户想来」，工单才是「店里有活要干」。
--       工单带服务项目、价格、执行人、开始/完成时间与状态流水。
-- ============================================================

-- ① 服务项目（洗澡/美容/寄养/医疗/训练/到店接待）
CREATE TABLE IF NOT EXISTS `pet_service_item` (
  `item_id`     bigint       NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `item_name`   varchar(64)  NOT NULL                COMMENT '项目名称',
  `item_type`   char(1)      DEFAULT '1'             COMMENT '类型（1洗护 2美容 3寄养 4医疗 5训练 6接待）',
  `price`       decimal(10,2) DEFAULT 0.00           COMMENT '标准价',
  `duration`    int          DEFAULT 60              COMMENT '标准时长（分钟）',
  `store_id`    bigint       DEFAULT NULL            COMMENT '限定门店（NULL=全门店通用）',
  `sort`        int          DEFAULT 0               COMMENT '排序',
  `status`      char(1)      DEFAULT '0'             COMMENT '状态（0上架 1下架）',
  `del_flag`    char(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  `remark`      varchar(255) DEFAULT NULL            COMMENT '备注',
  `create_by`   varchar(64)  DEFAULT NULL,
  `create_time` datetime     DEFAULT NULL,
  `update_by`   varchar(64)  DEFAULT NULL,
  `update_time` datetime     DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_store` (`store_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务项目';

-- ② 服务工单
CREATE TABLE IF NOT EXISTS `pet_service_order` (
  `service_id`     bigint       NOT NULL AUTO_INCREMENT COMMENT '工单ID',
  `service_no`     varchar(32)  NOT NULL                COMMENT '工单号',
  `appointment_id` bigint       DEFAULT NULL            COMMENT '来源预约ID',
  `store_id`       bigint       DEFAULT NULL            COMMENT '门店ID',
  `customer_id`    bigint       DEFAULT NULL            COMMENT '客户ID',
  `user_id`        bigint       DEFAULT NULL            COMMENT '账号ID',
  `customer_name`  varchar(64)  DEFAULT NULL            COMMENT '客户姓名（下单时快照）',
  `pet_id`         bigint       DEFAULT NULL            COMMENT '宠物ID',
  `pet_name`       varchar(64)  DEFAULT NULL            COMMENT '宠物名称（快照）',
  `item_id`        bigint       DEFAULT NULL            COMMENT '服务项目ID',
  `item_name`      varchar(64)  DEFAULT NULL            COMMENT '服务项目名称（快照）',
  `item_type`      char(1)      DEFAULT '1'             COMMENT '项目类型（快照）',
  `price`          decimal(10,2) DEFAULT 0.00           COMMENT '成交价（快照，后台可改）',
  `staff_id`       bigint       DEFAULT NULL            COMMENT '执行员工ID',
  `staff_name`     varchar(32)  DEFAULT NULL            COMMENT '执行员工姓名',
  `appoint_time`   datetime     DEFAULT NULL            COMMENT '约定到店时间',
  `start_time`     datetime     DEFAULT NULL            COMMENT '开始服务时间',
  `finish_time`    datetime     DEFAULT NULL            COMMENT '完成时间',
  `status`         char(1)      DEFAULT '0'             COMMENT '状态（0待接单 1已接单 2服务中 3已完成 4已取消 5爽约）',
  `pay_status`     char(1)      DEFAULT '0'             COMMENT '收费状态（0未收 1已收）',
  `score`          int          DEFAULT NULL            COMMENT '客户评分（1-5）',
  `comment`        varchar(500) DEFAULT NULL            COMMENT '客户评价',
  `source`         char(1)      DEFAULT '1'             COMMENT '来源（1预约 2后台开单）',
  `del_flag`       char(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  `remark`         varchar(500) DEFAULT NULL            COMMENT '备注/取消原因',
  `create_by`      varchar(64)  DEFAULT NULL,
  `create_time`    datetime     DEFAULT NULL,
  `update_by`      varchar(64)  DEFAULT NULL,
  `update_time`    datetime     DEFAULT NULL,
  PRIMARY KEY (`service_id`),
  UNIQUE KEY `uk_service_no` (`service_no`),
  KEY `idx_store_status` (`store_id`, `status`),
  KEY `idx_staff` (`staff_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务工单';

-- ③ 工单状态流水（谁在什么时候把工单推到了哪一步）
CREATE TABLE IF NOT EXISTS `pet_service_log` (
  `log_id`      bigint      NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `service_id`  bigint      NOT NULL                COMMENT '工单ID',
  `from_status` char(1)     DEFAULT NULL            COMMENT '原状态',
  `to_status`   char(1)     NOT NULL                COMMENT '新状态',
  `operator`    varchar(64) DEFAULT NULL            COMMENT '操作人',
  `remark`      varchar(255) DEFAULT NULL           COMMENT '说明',
  `create_time` datetime    DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_service` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单状态流水';

-- ④ 演示用服务项目
INSERT INTO `pet_service_item` (`item_name`, `item_type`, `price`, `duration`, `sort`, `status`, `remark`, `create_by`, `create_time`)
SELECT * FROM (
  SELECT '到店看宠接待' AS a, '6' AS b, 0.00 AS c, 30 AS d, 1 AS e, '0' AS f, '预约到店的基础工单，不计费' AS g, 'admin' AS h, sysdate() AS i
  UNION ALL SELECT '基础洗护（犬）', '1', 88.00, 60, 2, '0', '洗澡+吹干+基础梳理', 'admin', sysdate()
  UNION ALL SELECT '基础洗护（猫）', '1', 98.00, 60, 3, '0', '含应激安抚', 'admin', sysdate()
  UNION ALL SELECT '精致美容造型', '2', 168.00, 90, 4, '0', '剪毛+造型+指甲+耳道', 'admin', sysdate()
  UNION ALL SELECT '宠物寄养（每天）', '3', 60.00, 1440, 5, '0', '含两次遛放与喂食', 'admin', sysdate()
  UNION ALL SELECT '健康体检套餐', '4', 128.00, 45, 6, '0', '基础体格+血常规', 'admin', sysdate()
  UNION ALL SELECT '上门接送', '6', 30.00, 40, 7, '0', '市区 5 公里内', 'admin', sysdate()
) t
WHERE NOT EXISTS (SELECT 1 FROM `pet_service_item`);

-- ⑤ 存量预约补生成工单（保证历史数据也能在工单列表里看到）
INSERT INTO `pet_service_order`
  (`service_no`, `appointment_id`, `store_id`, `customer_id`, `user_id`, `customer_name`,
   `pet_id`, `pet_name`, `item_id`, `item_name`, `item_type`, `price`,
   `appoint_time`, `status`, `pay_status`, `source`, `create_time`)
SELECT CONCAT('SV', DATE_FORMAT(a.create_time, '%Y%m%d'), LPAD(a.appointment_id, 6, '0')),
       a.appointment_id,
       IFNULL(a.store_id, 1),
       a.customer_id,
       a.user_id,
       c.customer_name,
       a.pet_id,
       p.pet_name,
       1,
       '到店看宠接待',
       '6',
       0.00,
       a.appointment_date,
       CASE a.status WHEN '1' THEN '1' WHEN '2' THEN '3' WHEN '3' THEN '4' ELSE '0' END,
       '0',
       '1',
       a.create_time
FROM `pet_appointment` a
LEFT JOIN `pet_info` p ON p.pet_id = a.pet_id
LEFT JOIN `pet_customer` c ON c.customer_id = a.customer_id
WHERE NOT EXISTS (SELECT 1 FROM `pet_service_order` s WHERE s.appointment_id = a.appointment_id);

-- 已完成工单补完成时间与收费状态，看板统计才有意义
UPDATE `pet_service_order`
SET `finish_time` = IFNULL(`finish_time`, DATE_ADD(`appoint_time`, INTERVAL 60 MINUTE)),
    `start_time`  = IFNULL(`start_time`, `appoint_time`),
    `staff_id`    = IFNULL(`staff_id`, (SELECT `staff_id` FROM `pet_staff` WHERE `store_id` = `pet_service_order`.`store_id` AND `del_flag` = '0' ORDER BY `staff_id` LIMIT 1)),
    `staff_name`  = IFNULL(`staff_name`, (SELECT `staff_name` FROM `pet_staff` WHERE `store_id` = `pet_service_order`.`store_id` AND `del_flag` = '0' ORDER BY `staff_id` LIMIT 1)),
    `pay_status`  = '1',
    `score`       = IFNULL(`score`, 5)
WHERE `status` = '3';

-- ⑥ 后台菜单：服务工单 / 服务项目
DELETE FROM `sys_menu` WHERE `menu_id` BETWEEN 2080 AND 2089;

INSERT INTO `sys_menu` (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`, `create_by`, `create_time`, `remark`)
VALUES
 (2080, '服务工单', 2000, 3, 'service', 'admin/service/index', 1, 0, 'C', '0', '0', 'pet:service:list', 'Tickets', 'admin', sysdate(), '服务工单管理'),
 (2081, '服务项目', 2000, 4, 'serviceItem', 'admin/service/item', 1, 0, 'C', '0', '0', 'pet:serviceitem:list', 'Goods', 'admin', sysdate(), '服务项目与价格'),
 (2082, '工单接单', 2080, 1, '', '', 1, 0, 'F', '0', '0', 'pet:service:dispatch', '#', 'admin', sysdate(), ''),
 (2083, '工单完成', 2080, 2, '', '', 1, 0, 'F', '0', '0', 'pet:service:finish', '#', 'admin', sysdate(), ''),
 (2084, '工单取消', 2080, 3, '', '', 1, 0, 'F', '0', '0', 'pet:service:cancel', '#', 'admin', sysdate(), ''),
 (2085, '服务项目维护', 2081, 1, '', '', 1, 0, 'F', '0', '0', 'pet:serviceitem:edit', '#', 'admin', sysdate(), '');

-- ⑦ 店长授权（店长可接单/完成工单，但不能维护价格）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, m.menu_id FROM `sys_menu` m
WHERE m.menu_id IN (2080, 2082, 2083, 2084, 2081)
  AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` rm WHERE rm.role_id = 3 AND rm.menu_id = m.menu_id);

-- ⑧ 回填工单上的客户/宠物快照（存量预约可能没带 customer_id，靠账号与宠物表补）
UPDATE `pet_service_order` o
LEFT JOIN `sys_user` u ON u.`user_id` = o.`user_id`
LEFT JOIN `pet_info` p ON p.`pet_id` = o.`pet_id`
LEFT JOIN `pet_customer` c ON c.`customer_id` = o.`customer_id`
SET o.`customer_name` = IFNULL(o.`customer_name`, IFNULL(c.`customer_name`, IFNULL(u.`nick_name`, u.`user_name`))),
    o.`pet_name` = IFNULL(o.`pet_name`, IFNULL(p.`pet_name`, '已下架宠物'));

UPDATE `pet_service_order` o JOIN `pet_customer` c ON c.`user_id` = o.`user_id`
SET o.`customer_id` = c.`customer_id` WHERE o.`customer_id` IS NULL;

UPDATE `pet_service_order`
SET `customer_name` = '历史客户'
WHERE `customer_name` IS NULL;

-- ⑨ 门店归属与宠物档案对齐（演示用：让各门店都有工单，数据隔离才看得出效果）
UPDATE `pet_service_order` o JOIN `pet_info` p ON p.`pet_id` = o.`pet_id`
SET o.`store_id` = p.`store_id` WHERE p.`store_id` IS NOT NULL;
UPDATE `pet_appointment` a JOIN `pet_info` p ON p.`pet_id` = a.`pet_id`
SET a.`store_id` = p.`store_id` WHERE p.`store_id` IS NOT NULL;

-- ⑩ 修复历史数据：已接单/服务中/已完成却没有执行人的，按门店补默认执行人
UPDATE `pet_service_order` o
JOIN `pet_staff` s ON s.`store_id` = o.`store_id` AND s.`del_flag` = '0'
SET o.`staff_id` = s.`staff_id`, o.`staff_name` = s.`staff_name`
WHERE o.`status` IN ('1', '2', '3') AND o.`staff_id` IS NULL;

-- ⑪ 工单与预约保持同一归属与状态（避免"预约待处理、工单已服务中"这种自相矛盾）
UPDATE `pet_service_order` o JOIN `pet_appointment` a ON a.`appointment_id` = o.`appointment_id`
SET o.`user_id` = a.`user_id`,
    o.`customer_id` = IFNULL(o.`customer_id`, a.`customer_id`)
WHERE o.`user_id` <> a.`user_id` OR o.`customer_id` IS NULL;

UPDATE `pet_appointment` a JOIN `pet_service_order` o ON o.`appointment_id` = a.`appointment_id`
SET a.`status` = CASE o.`status` WHEN '1' THEN '1' WHEN '2' THEN '1' WHEN '3' THEN '2' WHEN '4' THEN '3' ELSE a.`status` END
WHERE o.`status` IN ('1', '2', '3', '4');

-- ⑫ 每张工单至少有一条创建流水，详情页的时间线不会是空白的
INSERT INTO `pet_service_log` (`service_id`, `from_status`, `to_status`, `operator`, `remark`, `create_time`)
SELECT o.`service_id`, NULL, o.`status`, 'system', '历史预约补登工单', o.`create_time`
FROM `pet_service_order` o
WHERE NOT EXISTS (SELECT 1 FROM `pet_service_log` l WHERE l.`service_id` = o.`service_id`);
