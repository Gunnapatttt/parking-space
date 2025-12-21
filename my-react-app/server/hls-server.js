const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Serve static files from the hls directory
app.use('/hls', express.static(path.join(__dirname, 'hls')));

// RTSP URLs for Entrance and Exit
const rtspUrls = {
    entrance: 'rtsp://716f898c7b71.entrypoint.cloud.wowza.com:1935/app-8F9K44lJ/304679fe_stream2',
    exit: 'rtsp://716f898c7b71.entrypoint.cloud.wowza.com:1935/app-8F9K44lJ/304679fe_stream2'
};

// Create hls directory if it doesn't exist
const fs = require('fs');
const hlsDir = path.join(__dirname, 'hls');
if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir);
}

// Function to start FFmpeg for a specific camera
function startFFmpeg(cameraName, rtspUrl) {
    console.log(`Starting FFmpeg for ${cameraName} with URL: ${rtspUrl}`);
    
    const cameraDir = path.join(hlsDir, cameraName);
    if (!fs.existsSync(cameraDir)) {
        fs.mkdirSync(cameraDir);
    }

    const ffmpeg = spawn(ffmpegPath, [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '10',
        '-hls_flags', 'append_list+delete_segments',
        '-hls_allow_cache', '1',
        '-hls_segment_filename', path.join(cameraDir, 'segment_%03d.ts'),
        path.join(cameraDir, 'playlist.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg ${cameraName} [${rtspUrl}]: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process for ${cameraName} [${rtspUrl}] exited with code ${code}`);
        // Restart FFmpeg if it exits
        setTimeout(() => startFFmpeg(cameraName, rtspUrl), 1000);
    });

    return ffmpeg;
}

// Start FFmpeg for each camera
const ffmpegProcesses = {};
Object.entries(rtspUrls).forEach(([cameraName, rtspUrl]) => {
    console.log(`Initializing stream for ${cameraName} with URL: ${rtspUrl}`);
    ffmpegProcesses[cameraName] = startFFmpeg(cameraName, rtspUrl);
});

// Add a route to check stream status
app.get('/stream-status', (req, res) => {
    const status = {};
    Object.entries(rtspUrls).forEach(([cameraName, rtspUrl]) => {
        status[cameraName] = {
            rtspUrl: rtspUrl,
            hlsUrl: `http://localhost:${port}/hls/${cameraName}/playlist.m3u8`,
            processRunning: ffmpegProcesses[cameraName] ? true : false
        };
    });
    res.json(status);
});

// Start the server
app.listen(port, () => {
    console.log(`HLS Server running at http://localhost:${port}`);
    console.log('Available streams:');
    Object.entries(rtspUrls).forEach(([cameraName, rtspUrl]) => {
        console.log(`- ${cameraName}:`);
        console.log(`  RTSP URL: ${rtspUrl}`);
        console.log(`  HLS URL: http://localhost:${port}/hls/${cameraName}/playlist.m3u8`);
    });
}); 