@echo off
chcp 65001 >nul
echo ========================================
echo    教学屏幕应用 - 构建脚本
echo ========================================
echo.

REM 获取脚本所在目录
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo 当前目录: %SCRIPT_DIR%
echo.

REM 检查Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误：未检测到Node.js
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js 已安装

REM 检查package.json
if not exist "package.json" (
    echo 错误：未找到package.json
    echo 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo ✓ 项目文件检查完成

REM 安装依赖
echo 正在检查依赖...
if not exist "node_modules" (
    echo 安装根目录依赖...
    npm install
)

if not exist "backend\node_modules" (
    echo 安装后端依赖...
    cd backend
    npm install
    cd ..
)

if not exist "admin-frontend\node_modules" (
    echo 安装管理端依赖...
    cd admin-frontend
    npm install
    cd ..
)

if not exist "big-screen-frontend\node_modules" (
    echo 安装大屏端依赖...
    cd big-screen-frontend
    npm install
    cd ..
)

echo ✓ 依赖检查完成

REM 构建项目
echo 正在构建项目...

echo 构建后端...
cd backend
call npm ci --legacy-peer-deps
if errorlevel 1 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo 后端构建失败！
    pause
    exit /b 1
)
cd ..

echo 构建管理端...
cd admin-frontend
call npm run build
if errorlevel 1 (
    echo 管理端构建失败！
    pause
    exit /b 1
)
cd ..

echo 构建大屏端...
cd big-screen-frontend
call npm run build
if errorlevel 1 (
    echo 大屏端构建失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo           构建完成！
echo ========================================
echo.
echo 所有项目已成功构建：
echo - 后端: backend/dist/
echo - 管理端: admin-frontend/dist/
echo - 大屏端: big-screen-frontend/dist/
echo.
echo 现在可以运行 install.bat 进行安装
echo 或运行 start-dev.bat 启动开发模式
echo.
pause
