import React,{useState,useEffect} from 'react'
import "./trackdelivery.css";
import {GoogleMap,Marker,useJsApiLoader} from '@react-google-maps/api'

function Trackdelivery() {
    const [status, setStatus] = useState("En Route");
    const{isLoaded,loadError} = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    }); 
    if(loadError) return "Error loading maps";

   useEffect(() => {
     const timer = setTimeout(() => {
       setStatus("Delivered");
     }, 5000);
     return () => clearTimeout(timer);
   }, []);

  return (
    <div className='track-delivery'>
        <h1>Track Your Delivery</h1>
        {
            isLoaded ?(<GoogleMap
                mapContainerStyle={{width:"100%",height:"400px"}}
                center={{lat: 37.7749, lng: -122.4194}}
                zoom={12}
                >
                <Marker position={{lat: 37.7749, lng: -122.4194}} />
            </GoogleMap>
            ):
            (
                <div>Loading Map...</div>
            )
        }
        <div className='status-panel'>
            <h2>Status:</h2>
            <p> <strong>Driver: </strong></p>
            <p> <strong>Vehicle </strong></p>
            <p> <strong>Estimated Arrival:</strong></p>


        </div>
    </div>
  )
}

export default Trackdelivery