import React, { useRef, useEffect, useState, useMemo } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Typography } from '@mui/material';
import { LocationOn } from '@mui/icons-material';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const LiveTrackingMap = ({ customerLocation, mechanicLocation }) => {
  const mapRef = useRef();

  // Ensure coordinates are valid [longitude, latitude] arrays
  const isValidCoord = (coord) => Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1]);
  
  const hasCustomer = isValidCoord(customerLocation);
  const hasMechanic = isValidCoord(mechanicLocation);

  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (hasCustomer && hasMechanic && MAPBOX_TOKEN) {
      const getRoute = async () => {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${mechanicLocation[0]},${mechanicLocation[1]};${customerLocation[0]},${customerLocation[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            setRouteGeoJSON(data.routes[0].geometry);
            setRouteInfo({
              duration: data.routes[0].duration, // in seconds
              distance: data.routes[0].distance, // in meters
            });
          }
        } catch (error) {
          console.error("Failed to fetch route", error);
        }
      };
      
      const timer = setTimeout(getRoute, 1000);
      return () => clearTimeout(timer);
    }
  }, [customerLocation, mechanicLocation, hasCustomer, hasMechanic]);

  const initialViewState = useMemo(() => {
    if (hasCustomer) {
      return {
        longitude: customerLocation[0],
        latitude: customerLocation[1],
        zoom: 13
      };
    }
    if (hasMechanic) {
      return {
        longitude: mechanicLocation[0],
        latitude: mechanicLocation[1],
        zoom: 13
      };
    }
    return {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10
    };
  }, [customerLocation, mechanicLocation, hasCustomer, hasMechanic]);

  useEffect(() => {
    if (mapRef.current && hasCustomer && hasMechanic) {
      const bounds = [
        [
          Math.min(customerLocation[0], mechanicLocation[0]),
          Math.min(customerLocation[1], mechanicLocation[1])
        ],
        [
          Math.max(customerLocation[0], mechanicLocation[0]),
          Math.max(customerLocation[1], mechanicLocation[1])
        ]
      ];
      
      // Only fit bounds if they are not identical to prevent errors
      if (bounds[0][0] !== bounds[1][0] || bounds[0][1] !== bounds[1][1]) {
         mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }
    }
  }, [customerLocation, mechanicLocation, hasCustomer, hasMechanic]);

  if (!MAPBOX_TOKEN) {
    return (
      <Box sx={{ 
        height: 250, 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        borderRadius: 2,
        mt: 1
      }}>
        <Typography color="error">Mapbox token is missing. Please add REACT_APP_MAPBOX_TOKEN to your .env file.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 250, width: '100%', borderRadius: 2, overflow: 'hidden', mt: 1, position: 'relative' }}>
      {routeInfo && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}>
          <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
            ETA: {Math.ceil(routeInfo.duration / 60)} min
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(routeInfo.distance / 1000).toFixed(1)} km away
          </Typography>
        </Box>
      )}
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {routeGeoJSON && (
          <Source id="routeSource" type="geojson" data={routeGeoJSON}>
            <Layer
              id="routeLayer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#1976d2',
                'line-width': 5,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {hasCustomer && (
          <Marker longitude={customerLocation[0]} latitude={customerLocation[1]} anchor="bottom">
            <Box sx={{ textAlign: 'center' }}>
              <LocationOn color="error" fontSize="large" sx={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }} />
              <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 1, px: 0.5 }}>You</Typography>
            </Box>
          </Marker>
        )}

        {hasMechanic && (
          <Marker longitude={mechanicLocation[0]} latitude={mechanicLocation[1]} anchor="bottom">
            <Box sx={{ textAlign: 'center' }}>
               <LocationOn 
                 htmlColor="#1976d2" 
                 fontSize="large" 
                 sx={{ 
                   filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))'
                 }} 
               />
               <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 1, px: 0.5 }}>Mechanic</Typography>
            </Box>
          </Marker>
        )}
      </Map>
    </Box>
  );
};

export default LiveTrackingMap;
