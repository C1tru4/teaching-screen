@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM 在这里输入IP地址
REM ========================================
set "IP_ADDRESS=在这里输入IP地址"
REM ========================================

REM 设置端口和路径
set "PORT=3000"
set "PATH=/screen"

REM 构建完整URL
set "URL=http://!IP_ADDRESS!:!PORT!!PATH!"

REM 查找浏览器
set "CHROME_PATH="
set "EDGE_PATH="

REM 检查Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

REM 检查Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

REM 打开浏览器（无边框全屏模式）
if defined CHROME_PATH (
    start "" "!CHROME_PATH!" --kiosk "!URL!"
) else if defined EDGE_PATH (
    start "" "!EDGE_PATH!" --kiosk "!URL!"
) else (
    start "" "!URL!"
)

