@echo off
title VaultLedger Launcher
color 0A
echo ===================================================
echo             🛡️ VaultLedger Launcher
echo ===================================================
echo.
echo Launching VaultLedger application...

cd /d "%~dp0"

:: Ensure python is available
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python from https://python.org
    pause
    exit /b
)

:: Start Flask app
start "VaultLedger Server" /min python app.py

:: Wait for server boot
timeout /t 2 /nobreak >nul

:: Open browser
start http://127.0.0.1:5000/

echo.
echo [SUCCESS] VaultLedger running live at http://127.0.0.1:5000/
echo.
echo Keep this window open while using the app.
echo Press any key to stop the server and exit.
pause >nul

echo Stopping VaultLedger server...
taskkill /f /fi "WINDOWTITLE eq VaultLedger Server*" >nul 2>&1
echo Done.
