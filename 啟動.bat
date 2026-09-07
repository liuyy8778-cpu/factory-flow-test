@echo off
chcp 65001 >nul

cd /d "%~dp0"
title 廠務帳 單機版
echo.
echo ================================
echo   廠務帳 單機版
echo ================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo 這台電腦還沒安裝 Node.js。
  echo 我幫你打開下載網頁，請下載並安裝 LTS 版，裝好後再點一次這個檔案。
  start https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo 第一次啟動，正在安裝需要的元件，大約 2 到 5 分鐘，請等一下...
  call npm install
  if errorlevel 1 (
    echo.
    echo 安裝失敗。請把上面的紅字拍照或複製給我。
    pause
    exit /b 1
  )
)
if not exist .next\BUILD_ID (
  echo 第一次啟動，正在準備系統，大約 1 到 3 分鐘，請等一下...
  call npm run build
  if errorlevel 1 (
    echo.
    echo 準備失敗。請把上面的紅字拍照或複製給我。
    pause
    exit /b 1
  )
)
echo.
echo 系統啟動中，等一下會自動打開瀏覽器。
echo 使用期間請不要關閉這個黑色視窗。可以縮到最小。
echo 要關閉系統時直接關掉這個視窗就好。
echo.
set PORT=3210
for /f %%P in ('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" ^| Where-Object { $_.CommandLine -match 'next' } ^| Select-Object -ExpandProperty ProcessId"') do set RUNNING=1
if defined RUNNING (
  echo 系統已經在執行中了，直接幫你打開瀏覽器。
  start http://localhost:3210
  timeout /t 3 >nul
  exit /b 0
)
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3210"
call npm run start
echo.
echo 系統已停止。
pause
