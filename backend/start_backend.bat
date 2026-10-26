@echo off
title Attendly Python AI Engine
cd /d "%~dp0"
echo ===================================================
echo   Attendly Python Face Recognition Backend (Port 8001)
echo ===================================================
:loop
python -m uvicorn main:app --host 127.0.0.1 --port 8001
echo.
echo [ATTENDLY] Server stopped or disconnected. Auto-restarting in 2 seconds...
timeout /t 2 /nobreak >nul
goto loop
