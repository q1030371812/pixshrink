@echo off
chcp 65001 >nul
setlocal
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":4173" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%P >nul 2>&1
  if not errorlevel 1 set "FOUND=1"
)
if "%FOUND%"=="1" (
  echo [INFO] Stopped the Pixshrink server on port 4173.
) else (
  echo [INFO] Port 4173 is free. No server was running.
)
pause
