@echo off
REM ============================================================
REM  PVCVision - Lanzador para Windows
REM  Arranca un mini servidor web (PowerShell, sin instalar nada)
REM  y abre el visor en el navegador automaticamente.
REM  La app usa modulos ES: NO funciona abriendo index.html directo.
REM ============================================================
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8000

REM Si PowerShell fallara al lanzarse, dejamos la ventana abierta.
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] No se pudo iniciar el servidor con PowerShell.
    echo.
    pause
)
