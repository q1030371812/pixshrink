@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Pixshrink local preview  -  startup diagnostics
echo ============================================================

where node
if errorlevel 1 (
  echo.
  echo [ERROR] node.exe is not in PATH.
  echo         Install Node.js 18+ from https://nodejs.org/
  echo         Then open a NEW terminal and run this bat again.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0static-preview.html" (
  echo.
  echo [ERROR] static-preview.html is missing in this folder.
  echo         Run:  node scripts\build-static.mjs
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0scripts\preview-server.mjs" (
  echo.
  echo [ERROR] scripts\preview-server.mjs is missing.
  pause
  exit /b 1
)

for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":4173" ^| findstr "LISTENING"') do set "RUNNING_PID=%%P"
if defined RUNNING_PID (
  echo.
  echo [INFO] Port 4173 is already in use by PID %%RUNNING_PID%%.
  echo        Opening browser to the existing server.
  start "" "http://127.0.0.1:4173/static-preview.html"
  exit /b 0
)

echo.
echo   URL: http://127.0.0.1:4173/static-preview.html
echo   Press Ctrl+C in this window to stop the server.
echo ============================================================
echo.

start "" "http://127.0.0.1:4173/static-preview.html"
node "%~dp0scripts\preview-server.mjs" 4173

echo.
echo [INFO] Server stopped.
pause
