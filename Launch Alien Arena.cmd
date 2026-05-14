@echo off
setlocal

cd /d "%~dp0"
set "PORT=4177"
set "URL=http://127.0.0.1:%PORT%/"

echo.
echo Alien Arena local launcher
echo --------------------------
echo Starting a local web server for Alien Arena...
echo Keep this window open while you play.
echo.
echo Game URL: %URL%
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process '%URL%'"

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m http.server %PORT% -b 127.0.0.1
  goto :done
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python -m http.server %PORT% -b 127.0.0.1
  goto :done
)

echo Python was not found, so the local server could not start.
echo Install Python or run this from PowerShell:
echo python -m http.server %PORT% -b 127.0.0.1
echo.
pause

:done
endlocal
