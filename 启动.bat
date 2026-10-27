@echo off
chcp 65001 >nul
title 宠物管理系统 - 一键启动
cd /d "%~dp0"

echo ============================================
echo    宠物管理系统  一键启动
echo    后端 API : http://localhost:8081
echo    前台页面 : http://localhost:82/shop/home
echo    管理后台 : http://localhost:83
echo ============================================
echo.

REM ---- 0. 依赖检查（全部用 PATH 上的命令，不写死机器路径）----
where java >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] 未找到 java，请安装 JDK 17+ 并加入 PATH
    pause & exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] 未找到 node，请安装 Node.js 18+ 并加入 PATH
    pause & exit /b 1
)

REM ---- 1. Redis（后端强依赖）----
echo [1/5] 检查 Redis (6379)...
netstat -ano | findstr ":6379" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    if exist ".runtime\redis-lite.mjs" (
        echo   未检测到 Redis，启动内置内存版 .runtime/redis-lite.mjs
        start "Redis-Lite-6379" /min node ".runtime\redis-lite.mjs"
    ) else (
        where redis-server >nul 2>&1
        if errorlevel 1 (
            echo   [ERROR] 系统无 Redis，且缺少 .runtime\redis-lite.mjs
            pause & exit /b 1
        )
        echo   未检测到 Redis，尝试启动 redis-server
        start "Redis-6379" /min redis-server
    )
    timeout /t 4 /nobreak >nul
    netstat -ano | findstr ":6379" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo   [ERROR] Redis 启动失败，请手动启动后重试
        pause & exit /b 1
    )
)
echo   Redis OK

REM ---- 2. MySQL（后端强依赖）----
echo [2/5] 检查 MySQL (3306)...
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] MySQL 未启动，请先启动 MySQL 服务
    pause & exit /b 1
)
echo   MySQL OK

REM ---- 3. 后端 8081 ----
echo [3/5] 启动后端 (8081)...
if not exist "ruoyi\ruoyi-admin\target\ruoyi-admin.jar" (
    echo   [ERROR] 缺少后端 jar，请先执行: bash build_backend.sh clean package -DskipTests
    pause & exit /b 1
)
start "Backend-8081" /min java -jar "ruoyi\ruoyi-admin\target\ruoyi-admin.jar" --server.port=8081

echo   等待后端就绪（最多约 60 秒）...
set /a TRY=0
:WAIT_BACKEND
timeout /t 5 /nobreak >nul
set /a TRY+=1
curl -sf --noproxy "*" --max-time 3 http://localhost:8081/pet/category/list >nul 2>&1
if not errorlevel 1 goto BACKEND_READY
if %TRY% LSS 12 goto WAIT_BACKEND
echo   [WARN] 后端 60 秒内未响应，请查看 Backend-8081 窗口日志
goto FRONTEND
:BACKEND_READY
echo   后端 OK

REM ---- 4. 前台 82 / 后台 83 ----
:FRONTEND
echo [4/5] 启动前台 (82) 与后台入口 (83)...
if exist "pet-web\dist\index.html" (
    start "Frontend-82" /min node static-server.mjs --port 82 --root ./pet-web/dist --api /dev-api=http://localhost:8081
    start "Admin-83" /min node static-server.mjs --port 83 --root ./pet-web/dist --api /dev-api=http://localhost:8081 --redirect /=/admin
    echo   使用生产包 pet-web\dist
) else (
    echo   未找到生产包，前台改用 vite dev（改完源码需重启）
    pushd "%~dp0pet-web"
    start "Frontend-82" /min cmd /c "npm run dev"
    popd
)

REM ---- 5. 汇总 ----
echo [5/5] 完成
echo.
echo ============================================
echo   前台商城 : http://localhost:82/shop/home
echo   管理后台 : http://localhost:83
echo   后端接口 : http://localhost:8081
echo   登录账号 : admin / admin123
echo   前端源码改动后需重新构建: bash build_web.sh
echo ============================================
echo.
pause
