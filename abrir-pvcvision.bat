@echo off
REM ============================================================
REM  PVCVision - Lanzador para Windows
REM  Arranca un servidor web local y abre el visor en el navegador.
REM  (La app usa modulos ES: NO funciona abriendo index.html directo.)
REM ============================================================
setlocal
cd /d "%~dp0"

set PORT=8000
set URL=http://localhost:%PORT%

echo.
echo  ===============================================
echo    PVCVision - Visor 3D de piezas PVC
echo  ===============================================
echo.

REM --- 1) Intentar con Python (python) ---
where python >nul 2>nul
if %errorlevel%==0 (
    echo  Servidor: Python  ^|  %URL%
    echo  Cierra esta ventana para detener el servidor.
    echo.
    start "" "%URL%"
    python -m http.server %PORT%
    goto :fin
)

REM --- 2) Intentar con el lanzador de Python (py) ---
where py >nul 2>nul
if %errorlevel%==0 (
    echo  Servidor: Python ^(py^)  ^|  %URL%
    echo  Cierra esta ventana para detener el servidor.
    echo.
    start "" "%URL%"
    py -m http.server %PORT%
    goto :fin
)

REM --- 3) Intentar con Node (npx serve) ---
where npx >nul 2>nul
if %errorlevel%==0 (
    echo  Servidor: Node ^(npx serve^)  ^|  %URL%
    echo  Cierra esta ventana para detener el servidor.
    echo.
    start "" "%URL%"
    npx --yes serve -l %PORT% .
    goto :fin
)

REM --- Nada disponible ---
echo  [ERROR] No se encontro Python ni Node en el sistema.
echo.
echo  Instala una de estas opciones y vuelve a ejecutar:
echo    - Python:  https://www.python.org/downloads/
echo    - Node.js: https://nodejs.org/
echo.
pause

:fin
endlocal
