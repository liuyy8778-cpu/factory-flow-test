@echo off
chcp 65001 >nul

cd /d "%~dp0"
title 廠務帳 備份
echo 正在備份資料庫與圖檔...
call npm run backup
echo.
echo 完成。備份放在上面顯示的資料夾裡，建議複製一份到外接硬碟。
pause
