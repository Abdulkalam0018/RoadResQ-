import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  FormControlLabel,
  Divider,
  TextField,
  Alert,
  Rating,
  Switch,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocationOn,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { mechanicsAPI, userAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import AIRoadsideAssistant from '../components/AIRoadsideAssistant';
import {
  getGeolocationErrorMessage,
  requestCurrentPosition,
} from '../utils/geolocation';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [garageForm, setGarageForm] = useState({
    name: '',
    location: [0, 0],
  });
  const [showGaragePage, setShowGaragePage] = useState(false);
  const [garages, setGarages] = useState([]);
  const [garageSuccess, setGarageSuccess] = useState('');
  const [garageError, setGarageError] = useState('');
  const [loadingGarages, setLoadingGarages] = useState(false);
  const [locatingGarage, setLocatingGarage] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [isAvailable, setIsAvailable] = useState(Boolean(user?.isAvailable));
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    cleanupRef.current = false;
    return () => {
      cleanupRef.current = true;
    };
  }, []);

  const handleGarageInputChange = useCallback((e) => {
    if (cleanupRef.current) return;
    
    const { name, value } = e.target;
    setGarageForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGarageLocationChange = useCallback((e, idx) => {
    if (cleanupRef.current) return;
    
    const value = parseFloat(e.target.value) || 0;
    setGarageForm((prev) => {
      const coords = [...prev.location];
      coords[idx] = value;
      return { ...prev, location: coords };
    });
  }, []);

  const handleUseMyLocation = useCallback(() => {
    if (cleanupRef.current) return;

    setGarageError('');
    setGarageSuccess('');
    setLocatingGarage(true);

    requestCurrentPosition()
      .then((position) => {
        if (!cleanupRef.current) {
          setGarageForm((prev) => ({
            ...prev,
            location: [position.coords.longitude, position.coords.latitude]
          }));
          setGarageSuccess('Current location added to the garage form.');
        }
      })
      .catch((locationError) => {
        if (!cleanupRef.current) {
          console.error('Error getting location:', locationError);
          setGarageError(getGeolocationErrorMessage(locationError));
        }
      })
      .finally(() => {
        if (!cleanupRef.current) {
          setLocatingGarage(false);
        }
      });
  }, []);

  const fetchGarages = useCallback(async () => {
    if (cleanupRef.current) return;
    
    setLoadingGarages(true);
    try {
      const res = await userAPI.getUserGarages(user?._id);
      if (!cleanupRef.current) {
        setGarages(res.data.data || []);
      }
    } catch (error) {
      if (!cleanupRef.current) {
        console.error('Failed to fetch garages:', error);
      }
    } finally {
      if (!cleanupRef.current) {
        setLoadingGarages(false);
      }
    }
  }, [user?._id]);

  useEffect(() => {
    if (user && user.userType === 'mechanic' && !cleanupRef.current) {
      fetchGarages();
    }
  }, [user, fetchGarages]);

  useEffect(() => {
    if (!cleanupRef.current) {
      setIsAvailable(Boolean(user?.isAvailable));
    }
  }, [user?.isAvailable]);

  useEffect(() => {
    const handleAssistantAction = (event) => {
      if (cleanupRef.current) return;

      const action = event.detail;
      if (!action?.type) return;

      if (action.type === 'navigate' && action.path) {
        navigate(action.path);
      }

      if (action.type === 'open_garage_manager') {
        setShowGaragePage(true);
      }
    };

    window.addEventListener('roadresq:assistant-action', handleAssistantAction);
    return () => {
      window.removeEventListener('roadresq:assistant-action', handleAssistantAction);
    };
  }, [navigate]);

  const handleGarageSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (cleanupRef.current) return;
    
    setGarageSuccess('');
    setGarageError('');
    try {
      const response = await userAPI.addOrUpdateGarage(garageForm);
      if (!cleanupRef.current) {
        setGarages(response.data.data);
        setGarageSuccess('Garage added successfully!');
        setGarageForm({ name: '', location: [0, 0] });
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setGarageError(error.response?.data?.message || 'Failed to add garage');
      }
    }
  }, [garageForm]);

  const handleDeleteGarage = useCallback(async (index) => {
    if (cleanupRef.current) return;
    
    setDeletingIndex(index);
    setGarageSuccess('');
    setGarageError('');
    try {
      const response = await userAPI.deleteGarage(index);
      if (!cleanupRef.current) {
        setGarages(response.data.data);
        setGarageSuccess('Garage deleted successfully!');
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setGarageError(error.response?.data?.message || 'Failed to delete garage');
      }
    } finally {
      if (!cleanupRef.current) {
        setDeletingIndex(null);
      }
    }
  }, []);

  const handleAvailabilityChange = useCallback(async (event) => {
    if (cleanupRef.current) return;

    const nextValue = event.target.checked;
    setAvailabilityLoading(true);
    setAvailabilityMessage('');
    setAvailabilityError('');

    try {
      const response = await mechanicsAPI.updateAvailability(nextValue);
      if (!cleanupRef.current) {
        setIsAvailable(Boolean(response.data?.data?.isAvailable));
        setAvailabilityMessage(`Availability is now ${response.data?.data?.isAvailable ? 'ON' : 'OFF'}.`);
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setAvailabilityError(error.response?.data?.message || 'Failed to update availability');
      }
    } finally {
      if (!cleanupRef.current) {
        setAvailabilityLoading(false);
      }
    }
  }, []);

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6">Please log in to view your dashboard</Typography>
      </Box>
    );
  }

  if (user.userType !== 'mechanic') {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            mb: { xs: 2, sm: 4 }
          }}
        >
          Welcome, {user.fullName}!
        </Typography>
        <Box sx={{ 
          mt: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'center',
          gap: 2
        }}>
          <Button
            variant="contained"
            size={isMobile ? "large" : "large"}
            color="primary"
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.1rem' },
              py: { xs: 1.5, sm: 2 },
              px: { xs: 3, sm: 4 }
            }}
            onClick={() => navigate('/nearby-mechanics')}
          >
            Search Nearby Garage
          </Button>
          <Button
            variant="outlined"
            size={isMobile ? "large" : "large"}
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.1rem' },
              py: { xs: 1.5, sm: 2 },
              px: { xs: 3, sm: 4 }
            }}
            onClick={() => navigate('/chat')}
          >
            Open Messages
          </Button>
        </Box>

        <Card elevation={2} sx={{ mt: 4, textAlign: 'left', maxWidth: 960, mx: 'auto' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <AIRoadsideAssistant />
          </CardContent>
        </Card>
      </Box>
    );
  }

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
        Welcome, {user.fullName}!
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '100%' }}>
                  <Typography 
                    variant={isMobile ? "h6" : "h6"}
                    sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                  >
                    {user.fullName}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    @{user.username}
                  </Typography>
                  <Chip 
                    label={user.userType} 
                    color={user.userType === 'mechanic' ? 'primary' : 'default'}
                    size="small"
                    sx={{ 
                      mt: 1,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  />
                </Box>
              </Box>

              {user.userType === 'mechanic' && (
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isAvailable}
                        onChange={handleAvailabilityChange}
                        disabled={availabilityLoading}
                      />
                    }
                    label={availabilityLoading ? 'Updating availability...' : `Availability ${isAvailable ? 'ON' : 'OFF'}`}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ 
                      mt: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}
                    onClick={() => setShowGaragePage(true)}
                  >
                    Add Garage
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Type Specific Content */}
        <Grid item xs={12} md={8}>
          {user.userType === 'mechanic' && showGaragePage ? (
            <Card elevation={2}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {availabilityMessage && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {availabilityMessage}
                  </Alert>
                )}
                {availabilityError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {availabilityError}
                  </Alert>
                )}
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  Garage Management
                </Typography>
                {garageSuccess && (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mb: 2,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {garageSuccess}
                  </Alert>
                )}
                {garageError && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 2,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {garageError}
                  </Alert>
                )}
                <Box component="form" onSubmit={handleGarageSubmit}>
                  <TextField
                    required
                    fullWidth
                    label="Garage Name"
                    name="name"
                    value={garageForm.name}
                    onChange={handleGarageInputChange}
                    sx={{ 
                      mb: 2,
                      '& .MuiInputLabel-root': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                    size={isMobile ? "small" : "medium"}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        label="Longitude"
                        name="lng"
                        type="number"
                        value={garageForm.location[0]}
                        onChange={(e) => handleGarageLocationChange(e, 0)}
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
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        label="Latitude"
                        name="lat"
                        type="number"
                        value={garageForm.location[1]}
                        onChange={(e) => handleGarageLocationChange(e, 1)}
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
                  </Grid>
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 2 },
                    mt: 2
                  }}>
                    <Button
                      variant="outlined"
                      onClick={handleUseMyLocation}
                      type="button"
                      disabled={locatingGarage}
                      size={isMobile ? "small" : "medium"}
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      {locatingGarage ? 'Getting Location...' : 'Use My Location'}
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size={isMobile ? "small" : "medium"}
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Add Garage
                    </Button>
                  </Box>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  Saved Garages
                </Typography>
                {garages.length === 0 && !loadingGarages ? (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    No garages added yet.
                  </Typography>
                ) : loadingGarages ? (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Loading garages...
                  </Typography>
                ) : (
                  garages.map((garage, idx) => {
                    const ratings = garage.ratings || [];
                    const avgRating = garage.averageRating !== undefined ? garage.averageRating : 
                      (ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length) : 0);
                    return (
                      <Card key={garage._id || idx} elevation={3} sx={{ 
                        mb: 3, 
                        p: { xs: 1, sm: 2 }, 
                        borderRadius: 3, 
                        boxShadow: 3 
                      }}>
                        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography 
                                variant={isMobile ? "h6" : "h6"} 
                                sx={{ 
                                  mb: 1,
                                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}
                              >
                                {garage.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <LocationOn fontSize="small" sx={{ mr: 1 }} />
                                <Typography 
                                  variant="body2"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  Longitude: {garage.location.coordinates[0]}, Latitude: {garage.location.coordinates[1]}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mr: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}
                                >
                                  Average Rating:
                                </Typography>
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
                                  ({avgRating.toFixed(1)}) ({ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'})
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              variant="outlined"
                              color="error"
                              size={isMobile ? "small" : "small"}
                              disabled={deletingIndex === idx}
                              onClick={() => handleDeleteGarage(idx)}
                              sx={{ 
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            >
                              {deletingIndex === idx ? 'Deleting...' : 'Delete'}
                            </Button>
                          </Box>
                          <Divider sx={{ my: 2 }} />
                        </CardContent>
                      </Card>
                    );
                  })
                )}
                <Button
                  variant="outlined"
                  sx={{ 
                    mt: 2,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                  onClick={() => setShowGaragePage(false)}
                >
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card elevation={2}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {availabilityMessage && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {availabilityMessage}
                  </Alert>
                )}
                {availabilityError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {availabilityError}
                  </Alert>
                )}
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  Mechanic Dashboard
                </Typography>
                {/* Mechanic-specific content here */}
                <Divider sx={{ my: 3 }} />
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  Saved Garages
                </Typography>
                {garages.length === 0 && !loadingGarages ? (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    No garages added yet.
                  </Typography>
                ) : loadingGarages ? (
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Loading garages...
                  </Typography>
                ) : (
                  garages.map((garage, idx) => {
                    const ratings = garage.ratings || [];
                    const avgRating = garage.averageRating !== undefined ? garage.averageRating : 
                      (ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length) : 0);
                    return (
                      <Card key={garage._id || idx} elevation={3} sx={{ 
                        mb: 3, 
                        p: { xs: 1, sm: 2 }, 
                        borderRadius: 3, 
                        boxShadow: 3 
                      }}>
                        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography 
                                variant={isMobile ? "h6" : "h6"} 
                                sx={{ 
                                  mb: 1,
                                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}
                              >
                                {garage.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <LocationOn fontSize="small" sx={{ mr: 1 }} />
                                <Typography 
                                  variant="body2"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                  Longitude: {garage.location.coordinates[0]}, Latitude: {garage.location.coordinates[1]}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mr: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}
                                >
                                  Average Rating:
                                </Typography>
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
                                  ({avgRating.toFixed(1)}) ({ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'})
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              variant="outlined"
                              color="error"
                              size={isMobile ? "small" : "small"}
                              disabled={deletingIndex === idx}
                              onClick={() => handleDeleteGarage(idx)}
                              sx={{ 
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            >
                              {deletingIndex === idx ? 'Deleting...' : 'Delete'}
                            </Button>
                          </Box>
                          <Divider sx={{ my: 2 }} />
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <AIRoadsideAssistant />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
