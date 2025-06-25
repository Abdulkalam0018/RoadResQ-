import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/DashBoard';  // Note the correct casing
import ReportIssue from './pages/reportissue/ReportIssue';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reportissue" element={<ReportIssue />} />  {/* Replace with actual ReportIssue component */}
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;