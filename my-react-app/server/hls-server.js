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
    origin: (origin, callback) => {
        // Allow GitHub Pages, any localhost port (for dev), and no-origin requests
        if (!origin || origin.startsWith('http://localhost:') || origin === 'https://gunnapatttt.github.io') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments+independent_segments',
        '-hls_delete_threshold', '3',
        '-hls_allow_cache', '0',
        '-hls_segment_filename', path.join(cameraDir, 'segment_%03d.ts'),
        path.join(cameraDir, 'playlist.m3u8')
    ];

    const isTestMode = !rtspUrl || rtspUrl.startsWith('OFFLINE') || rtspUrl === '';

    if (isTestMode) {
        // Built-in FFmpeg test pattern - low resolution to save Railway CPU
        console.log(`[${cameraName}] No RTSP URL set, using built-in test pattern`);
        return [
            '-re',
            '-f', 'lavfi',
            '-i', 'testsrc2=size=640x360:rate=15',
            '-f', 'lavfi',
            '-i', 'sine=frequency=0:sample_rate=44100',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
            '-crf', '28', '-maxrate', '800k', '-bufsize', '1600k',
            '-g', '30', '-sc_threshold', '0',
            '-c:a', 'aac', '-b:a', '64k',
            ...output
        ];
    }

    // Real RTSP source — transcode to H.264 for HLS compatibility
    return [
        '-rtsp_transport', 'tcp',
        '-timeout', '10000000',
        '-i', rtspUrl,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
        '-crf', '28', '-maxrate', '800k', '-bufsize', '1600k',
        '-g', '30', '-sc_threshold', '0',
        '-threads', '1',
        '-c:a', 'aac', '-b:a', '64k',
        ...output
    ];
}

// Function to start FFmpeg for a specific camera
function startFFmpeg(cameraName, rtspUrl, retryDelay = 3000) {
    console.log(`Starting FFmpeg for ${cameraName} with URL: ${rtspUrl || 'TEST PATTERN'}`);
    
    const cameraDir = path.join(hlsDir, cameraName);
    if (!fs.existsSync(cameraDir)) {
        fs.mkdirSync(cameraDir);
    }

    const args = buildFFmpegArgs(cameraName, rtspUrl, cameraDir);
    const ffmpeg = spawn(ffmpegPath, args);

    ffmpeg.on('error', (err) => {
        console.error(`FFmpeg ${cameraName} spawn error: ${err.message}`);
    });

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg ${cameraName} [${rtspUrl}]: ${data}`);
    });

    ffmpeg.on('close', (code, signal) => {
        console.log(`FFmpeg process for ${cameraName} exited — code: ${code}, signal: ${signal}`);
        // Exponential backoff: cap at 30s
        const nextDelay = Math.min(retryDelay * 2, 30000);
        console.log(`Restarting ${cameraName} in ${retryDelay}ms...`);
        setTimeout(() => startFFmpeg(cameraName, rtspUrl, nextDelay), retryDelay);
    });

    return ffmpeg;
}

// Start FFmpeg for each camera — stagger by 5s to avoid OOM on Railway
const ffmpegProcesses = {};
const cameraList = Object.entries(rtspUrls);
cameraList.forEach(([cameraName, rtspUrl], index) => {
    setTimeout(() => {
        console.log(`Initializing stream for ${cameraName} with URL: ${rtspUrl}`);
        ffmpegProcesses[cameraName] = startFFmpeg(cameraName, rtspUrl);
    }, index * 5000);
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