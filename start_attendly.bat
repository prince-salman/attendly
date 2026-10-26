@echo off
title Attendly - Smart School Attendance System
color 0A
echo ======================================================================
echo          ATTENDLY - SISTEM ABSENSI WAJAH PINTAR & GERBANG KIOSK
echo ======================================================================
echo.
echo [*] Memeriksa & menjalankan modul Attendly...
echo.

:: Tutup instance lama jika ada yang tertinggal pada port 8000 / 5173
echo [*] Menyiapkan port 8000 (Python AI) dan 5173 (Vite Frontend)...

:: 1. Jalankan Python FastAPI ArcFace Backend
start "Attendly Backend Engine (Port 8000)" cmd /k "cd /d "%~dp0backend" && echo [Attendly AI] Menjalankan Python InsightFace Engine... && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

:: 2. Beri jeda 2 detik agar AI backend siap
timeout /t 2 /nobreak >nul

:: 3. Jalankan Vite React Frontend
start "Attendly Frontend Web (Port 5173)" cmd /k "cd /d "%~dp0" && echo [Attendly Web] Menjalankan Vite Dashboard... && npm run dev -- --host 127.0.0.1 --port 5173"

:: 4. Beri jeda 2 detik lalu buka browser secara otomatis
timeout /t 2 /nobreak >nul
echo [*] Membuka antarmuka Attendly di browser...
start http://127.0.0.1:5173

echo.
echo ======================================================================
echo  [SUKSES] Kedua server Attendly berhasil dijalankan!
echo  - Frontend Dashboard : http://127.0.0.1:5173
echo  - Backend Python AI  : http://127.0.0.1:8000 (InsightFace ArcFace)
echo ======================================================================
echo.
echo Jangan tutup jendela terminal Backend dan Frontend yang baru terbuka agar server tetap aktif.
echo Anda dapat menutup jendela peluncur ini sekarang.
echo.
pause
