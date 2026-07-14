@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-auto-login-windows.ps1"
if errorlevel 1 (
  echo Automatic login setup failed.
  pause
)
