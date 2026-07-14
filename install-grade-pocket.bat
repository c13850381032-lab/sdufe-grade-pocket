@echo off
setlocal
cd /d "%~dp0"
title Grade Pocket Installer

where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 22.13 or newer from https://nodejs.org/
  echo Then close this window and run this installer again.
  pause
  exit /b 1
)

echo [1/3] Installing project dependencies...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto :install_failed

echo.
echo [2/3] Installing the Playwright WebKit browser...
call "%~dp0node_modules\.bin\playwright.cmd" install webkit
if errorlevel 1 goto :browser_failed

echo.
echo [3/3] Creating the desktop shortcut...
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut-windows.ps1"
if errorlevel 1 goto :shortcut_failed

echo.
echo Installation completed successfully.
echo Use the Grade Pocket shortcut on the desktop to start the app.
echo Run setup-auto-login.bat once if automatic login is needed.
pause
exit /b 0

:shortcut_failed
echo.
echo Dependencies and WebKit were installed successfully.
echo The desktop shortcut could not be created, but the app is still installed.
echo Run start-grade-pocket.bat to start the app.
pause
exit /b 0

:browser_failed
echo.
echo WebKit installation failed. Check the network connection and try again.
pause
exit /b 1

:install_failed
echo.
echo Dependency installation failed. Check the network connection and Node.js version.
pause
exit /b 1
