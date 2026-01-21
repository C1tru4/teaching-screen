@echo off
chcp 65001 >nul
echo ========================================
echo    教学屏幕应用安装程序
echo ========================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误：需要管理员权限运行此安装程序
    echo 请右键点击 install.bat 选择"以管理员身份运行"
    pause
    exit /b 1
)

echo 正在检查系统环境...

REM 检查Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误：未检测到Node.js
    echo 请先安装Node.js: https://nodejs.org/
    echo 建议安装LTS版本
    pause
    exit /b 1
)

echo ✓ Node.js 已安装

REM 获取安装路径
set /p INSTALL_PATH="请输入安装路径 (默认: C:\Program Files\TeachingScreen): "
if "%INSTALL_PATH%"=="" set INSTALL_PATH=C:\Program Files\TeachingScreen

echo.
echo 安装路径: %INSTALL_PATH%
echo.

REM 创建安装目录
echo 正在创建安装目录...
if not exist "%INSTALL_PATH%" mkdir "%INSTALL_PATH%"
if not exist "%INSTALL_PATH%\data" mkdir "%INSTALL_PATH%\data"
if not exist "%INSTALL_PATH%\data\uploads" mkdir "%INSTALL_PATH%\data\uploads"
if not exist "%INSTALL_PATH%\data\uploads\projects" mkdir "%INSTALL_PATH%\data\uploads\projects"
if not exist "%INSTALL_PATH%\data\uploads\banners" mkdir "%INSTALL_PATH%\data\uploads\banners"

echo ✓ 目录创建完成

REM 复制文件
echo 正在复制程序文件...
xcopy /E /I /Y "admin-frontend\dist" "%INSTALL_PATH%\admin-frontend\dist"
xcopy /E /I /Y "big-screen-frontend\dist" "%INSTALL_PATH%\big-screen-frontend\dist"
xcopy /E /I /Y "backend\dist" "%INSTALL_PATH%\backend\dist"
xcopy /E /I /Y "backend\node_modules" "%INSTALL_PATH%\backend\node_modules"
xcopy /E /I /Y "backend\src" "%INSTALL_PATH%\backend\src"
copy /Y "backend\package.json" "%INSTALL_PATH%\backend\"
copy /Y "backend\package-lock.json" "%INSTALL_PATH%\backend\"
copy /Y "backend\tsconfig.json" "%INSTALL_PATH%\backend\"
copy /Y "backend\tsconfig.build.json" "%INSTALL_PATH%\backend\"
copy /Y "backend\nest-cli.json" "%INSTALL_PATH%\backend\"

echo ✓ 文件复制完成

REM 创建启动脚本
echo 正在创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo echo 正在启动教学屏幕应用...
echo cd /d "%%~dp0"
echo.
echo REM 设置环境变量
echo set NODE_ENV=production
echo set TZ=Asia/Shanghai
echo.
echo REM 启动后端服务
echo echo 启动后端服务...
echo start "教学屏幕后端" /MIN cmd /c "cd backend ^& node dist/main.js"
echo.
echo REM 等待后端启动
echo timeout /t 3 /nobreak ^>nul
echo.
echo REM 打开浏览器
echo echo 正在打开管理端...
echo start http://localhost:3000/admin
echo.
echo echo 应用已启动！
echo echo 管理端: http://localhost:3000/admin
echo echo 大屏端: http://localhost:3000/screen
echo echo.
echo echo 按任意键关闭此窗口...
echo pause ^>nul
) > "%INSTALL_PATH%\start.bat"

REM 创建大屏启动脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo echo 正在启动大屏显示...
echo cd /d "%%~dp0"
echo.
echo REM 设置环境变量
echo set NODE_ENV=production
echo set TZ=Asia/Shanghai
echo.
echo REM 启动后端服务
echo echo 启动后端服务...
echo start "教学屏幕后端" /MIN cmd /c "cd backend ^& node dist/main.js"
echo.
echo REM 等待后端启动
echo timeout /t 3 /nobreak ^>nul
echo.
echo REM 打开大屏
echo echo 正在打开大屏显示...
echo start http://localhost:3000/screen
echo.
echo echo 大屏已启动！
echo echo 大屏地址: http://localhost:3000/screen
echo echo.
echo echo 按任意键关闭此窗口...
echo pause ^>nul
) > "%INSTALL_PATH%\start-screen.bat"

REM 创建停止脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo echo 正在停止教学屏幕应用...
echo.
echo REM 停止Node.js进程
echo taskkill /F /IM node.exe 2^>nul
echo.
echo echo 应用已停止！
echo pause
) > "%INSTALL_PATH%\stop.bat"

echo ✓ 启动脚本创建完成

REM 创建桌面快捷方式
echo 正在创建桌面快捷方式...
set DESKTOP=%USERPROFILE%\Desktop

REM 管理端快捷方式
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%DESKTOP%\教学屏幕管理端.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%INSTALL_PATH%\start.bat"
echo oLink.WorkingDirectory = "%INSTALL_PATH%"
echo oLink.Description = "教学屏幕应用管理端"
echo oLink.Save
) > "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"

REM 大屏快捷方式
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%DESKTOP%\教学屏幕大屏.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%INSTALL_PATH%\start-screen.bat"
echo oLink.WorkingDirectory = "%INSTALL_PATH%"
echo oLink.Description = "教学屏幕应用大屏显示"
echo oLink.Save
) > "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"

echo ✓ 桌面快捷方式创建完成

REM 创建卸载脚本
(
echo @echo off
echo chcp 65001 ^>nul
echo echo ========================================
echo     教学屏幕应用卸载程序
echo ========================================
echo.
echo 正在停止应用...
echo taskkill /F /IM node.exe 2^>nul
echo.
echo 正在删除文件...
echo rmdir /S /Q "%INSTALL_PATH%"
echo.
echo 正在删除桌面快捷方式...
echo del "%DESKTOP%\教学屏幕管理端.lnk" 2^>nul
echo del "%DESKTOP%\教学屏幕大屏.lnk" 2^>nul
echo.
echo 卸载完成！
echo pause
) > "%INSTALL_PATH%\uninstall.bat"

echo ✓ 卸载脚本创建完成

echo.
echo ========================================
echo           安装完成！
echo ========================================
echo.
echo 安装路径: %INSTALL_PATH%
echo 管理端: http://localhost:3000/admin
echo 大屏端: http://localhost:3000/screen
echo.
echo 桌面快捷方式已创建：
echo - 教学屏幕管理端.lnk
echo - 教学屏幕大屏.lnk
echo.
echo 现在可以双击桌面快捷方式启动应用！
echo.
pause
