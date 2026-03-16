// Load .env for local development (not needed on Railway which uses real env vars)
try { require('dotenv').config(); } catch (e) { /* dotenv not available, using system env vars */ }
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'https://gunnapatttt.github.io'
    ],
    credentials: true
}));

// RTSP URLs for Entrance and Exit
// If not set, falls back to built-in FFmpeg test pattern (see buildFFmpegArgs)
const rtspUrls = {
    entrance: process.env.RTSP_ENTRANCE_URL || '',
    exit: process.env.RTSP_EXIT_URL || ''
};

// Create hls directory if it doesn't exist
// Use /tmp/hls on Railway (guaranteed writable), local ./hls otherwise
const fs = require('fs');
const hlsDir = process.env.RAILWAY_ENVIRONMENT
    ? '/tmp/hls'
    : path.join(__dirname, 'hls');
if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
}

// Serve static files from the correct hls directory
app.use('/hls', express.static(hlsDir));

// Build FFmpeg args depending on whether we have a real RTSP URL or use test pattern
function buildFFmpegArgs(cameraName, rtspUrl, cameraDir) {
    const output = [
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '10',
        '-hls_flags', 'append_list+delete_segments',
        '-hls_allow_cache', '1',
        '-hls_segment_filename', path.join(cameraDir, 'segment_%03d.ts'),
        path.join(cameraDir, 'playlist.m3u8')
    ];

    const isTestMode = !rtspUrl || rtspUrl.startsWith('OFFLINE') || rtspUrl === '';

    if (isTestMode) {
        // Built-in FFmpeg test pattern - no external source needed
        console.log(`[${cameraName}] No RTSP URL set, using built-in test pattern`);
        return [
            '-re',
            '-f', 'lavfi',
            '-i', `testsrc2=size=1280x720:rate=25`,
            '-f', 'lavfi',
            '-i', 'sine=frequency=0:sample_rate=44100',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
            '-c:a', 'aac',
            ...output
        ];
    }

    // Real RTSP source
    return [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-c:v', 'copy',
        '-c:a', 'aac',
        ...output
    ];
}

// Function to start FFmpeg for a specific camera
function startFFmpeg(cameraName, rtspUrl) {
    console.log(`Starting FFmpeg for ${cameraName} with URL: ${rtspUrl || 'TEST PATTERN'}`);
    
    const cameraDir = path.join(hlsDir, cameraName);
    if (!fs.existsSync(cameraDir)) {
        fs.mkdirSync(cameraDir);
    }

    const args = buildFFmpegArgs(cameraName, rtspUrl, cameraDir);
    const ffmpeg = spawn(ffmpegPath, args);

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

// Add health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Add a route to check stream status
app.get('/stream-status', (req, res) => {
    const status = {};
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const baseUrl = railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`;
    Object.entries(rtspUrls).forEach(([cameraName, rtspUrl]) => {
        status[cameraName] = {
            rtspUrl: rtspUrl,
            hlsUrl: `${baseUrl}/hls/${cameraName}/playlist.m3u8`,
            processRunning: ffmpegProcesses[cameraName] ? true : false
        };
    });
    res.json(status);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`HLS Server running at http://0.0.0.0:${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Available streams:');
    Object.entries(rtspUrls).forEach(([cameraName, rtspUrl]) => {
        console.log(`- ${cameraName}:`);
        console.log(`  RTSP URL: ${rtspUrl}`);
        console.log(`  HLS URL: http://localhost:${port}/hls/${cameraName}/playlist.m3u8`);
    });
}); 