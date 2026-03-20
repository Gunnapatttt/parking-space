import React from 'react';
import CameraFeed from './CameraFeed';

const LiveFeed = () => (
    <div>
        <h2 style={{ fontWeight: 500, fontSize: 22, marginBottom: 16, marginTop: -10 }}>Live Feed</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <CameraFeed
                label="Entrance"
            />
            <CameraFeed
                label="Exit"
            />
        </div>
    </div>
);

export default LiveFeed;