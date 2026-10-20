-- =============================================
-- 补充宠物业务模块按钮权限 + 前台菜单
-- 给 pet_info / pet_appointment / pet_favorite 各加 query/add/edit/remove/export
-- 加"宠物前台"菜单（path=shop, component=pet/shop/index）
-- admin 角色分配所有新增权限
-- =============================================

-- 取各二级菜单 ID
SET @info_menu = (SELECT menu_id FROM sys_menu WHERE perms = 'pet:info:list');
SET @appt_menu = (SELECT menu_id FROM sys_menu WHERE perms = 'pet:appointment:list');
SET @fav_menu  = (SELECT menu_id FROM sys_menu WHERE perms = 'pet:favorite:list');
SET @pet_dir   = (SELECT menu_id FROM sys_menu WHERE menu_name = '宠物管理');

-- 宠物信息按钮权限
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
('宠物查询', @info_menu, 1, '#', '', 1, 0, 'F', '0', '0', 'pet:info:query',  '#', 'admin', NOW(), ''),
('宠物新增', @info_menu, 2, '#', '', 1, 0, 'F', '0', '0', 'pet:info:add',    '#', 'admin', NOW(), ''),
('宠物修改', @info_menu, 3, '#', '', 1, 0, 'F', '0', '0', 'pet:info:edit',   '#', 'admin', NOW(), ''),
('宠物删除', @info_menu, 4, '#', '', 1, 0, 'F', '0', '0', 'pet:info:remove', '#', 'admin', NOW(), ''),
('宠物导出', @info_menu, 5, '#', '', 1, 0, 'F', '0', '0', 'pet:info:export', '#', 'admin', NOW(), '');

-- 预约按钮权限
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
('预约查询', @appt_menu, 1, '#', '', 1, 0, 'F', '0', '0', 'pet:appointment:query',  '#', 'admin', NOW(), ''),
('预约新增', @appt_menu, 2, '#', '', 1, 0, 'F', '0', '0', 'pet:appointment:add',    '#', 'admin', NOW(), ''),
('预约修改', @appt_menu, 3, '#', '', 1, 0, 'F', '0', '0', 'pet:appointment:edit',   '#', 'admin', NOW(), ''),
('预约删除', @appt_menu, 4, '#', '', 1, 0, 'F', '0', '0', 'pet:appointment:remove', '#', 'admin', NOW(), ''),
('预约导出', @appt_menu, 5, '#', '', 1, 0, 'F', '0', '0', 'pet:appointment:export', '#', 'admin', NOW(), '');

-- 收藏按钮权限
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
('收藏查询', @fav_menu, 1, '#', '', 1, 0, 'F', '0', '0', 'pet:favorite:query',  '#', 'admin', NOW(), ''),
('收藏新增', @fav_menu, 2, '#', '', 1, 0, 'F', '0', '0', 'pet:favorite:add',    '#', 'admin', NOW(), ''),
('收藏删除', @fav_menu, 3, '#', '', 1, 0, 'F', '0', '0', 'pet:favorite:remove', '#', 'admin', NOW(), ''),
('收藏导出', @fav_menu, 4, '#', '', 1, 0, 'F', '0', '0', 'pet:favorite:export', '#', 'admin', NOW(), '');

-- 前台浏览菜单（挂在宠物管理目录下，置顶 order_num=0）
INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES ('宠物前台', @pet_dir, 0, 'shop', 'pet/shop/index', 1, 0, 'C', '0', '0', 'pet:shop', 'shopping', 'admin', NOW(), '用户侧前台浏览页');

-- 给 admin 角色（role_id=1）分配所有新菜单权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, menu_id FROM sys_menu
WHERE perms LIKE 'pet:%' AND menu_id NOT IN (SELECT menu_id FROM sys_role_menu WHERE role_id = 1);
