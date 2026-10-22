-- ============================================================
-- 平台化第二步：岗位权限（店长角色 + 门店数据隔离）
-- 2026-10-21
--
-- 目标：后台不再只有 admin。新增「店长」角色，绑定某一家门店，
--       登录后只能看到本店的门店/客户/订单/预约，不能跨店。
-- 账号：manager / 123456（密码采用项目现有的明文编码器）
-- ============================================================

SET NAMES utf8mb4;

-- ① 店长角色
INSERT INTO sys_role (role_id, role_name, role_key, role_sort, data_scope, menu_check_strictly, dept_check_strictly, status, del_flag, create_by, create_time, remark)
SELECT 3, '店长', 'store_manager', 3, '5', 1, 1, '0', '0', 'admin', NOW(), '门店店长：仅本店数据'
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_id = 3);

-- ② 店长账号（明文口令 123456，与项目现有 PlainPasswordEncoder 一致）
INSERT INTO sys_user (user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, create_by, create_time, remark)
SELECT 100, 100, 'manager', '张敏', '00', 'manager@pet.local', '13800000010', '1', '', '123456', '0', '0', 'admin', NOW(), '总店店长演示账号'
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE user_id = 100);

INSERT INTO sys_user_role (user_id, role_id)
SELECT 100, 3 WHERE NOT EXISTS (SELECT 1 FROM sys_user_role WHERE user_id = 100 AND role_id = 3);

-- ③ 员工档案：绑定总店、岗位=店长
INSERT INTO pet_staff (user_id, store_id, staff_name, post, phone, entry_date, status, create_by, create_time)
SELECT 100, 1, '张敏', '店长', '13800000010', '2022-04-01', '0', 'admin', NOW()
WHERE NOT EXISTS (SELECT 1 FROM pet_staff WHERE user_id = 100);

-- ④ 角色菜单：授予「宠物管理」下全部菜单（不含系统管理/监控）
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 3, m.menu_id
FROM sys_menu m
WHERE (m.menu_id = 2000 OR m.parent_id = 2000
       OR m.parent_id IN (SELECT menu_id FROM (SELECT menu_id FROM sys_menu WHERE parent_id = 2000) t))
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = 3 AND x.menu_id = m.menu_id);

-- ⑤ 让门店之间有数据差异：犬类归高新店，其余归总店
UPDATE pet_info SET store_id = 1 WHERE store_id IS NULL;
UPDATE pet_info SET store_id = 2 WHERE category_id = 2;

-- ⑥ 校验：总店 / 高新店 各有多少宠物
SELECT s.store_id, s.store_name, COUNT(p.pet_id) AS pets
FROM pet_store s LEFT JOIN pet_info p ON p.store_id = s.store_id
GROUP BY s.store_id, s.store_name ORDER BY s.store_id;
