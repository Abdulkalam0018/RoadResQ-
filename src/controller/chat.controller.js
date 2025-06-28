import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Get or create a chat between two users
export const getOrCreateChat = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  // Validate if userId exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    throw new ApiError(404, "User not found");
  }

  // Check if chat already exists
  const existingChat = await Chat.findOne({
    participants: { $all: [req.user._id, userId] }
  }).populate("participants", "username fullName avatar userType");

  if (existingChat) {
    return res.status(200).json(
      new ApiResponse(200, existingChat, "Chat retrieved successfully")
    );
  }

  // Create new chat
  const newChat = await Chat.create({
    participants: [req.user._id, userId],
    unreadCount: new Map([
      [req.user._id.toString(), 0],
      [userId.toString(), 0]
    ])
  });

  const populatedChat = await Chat.findById(newChat._id).populate(
    "participants",
    "username fullName avatar userType"
  );

  return res.status(201).json(
    new ApiResponse(201, populatedChat, "Chat created successfully")
  );
});

// Get all chats for current user
export const getUserChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    participants: req.user._id
  })
    .populate("participants", "username fullName avatar userType")
    .sort({ updatedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, chats, "User chats retrieved successfully")
  );
});

// Get chat messages
export const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Validate chat exists and user is a participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.includes(req.user._id)) {
    throw new ApiError(403, "You are not authorized to access this chat");
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 } // Newest first
  };

  const messages = await Message.find({ chatId })
    .sort(options.sort)
    .skip((options.page - 1) * options.limit)
    .limit(options.limit)
    .populate("sender", "username fullName avatar");

  // Mark messages as read
  await Message.updateMany(
    { 
      chatId,
      receiver: req.user._id,
      read: false 
    },
    { read: true }
  );

  // Reset unread count for this user
  const userId = req.user._id.toString();
  if (chat.unreadCount.get(userId) > 0) {
    chat.unreadCount.set(userId, 0);
    await chat.save();
  }

  return res.status(200).json(
    new ApiResponse(
      200, 
      messages.reverse(), // Return messages array directly in chronological order
      "Messages retrieved successfully"
    )
  );
});

// Send a message
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content } = req.body;

  if (!chatId || !content) {
    throw new ApiError(400, "Chat ID and content are required");
  }

  // Validate chat exists and user is a participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.includes(req.user._id)) {
    throw new ApiError(403, "You are not authorized to send messages in this chat");
  }

  // Find the receiver (the other participant)
  const receiverId = chat.participants.find(
    (id) => id.toString() !== req.user._id.toString()
  );

  // Create message
  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content,
    chatId
  });

  // Update chat with last message and increment unread count for receiver
  chat.lastMessage = content;
  const receiverIdStr = receiverId.toString();
  const currentUnreadCount = chat.unreadCount.get(receiverIdStr) || 0;
  chat.unreadCount.set(receiverIdStr, currentUnreadCount + 1);
  chat.updatedAt = Date.now();
  await chat.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "username fullName avatar"
  );

  // Import io from index.js
  const { io } = await import('../index.js');
  
  // Emit socket event to receiver
  io.to(receiverIdStr).emit("new_message", {
    message: populatedMessage,
    chat: chat._id
  });

  return res.status(201).json(
    new ApiResponse(201, populatedMessage, "Message sent successfully")
  );
});

// Mark all messages in a chat as read
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // Validate chat exists and user is a participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.includes(req.user._id)) {
    throw new ApiError(403, "You are not authorized to access this chat");
  }

  // Mark messages as read
  await Message.updateMany(
    { 
      chatId,
      receiver: req.user._id,
      read: false 
    },
    { read: true }
  );

  // Reset unread count for this user
  const userId = req.user._id.toString();
  if (chat.unreadCount.get(userId) > 0) {
    chat.unreadCount.set(userId, 0);
    await chat.save();
  }

  return res.status(200).json(
    new ApiResponse(200, { success: true }, "Messages marked as read")
  );
});