@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 22.13 或更高版本。
  echo https://nodejs.org/
  pause
  exit /b 1
)

echo 正在安装成绩袋，请保持网络连接……
call npm install
if errorlevel 1 goto :failed
call npx playwright install webkit
if errorlevel 1 goto :failed

echo.
echo 安装完成。以后双击 start-grade-pocket.bat 即可运行。
echo 如需后台自动登录，请再双击 setup-auto-login.bat。
pause
exit /b 0

:failed
echo.
echo 安装失败，请检查网络后重新运行。
pause
exit /b 1
