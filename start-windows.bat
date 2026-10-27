@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 18 or later is required.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:49383/ after the server starts.
node server.mjs
pause
