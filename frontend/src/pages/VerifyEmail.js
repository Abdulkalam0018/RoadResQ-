import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Email,
  ArrowBack,
} from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cleanupRef = useRef(false);
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    cleanupRef.current = false;
    return () => {
      cleanupRef.current = true;
    };
  }, []);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        if (!cleanupRef.current) {
          setStatus('error');
          setError('No verification token found in the URL.');
        }
        return;
      }

      try {
        const response = await authAPI.verifyEmail({ token });
        if (!cleanupRef.current) {
          setStatus('success');
          setMessage(response.data?.message || 'Email verified successfully!');
        }
      } catch (error) {
        if (!cleanupRef.current) {
          setStatus('error');
          setError(error.response?.data?.message || 'Failed to verify email. Please try again.');
        }
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleGoToLogin = () => {
    if (!cleanupRef.current) {
      navigate('/login');
    }
  };

  const handleGoHome = () => {
    if (!cleanupRef.current) {
      navigate('/');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              Verifying Your Email...
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              Please wait while we verify your email address.
            </Typography>
          </Box>
        );

      case 'success':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle 
              sx={{ 
                fontSize: 80, 
                color: 'success.main',
                mb: 3 
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 2,
                color: 'success.main',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              Email Verified Successfully!
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 4,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: 1.6
              }}
            >
              {message}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGoToLogin}
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                px: 4,
                py: 1.5
              }}
            >
              Sign In Now
            </Button>
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Error 
              sx={{ 
                fontSize: 80, 
                color: 'error.main',
                mb: 3 
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 2,
                color: 'error.main',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              Verification Failed
            </Typography>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 4,
                textAlign: 'left',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {error}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={handleGoHome}
                startIcon={<ArrowBack />}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Go Home
              </Button>
              <Button
                variant="contained"
                onClick={handleGoToLogin}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Sign In
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
        bgcolor: 'grey.50'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 6 },
          maxWidth: 500,
          width: '100%',
          borderRadius: 2,
          textAlign: 'center'
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Email 
            sx={{ 
              fontSize: 60, 
              color: 'primary.main',
              mb: 2
            }} 
          />
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            Email Verification
          </Typography>
        </Box>

        {renderContent()}
      </Paper>
    </Box>
  );
};

export default VerifyEmail; 