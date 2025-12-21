@echo off
echo Starting HLS Server with proper FFmpeg path...
echo.

REM Refresh environment variables
call refreshenv >nul 2>&1

REM Start the HLS server
node hls-server.js

pause