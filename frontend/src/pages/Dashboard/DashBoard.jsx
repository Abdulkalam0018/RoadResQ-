import react from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css"; // Assuming you have a CSS file for styling
import ReportIssue from "../reportissue/ReportIssue";
const DashBoard = () => {
    const navigate = useNavigate();
    return (
        <div className="dashboard-container">
            <h1>
                Welcome to the RoadResQ
            </h1>
            <div className="dashboard-buttons">
                <button className="dashboard-btn blue" onClick={() => navigate('/reportissue')}>
                    Report Vechile breakdown
                </button>

                <button className="dashboard-btn green" onClick={() => navigate('/chat')}>
                    Chat with a Mechanic
                </button>
                <button className="dashboard-btn yellow" onClick={() => navigate('/track')}>
                    Track your request
                </button>
                <button className="dashboard-btn red" onClick={() =>{localStorage.clear(); navigate('/')}}>
                    Logout
                </button>


            </div>
        </div>
    );
};
export default DashBoard;