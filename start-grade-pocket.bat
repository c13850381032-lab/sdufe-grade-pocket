@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Grade Pocket is not installed yet.
  echo Run install-grade-pocket.bat first.
  pause
  exit /b 1
)

start "Grade Pocket Connector" cmd /k npm.cmd run connector
start "Grade Pocket Web" cmd /k npm.cmd run dev
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

echo Grade Pocket has started. Keep both command windows open.
timeout /t 3 /nobreak >nul
exit /b 0
