import React, { useState, useRef } from 'react';
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
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cleanupRef.current) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.forgotPassword({ email });
      
      if (!cleanupRef.current) {
        // Check if this is a development response (email not configured)
        if (response.data && response.data.data && response.data.data.development) {
          setSuccess(
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
          setSuccess('Password reset instructions sent to your email! Please check your inbox.');
        }
      }
    } catch (error) {
      if (!cleanupRef.current) {
        console.error('Password reset error:', error);
        
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 404) {
            setError('User not found. Please check your email address.');
          } else if (status === 500) {
            if (data.details && data.details.includes('not properly configured')) {
              setError('Email service is not properly configured. Please contact the administrator.');
            } else if (data.message && data.message.includes('authentication failed')) {
              setError('Email authentication failed. Please contact the administrator.');
            } else {
              setError(data.message || 'Server error while sending reset email');
            }
          } else {
            setError(data.message || 'Failed to send reset email');
          }
        } else if (error.request) {
          setError('No response from server. Please check your internet connection.');
        } else {
          setError('Failed to send reset email. Please try again later.');
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
          Forgot Your Password?
        </Typography>

        <Typography 
          variant="body1" 
          color="text.secondary" 
          align="center" 
          sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Enter your email address and we'll send you instructions to reset your password.
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

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? <CircularProgress size={isMobile ? 20 : 24} /> : 'Send Reset Instructions'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/login')}
            sx={{ textDecoration: 'none' }}
          >
            Back to Login
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPassword; 