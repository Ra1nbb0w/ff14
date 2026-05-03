#!/usr/bin/env bash
set -euo pipefail

if ! command -v pyinstaller >/dev/null 2>&1; then
  echo "[1/3] Installing PyInstaller..."
  python3 -m pip install pyinstaller
fi

echo "[2/3] Building ff14-planner ..."
pyinstaller --noconfirm --clean --onefile --windowed --name ff14-planner app.py

echo "[3/3] Done"
echo "Output: dist/ff14-planner"
