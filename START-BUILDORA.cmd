@echo off
setlocal
cd /d "%~dp0"
title Buildora
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 or newer from https://nodejs.org first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing Buildora dependencies...
  call npm install
  if errorlevel 1 goto failed
)
echo Building Buildora...
call npm run build
if errorlevel 1 goto failed
echo Open http://127.0.0.1:3000 in your browser.
echo Keep this window open while using Buildora. Press Ctrl+C to stop.
call npm start
goto end
:failed
echo Buildora could not start. Read the error above and the setup guide.
:end
pause
