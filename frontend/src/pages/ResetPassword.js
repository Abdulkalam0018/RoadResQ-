import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    cleanupRef.current = false;
    return () => {
      cleanupRef.current = true;
    };
  }, []);

  useEffect(() => {
    // Extract token from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const resetToken = queryParams.get('token');
    
    if (!cleanupRef.current) {
      if (!resetToken) {
        setTokenValid(false);
        setError('Invalid or missing reset token. Please request a new password reset link.');
      } else {
        setToken(resetToken);
      }
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cleanupRef.current) return;
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.resetPassword({
        token,
        password: formData.password,
      });

      if (!cleanupRef.current) {
        setSuccess('Password reset successfully! You can now log in with your new password.');
        setTimeout(() => {
          if (!cleanupRef.current) {
            navigate('/login');
          }
        }, 2000);
      }
    } catch (error) {
      if (!cleanupRef.current) {
        console.error('Password reset error:', error);
        
        if (error.response) {
          const { status, data } = error.response;
          console.log('Error response:', status, data);
          
          if (status === 400) {
            setError(data.message || 'Invalid request. Please check your password requirements.');
            setTokenValid(false);
          } else if (status === 401) {
            setError(data.message || 'Reset token is invalid or has expired. Please request a new password reset link.');
            setTokenValid(false);
          } else if (status === 404) {
            setError(data.message || 'User not found. The account associated with this reset link may have been deleted.');
            setTokenValid(false);
          } else if (status === 500) {
            setError(data.message || 'Server error. Please try again later or contact support.');
          } else {
            setError(data.message || 'Failed to reset password. Please try again.');
          }
        } else if (error.request) {
          setError('No response from server. Please check your internet connection.');
        } else {
          setError('Failed to reset password. Please try again later.');
        }
      }
    } finally {
      if (!cleanupRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      px: { xs: 2, sm: 0 } 
    }}>
      <Paper elevation={3} sx={{ 
        p: { xs: 3, sm: 4 }, 
        width: '100%', 
        maxWidth: { xs: '100%', sm: 400 } 
      }}>
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}
        >
          Reset Your Password
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {error}
          </Alert>
        )}

        {tokenValid ? (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={loading}
              helperText="Password must be at least 6 characters"
              size={isMobile ? "small" : "medium"}
              InputLabelProps={{
                style: { fontSize: isMobile ? '0.875rem' : '1rem' }
              }}
              FormHelperTextProps={{
                style: { fontSize: isMobile ? '0.75rem' : '0.875rem' }
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
              size={isMobile ? "small" : "medium"}
              InputLabelProps={{
                style: { fontSize: isMobile ? '0.875rem' : '1rem' }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              size={isMobile ? "medium" : "large"}
            >
              {loading ? <CircularProgress size={isMobile ? 20 : 24} /> : 'Reset Password'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/profile')}
              sx={{ mt: 2 }}
              size={isMobile ? "medium" : "large"}
            >
              Go to Profile
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ResetPassword;