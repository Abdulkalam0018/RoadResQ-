import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token && mountedRef.current) {
        const response = await authAPI.getCurrentUser();
        if (mountedRef.current) {
          setUser(response.data?.data || null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (mountedRef.current) {
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus();
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { accessToken, refreshToken } = response.data?.data || {};
      
      if (mountedRef.current) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(response.data?.data || null);
        
        // Initialize socket connection after login
        try {
          const { initializeSocket } = await import('../services/socket.js');
          initializeSocket(accessToken);
        } catch (error) {
          console.log('Socket initialization failed:', error);
        }
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return { 
        success: true, 
        data: response.data?.data || {},
        message: response.data?.message || 'Registration successful'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (mountedRef.current) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        
        // Disconnect socket on logout
        try {
          const { disconnectSocket } = await import('../services/socket.js');
          disconnectSocket();
        } catch (error) {
          console.log('Socket disconnection failed:', error);
        }
      }
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
