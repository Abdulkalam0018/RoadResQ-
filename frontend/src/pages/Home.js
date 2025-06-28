import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  DirectionsCar,
  LocationOn,
  Speed,
  Security,
} from '@mui/icons-material';

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const cleanupRef = useRef(false);

  const handleFindMechanics = () => {
    if (!cleanupRef.current) {
      navigate('/nearby-mechanics');
    }
  };

  const handleJoinAsMechanic = () => {
    if (!cleanupRef.current) {
      navigate('/register');
    }
  };

  const handleLogin = () => {
    if (!cleanupRef.current) {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: <LocationOn fontSize="large" color="primary" />,
      title: 'Find Nearby Mechanics',
      description: 'Locate qualified mechanics in your area with real-time GPS tracking.',
    },
    {
      icon: <Speed fontSize="large" color="primary" />,
      title: 'Quick Response',
      description: 'Get help within minutes with our fast response system.',
    },
    {
      icon: <Security fontSize="large" color="primary" />,
      title: 'Verified Professionals',
      description: 'All mechanics are verified and rated by the community.',
    },
    {
      icon: <DirectionsCar fontSize="large" color="primary" />,
      title: '24/7 Support',
      description: 'Round-the-clock roadside assistance whenever you need it.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: { xs: 2, sm: 3, md: 4 },
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: 'url(https://images.unsplash.com/photo-1485291571150-772bcfc10da5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80)',
          minHeight: { xs: '50vh', sm: '60vh', md: '70vh' },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.3)',
          }}
        />
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              component="h1"
              variant={isMobile ? "h3" : isTablet ? "h2" : "h1"}
              color="inherit"
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '2rem', sm: '3rem', md: '3.75rem' },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              RoadResQ
            </Typography>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              color="inherit" 
              paragraph
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                textAlign: { xs: 'center', sm: 'left' },
                mb: { xs: 3, sm: 4 }
              }}
            >
              Your trusted partner for roadside assistance. Find qualified mechanics 
              near you and get back on the road quickly and safely.
            </Typography>
            <Box sx={{ 
              mt: { xs: 2, sm: 3, md: 4 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 2 },
              alignItems: { xs: 'stretch', sm: 'flex-start' }
            }}>
              <Button
                variant="contained"
                size={isMobile ? "large" : "large"}
                onClick={handleFindMechanics}
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 3, sm: 4 }
                }}
              >
                Find Mechanics Now
              </Button>
              <Button
                variant="outlined"
                size={isMobile ? "large" : "large"}
                onClick={handleJoinAsMechanic}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 3, sm: 4 }
                }}
              >
                Join as Mechanic
              </Button>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          component="h2" 
          gutterBottom 
          align="center" 
          sx={{ 
            mb: { xs: 3, sm: 4, md: 5 },
            fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' }
          }}
        >
          Why Choose RoadResQ?
        </Typography>
        
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ 
                height: '100%', 
                textAlign: 'center',
                p: { xs: 1, sm: 2 }
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                    {React.cloneElement(feature.icon, {
                      fontSize: isMobile ? "large" : "large",
                      sx: { fontSize: { xs: '2rem', sm: '2.5rem' } }
                    })}
                  </Box>
                  <Typography 
                    gutterBottom 
                    variant={isMobile ? "h6" : "h6"} 
                    component="h3"
                    sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      mb: { xs: 1, sm: 2 }
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      lineHeight: 1.5
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* CTA Section */}
        <Box sx={{ 
          mt: { xs: 4, sm: 6, md: 8 }, 
          textAlign: 'center',
          px: { xs: 1, sm: 2 }
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            gutterBottom
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              mb: { xs: 2, sm: 3 }
            }}
          >
            Ready to Get Started?
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.125rem' },
              mb: { xs: 3, sm: 4 },
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            Join thousands of users who trust RoadResQ for their roadside assistance needs.
          </Typography>
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2 },
            justifyContent: 'center',
            alignItems: { xs: 'stretch', sm: 'center' }
          }}>
            <Button
              variant="contained"
              size={isMobile ? "large" : "large"}
              onClick={handleJoinAsMechanic}
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.1rem' },
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 }
              }}
            >
              Sign Up Now
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? "large" : "large"}
              onClick={handleLogin}
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.1rem' },
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 }
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Home; 