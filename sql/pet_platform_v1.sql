-- ============================================================
-- 平台化第一步：立主数据主干（门店 / 员工 / 客户 / 宠物归属）
-- 2026-10-21
--
-- 背景：原系统只有「宠物档案」一根主干，缺门店与客户，
--       导致所有业务默认「世界上只有一家店、一个账号」。
--       本脚本补四张主数据表，并把门店/客户挂到现有业务表上。
--
-- 执行顺序：在所有既有 sql/*.sql 之后执行一次（ALTER 不可重复执行）
-- ============================================================

SET NAMES utf8mb4;

-- ① 门店
CREATE TABLE IF NOT EXISTS pet_store (
  store_id       BIGINT       NOT NULL AUTO_INCREMENT COMMENT '门店ID',
  store_code     VARCHAR(32)  NOT NULL                COMMENT '门店编码',
  store_name     VARCHAR(64)  NOT NULL                COMMENT '门店名称',
  store_type     CHAR(1)      DEFAULT '0'             COMMENT '门店类型（0直营 1加盟）',
  manager_name   VARCHAR(32)  DEFAULT ''              COMMENT '店长',
  phone          VARCHAR(20)  DEFAULT ''              COMMENT '联系电话',
  province       VARCHAR(32)  DEFAULT ''              COMMENT '省',
  city           VARCHAR(32)  DEFAULT ''              COMMENT '市',
  address        VARCHAR(200) DEFAULT ''              COMMENT '详细地址',
  business_hours VARCHAR(64)  DEFAULT ''              COMMENT '营业时间',
  pet_capacity   INT          DEFAULT 0               COMMENT '可容纳宠物数',
  open_date      DATE         DEFAULT NULL            COMMENT '开业日期',
  status         CHAR(1)      DEFAULT '0'             COMMENT '状态（0营业 1停业）',
  del_flag       CHAR(1)      DEFAULT '0'             COMMENT '删除标志（0存在 2删除）',
  create_by      VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time    DATETIME     DEFAULT NULL            COMMENT '创建时间',
  update_by      VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time    DATETIME     DEFAULT NULL            COMMENT '更新时间',
  remark         VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (store_id),
  UNIQUE KEY uk_store_code (store_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店';

-- ② 员工（一个后台账号可绑定一个门店与一个岗位）
CREATE TABLE IF NOT EXISTS pet_staff (
  staff_id     BIGINT       NOT NULL AUTO_INCREMENT COMMENT '员工ID',
  user_id      BIGINT       DEFAULT NULL            COMMENT '关联 sys_user.user_id',
  store_id     BIGINT       NOT NULL                COMMENT '所属门店',
  staff_name   VARCHAR(32)  NOT NULL                COMMENT '姓名',
  post         VARCHAR(32)  DEFAULT '店员'          COMMENT '岗位（店长/店员/美容师/医生/库管）',
  phone        VARCHAR(20)  DEFAULT ''              COMMENT '手机号',
  entry_date   DATE         DEFAULT NULL            COMMENT '入职日期',
  status       CHAR(1)      DEFAULT '0'             COMMENT '状态（0在职 1离职）',
  del_flag     CHAR(1)      DEFAULT '0'             COMMENT '删除标志',
  create_by    VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time  DATETIME     DEFAULT NULL            COMMENT '创建时间',
  update_by    VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time  DATETIME     DEFAULT NULL            COMMENT '更新时间',
  remark       VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (staff_id),
  UNIQUE KEY uk_staff_user (user_id),
  KEY idx_staff_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工';

-- ③ 客户档案（与账号解耦：到店客可以先建档、后注册）
CREATE TABLE IF NOT EXISTS pet_customer (
  customer_id    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '客户ID',
  customer_code  VARCHAR(32)  NOT NULL                COMMENT '客户编号',
  user_id        BIGINT       DEFAULT NULL            COMMENT '关联账号（可空）',
  customer_name  VARCHAR(32)  NOT NULL                COMMENT '客户姓名',
  phone          VARCHAR(20)  DEFAULT ''              COMMENT '手机号',
  gender         CHAR(1)      DEFAULT '2'             COMMENT '性别（0男 1女 2未知）',
  birthday       DATE         DEFAULT NULL            COMMENT '生日',
  store_id       BIGINT       DEFAULT NULL            COMMENT '归属门店',
  level          VARCHAR(16)  DEFAULT '普通'          COMMENT '会员等级（普通/银卡/金卡/黑卡）',
  source         VARCHAR(32)  DEFAULT '到店'          COMMENT '来源渠道',
  tags           VARCHAR(200) DEFAULT ''              COMMENT '标签（逗号分隔）',
  order_count    INT          DEFAULT 0               COMMENT '累计订单数',
  total_amount   DECIMAL(12,2) DEFAULT 0              COMMENT '累计消费金额',
  first_deal_time DATETIME    DEFAULT NULL            COMMENT '首次成交时间',
  last_deal_time  DATETIME    DEFAULT NULL            COMMENT '最近成交时间',
  status         CHAR(1)      DEFAULT '0'             COMMENT '状态（0正常 1流失）',
  del_flag       CHAR(1)      DEFAULT '0'             COMMENT '删除标志',
  create_by      VARCHAR(64)  DEFAULT ''              COMMENT '创建者',
  create_time    DATETIME     DEFAULT NULL            COMMENT '创建时间',
  update_by      VARCHAR(64)  DEFAULT ''              COMMENT '更新者',
  update_time    DATETIME     DEFAULT NULL            COMMENT '更新时间',
  remark         VARCHAR(500) DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (customer_id),
  UNIQUE KEY uk_customer_code (customer_code),
  KEY idx_customer_user (user_id),
  KEY idx_customer_store (store_id),
  KEY idx_customer_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户档案';

-- ④ 宠物归属（多对多 + 易主历史：end_time 为空表示当前主人）
CREATE TABLE IF NOT EXISTS pet_owner (
  owner_id    BIGINT   NOT NULL AUTO_INCREMENT COMMENT '归属ID',
  pet_id      BIGINT   NOT NULL                COMMENT '宠物ID',
  customer_id BIGINT   NOT NULL                COMMENT '客户ID',
  relation    VARCHAR(16) DEFAULT '现主人'     COMMENT '关系（现主人/历史主人）',
  start_time  DATETIME DEFAULT NULL            COMMENT '归属开始时间',
  end_time    DATETIME DEFAULT NULL            COMMENT '归属结束时间（空=仍在名下）',
  del_flag    CHAR(1)  DEFAULT '0'             COMMENT '删除标志',
  create_by   VARCHAR(64)  DEFAULT ''          COMMENT '创建者',
  create_time DATETIME DEFAULT NULL            COMMENT '创建时间',
  remark      VARCHAR(500) DEFAULT NULL        COMMENT '备注',
  PRIMARY KEY (owner_id),
  KEY idx_owner_pet (pet_id),
  KEY idx_owner_customer (customer_id),
  KEY idx_owner_current (pet_id, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物归属（含易主历史）';

-- ⑤ 给现有业务表挂上门店与客户
SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_info` ADD COLUMN `store_id` bigint DEFAULT NULL COMMENT ''所属门店'' AFTER `category_id`, ADD KEY `idx_pet_store` (`store_id`)',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_info' AND column_name = 'store_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_cart` ADD COLUMN `store_id` bigint DEFAULT NULL COMMENT ''门店ID'' AFTER `user_id`, ADD COLUMN `customer_id` bigint DEFAULT NULL COMMENT ''客户ID'' AFTER `store_id`, ADD KEY `idx_cart_store` (`store_id`), ADD KEY `idx_cart_customer` (`customer_id`)',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_cart' AND column_name = 'store_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_appointment` ADD COLUMN `store_id` bigint DEFAULT NULL COMMENT ''门店ID'' AFTER `pet_id`, ADD COLUMN `customer_id` bigint DEFAULT NULL COMMENT ''客户ID'' AFTER `store_id`, ADD KEY `idx_apt_store` (`store_id`), ADD KEY `idx_apt_customer` (`customer_id`)',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_appointment' AND column_name = 'store_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `pet_health` ADD COLUMN `store_id` bigint DEFAULT NULL COMMENT ''所属门店'' AFTER `pet_id`',
    'SELECT 1')
    FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pet_health' AND column_name = 'store_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 演示数据
-- ============================================================

INSERT INTO pet_store (store_id, store_code, store_name, store_type, manager_name, phone, province, city, address, business_hours, pet_capacity, open_date, status, create_by, create_time, remark) VALUES
(1, 'S001', '宠物之家·总店', '0', '陈明', '023-88880001', '重庆市', '重庆市', '渝中区解放碑步行街 88 号', '09:00-21:00', 60, '2021-05-01', '0', 'admin', NOW(), '旗舰店，含活体展示、医疗服务区'),
(2, 'S002', '宠物之家·高新店', '0', '李婷', '023-88880002', '重庆市', '重庆市', '九龙坡区科园四路 12 号', '10:00-22:00', 40, '2023-03-18', '0', 'admin', NOW(), '社区店，主营养护与零售'),
(3, 'S003', '宠物之家·江北店', '1', '王浩', '023-88880003', '重庆市', '重庆市', '江北区观音桥北城天街 5 号', '10:00-22:00', 30, '2024-09-10', '0', 'admin', NOW(), '加盟店，以猫舍与寄养为主')
ON DUPLICATE KEY UPDATE store_name = VALUES(store_name);

INSERT INTO pet_staff (user_id, store_id, staff_name, post, phone, entry_date, status, create_by, create_time) VALUES
(1, 1, '陈明', '店长', '13800000001', '2021-05-01', '0', 'admin', NOW()),
(2, 1, '李婷', '店员', '13800000002', '2023-03-18', '0', 'admin', NOW()),
(NULL, 1, '周雪', '美容师', '13800000003', '2022-07-01', '0', 'admin', NOW()),
(NULL, 1, '刘一鸣', '兽医', '13800000004', '2023-01-09', '0', 'admin', NOW()),
(NULL, 2, '赵强', '店长', '13800000005', '2023-03-18', '0', 'admin', NOW()),
(NULL, 3, '王浩', '店长', '13800000006', '2024-09-10', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE staff_name = VALUES(staff_name);

-- 存量账号转成客户档案（跳过管理员）
INSERT INTO pet_customer (customer_code, user_id, customer_name, phone, store_id, level, source, order_count, total_amount, create_by, create_time)
SELECT CONCAT('C', LPAD(u.user_id, 6, '0')), u.user_id, u.nick_name, u.phonenumber, 1, '普通', '线上商城', 0, 0, 'admin', NOW()
FROM sys_user u
WHERE u.user_id <> 1 AND u.del_flag = '0'
  AND NOT EXISTS (SELECT 1 FROM pet_customer c WHERE c.user_id = u.user_id);

-- 到店客户 / 待召回客户（演示分级与来源）
INSERT INTO pet_customer (customer_code, customer_name, phone, gender, birthday, store_id, level, source, tags, order_count, total_amount, first_deal_time, last_deal_time, status, create_by, create_time, remark) VALUES
('C100001', '张伟', '13900000001', '0', '1988-04-12', 1, '金卡', '到店', '养猫,高复购,价格不敏感', 8, 12680.00, '2024-02-11 10:20:00', '2026-09-28 16:40:00', '0', 'admin', NOW(), '家里两只英短，长期买处方粮'),
('C100002', '李娜', '13900000002', '1', '1995-11-03', 1, '银卡', '抖音', '新手,比价,关注售后', 3, 3200.00, '2025-12-02 14:00:00', '2026-08-19 11:15:00', '0', 'admin', NOW(), '第一次养猫，咨询较多'),
('C100003', '王强', '13900000003', '0', '1982-07-21', 2, '黑卡', '转介绍', '多宠,寄养常客', 21, 45800.00, '2023-06-05 09:30:00', '2026-10-12 19:05:00', '0', 'admin', NOW(), '三狗两猫，节假日固定寄养'),
('C100004', '刘敏', '13900000004', '1', '1998-02-17', 3, '普通', '美团', '只看不下单', 0, 0, NULL, NULL, '1', 'admin', NOW(), '预约看宠 3 次未成交，待召回'),
('C100005', '陈晨', '13900000005', '0', '1990-09-09', 2, '银卡', '到店', '养犬,洗澡卡用户', 6, 8600.00, '2024-11-20 15:10:00', '2026-07-30 10:00:00', '1', 'admin', NOW(), '近 3 个月无消费，疑似流失')
ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name);

-- 从历史预约 / 收藏回填宠物归属
INSERT INTO pet_owner (pet_id, customer_id, relation, start_time, create_by, create_time)
SELECT a.pet_id, c.customer_id, '现主人', MIN(a.create_time), 'admin', NOW()
FROM pet_appointment a
JOIN pet_customer c ON c.user_id = a.user_id
WHERE a.pet_id IS NOT NULL
GROUP BY a.pet_id, c.customer_id;

INSERT INTO pet_owner (pet_id, customer_id, relation, start_time, create_by, create_time)
SELECT f.pet_id, c.customer_id, '关注', MIN(f.create_time), 'admin', NOW()
FROM pet_favorite f
JOIN pet_customer c ON c.user_id = f.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM pet_owner o
    WHERE o.pet_id = f.pet_id AND o.customer_id = c.customer_id AND o.end_time IS NULL
)
GROUP BY f.pet_id, c.customer_id;

-- 业务表回填门店：存量数据一律归总店
UPDATE pet_info SET store_id = 1 WHERE store_id IS NULL;
UPDATE pet_cart SET store_id = 1 WHERE store_id IS NULL;
UPDATE pet_appointment SET store_id = 1 WHERE store_id IS NULL;
UPDATE pet_health SET store_id = 1 WHERE store_id IS NULL;

UPDATE pet_cart c
JOIN pet_customer cu ON cu.user_id = c.user_id
SET c.customer_id = cu.customer_id
WHERE c.customer_id IS NULL;

UPDATE pet_appointment a
JOIN pet_customer cu ON cu.user_id = a.user_id
SET a.customer_id = cu.customer_id
WHERE a.customer_id IS NULL;

-- 客户消费汇总回填（有历史订单的账号）
UPDATE pet_customer c
JOIN (
    SELECT cu.customer_id, COUNT(*) AS cnt, SUM(x.amount) AS amt, MIN(x.create_time) AS first_t, MAX(x.create_time) AS last_t
    FROM pet_cart x
    JOIN pet_customer cu ON cu.user_id = x.user_id
    WHERE x.status <> '3' AND x.amount IS NOT NULL
    GROUP BY cu.customer_id
) s ON s.customer_id = c.customer_id
SET c.order_count = s.cnt,
    c.total_amount = IFNULL(s.amt, 0),
    c.first_deal_time = s.first_t,
    c.last_deal_time = s.last_t;

-- ⑥ 后台菜单（挂在「宠物管理」2000 下；后台侧边栏由前端静态定义，这里保留权限位）
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2060, '门店管理', 2000, 9, 'store', 'pet/store/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:store:list', 'shop', 'admin', NOW(), '门店主数据'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2060);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2061, '客户档案', 2000, 10, 'customer', 'pet/customer/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:customer:list', 'user', 'admin', NOW(), '客户主数据与名下宠物'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2061);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2062, '门店新增', 2060, 1, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:store:add', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2062);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2063, '门店修改', 2060, 2, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:store:edit', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2063);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2064, '门店删除', 2060, 3, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:store:remove', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2064);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2065, '客户新增', 2061, 1, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:customer:add', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2065);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2066, '客户修改', 2061, 2, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:customer:edit', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2066);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2067, '客户删除', 2061, 3, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:customer:remove', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2067);

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT rm.role_id, m.menu_id
FROM sys_role_menu rm
JOIN (SELECT 2060 AS menu_id UNION SELECT 2061 UNION SELECT 2062 UNION SELECT 2063 UNION SELECT 2064
      UNION SELECT 2065 UNION SELECT 2066 UNION SELECT 2067) m
WHERE rm.menu_id = 2000
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = rm.role_id AND x.menu_id = m.menu_id);
