-- ============================================================
-- 平台化第二步（续）：店长可见范围收敛 + 补齐业务菜单权限位
-- 2026-10-21
--
-- 原则：店长只看「本店经营」相关菜单；社区/客服/匹配/看板等
--       跨店数据不开放。菜单可见性由前端 v-hasPermi + 后端 @PreAuthorize 双控。
-- ============================================================

SET NAMES utf8mb4;

-- ① 补齐业务菜单权限位（原来这些页面只在前端静态侧边栏存在，没有权限串）
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2070, '购物车管理', 2000, 11, 'cart', 'pet/cart/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:cart:list', 'shopping-cart', 'admin', NOW(), '订单/购物车管理'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2070);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2071, '医生咨询记录', 2000, 12, 'doctor', 'pet/doctor/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:doctor:list', 'first-aid-kit', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2071);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2072, '取消记录', 2000, 13, 'cancel', 'pet/cancel/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:cancel:list', 'circle-close', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2072);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2073, '智能匹配记录', 2000, 14, 'match', 'pet/match/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:match:list', 'magic-stick', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2073);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
SELECT 2074, '数据看板', 2000, 15, 'dashboard', 'dashboard/index', '', NULL, 1, 0, 'C', '0', '0', 'pet:dashboard:view', 'data-line', 'admin', NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 2074);

-- ② 店长角色：先清空再按最小集授权（只留本店经营相关）
DELETE FROM sys_role_menu WHERE role_id = 3;

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 3, m.menu_id FROM (
    SELECT 2000 AS menu_id
    UNION SELECT 2001
    UNION SELECT 2002
    UNION SELECT 2003
    UNION SELECT 2060
    UNION SELECT 2061
    UNION SELECT 2063
    UNION SELECT 2065
    UNION SELECT 2066
    UNION SELECT 2070
) m
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = 3 AND x.menu_id = m.menu_id);

-- ③ 校验店长权限集
SELECT m.menu_id, m.menu_name, m.perms
FROM sys_role_menu rm JOIN sys_menu m ON m.menu_id = rm.menu_id
WHERE rm.role_id = 3 ORDER BY m.menu_id;
