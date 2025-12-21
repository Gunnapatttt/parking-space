import React, { useEffect, useState } from 'react';

export default function App() {
  const [response, setResponse] = useState('Testing new API endpoints...');

  useEffect(() => {
    // Test the actual API endpoints your backend dev provided
    const testEndpoints = async () => {
      try {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const currentDate = `${day}-${month}-${year}`; // DD-MM-YYYY format

        let results = `Testing https://a4dad061e184.ngrok-free.app\nDate: ${currentDate}\n\n`;

        // Test 1: Car Count endpoint
        setResponse(results + '🔄 Testing /api/carCount...');
        try {
          const carCountResponse = await fetch(`/api/carCount?targetCarCountDate=${currentDate}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          
          if (carCountResponse.ok) {
            const carData = await carCountResponse.text();
            results += `✅ Car Count API: SUCCESS\n📊 Response: ${carData}\n\n`;
          } else {
            results += `❌ Car Count API: ${carCountResponse.status} ${carCountResponse.statusText}\n\n`;
          }
        } catch (error) {
          results += `❌ Car Count API: ${error.message}\n\n`;
        }

        // Test 2: Parking Average endpoint
        setResponse(results + '🔄 Testing /api/parking-avg...');
        try {
          const avgResponse = await fetch(`/api/parking-avg?startDate=01-01-${year}&endDate=31-12-${year}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          
          if (avgResponse.ok) {
            const avgData = await avgResponse.text();
            results += `✅ Parking Average API: SUCCESS\n📊 Response: ${avgData}\n\n`;
          } else {
            results += `❌ Parking Average API: ${avgResponse.status} ${avgResponse.statusText}\n\n`;
          }
        } catch (error) {
          results += `❌ Parking Average API: ${error.message}\n\n`;
        }

        // Test 3: Peak Time endpoint
        setResponse(results + '🔄 Testing /api/peakTime...');
        try {
          const peakResponse = await fetch(`/api/peakTime?peakTimeTargetDate=${currentDate}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          
          if (peakResponse.ok) {
            const peakData = await peakResponse.text();
            results += `✅ Peak Time API: SUCCESS\n📊 Response: ${peakData}\n\n`;
          } else {
            results += `❌ Peak Time API: ${peakResponse.status} ${peakResponse.statusText}\n\n`;
          }
        } catch (error) {
          results += `❌ Peak Time API: ${error.message}\n\n`;
        }

        setResponse(results + '🎯 Testing complete!');
      } catch (error) {
        setResponse(`❌ General Error: ${error.message}`);
      }
    };
    
    testEndpoints();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f5f5f5', 
      borderRadius: '8px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      {response}
    </div>
  );
}