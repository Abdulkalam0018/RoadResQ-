import api from './api';

const chatService = {
  // Get all chats for the current user
  getUserChats: () => api.get('/chats'),
  
  // Get or create a chat with another user
  getOrCreateChat: (userId) => api.get(`/chats/user/${userId}`),
  
  // Get messages for a specific chat
  getChatMessages: (chatId, page = 1, limit = 20) => 
    api.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),
  
  // Send a message
  sendMessage: (chatId, content) => 
    api.post('/chats/message', { chatId, content })
};

export default chatService;