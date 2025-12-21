@echo off
echo Starting MediaMTX RTSP Server...
echo.
echo Available RTSP streams will be:
echo - rtsp://localhost:8554/test1
echo - rtsp://localhost:8554/test2  
echo - rtsp://localhost:8554/entrance
echo - rtsp://localhost:8554/exit
echo.
echo To publish a stream, use OBS or ffmpeg to stream to one of these URLs
echo.
echo Press Ctrl+C to stop the server
echo.
mediamtx.exe
