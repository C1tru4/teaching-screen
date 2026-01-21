@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo 视频批量转码工具 (H.265 → H.264)
echo ========================================
echo.

REM 检查 FFmpeg 是否安装
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 FFmpeg！
    echo 请先安装 FFmpeg 并添加到环境变量
    echo 下载地址: https://ffmpeg.org/download.html
    pause
    exit /b 1
)

echo [信息] FFmpeg 已安装
echo.

REM 选择模式
echo 请选择转码模式:
echo   1. 单个文件转码
echo   2. 批量转码（文件夹）
echo.
set /p mode="请输入选项 (1 或 2): "

if "%mode%"=="1" goto :single_file
if "%mode%"=="2" goto :batch_folder
echo [错误] 无效的选项
pause
exit /b 1

:single_file
echo.
echo ========================================
echo 单个文件转码模式
echo ========================================
echo.
set /p input_file="请输入视频文件路径（或拖拽文件到此窗口）: "
set input_file=!input_file:"=!

REM 检查文件是否存在
if not exist "!input_file!" (
    echo [错误] 文件不存在: !input_file!
    pause
    exit /b 1
)

REM 生成输出文件名
for %%F in ("!input_file!") do (
    set "output_file=%%~dpnF_H264%%~xF"
)

echo.
echo [信息] 输入文件: !input_file!
echo [信息] 输出文件: !output_file!
echo.
echo [开始] 正在转码，请稍候...
echo.

REM 执行转码
ffmpeg -i "!input_file!" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "!output_file!" -y

if !errorlevel! equ 0 (
    echo.
    echo ========================================
    echo [成功] 转码完成！
    echo 输出文件: !output_file!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo [失败] 转码失败，请检查错误信息
    echo ========================================
)
goto :end

:batch_folder
echo.
echo ========================================
echo 批量转码模式
echo ========================================
echo.
set /p input_folder="请输入视频文件夹路径（或拖拽文件夹到此窗口）: "
set input_folder=!input_folder:"=!

REM 检查文件夹是否存在
if not exist "!input_folder!" (
    echo [错误] 文件夹不存在: !input_folder!
    pause
    exit /b 1
)

REM 创建输出文件夹
set "output_folder=!input_folder!_H264"
if not exist "!output_folder!" (
    mkdir "!output_folder!"
    echo [信息] 已创建输出文件夹: !output_folder!
)

echo.
echo [信息] 输入文件夹: !input_folder!
echo [信息] 输出文件夹: !output_folder!
echo.
echo [扫描] 正在扫描视频文件...
echo.

REM 支持的视频格式
set "video_extensions=.mp4 .avi .mov .mkv .flv .wmv .webm .m4v"

REM 统计变量
set /a total_files=0
set /a success_count=0
set /a fail_count=0

REM 遍历文件夹中的所有视频文件
for %%F in ("!input_folder!\*.*") do (
    set "file_ext=%%~xF"
    set "file_ext=!file_ext:~0,4!"
    
    REM 检查是否是视频文件
    set "is_video=0"
    for %%E in (%video_extensions%) do (
        if /i "!file_ext!"=="%%E" set "is_video=1"
    )
    
    if !is_video! equ 1 (
        set /a total_files+=1
        set "input_file=%%F"
        set "filename=%%~nxF"
        set "output_file=!output_folder!\!filename:~0,-4!_H264%%~xF"
        
        echo.
        echo ========================================
        echo [!total_files!] 正在转码: !filename!
        echo 输入: !input_file!
        echo 输出: !output_file!
        echo ========================================
        echo.
        
        REM 执行转码
        ffmpeg -i "!input_file!" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "!output_file!" -y -loglevel error -stats
        
        if !errorlevel! equ 0 (
            set /a success_count+=1
            echo [成功] !filename! 转码完成
        ) else (
            set /a fail_count+=1
            echo [失败] !filename! 转码失败
        )
    )
)

echo.
echo ========================================
echo 批量转码完成！
echo ========================================
echo 总文件数: !total_files!
echo 成功: !success_count!
echo 失败: !fail_count!
echo 输出文件夹: !output_folder!
echo ========================================
goto :end

:end
echo.
pause

