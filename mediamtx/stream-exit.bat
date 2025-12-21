@echo off
echo Streaming video to MediaMTX exit stream (rtsp://localhost:8554/exit)
echo Press Ctrl+C to stop
echo.

ffmpeg -re -stream_loop -1 -i "../video/FAKE Taylormade P790 from TEMU _ INCREDIBLE RESULTS.mp4" -c:v libx264 -preset fast -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ac 2 -ar 44100 -f rtsp rtsp://localhost:8554/exit

pause
