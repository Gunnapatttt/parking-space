@echo off
echo Streaming video to BOTH entrance and exit streams
echo This will start two FFmpeg processes
echo Press Ctrl+C to stop
echo.

echo Starting entrance stream...
start "Entrance Stream" cmd /k "ffmpeg -re -stream_loop -1 -i "../video/FAKE Taylormade P790 from TEMU _ INCREDIBLE RESULTS.mp4" -c:v libx264 -preset fast -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ac 2 -ar 44100 -f rtsp rtsp://localhost:8554/entrance"

timeout /t 2

echo Starting exit stream...
start "Exit Stream" cmd /k "ffmpeg -re -stream_loop -1 -i "../video/FAKE Taylormade P790 from TEMU _ INCREDIBLE RESULTS.mp4" -c:v libx264 -preset fast -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ac 2 -ar 44100 -f rtsp rtsp://localhost:8554/exit"

echo.
echo Both streams started in separate windows!
echo Close this window or the individual stream windows to stop.
pause
