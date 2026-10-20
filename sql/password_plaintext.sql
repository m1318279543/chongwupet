-- ============================================================
--  把 sys_user.password 从 BCrypt 密文（看起来像乱码）改为明文
--  配套改动：PlainPasswordEncoder（明文存储 + 兼容 BCrypt 校验）
--  改完后仍可用原密码登录：admin/admin123、ry/admin123
--  注意：md123 原密码是 BCrypt 密文无法反解，统一重置为 123456
-- ============================================================
USE `ry-pet`;

UPDATE sys_user SET password = 'admin123' WHERE user_name = 'admin';
UPDATE sys_user SET password = 'admin123' WHERE user_name = 'ry';
UPDATE sys_user SET password = '123456'  WHERE user_name = 'md123';

-- 查看结果
SELECT user_id, user_name, nick_name, password AS pwd_plain, status FROM sys_user;
