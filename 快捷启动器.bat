@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
REM ========================================
echo    教学屏幕应用 - 便携版
REM ========================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
echo 当前目录: %SCRIPT_DIR%
echo.

REM ========================================
REM 1) 检查 Node 与构建产物
REM ========================================
REM 检测Node.js版本
node --version >nul 2>&1 || (
    echo 错误：未检测到Node.js
    echo.
    echo Node.js 是必需的运行环境，需要约30MB下载
    echo 将下载与开发环境相同的版本：v22.18.0
    echo 是否自动下载并安装Node.js？
    echo.
    set /p DOWNLOAD_NODE="请输入 y/n (y=下载安装, n=手动安装): "
    
    if /i "%DOWNLOAD_NODE%"=="y" (
        echo.
        echo 正在下载Node.js v22.18.0...
        echo 下载地址: https://nodejs.org/dist/v22.18.0/node-v22.18.0-x64.msi
        echo 下载位置: %TEMP%\nodejs-installer.msi
        echo.
        
        REM 使用PowerShell下载Node.js
        powershell -NoProfile -Command "try { Write-Host '正在下载Node.js v22.18.0...'; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.18.0/node-v22.18.0-x64.msi' -OutFile '%TEMP%\nodejs-installer.msi'; Write-Host '下载完成！' } catch { Write-Host '下载失败: ' $_.Exception.Message; exit 1 }"
        
        if errorlevel 1 (
            echo 下载失败！请检查网络连接或手动安装Node.js
            echo 手动安装地址: https://nodejs.org/
            pause
            exit /b 1
        )
        
        echo 正在安装Node.js...
        echo 请在弹出的安装窗口中按照提示完成安装
        echo.
        
        REM 静默安装Node.js
        msiexec /i "%TEMP%\nodejs-installer.msi" /quiet /norestart
        
        if errorlevel 1 (
            echo 安装失败！请手动安装Node.js
            echo 安装文件位置: %TEMP%\nodejs-installer.msi
            pause
            exit /b 1
        )
        
        echo 安装完成！正在清理临时文件...
        del "%TEMP%\nodejs-installer.msi" 2>nul
        
        echo 请重新运行此启动器
        pause
        exit /b 0
    ) else (
        echo 请手动安装Node.js: https://nodejs.org/
        echo 建议安装版本：v22.18.0（与开发环境保持一致）
        pause
        exit /b 1
    )
)
echo ✓ Node.js 已安装

if not exist "backend\dist\main.js" (
    echo 错误：未找到后端文件（backend\dist\main.js）
    pause & exit /b 1
)
if not exist "admin-frontend\dist\index.html" (
    echo 错误：未找到管理端构建产物（admin-frontend\dist）
    pause & exit /b 1
)
if not exist "big-screen-frontend\dist\index.html" (
    echo 错误：未找到大屏端构建产物（big-screen-frontend\dist）
    pause & exit /b 1
)
echo ✓ 构建产物检查完成

REM ========================================
REM 2) 准备数据目录（按你现有结构）
REM ========================================
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\data\uploads" mkdir "backend\data\uploads"
if not exist "backend\data\uploads\projects" mkdir "backend\data\uploads\projects"
if not exist "backend\data\uploads\banners" mkdir "backend\data\uploads\banners"
echo ✓ 数据目录已准备：%SCRIPT_DIR%backend\data

REM 数据库存在与否 -> 切换环境
if not exist "backend\data\app.db" (
    echo 数据库不存在，使用开发模式创建数据库表结构...
    set "NODE_ENV=development"
) else (
    echo 数据库已存在，使用生产模式启动...
    set "NODE_ENV=production"
)
set "TZ=Asia/Shanghai"

REM ========================================
REM 3) 启动后端
REM ========================================
set "PORT=3000"
set "HOST=0.0.0.0"
set "UPLOAD_DIR=%SCRIPT_DIR%backend\data\uploads"

echo 正在启动后端服务...
start "教学屏幕后端" cmd /c "cd backend & set NODE_ENV=%NODE_ENV% & set TZ=%TZ% & set PORT=%PORT% & set HOST=%HOST% & set UPLOAD_DIR=%UPLOAD_DIR% & echo. & echo ======================================== & echo [info] 本机管理端: http://localhost:%PORT%/admin & echo [info] 本机大屏端: http://localhost:%PORT%/screen & echo [info] 局域网管理端: http://%LAN_IP%:%PORT%/admin & echo [info] 局域网大屏端: http://%LAN_IP%:%PORT%/screen & echo [info] 数据目录: %SCRIPT_DIR%backend\data & echo ======================================== & echo. & node dist/main.js & pause"

REM 等待5秒后最小化后端窗口
timeout /t 5 /nobreak >nul
echo 正在最小化后端服务窗口...
powershell -NoProfile -Command "Get-Process cmd | Where-Object {$_.MainWindowTitle -eq '教学屏幕后端'} | ForEach-Object { $_.MinimizeWorkingSet() }" 2>nul

