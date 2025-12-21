import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const CameraFeed = ({ label, timestamp }) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Convert label to lowercase for URL consistency
        const streamName = label.toLowerCase();
        const streamUrl = `http://localhost:3001/hls/${streamName}/playlist.m3u8`;
        
        console.log(`Initializing stream for ${label}:`, {
            streamName,
            streamUrl
        });

        if (Hls.isSupported()) {
            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                liveDurationInfinity: true,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 10,
                segmentLoadingTimeOut: 10000,
                segmentLoadingMaxRetry: 10
            });

            hlsRef.current = hls;

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log(`HLS manifest parsed for ${label} (${streamUrl}), attempting to play`);
                // Set video properties for better autoplay compatibility
                video.muted = true;
                video.playsInline = true;
                
                video.play().catch(error => {
                    console.error(`Error playing video for ${label}:`, error);
                    // Try again with muted autoplay
                    setTimeout(() => {
                        video.muted = true;
                        video.play().catch(e => console.error(`Second attempt failed for ${label}:`, e));
                    }, 1000);
                });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.log(`HLS error for ${label}:`, {
                    type: data.type,
                    details: data.details,
                    fatal: data.fatal,
                    url: streamUrl
                });

                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error(`Fatal network error encountered for ${label}, trying to recover`);
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error(`Fatal media error encountered for ${label}, trying to recover`);
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error(`Fatal error for ${label}, cannot recover`);
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // For Safari, which has native HLS support
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(error => {
                    console.error(`Error playing video for ${label}:`, error);
                });
            });
        }

        return () => {
            if (hlsRef.current) {
                console.log(`Cleaning up HLS instance for ${label}`);
                hlsRef.current.destroy();
            }
        };
    }, [label]);

    return (
        <div className="camera-feed">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{label}</h3>
                <span style={{ color: '#666', fontSize: 14 }}>{timestamp}</span>
            </div>
            <div className="video-container" style={{ 
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
            }}>
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    muted
                    playsInline
                    style={{
                        width: '100%',
                        maxWidth: '100%',
                        borderRadius: '4px',
                        backgroundColor: '#000'
                    }}
                />
            </div>
        </div>
    );
};

export default CameraFeed; 