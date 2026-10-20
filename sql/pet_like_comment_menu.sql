-- 81 原生后台菜单：点赞管理 / 评论管理（挂在"宠物管理"2000 下）
-- 菜单 ID 从 2030 起，避免与现有 2000-2024 冲突

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2030, '点赞管理', 2000, 6, 'like', 'pet/like/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:like:list', 'star', 'admin', NOW(), '宠物点赞管理菜单'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2030);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2031, '评论管理', 2000, 7, 'comment', 'pet/comment/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:comment:manage', 'message', 'admin', NOW(), '宠物评论管理菜单'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2031);

-- 按钮权限
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2032, '点赞删除', 2030, 1, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:like:remove', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2032);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2033, '评论修改', 2031, 1, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:comment:edit', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2033);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2034, '评论删除', 2031, 2, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:comment:remove', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2034);

-- 授权给所有含"宠物管理"目录的角色
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT rm.role_id, m.menu_id
FROM sys_role_menu rm
JOIN (SELECT 2030 AS menu_id UNION SELECT 2031 UNION SELECT 2032 UNION SELECT 2033 UNION SELECT 2034) m
WHERE rm.menu_id = 2000
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = rm.role_id AND x.menu_id = m.menu_id);
