@echo off
title Attendly System Launcher
cd /d "%~dp0"
echo ===================================================
echo   Attendly Kiosk - Starting Local System
echo ===================================================
echo Starting Python Backend on Port 8001...
start "Attendly Python AI Backend" cmd /k "cd backend && start_backend.bat"
echo Starting Vite Dev Server on Port 5173...
start "Attendly Web UI" cmd /k "npm run dev"
echo.
echo ===================================================
echo   System is launching!
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8001
echo ===================================================
timeout /t 3 >nul
start http://127.0.0.1:5173
