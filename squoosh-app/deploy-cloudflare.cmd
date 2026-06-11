@echo off
REM Build, then publish dist\ to Cloudflare Pages.
REM   1) Install wrangler once:   npm install -g wrangler
REM   2) Log in once:             wrangler login
REM   3) Run this script. It will ask for the project name on first run.
cd /d "%~dp0"
where wrangler >nul 2>nul
if errorlevel 1 (
  echo wrangler is not installed. Run:  npm install -g wrangler
  exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
echo.
echo  Uploading dist\ to Cloudflare Pages...
call wrangler pages deploy dist --project-name pixshrink --commit-dirty=true
