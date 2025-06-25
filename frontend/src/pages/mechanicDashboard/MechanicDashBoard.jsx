import React,{useState} from 'react'
import './mechanicdashboard.css';
import { useNavigate } from 'react-router-dom'; 

const mockRequests = [
  {
    id: 1,
    location: "13.0827, 80.2707",
    description: "Flat tire near Chennai Central.",
  },
  {
    id: 2,
    location: "12.9716, 77.5946",
    description: "Engine stalled near MG Road.",
  },
  {
    id: 3,
    location: "28.7041, 77.1025",
    description: "Battery dead near New Delhi Station.",
  },
];// Assuming you have a CSS file for styling
function MechanicDashBoard() {
    const [requests, setRequests] = useState(mockRequests);
    const navigate = useNavigate();
    const handleAccept=(id)=>{
        alert('Request #${id} accepted !')
        setRequests((prev)=>prev.filter((req)=>req.id!==id));
    }

  return (
    <div className='mechanic-container'>
        <h1 className='mechanic-title'>mechanic Dashboard</h1>
        {
            requests.length === 0 ? (
                <p className='no-request'>
                    No requests available at the moment.
                </p>
            ) : (
                <div className='request-list'>
                    {requests.map((request) => (
                        <div key={request.id} className='request-card'>
                            <p><strong>Location:</strong> {request.location}</p>
                            <p><strong>Issue:</strong>{request.description}</p>
                            <div className='btn-row'>
                                <button onClick={()=>handleAccept(request.id) } className='accept-btn'>
                                    Accept
                                </button>
                                <button onClick={()=>navigate('/chat')} className='="chat-btn'>
                                    Chat
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
        )}

    </div>
  )
}

export default MechanicDashBoard