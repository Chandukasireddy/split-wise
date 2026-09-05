@echo off
echo ============================================
echo Repairing Git Index on Windows...
echo ============================================
if exist .git\index del /f /q .git\index
if exist .git\index.lock del /f /q .git\index.lock
git reset
echo.
echo Git index successfully restored!
pause
