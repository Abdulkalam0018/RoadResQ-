import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Slider,
  Avatar,
  Rating,
  Alert,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocationOn,
  Phone,
  Star,
  Chat,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { mechanicsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NearbyMechanics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useState({
    lat: 0,
    lon: 0,
    radius: 5,
  });
  const [ratingSubmitting, setRatingSubmitting] = useState({});
  const [ratingSuccess, setRatingSuccess] = useState({});
  const [ratingError, setRatingError] = useState({});

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    cleanupRef.current = false;
    return () => {
      cleanupRef.current = true;
    };
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cleanupRef.current) {
            const { latitude, longitude } = position.coords;
            setSearchParams(prev => ({
              ...prev,
              lat: latitude,
              lon: longitude,
            }));
            // Don't automatically search - let user click search button
          }
        },
        (error) => {
          if (!cleanupRef.current) {
            console.error('Error getting location:', error);
            setError('Unable to get your location. Please enter coordinates manually.');
          }
        }
      );
    } else {
      if (!cleanupRef.current) {
        setError('Geolocation is not supported by this browser.');
      }
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const searchNearbyMechanics = useCallback(async (lat, lon, radius) => {
    if (cleanupRef.current) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await mechanicsAPI.getNearby(lat, lon, radius);
      if (!cleanupRef.current) {
        setGarages(response.data?.data || []);
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setError(error.response?.data?.message || 'Failed to fetch nearby mechanics');
      }
    } finally {
      if (!cleanupRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleSearch = () => {
    searchNearbyMechanics(searchParams.lat, searchParams.lon, searchParams.radius);
  };

  const handleRateGarage = useCallback(async (mechanicId, garageIndex, value) => {
    if (cleanupRef.current) return;
    
    // Create a unique key for this specific garage
    const garageKey = `${mechanicId}-${garageIndex}`;
    
    setRatingSubmitting(prev => ({ ...prev, [garageKey]: true }));
    setRatingSuccess(prev => ({ ...prev, [garageKey]: '' }));
    setRatingError(prev => ({ ...prev, [garageKey]: '' }));
    
    try {
      const response = await mechanicsAPI.rateGarage(mechanicId, garageIndex, value);
      if (!cleanupRef.current) {
        setRatingSuccess(prev => ({ 
          ...prev, 
          [garageKey]: 'Rating submitted successfully!' 
        }));
        
        // Update the garage rating in the UI
        setGarages(prevGarages => 
          prevGarages.map(garage => {
            if (garage._id === mechanicId && garage.garageIndex === garageIndex) {
              return {
                ...garage,
                garage: {
                  ...garage.garage,
                  averageRating: response.data?.data?.averageRating,
                  totalRatings: response.data?.data?.totalRatings
                }
              };
            }
            return garage;
          })
        );
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setRatingError(prev => ({ 
          ...prev, 
          [garageKey]: error.response?.data?.message || 'Failed to submit rating' 
        }));
      }
    } finally {
      if (!cleanupRef.current) {
        setRatingSubmitting(prev => ({ ...prev, [garageKey]: false }));
      }
    }
  }, []);

  return (
    <Box sx={{ px: { xs: 1, sm: 2 } }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom
        sx={{ 
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          mb: { xs: 2, sm: 3 }
        }}
      >
        Find Nearby Mechanics
      </Typography>

      {/* Search Controls */}
      <Paper elevation={2} sx={{ 
        p: { xs: 2, sm: 3 }, 
        mb: { xs: 2, sm: 3 },
        borderRadius: { xs: 2, sm: 3 }
      }}>
        <Typography 
          variant={isMobile ? "h6" : "h6"} 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            mb: { xs: 1, sm: 2 }
          }}
        >
          Search Parameters
        </Typography>
        
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Latitude"
              type="number"
              value={searchParams.lat}
              onChange={(e) => setSearchParams(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Longitude"
              type="number"
              value={searchParams.lon}
              onChange={(e) => setSearchParams(prev => ({ ...prev, lon: parseFloat(e.target.value) || 0 }))}
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography 
                variant="body2" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Search Radius: {searchParams.radius} km
              </Typography>
              <Slider
                value={searchParams.radius}
                onChange={(_, value) => setSearchParams(prev => ({ ...prev, radius: value }))}
                min={1}
                max={50}
                step={1}
                marks={[
                  { value: 1, label: '1km' },
                  { value: 25, label: '25km' },
                  { value: 50, label: '50km' }
                ]}
                sx={{
                  '& .MuiSlider-markLabel': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 1, sm: 2 },
              height: '100%',
              justifyContent: 'center'
            }}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                size={isMobile ? "medium" : "large"}
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 }
                }}
              >
                {loading ? <CircularProgress size={20} /> : 'Search'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
                        setSearchParams(prev => ({
                          ...prev,
                          lat: latitude,
                          lon: longitude,
                        }));
                        setError(''); // Clear any previous errors
                      },
                      (error) => {
                        console.error('Error getting location:', error);
                        setError('Unable to get your location. Please enter coordinates manually.');
                      }
                    );
                  } else {
                    setError('Geolocation is not supported by this browser.');
                  }
                }}
                size={isMobile ? "small" : "medium"}
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                Use My Location
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Results */}
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          py: { xs: 4, sm: 8 } 
        }}>
          <CircularProgress />
        </Box>
      ) : garages.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {garages.map((mechanic, index) => {
            const ratings = mechanic.garage?.ratings || [];
            const avgRating = mechanic.garage?.averageRating !== undefined ? 
              mechanic.garage.averageRating : 
              (ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length) : 0);
            
            // Get the total number of ratings (either from ratings array or totalRatings field)
            const totalRatings = mechanic.garage?.totalRatings || ratings.length;
            
            // Create a unique key combining mechanic ID, garage name, and index
            const uniqueKey = `${mechanic._id}-${mechanic.garageIndex || 0}`; // Use garageIndex from backend
            
            return (
              <Grid item xs={12} sm={6} md={4} key={uniqueKey}>
                <Card elevation={3} sx={{ 
                  height: '100%',
                  borderRadius: { xs: 2, sm: 3 },
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease-in-out'
                  }
                }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        mr: 2, 
                        width: { xs: 48, sm: 56 }, 
                        height: { xs: 48, sm: 56 } 
                      }}>
                        {mechanic.fullName?.charAt(0) || mechanic.username?.charAt(0) || 'M'}
                      </Avatar>
                      <Box>
                        <Typography 
                          variant={isMobile ? "h6" : "h6"}
                          sx={{ 
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            fontWeight: 'bold'
                          }}
                        >
                          {mechanic.fullName}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          @{mechanic.username}
                        </Typography>
                      </Box>
                    </Box>

                    {mechanic.garage && (
                      <>
                        <Typography 
                          variant={isMobile ? "h6" : "h6"}
                          sx={{ 
                            fontSize: { xs: '1rem', sm: '1.125rem' },
                            fontWeight: 'bold',
                            mb: 1
                          }}
                        >
                          {mechanic.garage.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            {mechanic.garage.location.coordinates[1].toFixed(4)}, {mechanic.garage.location.coordinates[0].toFixed(4)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography 
                            variant="body2" 
                            color="primary"
                            sx={{ 
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              fontWeight: 'bold'
                            }}
                          >
                            Distance: {mechanic.distance ? `${(mechanic.distance / 1000).toFixed(1)} km` : 'Unknown'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Star fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                          <Rating 
                            value={avgRating} 
                            precision={0.1} 
                            readOnly 
                            size={isMobile ? "small" : "small"} 
                          />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              ml: 1,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                          >
                            ({avgRating.toFixed(1)}) ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                          </Typography>
                        </Box>

                        {user && user.userType === 'user' && (
                          <Box sx={{ mb: 2 }}>
                            <Typography 
                              variant="body2" 
                              gutterBottom
                              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                            >
                              Rate this Garage:
                            </Typography>
                            <Rating
                              name={`rate-garage-${uniqueKey}`}
                              value={0}
                              max={5}
                              onChange={(_, value) => handleRateGarage(mechanic._id, mechanic.garageIndex || 0, value)}
                              disabled={ratingSubmitting[uniqueKey]}
                              size={isMobile ? "small" : "medium"}
                            />
                            {ratingSuccess[uniqueKey] && (
                              <Alert 
                                severity="success" 
                                sx={{ 
                                  mt: 1,
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                {ratingSuccess[uniqueKey]}
                              </Alert>
                            )}
                            {ratingError[uniqueKey] && (
                              <Alert 
                                severity="error" 
                                sx={{ 
                                  mt: 1,
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                {ratingError[uniqueKey]}
                              </Alert>
                            )}
                          </Box>
                        )}
                      </>
                    )}

                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      gap: { xs: 1, sm: 2 }
                    }}>
                      <Button
                        variant="outlined"
                        size={isMobile ? "small" : "small"}
                        startIcon={<Phone />}
                        href={`tel:${mechanic.phone}`}
                        sx={{ 
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          flex: 1
                        }}
                      >
                        Call
                      </Button>
                      <Button 
                        variant="contained" 
                        color="secondary" 
                        size={isMobile ? "small" : "small"}
                        startIcon={<Chat />}
                        onClick={() => navigate(`/chat/${mechanic._id}`)}
                        sx={{ 
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          flex: 1
                        }}
                      >
                        Chat
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : !loading && searchParams.lat !== 0 && searchParams.lon !== 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: { xs: 4, sm: 8 } 
        }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"}
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              mb: 2
            }}
          >
            No mechanics found nearby
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Try increasing the search radius or check your location settings.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          textAlign: 'center', 
          py: { xs: 4, sm: 8 } 
        }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"}
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              mb: 2
            }}
          >
            Ready to Search
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Enter your location coordinates or use "Use My Location" button, then click "Search" to find nearby mechanics.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NearbyMechanics;