import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // Main dashboard - Updated for https://a4dad061e184.ngrok-free.app
// import App from './2'; // Test component - Testing new API endpoints

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
