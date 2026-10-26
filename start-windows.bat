@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 18 or later is required. Install Node.js and try again.
  pause
  exit /b 1
)
start "" "http://localhost:4173"
node server.mjs
pause
