import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/DashBoard';  // Note the correct casing
import ReportIssue from './pages/reportissue/ReportIssue';
import MechanicDashBoard from './pages/mechanicDashboard/MechanicDashBoard';
import Trackdelivery from './pages/trackdelivery/Trackdelivery';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/mechanic" element={<Dashboard />} />
        <Route path="/reportissue" element={<ReportIssue />} />
        <Route path="/track" element ={<MechanicDashBoard/>}/>
        <Route path="/" element={<Trackdelivery />} />
      </Routes>
    </Router>
  );
}

export default App;