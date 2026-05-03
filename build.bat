@echo off
setlocal enabledelayedexpansion

where pyinstaller >nul 2>nul
if %errorlevel% neq 0 (
  echo [1/3] Installing PyInstaller...
  pip install pyinstaller
  if %errorlevel% neq 0 (
    echo Failed to install PyInstaller.
    exit /b 1
  )
)

echo [2/3] Building app.exe ...
pyinstaller --noconfirm --clean --onefile --windowed --name ff14-planner app.py
if %errorlevel% neq 0 (
  echo Build failed.
  exit /b 1
)

echo [3/3] Done.
echo Output: dist\ff14-planner.exe
exit /b 0
