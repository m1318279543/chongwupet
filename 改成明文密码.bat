@echo off
chcp 65001 >nul
title 把 sys_user 密码改为明文

echo ============================================
echo   将 sys_user.password 从 BCrypt 密文改为明文
echo   admin / ry  -> admin123
echo   md123       -> 123456 （原密码是密文无法反解，需重置）
echo ============================================
echo.

set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if not exist %MYSQL% set MYSQL="D:\Undergraduate_courses\mysql-8.0.39-winx64\bin\mysql.exe"

%MYSQL% -uroot -p123456 ry-pet --default-character-set=utf8mb4 < "%~dp0sql\password_plaintext.sql"

echo.
echo 执行完成，上面列出了 user_id / user_name / password（明文）。
pause
