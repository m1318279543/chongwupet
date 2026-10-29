-- ============================================================
-- AI 知识库后台菜单（幂等，可重复执行）
-- 说明：菜单 ID 2102-2106 在本项目内未被占用，与业务菜单 2000 同组
-- ============================================================

INSERT IGNORE INTO sys_menu
(menu_id, menu_name, parent_id, order_num, path, component, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time)
VALUES
(2102, 'AI 知识库', 2000, 16, 'knowledge', 'admin/knowledge/index', 1, 0, 'C', '0', '0', 'pet:knowledge:list', 'Reading', 'admin', sysdate()),
(2103, '知识查询', 2102, 1, '', NULL, 1, 0, 'F', '0', '0', 'pet:knowledge:query', '#', 'admin', sysdate()),
(2104, '知识新增', 2102, 2, '', NULL, 1, 0, 'F', '0', '0', 'pet:knowledge:add', '#', 'admin', sysdate()),
(2105, '知识修改', 2102, 3, '', NULL, 1, 0, 'F', '0', '0', 'pet:knowledge:edit', '#', 'admin', sysdate()),
(2106, '知识删除', 2102, 4, '', NULL, 1, 0, 'F', '0', '0', 'pet:knowledge:remove', '#', 'admin', sysdate());

-- 店长可维护知识库；客服常见问题由店长补充
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role_id, menu_id FROM sys_role, (SELECT 2102 AS menu_id UNION ALL SELECT 2103 UNION ALL SELECT 2104 UNION ALL SELECT 2105 UNION ALL SELECT 2106) t
WHERE role_key = 'store_manager';
