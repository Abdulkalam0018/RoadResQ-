import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorModal from '../components/ErrorModal';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cleanupRef.current) return;
    
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);
      
      if (!cleanupRef.current) {
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Login failed. Please try again.');
          setShowErrorModal(!!result.error);
        }
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setError('Login failed. Please try again.');
        setShowErrorModal(true);
      }
    } finally {
      if (!cleanupRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCloseErrorModal = () => {
    if (!cleanupRef.current) {
      setShowErrorModal(false);
      setError('');
    }
  };

  return (
    <Box sx={{ 
      maxWidth: { xs: '100%', sm: 400, md: 450 }, 
      mx: 'auto', 
      mt: { xs: 2, sm: 4, md: 8 },
      px: { xs: 2, sm: 0 }
    }}>
      <Paper elevation={3} sx={{ 
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: { xs: 2, sm: 3 }
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            fontWeight: 'bold',
            mb: { xs: 2, sm: 3 }
          }}
        >
          Welcome Back
        </Typography>
        
        <Typography 
          variant="body1" 
          color="text.secondary" 
          align="center" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Sign in to your RoadResQ account
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: { xs: 2, sm: 3 } }}>
          <TextField
            required
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            sx={{ 
              mb: { xs: 2, sm: 3 },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
            size={isMobile ? "small" : "medium"}
          />
          
          <TextField
            required
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            sx={{ 
              mb: { xs: 3, sm: 4 },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
            size={isMobile ? "small" : "medium"}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mb: { xs: 2, sm: 3 },
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '1rem', sm: '1.1rem' }
            }}
            disabled={loading}
            size={isMobile ? "large" : "large"}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Box sx={{ 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: { xs: 1, sm: 1.5 }
          }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/forgot-password')}
              sx={{ 
                textDecoration: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 0.5, sm: 1 }
              }}
            >
              Forgot your password?
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/register')}
              sx={{ 
                textDecoration: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 0.5, sm: 1 }
              }}
            >
              Don't have an account? Sign up
            </Link>
          </Box>
        </Box>
      </Paper>
      {showErrorModal && error && (
        <ErrorModal open={showErrorModal} onClose={handleCloseErrorModal} error={error} />
      )}
    </Box>
  );
};

export default Login;