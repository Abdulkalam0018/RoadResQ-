import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Edit, Save, Lock, Email } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { userAPI, authAPI } from '../services/api';
import { useLocation } from 'react-router-dom';

const Profile = () => {
  const { user, checkAuthStatus } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [iconPosition, setIconPosition] = useState(isMobile ? 'top' : 'start');
  const cleanupRef = useRef(false);
  
  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    cleanupRef.current = false;
    return () => {
      cleanupRef.current = true;
    };
  }, []);
  
  // Update icon position based on screen size
  useEffect(() => {
    if (!cleanupRef.current) {
      setIconPosition(isMobile ? 'top' : 'start');
    }
  }, [isMobile]);
  
  // Profile update state
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState(user?.email || '');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleTabChange = (event, newValue) => {
    if (!cleanupRef.current) {
      setActiveTab(newValue);
      // Reset all success/error messages when changing tabs
      setProfileSuccess('');
      setProfileError('');
      setPasswordSuccess('');
      setPasswordError('');
      setForgotSuccess('');
      setForgotError('');
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (cleanupRef.current) return;
    
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      await userAPI.updateProfile({
        fullName: profileData.fullName,
        email: profileData.email,
      });
      if (!cleanupRef.current) {
        setProfileSuccess('Profile updated successfully!');
        // Refresh user data
        checkAuthStatus();
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setProfileError(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      if (!cleanupRef.current) {
        setProfileLoading(false);
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      await authAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await authAPI.forgotPassword({ email: forgotEmail });
      
      // Check if this is a development response (email not configured)
      if (response.data && response.data.data && response.data.data.development) {
        setForgotSuccess(
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {response.data.data.message}
            </Typography>
            <Typography 
              variant="body2" 
              component="a" 
              href={response.data.data.resetURL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main', 
                textDecoration: 'underline',
                wordBreak: 'break-all'
              }}
            >
              {response.data.data.resetURL}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              (Copy and paste this URL in your browser to reset your password)
            </Typography>
          </Box>
        );
      } else {
        setForgotSuccess('Password reset instructions sent to your email!');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Handle different error scenarios with appropriate messages
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 404) {
          setForgotError('User not found. Please check your email address.');
        } else if (status === 500) {
          if (data.details && data.details.includes('not properly configured')) {
            setForgotError('Email service is not properly configured. Please contact the administrator.');
          } else if (data.message && data.message.includes('authentication failed')) {
            setForgotError('Email authentication failed. Please contact the administrator.');
          } else {
            setForgotError(data.message || 'Server error while sending reset email');
          }
        } else {
          setForgotError(data.message || 'Failed to send reset email');
        }
      } else if (error.request) {
        setForgotError('No response from server. Please check your internet connection.');
      } else {
        setForgotError('Failed to send reset email. Please try again later.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6">Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
        Profile Settings
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Profile Summary Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, mb: 2 }}>
                  {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                </Avatar>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{user.fullName}</Typography>
                <Typography variant="body1" color="text.secondary">
                  @{user.username}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center', wordBreak: 'break-word' }}>
                  {user.email}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Tabs */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minWidth: { xs: '33%', sm: 'auto' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            >
              <Tab 
                label="Edit Profile" 
                icon={<Edit />} 
                iconPosition={iconPosition} 
              />
              <Tab 
                label="Change Password" 
                icon={<Lock />} 
                iconPosition={iconPosition} 
              />
              <Tab 
                label="Reset Password" 
                icon={<Email />} 
                iconPosition={iconPosition} 
              />
            </Tabs>

            {/* Edit Profile Tab */}
            {activeTab === 0 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {profileSuccess && <Alert severity="success" sx={{ mb: 2 }}>{profileSuccess}</Alert>}
                {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
                
                <Box component="form" onSubmit={handleProfileSubmit}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleProfileChange}
                    margin="normal"
                    required
                    size={isMobile ? "small" : "medium"}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    margin="normal"
                    required
                    size={isMobile ? "small" : "medium"}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={profileLoading ? <CircularProgress size={isMobile ? 16 : 20} color="inherit" /> : <Save />}
                    disabled={profileLoading}
                    sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
                    size={isMobile ? "medium" : "large"}
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Change Password Tab */}
            {activeTab === 1 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
                {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
                
                <Box component="form" onSubmit={handlePasswordSubmit}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="oldPassword"
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    size={isMobile ? "small" : "medium"}
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    helperText="Password must be at least 6 characters"
                    size={isMobile ? "small" : "medium"}
                  />
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    size={isMobile ? "small" : "medium"}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={passwordLoading ? <CircularProgress size={isMobile ? 16 : 20} color="inherit" /> : <Lock />}
                    disabled={passwordLoading}
                    sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
                    size={isMobile ? "medium" : "large"}
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Reset Password Tab */}
            {activeTab === 2 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {forgotSuccess && <Alert severity="success" sx={{ mb: 2 }}>{forgotSuccess}</Alert>}
                {forgotError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {forgotError}
                    {forgotError.includes('not properly configured') && (
                      <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Note: This is a development environment issue. The email service needs to be configured with valid credentials in the backend .env file.
                      </Typography>
                    )}
                  </Alert>
                )}
                
                <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Forgot your password? Enter your email address below and we'll send you instructions to reset it.
                </Typography>
                
                <Box component="form" onSubmit={handleForgotSubmit}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    margin="normal"
                    required
                    size={isMobile ? "small" : "medium"}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={forgotLoading ? <CircularProgress size={isMobile ? 16 : 20} color="inherit" /> : <Email />}
                    disabled={forgotLoading}
                    sx={{ mt: 3, width: { xs: '100%', sm: 'auto' } }}
                    size={isMobile ? "medium" : "large"}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Instructions'}
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;