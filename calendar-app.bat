@echo off
setlocal EnableExtensions

REM === App folder = wherever this .bat file lives ===
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

REM === Make Node visible ===
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

cls
echo Starting Study Calendar...
echo.
echo App folder:
echo %APP_DIR%
echo.

if not exist "%APP_DIR%\package.json" (
  echo ERROR: Could not find package.json in the app folder.
  echo Check this folder exists:
  echo %APP_DIR%
  echo.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
if errorlevel 1 (
  echo ERROR: Could not enter the app folder.
  echo %APP_DIR%
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found.
  echo Restart Windows, then try again. If still broken, reinstall Node.js LTS with Add to PATH enabled.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  echo Restart Windows, then try again. If still broken, reinstall Node.js LTS with npm/Add to PATH enabled.
  echo.
  pause
  exit /b 1
)

echo Node version:
node -v
echo.
echo npm version:
call npm -v
echo.

if not exist node_modules (
  echo Installing app packages. This only happens the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo Copy the error above and send it to ChatGPT.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Opening the app at http://localhost:5173
echo Leave this window open while using the app.
echo Press Ctrl+C in this window to stop the app.
echo.
start "" "http://localhost:5173"
call npm run dev -- --host 127.0.0.1

echo.
echo The app server stopped.
pause
