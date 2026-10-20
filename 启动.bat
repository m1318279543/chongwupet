@echo off
chcp 936 >nul
title 宠物管理系统 - 一键启动
cd /d "%~dp0"

echo ============================================
echo    宠物管理系统  一键启动
echo    后端 API : http://localhost:8081
echo    前端页面 : http://localhost:82
echo ============================================
echo.

REM ---- 1. 检查 Redis（后端强依赖）----
echo [1/4] 检查 Redis (6379)...
netstat -ano | findstr ":6379" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo   Redis not running, try to start it from D:\Redis ...
    if exist "D:\Redis\redis-server.exe" (
        start "Redis-6379" /min "D:\Redis\redis-server.exe" "D:\Redis\redis.windows.conf"
        timeout /t 5 /nobreak >nul
    ) else (
        echo   [ERROR] Redis not found at D:\Redis. Start it manually.
        echo.
        pause
        exit /b 1
    )
    netstat -ano | findstr ":6379" | findstr "LISTENING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [ERROR] Redis failed to start. Start it manually.
        echo.
        pause
        exit /b 1
    )
)
echo   Redis OK

REM ---- 2. 在线模型说明（宠物医生已改为在线 LLM，默认免费免密钥，开箱即用）----
echo [2/4] 宠物医生在线模型：默认接入 Pollinations AI（免费、无需 API Key、开箱即用）。
echo   如需更高质量，可在后端 application.yml 的 llm 配置项切换到豆包/Kimi/通义等密钥模型。
echo.

REM ---- 3. 检查 MySQL（后端强依赖）----
echo [3/4] 检查 MySQL (3306)...
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] MySQL not running! Please start MySQL first.
    echo.
    pause
    exit /b 1
)
echo   MySQL OK

REM ---- 4. 启动后端 SpringBoot (8081) ----
echo [4/4] Starting backend: ruoyi-admin (8081)...
rem Important: force explicit port to avoid Windows dynamic-port range auto drift
start "Backend-8081" /min cmd /c "set JAVA_HOME=D:\Undergraduate_courses\jdk-17\jdk-17.0.20.1+1 && D:\Undergraduate_courses\jdk-17\jdk-17.0.20.1+1\bin\java.exe -jar D:\Undergraduate_courses\企业开发\期末作业\ruoyi-pet\ruoyi\ruoyi-admin\target\ruoyi-admin.jar --server.port=8081"

echo   Waiting for backend startup (about 50 seconds)...
timeout /t 50 /nobreak >nul

REM ---- 4. 启动前端 Vite (82) ----
echo   Starting frontend: pet-web (82)...
cd /d "D:\Undergraduate_courses\企业开发\期末作业\ruoyi-pet\pet-web"
start "Frontend-82" /min cmd /c "npm run dev"

REM ---- 5. Optional: RuoYi native admin UI (ruoyi-ui, port 81) ----
set /p START_RUOYI=Start RuoYi native admin UI (ruoyi-ui, port 81)? [y/N]:
if /i "%START_RUOYI%"=="y" (
    echo   Starting RuoYi native admin UI (81)...
    start "RuoyiUI-81" /min cmd /c "cd /d D:\Undergraduate_courses\企业开发\期末作业\ruoyi-pet\ruoyi-ui && npm run dev"
)

echo.
echo ============================================
echo    Started! Access:
echo    Pet Shop  : http://localhost:82/shop/home
echo    Backend   : http://localhost:82/backend
echo    Admin     : http://localhost:82/admin
echo    Login     : admin / admin123
echo    ---------------------------------------
echo    RuoYi admin pages are built into our own
echo    admin console (82) -> System Management:
echo      users / roles / menus / depts / dicts
echo      / operation logs / online users
echo    Native RuoYi UI (if started):
echo      http://localhost:81
echo ============================================
echo.
pause
