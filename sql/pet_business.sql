-- =============================================
-- 宠物管理系统业务表 + 菜单数据
-- 库：ry-pet
-- 说明：基于 RuoYi-Vue3，覆盖任务书"管理员侧+用户侧"功能
--   pet_category    宠物分类   (管理员维护)
--   pet_info        宠物信息   (管理员维护/用户浏览)
--   pet_appointment 预约       (用户发起/管理员处理)
--   pet_favorite    收藏       (用户收藏宠物)
--   消息通知       复用 RuoYi 自带 sys_notice，不重复建表
-- =============================================

DROP TABLE IF EXISTS pet_category;
CREATE TABLE pet_category (
  category_id   BIGINT(20)   NOT NULL AUTO_INCREMENT  COMMENT '分类ID',
  category_name VARCHAR(50)  NOT NULL                 COMMENT '分类名称（如：犬类、猫类、鸟类）',
  sort          INT(4)       DEFAULT 0                COMMENT '显示顺序',
  status        CHAR(1)      DEFAULT '0'              COMMENT '状态（0正常 1停用）',
  create_by     VARCHAR(64)  DEFAULT ''               COMMENT '创建者',
  create_time   DATETIME                               COMMENT '创建时间',
  update_by     VARCHAR(64)  DEFAULT ''               COMMENT '更新者',
  update_time   DATETIME                               COMMENT '更新时间',
  remark        VARCHAR(500) DEFAULT NULL              COMMENT '备注',
  PRIMARY KEY (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物分类表';

DROP TABLE IF EXISTS pet_info;
CREATE TABLE pet_info (
  pet_id        BIGINT(20)   NOT NULL AUTO_INCREMENT  COMMENT '宠物ID',
  category_id   BIGINT(20)   NOT NULL                 COMMENT '分类ID（关联 pet_category）',
  pet_name      VARCHAR(50)  NOT NULL                  COMMENT '宠物名称',
  breed         VARCHAR(50)  DEFAULT NULL             COMMENT '品种（如：金毛、英短）',
  age           VARCHAR(20)  DEFAULT NULL              COMMENT '年龄（如：2岁、3个月）',
  gender        CHAR(1)      DEFAULT '0'              COMMENT '性别（0公 1母 2未知）',
  price         DECIMAL(10,2) DEFAULT 0                COMMENT '价格（元）',
  image         VARCHAR(255) DEFAULT ''               COMMENT '宠物图片URL',
  status        CHAR(1)      DEFAULT '0'              COMMENT '状态（0在售 1已售 2下架）',
  description   TEXT                                   COMMENT '宠物描述',
  create_by     VARCHAR(64)  DEFAULT ''               COMMENT '创建者',
  create_time   DATETIME                               COMMENT '创建时间',
  update_by     VARCHAR(64)  DEFAULT ''               COMMENT '更新者',
  update_time   DATETIME                               COMMENT '更新时间',
  remark        VARCHAR(500) DEFAULT NULL              COMMENT '备注',
  PRIMARY KEY (pet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物信息表';

DROP TABLE IF EXISTS pet_appointment;
CREATE TABLE pet_appointment (
  appointment_id  BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '预约ID',
  user_id         BIGINT(20)   NOT NULL                 COMMENT '用户ID（关联 sys_user）',
  pet_id          BIGINT(20)   NOT NULL                 COMMENT '宠物ID（关联 pet_info）',
  appointment_date DATE                                COMMENT '预约日期',
  contact_phone   VARCHAR(20)  DEFAULT ''               COMMENT '联系电话',
  status          CHAR(1)      DEFAULT '0'              COMMENT '状态（0待处理 1已确认 2已完成 3已取消）',
  create_by       VARCHAR(64)  DEFAULT ''               COMMENT '创建者',
  create_time     DATETIME                               COMMENT '创建时间',
  update_by       VARCHAR(64)  DEFAULT ''               COMMENT '更新者',
  update_time     DATETIME                               COMMENT '更新时间',
  remark          VARCHAR(500) DEFAULT NULL             COMMENT '备注',
  PRIMARY KEY (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物预约表';

DROP TABLE IF EXISTS pet_favorite;
CREATE TABLE pet_favorite (
  favorite_id  BIGINT(20)   NOT NULL AUTO_INCREMENT COMMENT '收藏ID',
  user_id      BIGINT(20)   NOT NULL                 COMMENT '用户ID',
  pet_id       BIGINT(20)   NOT NULL                 COMMENT '宠物ID',
  create_by    VARCHAR(64)  DEFAULT ''               COMMENT '创建者',
  create_time  DATETIME                              COMMENT '收藏时间',
  PRIMARY KEY (favorite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宠物收藏表';

-- =============================================
-- 菜单数据（sys_menu）
-- 父菜单 ID：2（系统管理下的"宠物管理"一级菜单）
--   1000 宠物分类（pet_category）
--   1001 宠物信息（pet_info）
--   1002 预约管理（pet_appointment）
--   1003 收藏管理（pet_favorite）
-- =============================================

-- 一级目录：宠物管理（挂在主菜单下，parent_id=0）
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES ('宠物管理', 0, 6, 'pet', NULL, 1, 0, 'M', '0', '0', '', 'guide', 'admin', NOW(), '宠物管理一级目录');

-- 取到刚插入的一级菜单 ID 作为子菜单父 ID
SET @pet_parent_id = LAST_INSERT_ID();

INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
('宠物分类', @pet_parent_id, 1, 'category', 'pet/category/index', 1, 0, 'C', '0', '0', 'pet:category:list', 'tree-table', 'admin', NOW(), '宠物分类菜单'),
('宠物信息', @pet_parent_id, 2, 'info',     'pet/info/index',     1, 0, 'C', '0', '0', 'pet:info:list',     'documentation', 'admin', NOW(), '宠物信息菜单'),
('预约管理', @pet_parent_id, 3, 'appointment', 'pet/appointment/index', 1, 0, 'C', '0', '0', 'pet:appointment:list', 'date', 'admin', NOW(), '预约管理菜单'),
('收藏管理', @pet_parent_id, 4, 'favorite', 'pet/favorite/index', 1, 0, 'C', '0', '0', 'pet:favorite:list', 'star', 'admin', NOW(), '收藏管理菜单');

-- 子菜单 ID（用于按钮权限）
SET @cat_menu_id = LAST_INSERT_ID();

-- 宠物分类按钮权限
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
('分类查询', @cat_menu_id, 1, '#', '', 1, 0, 'F', '0', '0', 'pet:category:query',  '#', 'admin', NOW(), ''),
('分类新增', @cat_menu_id, 2, '#', '', 1, 0, 'F', '0', '0', 'pet:category:add',    '#', 'admin', NOW(), ''),
('分类修改', @cat_menu_id, 3, '#', '', 1, 0, 'F', '0', '0', 'pet:category:edit',    '#', 'admin', NOW(), ''),
('分类删除', @cat_menu_id, 4, '#', '', 1, 0, 'F', '0', '0', 'pet:category:remove',  '#', 'admin', NOW(), ''),
('分类导出', @cat_menu_id, 5, '#', '', 1, 0, 'F', '0', '0', 'pet:category:export',  '#', 'admin', NOW(), '');

-- 给 admin 角色（role_id=1）分配所有新菜单权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, menu_id FROM sys_menu WHERE perms LIKE 'pet:%' OR menu_name = '宠物管理';
