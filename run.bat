@echo off
title Microservices + Frontend Dashboard Launcher
echo ========================================================
echo   Launching Full System (Frontend + 4 Microservices)
echo ========================================================
echo.
echo [1/5] Starting Product Service (Port 5001)...
start "Product Service (Port 5001)" cmd /k "cd /d %~dp0 && node product-service/src/server.js"

echo [2/5] Starting Order Service (Port 5002)...
start "Order Service (Port 5002)" cmd /k "cd /d %~dp0 && node order-service/src/server.js"

echo [3/5] Starting Customer Service (Port 5003)...
start "Customer Service (Port 5003)" cmd /k "cd /d %~dp0 && node customer-service/src/server.js"

echo [4/5] Starting Payment Service (Port 5004)...
start "Payment Service (Port 5004)" cmd /k "cd /d %~dp0 && node payment-service/src/server.js"

echo [5/5] Starting Frontend Web Dashboard (Port 3000)...
start "Frontend Web Dashboard (Port 3000)" cmd /k "cd /d %~dp0 && node frontend/server.js"

echo.
echo ========================================================
echo All services and the Frontend are running!
echo.
echo 🌐 Frontend Dashboard: http://localhost:3000
echo 📖 Product Service:    http://localhost:5001/api-docs
echo 📖 Order Service:      http://localhost:5002/api-docs
echo 📖 Customer Service:   http://localhost:5003/api-docs
echo 📖 Payment Service:    http://localhost:5004/api-docs
echo.
echo Open http://localhost:3000 in your browser!
echo ========================================================
echo.
pause
