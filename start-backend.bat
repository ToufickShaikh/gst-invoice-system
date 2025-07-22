@echo off
echo Starting GST Invoice System Backend...
echo.
cd /d "%~dp0backend"
echo Current directory: %CD%
echo.
echo Starting server on port 5000...
npm start
