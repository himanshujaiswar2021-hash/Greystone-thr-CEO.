@echo off
title Backend Microservices Launcher
echo ========================================================
echo   Launching Backend (4 Microservices)
echo ========================================================
echo.
echo [1/4] Starting Product Service (Port 5001)...
start "Product Service (Port 5001)" cmd /k "cd /d %~dp0 && node product-service/src/server.js"

echo [2/4] Starting Order Service (Port 5002)...
start "Order Service (Port 5002)" cmd /k "cd /d %~dp0 && node order-service/src/server.js"

echo [3/4] Starting Customer Service (Port 5003)...
start "Customer Service (Port 5003)" cmd /k "cd /d %~dp0 && node customer-service/src/server.js"

echo [4/4] Starting Payment Service (Port 5004)...
start "Payment Service (Port 5004)" cmd /k "cd /d %~dp0 && node payment-service/src/server.js"

echo.
echo ========================================================
echo All 4 Backend Microservices are running!
echo.
echo Product Service:  http://localhost:5001/api-docs
echo Order Service:    http://localhost:5002/api-docs
echo Customer Service: http://localhost:5003/api-docs
echo Payment Service:  http://localhost:5004/api-docs
echo.
echo To run backend integration tests:
echo   node test-flow.js
echo ========================================================
echo.
pause
