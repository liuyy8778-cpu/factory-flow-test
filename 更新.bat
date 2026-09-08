@echo off
chcp 65001 >nul

cd /d "%~dp0"
title 廠務帳 更新
echo.
echo ================================
echo   廠務帳 更新到最新版
echo ================================
echo.
set "PS1=%~dp0scripts\update.ps1"
if not exist "%~dp0scripts" mkdir "%~dp0scripts"
echo 正在取得最新的更新程式...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/liuyy8778-cpu/factory-flow-test/claude/data-lookup-lf8por/scripts/update.ps1' -OutFile '%PS1%' -UseBasicParsing"
if errorlevel 1 echo 取不到最新的更新程式，改用現有的。
if not exist "%PS1%" (
  echo 找不到更新程式 scripts\update.ps1。請確認網路，或把這個視窗截圖給我。
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 (
  echo.
  echo 更新沒有完成。請把這個視窗截圖給我。
)
pause