echo 等待后端启动...
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try{ (Invoke-WebRequest -UseBasicParsing http://localhost:%PORT%/health).StatusCode -eq 200 }catch{ $false }" | find "True" >nul && goto :ready
    timeout /t 1 /nobreak >nul
)

:ready
REM ========================================
REM 4) 生成访问地址（本机+局域网）
REM ========================================
set "ADMIN_URL=http://localhost:%PORT%/admin"
set "SCREEN_URL=http://localhost:%PORT%/screen"

echo 正在检测本机IP地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "temp_ip=%%a"
    set "temp_ip=!temp_ip: =!"
    echo 检测到IP: !temp_ip!
    if not "!temp_ip!"=="" (
        set "LAN_IP=!temp_ip!"
        goto :ip_found
    )
)
:ip_found
if defined LAN_IP (
    echo 成功获取本机IP: %LAN_IP%
) else (
    echo 未能获取本机IP地址
)
if not "%LAN_IP%"=="" (
    set "LAN_ADMIN_URL=http://%LAN_IP%:%PORT%/admin"
    set "LAN_SCREEN_URL=http://%LAN_IP%:%PORT%/screen"
) else (
    set "LAN_ADMIN_URL=(未检测到网关IP)"
    set "LAN_SCREEN_URL=(未检测到网关IP)"
)

REM ========================================
REM 5) 查找 Chrome / Edge
REM ========================================
set "CHROME_PATH="
echo 正在查找Chrome浏览器...
REM 直接检查常见安装路径
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined CHROME_PATH if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not defined CHROME_PATH (
  for /f "tokens=2*" %%a in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%b"
)
if not defined CHROME_PATH (
  for /f "tokens=2*" %%a in ('reg query "HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%b"
)

set "EDGE_PATH="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE_PATH if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

REM ========================================
REM 6) 分别以独立profile打开（不关闭已有窗口）
REM ========================================
set "ADMIN_PROFILE=%TEMP%\ts_admin_profile"
set "SCREEN_PROFILE=%TEMP%\ts_screen_profile"

REM 不再强制关闭已有浏览器窗口，允许同时运行多个实例
REM taskkill /f /im chrome.exe >nul 2>&1
REM taskkill /f /im msedge.exe >nul 2>&1

echo 正在打开管理端...

REM 注释掉展示端，只打开管理端
REM if defined CHROME_PATH (
REM   echo 使用 Chrome 打开
REM   echo 正在打开大屏端（全屏）...
REM   start "" "%CHROME_PATH%" --kiosk --user-data-dir="%SCREEN_PROFILE%" "%SCREEN_URL%"
REM   timeout /t 2 /nobreak >nul
REM   echo 正在打开管理端（窗口模式）...
REM   start "" "%CHROME_PATH%" --app="%ADMIN_URL%" --user-data-dir="%ADMIN_PROFILE%" --window-size=1200,800 --window-position=100,50
REM ) else if defined EDGE_PATH (
REM   echo 未找到 Chrome，改用 Edge
REM   echo 正在打开大屏端（全屏）...
REM   start "" "%EDGE_PATH%" --kiosk --user-data-dir="%SCREEN_PROFILE%" "%SCREEN_URL%"
REM   timeout /t 2 /nobreak >nul
REM   echo 正在打开管理端（窗口模式）...
REM   start "" "%EDGE_PATH%" --app="%ADMIN_URL%" --user-data-dir="%ADMIN_PROFILE%" --window-size=1200,800 --window-position=100,50
REM ) else (
REM   echo 未找到 Chrome/Edge，使用默认浏览器打开（无法无边框）
REM   start "" "%SCREEN_URL%"
REM   timeout /t 2 /nobreak >nul
REM   start "" "%ADMIN_URL%"
REM )

if defined CHROME_PATH (
  echo 使用 Chrome 打开管理端（窗口模式）...
  start "" "%CHROME_PATH%" --app="%ADMIN_URL%" --user-data-dir="%ADMIN_PROFILE%" --window-size=1200,800 --window-position=100,50
) else if defined EDGE_PATH (
  echo 未找到 Chrome，改用 Edge 打开管理端（窗口模式）...
  start "" "%EDGE_PATH%" --app="%ADMIN_URL%" --user-data-dir="%ADMIN_PROFILE%" --window-size=1200,800 --window-position=100,50
) else (
  echo 未找到 Chrome/Edge，使用默认浏览器打开管理端...
  start "" "%ADMIN_URL%"
)

echo.
REM ========================================
echo           应用已启动！
REM ========================================
echo 本机管理端: %ADMIN_URL%
echo 本机大屏端: %SCREEN_URL%
echo 局域网管理端: %LAN_ADMIN_URL%
echo 局域网大屏端: %LAN_SCREEN_URL%
echo 数据目录: %SCRIPT_DIR%backend\data
echo.
echo 注意：后端窗口必须保持打开状态！
echo 关闭后端窗口将停止整个应用。
echo.
echo 启动器将在5秒后自动关闭...
timeout /t 5 /nobreak >nul