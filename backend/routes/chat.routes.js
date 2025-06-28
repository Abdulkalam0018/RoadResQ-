import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead
} from '../controller/chat.controller.js';

const router = Router();

// All chat routes require authentication
router.use(verifyJWT);

// Get or create a chat with another user
router.get('/user/:userId', getOrCreateChat);

// Get all chats for the current user
router.get('/', getUserChats);

// Get messages for a specific chat
router.get('/:chatId/messages', getChatMessages);

// Send a message
router.post('/message', sendMessage);

// Mark messages as read
router.post('/:chatId/mark-read', markMessagesAsRead);

export default router;