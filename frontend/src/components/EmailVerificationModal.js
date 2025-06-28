import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Email,
} from '@mui/icons-material';

const EmailVerificationModal = ({ 
  open, 
  onClose, 
  email, 
  verificationUrl, 
  onResendEmail,
  isResending = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cleanupRef = useRef(false);

  const handleResendEmail = async () => {
    if (cleanupRef.current || !onResendEmail) return;
    
    try {
      await onResendEmail();
    } catch (error) {
      console.error('Failed to resend email:', error);
    }
  };

  const handleClose = () => {
    if (!cleanupRef.current) {
      onClose();
    }
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
          <Email sx={{ fontSize: 60, color: 'primary.main' }} />
        </Box>
        Verify Your Email
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: { xs: 2, sm: 4 } }}>
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            lineHeight: 1.6
          }}
        >
          We've sent a verification link to:
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3,
            fontWeight: 'bold',
            color: 'primary.main',
            fontSize: { xs: '1rem', sm: '1.125rem' }
          }}
        >
          {email}
        </Typography>

        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            textAlign: 'left',
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          <Typography variant="body2">
            <strong>What to do next:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            • Check your email inbox (and spam folder)
          </Typography>
          <Typography variant="body2">
            • Click the verification link in the email
          </Typography>
          <Typography variant="body2">
            • Return here to sign in once verified
          </Typography>
        </Alert>

        {/* Development mode - show verification URL */}
        {verificationUrl && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3,
              textAlign: 'left',
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            <Typography variant="body2">
              <strong>Development Mode:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all' }}>
              Verification URL: {verificationUrl}
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleResendEmail}
            disabled={isResending}
            startIcon={isResending ? <CircularProgress size={20} /> : <Email />}
            sx={{ 
              mr: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {isResending ? 'Sending...' : 'Resend Email'}
          </Button>
          
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

export default EmailVerificationModal; 