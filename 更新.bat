@echo off
chcp 65001 >nul

cd /d "%~dp0"
title 廠務帳 更新
echo.
echo ================================
echo   廠務帳 更新到最新版
echo ================================
echo.
for /f %%P in ('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" ^| Where-Object { $_.CommandLine -match 'next' } ^| Select-Object -ExpandProperty ProcessId"') do set RUNNING=1
if defined RUNNING (
  echo 系統還在執行中。更新前必須先關閉系統。
  choice /c YN /m "要我幫你關閉系統嗎？Y=關閉並繼續更新  N=取消"
  if errorlevel 2 exit /b 1
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -match 'next' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
  timeout /t 2 >nul
  echo 系統已關閉。
)
echo 正在下載最新版...
set ZIP=%TEMP%\factory-flow-update.zip
set DIR=%TEMP%\factory-flow-update
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference=SilentlyContinue; Invoke-WebRequest -Uri https://github.com/liuyy8778-cpu/factory-flow-test/archive/refs/heads/claude/data-lookup-lf8por.zip -OutFile %ZIP%"
if errorlevel 1 (
  echo 下載失敗。請確認網路有通。
  pause
  exit /b 1
)
echo 正在解壓縮...
rmdir /s /q "%DIR%" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path %ZIP% -DestinationPath %DIR% -Force"
if errorlevel 1 (
  echo 解壓縮失敗。
  pause
  exit /b 1
)
for /d %%D in ("%DIR%\*") do set SRC=%%D
echo 正在換上新程式。不會動到 data 與 備份 資料夾。
robocopy "%SRC%" "%~dp0." /E /XD data 備份 node_modules .next /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo 複製失敗。請把這個視窗截圖給我。
  pause
  exit /b 1
)
rmdir /s /q .next 2>nul
rmdir /s /q "%DIR%" 2>nul
del /q "%ZIP%" 2>nul
echo 正在重新準備系統。大約 1 到 3 分鐘。
call npm install
call npm run build
if errorlevel 1 (
  echo.
  echo 準備失敗。請把上面的紅字截圖給我。
  pause
  exit /b 1
)
echo.
echo 更新完成。現在可以點「啟動」了。
pause
