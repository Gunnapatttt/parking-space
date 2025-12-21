@echo off
echo Starting video streaming setup...
echo.

echo 1. Starting MediaMTX server...
start "MediaMTX" /D "c:\Users\gunna\Desktop\React Project\mediamtx" mediamtx.exe

echo 2. Waiting for MediaMTX to initialize...
timeout /t 3 /nobreak > nul

echo 3. Starting HLS server...
start "HLS Server" /D "c:\Users\gunna\Desktop\React Project\my-react-app\server" node hls-server.js

echo.
echo Setup complete! 
echo - MediaMTX RTSP streams: rtsp://localhost:8554/entrance and rtsp://localhost:8554/exit
echo - HLS streams: http://localhost:3001/hls/entrance/playlist.m3u8 and http://localhost:3001/hls/exit/playlist.m3u8
echo.
pause
