import React from 'react';
import './App.css';
import DashboardLayout from './components/DashboardLayout';
import Header from './components/Header';
import LiveFeed from './components/LiveFeed';
import DashboardSummary from './components/DashboardSummary';
import UpdateLog from './components/UpdateLog';

function App() {
  return (
    <DashboardLayout
      header={<Header />}
      left={<LiveFeed />}
      right={
        <div>
          <DashboardSummary />
          <UpdateLog />
        </div>
      }
    />
  );
}

export default App;
