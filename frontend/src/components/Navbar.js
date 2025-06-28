import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  Dashboard,
  Message,
  Person,
  Logout,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { chatAPI } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cleanupRef = useRef(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const socketRef = useRef(null);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!user || cleanupRef.current) return;

    const connectSocket = async () => {
      try {
        const { getSocket } = await import('../services/socket.js');
        const socket = getSocket();
        if (socket && !cleanupRef.current) {
          socketRef.current = socket;
          
          // Listen for new messages
          socket.on('new_message', (data) => {
            if (cleanupRef.current || !data.chat) return;
            
            // Update unread count for the chat that received the message
            setChats(prevChats => {
              if (cleanupRef.current) return prevChats;
              
              return prevChats.map(chat => {
                if (chat._id === data.chat) {
                  // Increment unread count for current user if they're not the sender
                  const updatedChat = { ...chat };
                  if (updatedChat.unreadCount && user._id && data.sender !== user._id) {
                    const currentUnread = updatedChat.unreadCount.get ? 
                      updatedChat.unreadCount.get(user._id) || 0 : 
                      updatedChat.unreadCount[user._id] || 0;
                    
                    if (typeof updatedChat.unreadCount.set === 'function') {
                      updatedChat.unreadCount.set(user._id, currentUnread + 1);
                    } else {
                      updatedChat.unreadCount[user._id] = currentUnread + 1;
                    }
                  }
                  return updatedChat;
                }
                return chat;
              });
            });
          });
        }
      } catch (error) {
        console.log('Socket connection failed:', error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message');
      }
    };
  }, [user]);

  // Fetch chats to check for unread messages
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const fetchChats = async () => {
      try {
        const response = await chatAPI.getChats();
        if (!ignore) {
          setChats(response.data.data || []);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchChats();
    return () => { ignore = true; };
  }, [user]);

  // Check for unread messages
  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }
    let found = false;
    for (const chat of chats) {
      let unread = 0;
      if (chat.unreadCount && user._id) {
        if (typeof chat.unreadCount.get === 'function') {
          unread = chat.unreadCount.get(user._id) || 0;
        } else if (typeof chat.unreadCount === 'object') {
          unread = chat.unreadCount[user._id] || 0;
        }
      }
      if (unread > 0) {
        found = true;
        break;
      }
    }
    setHasUnread(found);
  }, [chats, user]);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    if (cleanupRef.current) return;
    try {
      await logout();
      if (!cleanupRef.current) {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleDrawerToggle = () => {
    if (!cleanupRef.current) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleNavigation = (path) => {
    if (!cleanupRef.current) {
      navigate(path);
      setMobileOpen(false);
    }
  };

  const mobileMenuItems = [
    { text: 'Home', icon: <Home />, path: '/' },
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    ...(user?.userType !== 'mechanic' ? [{ text: 'Search Mechanics', icon: <Search />, path: '/nearby-mechanics' }] : []),
    { text: 'Messages', icon: <Message />, path: '/chat' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
    { text: 'Logout', icon: <Logout />, action: handleLogout },
  ];

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: 'primary.main' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <DirectionsCarIcon sx={{ mr: { xs: 1, sm: 2 } }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 'bold'
              }}
            >
              RoadResQ
            </Typography>
          </Box>

          {user ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" onClick={() => navigate('/dashboard')} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Dashboard</Button>
              {user?.userType !== 'mechanic' && (
                <Button color="inherit" onClick={() => navigate('/nearby-mechanics')} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Search Mechanics</Button>
              )}
              <Button color="inherit" onClick={() => navigate('/chat')} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Messages</Button>
              <Button color="inherit" onClick={() => navigate('/profile')} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Profile</Button>
              <Button color="inherit" onClick={handleLogout} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Logout</Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="inherit" 
                onClick={() => navigate('/login')}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Login
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                onClick={() => navigate('/register')}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Dialog open={showLogoutModal} onClose={cancelLogout} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
          Are you sure you want to logout?
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={cancelLogout} variant="outlined">Cancel</Button>
          <Button onClick={confirmLogout} variant="contained" color="error">Logout</Button>
        </DialogActions>
      </Dialog>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Menu
          </Typography>
          <List>
            {mobileMenuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.text === 'Messages' ? (
                    <Badge
                      color="error"
                      variant="dot"
                      invisible={!hasUnread}
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      sx={{ '& .MuiBadge-badge': { backgroundColor: '#ff4444' } }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      fontSize: '1rem' 
                    } 
                  }}
                />
              </ListItem>
            ))}
            <ListItem 
              button 
              onClick={handleLogout}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText 
                primary="Logout" 
                sx={{ 
                  '& .MuiListItemText-primary': { 
                    fontSize: '1rem' 
                  } 
                }}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;