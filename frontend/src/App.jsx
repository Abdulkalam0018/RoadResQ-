import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/DashBoard';  // Note the correct casing
import ReportIssue from './pages/reportissue/ReportIssue';
import MechanicDashBoard from './pages/mechanicDashboard/MechanicDashBoard';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/mechanic" element={<Dashboard />} />
        <Route path="/reportissue" element={<ReportIssue />} />
        <Route path="/" element ={<MechanicDashBoard/>}/>
      </Routes>
    </Router>
  );
}

export default App;