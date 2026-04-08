import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () =>
  (process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || 'http://localhost:9000')
    .replace(/\/api\/v1$/, '')
    .replace(/\/$/, '');

export const initializeSocket = (token, userId) => {
  if (!token) {
    return null;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(getSocketUrl(), {
    auth: {
      token,
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    // Register the user with the backend
    if (userId) {
      socket.emit('register', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
