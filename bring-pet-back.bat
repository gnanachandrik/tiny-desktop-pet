@echo off
cd /d "%~dp0"
if not exist node_modules\electron npm install
if errorlevel 1 (pause & exit /b 1)
start "Tiny Desktop Pet" cmd /c "npm start"
