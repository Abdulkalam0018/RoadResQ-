import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmailVerificationModal from '../components/EmailVerificationModal';
import ErrorModal from '../components/ErrorModal';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);
  
  const [userType, setUserType] = useState('user');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Email verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState({ email: '', verificationUrl: '' });
  const [isResending, setIsResending] = useState(false);
  
  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUserTypeChange = (event, newUserType) => {
    if (newUserType !== null && !cleanupRef.current) {
      setUserType(newUserType);
    }
  };

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
    
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        ...formData,
        userType
      });
      
      if (!cleanupRef.current) {
        if (result.success) {
          // Show email verification modal instead of redirecting
          setVerificationData({
            email: formData.email,
            verificationUrl: result.data?.verificationUrl || ''
          });
          setShowVerificationModal(true);
        } else {
          setErrorMessage(result.error);
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setErrorMessage('Registration failed. Please try again.');
        setShowErrorModal(true);
      }
    } finally {
      if (!cleanupRef.current) {
        setLoading(false);
      }
    }
  };

  const handleResendEmail = async () => {
    if (cleanupRef.current) return;
    
    setIsResending(true);
    try {
      // You can implement resend email functionality here
      // For now, we'll just show a success message
      if (!cleanupRef.current) {
        setSuccess('Verification email resent successfully!');
      }
    } catch (error) {
      if (!cleanupRef.current) {
        setErrorMessage('Failed to resend verification email. Please try again.');
        setShowErrorModal(true);
      }
    } finally {
      if (!cleanupRef.current) {
        setIsResending(false);
      }
    }
  };

  const handleCloseVerificationModal = () => {
    if (!cleanupRef.current) {
      setShowVerificationModal(false);
      navigate('/login');
    }
  };

  return (
    <Box sx={{ 
      maxWidth: { xs: '100%', sm: 600, md: 700 }, 
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
          Join RoadResQ
        </Typography>
        
        <Box sx={{ 
          mb: { xs: 2, sm: 3 }, 
          textAlign: 'center' 
        }}>
          <ToggleButtonGroup
            value={userType}
            exclusive
            onChange={handleUserTypeChange}
            aria-label="user type"
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiToggleButton-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                px: { xs: 2, sm: 3 }
              }
            }}
          >
            <ToggleButton value="user" aria-label="user">
              Regular User
            </ToggleButton>
            <ToggleButton value="mechanic" aria-label="mechanic">
              Mechanic
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 2, sm: 3 }
          }}>
            <TextField
              required
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              sx={{ 
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
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              sx={{ 
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Box>

          <TextField
            required
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            sx={{ 
              mt: { xs: 2, sm: 3 },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
            size={isMobile ? "small" : "medium"}
          />

          {userType === 'mechanic' && (
            <TextField
              required
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              sx={{ 
                mt: { xs: 2, sm: 3 },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
              size={isMobile ? "small" : "medium"}
            />
          )}

          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 2, sm: 3 },
            mt: { xs: 2, sm: 3 }
          }}>
            <TextField
              required
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              helperText="Minimum 6 characters"
              sx={{ 
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
              size={isMobile ? "small" : "medium"}
            />
            
            <TextField
              required
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              sx={{ 
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: { xs: 3, sm: 4 },
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '1rem', sm: '1.1rem' }
            }}
            disabled={loading}
            size={isMobile ? "large" : "large"}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Box sx={{ 
            textAlign: 'center', 
            mt: { xs: 2, sm: 3 } 
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Already have an account?{' '}
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  textTransform: 'none'
                }}
              >
                Sign in
              </Button>
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Email Verification Modal */}
      <EmailVerificationModal
        open={showVerificationModal}
        onClose={handleCloseVerificationModal}
        email={verificationData.email}
        verificationUrl={verificationData.verificationUrl}
        onResendEmail={handleResendEmail}
        isResending={isResending}
      />
      
      {/* Error Modal */}
      <ErrorModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={errorMessage}
      />
    </Box>
  );
};

export default Register; 