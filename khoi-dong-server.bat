@echo off
setlocal

cd /d "%~dp0"
title My Photobooth - Dev Server

echo.
echo Dang khoi dong My Photobooth...
echo Thu muc du an: %cd%
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay npm. Ban can cai Node.js truoc:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Chua co node_modules, dang cai dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Cai dependencies that bai. Hay kiem tra loi phia tren.
    pause
    exit /b 1
  )
  echo.
)

echo Server se chay tai dia chi hien trong cua so nay.
echo Dong cua so nay de tat server.
echo.

call npm.cmd run booth

echo.
echo Server da dung.
pause
