import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Error,
  Warning,
} from '@mui/icons-material';

const ErrorModal = ({ 
  open, 
  onClose, 
  error, 
  title = "Registration Error"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = () => {
    onClose();
  };

  const getErrorIcon = () => {
    if (error?.includes('already exists') || error?.includes('duplicate')) {
      return <Warning sx={{ fontSize: 60, color: 'warning.main' }} />;
    }
    return <Error sx={{ fontSize: 60, color: 'error.main' }} />;
  };

  const getErrorSeverity = () => {
    if (error?.includes('already exists') || error?.includes('duplicate')) {
      return 'warning';
    }
    return 'error';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          p: isMobile ? 2 : 0,
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center',
        pb: 1,
        fontSize: { xs: '1.25rem', sm: '1.5rem' }
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {getErrorIcon()}
        </Box>
        {title}
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: { xs: 2, sm: 4 } }}>
        <Alert 
          severity={getErrorSeverity()}
          sx={{ 
            mb: 3,
            textAlign: 'left',
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {error}
          </Typography>
          
          {error?.includes('already exists') && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Try using a different email address or username
            </Typography>
          )}
          
          {error?.includes('password') && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Make sure your password meets the requirements
            </Typography>
          )}
          
          {(error?.includes('network') || error?.includes('connection')) && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Check your internet connection and try again
            </Typography>
          )}
        </Alert>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Got It
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorModal; 