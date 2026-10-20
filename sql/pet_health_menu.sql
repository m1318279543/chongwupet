-- 81 原生后台菜单：健康档案（挂在"宠物管理"2000 下）
-- 菜单 ID 从 2035 起，避免与现有 2000-2034 冲突

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2035, '健康档案', 2000, 8, 'health', 'pet/health/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:health:list', 'heart', 'admin', NOW(), '宠物健康与服务档案管理菜单'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2035);

-- 按钮权限
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2036, '档案新增', 2035, 1, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:health:add', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2036);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2037, '档案修改', 2035, 2, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:health:edit', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2037);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2038, '档案删除', 2035, 3, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:health:remove', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2038);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2039, '档案导出', 2035, 4, '#', '', '', NULL, 1, 0, 'F', '0', '0', 'pet:health:export', '#', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2039);

-- 授权给拥有"宠物管理"目录的角色
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT rm.role_id, m.menu_id
FROM sys_role_menu rm
JOIN (SELECT 2035 AS menu_id UNION SELECT 2036 UNION SELECT 2037 UNION SELECT 2038 UNION SELECT 2039) m
WHERE rm.menu_id = 2000
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = rm.role_id AND x.menu_id = m.menu_id);
