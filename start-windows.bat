@echo off
cd /d "%~dp0"
if not exist node_modules\electron (echo First run: installing app dependencies... & npm install)
if errorlevel 1 (echo Install failed. Install Node.js LTS from https://nodejs.org/ and try again. & pause & exit /b 1)
npm start
