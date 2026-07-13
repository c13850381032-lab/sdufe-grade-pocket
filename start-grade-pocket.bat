@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules (
  echo 尚未安装成绩袋，请先双击 install-grade-pocket.bat。
  pause
  exit /b 1
)

start "成绩袋连接器" cmd /k npm run connector
start "成绩袋网页" cmd /k npm run dev
timeout /t 4 /nobreak >nul
start "" http://localhost:3000

echo 成绩袋已经启动。请保持两个命令窗口开启。
timeout /t 3 /nobreak >nul
