@echo off
title Frontend Website Launcher
echo ========================================================
echo   Launching Frontend Website Dashboard
echo ========================================================
echo.
echo Starting Website on http://localhost:3000...
start "Frontend Website (Port 3000)" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo ========================================================
echo Website is running!
echo URL: http://localhost:3000
echo.
echo (Make sure your backend microservices are also running!)
echo ========================================================
echo.
pause
