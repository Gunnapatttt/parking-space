# React Live Streaming Dashboard

A React application for monitoring live camera feeds with HLS streaming capabilities.

## Features
- Live video streaming display
- Dashboard with entrance/exit camera feeds
- Real-time status updates
- HLS (HTTP Live Streaming) support

## Project Structure
- `my-react-app/` - React frontend application
- `my-react-app/server/` - Node.js HLS streaming server

## Frontend Deployment (GitHub Pages)

The React frontend can be deployed to GitHub Pages for static hosting.

### Prerequisites
1. Node.js and npm installed
2. Git repository access

### Deployment Steps
1. Build the React application:
   ```bash
   cd my-react-app
   npm install
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## Backend Deployment (Separate Platform Required)

The HLS server requires a Node.js hosting platform such as:
- Heroku
- Railway
- Render
- Vercel

### Environment Variables
Configure the following for production:
- `PORT` - Server port (default: 3001)
- `RTSP_ENTRANCE_URL` - RTSP URL for entrance camera
- `RTSP_EXIT_URL` - RTSP URL for exit camera

## Local Development

### Frontend
```bash
cd my-react-app
npm install
npm start
```

### Backend
```bash
cd my-react-app/server
node hls-server.js
```

## Dependencies
- React 18
- HLS.js for video streaming
- Express.js for backend server
- FFmpeg for video processing
- CORS for cross-origin requests

## Notes
- Frontend is deployed as static files (GitHub Pages compatible)
- Backend requires separate deployment on Node.js hosting platform
- Update API endpoints in frontend when backend is deployed