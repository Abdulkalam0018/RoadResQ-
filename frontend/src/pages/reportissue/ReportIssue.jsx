import React,{useState,useEffect} from 'react'
import './reportissue.css'; // Assuming you have a CSS file for styling
function ReportIssue() {
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [loading,setLoading]=useState(false);
    const handleDetectLocation = () => {
        if(!navigator.geolocation) {
            alert("Geolocation is not supported by this browser.");
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation(`Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`);
                setLoading(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location. Please enter it manually.");
                setLoading(false);
            }
        );
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here
        console.log("Form submitted",{location,description});
        alert("Form submitted successfully!");
        setLocation('');
        setDescription('');
        // Reset form fields if needed
    };
  return (
    <div className='report-container'>
        <h1>Report Vehicle Breakdown</h1>
        <form onSubmit={handleSubmit} className='report-form'>
            <div className='locatin-row'>
                <input
                    type="text" 
                    placeholder="Enter your location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className='location-input'
                    required
                />
                <button type='button' className='detect-button' onClick={handleDetectLocation}>
                    {loading ? 'Detecting...' : 'Detect Location'}

                </button>
            
            </div>
            <textarea
                placeholder='Describe your issue'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='report-textarea'
                required
            >

            </textarea>
            <button type='submit' className='submit-button'>
                Submit Report
            </button>
            <button type='reset' className='reset-button' onClick={() => {setLocation(''); setDescription('');}}>
                Reset
            </button>       

        </form>



    </div>
  )
}

export default ReportIssue