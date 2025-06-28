import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  Badge,
} from '@mui/material';
import {
  Send,
  ArrowBack,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';

const Chat = () => {
  const { user } = useAuth();
  const { userId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);
  const socketRef = useRef(null);
  const selectedChatRef = useRef(null);

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.off('new_message');
      }
    };
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!user || !mountedRef.current) return;

    const connectSocket = async () => {
      try {
        const { getSocket, initializeSocket } = await import('../services/socket.js');
        let socket = getSocket();
        
        // Initialize socket if not already connected
        if (!socket || !socket.connected) {
          const token = localStorage.getItem('accessToken');
          socket = initializeSocket(token, user._id);
        }
        
        if (socket && mountedRef.current) {
          socketRef.current = socket;
          
          // Register user if not already registered
          if (user._id && socket.connected) {
            socket.emit('register', user._id);
          }
          
          // Listen for new messages
          socket.on('new_message', (data) => {
  if (!mountedRef.current || !data.chat || !data.message?._id) return;

  if (selectedChatRef.current && selectedChatRef.current._id === data.chat) {
    setMessages(prev => {
      const alreadyExists = prev.some(msg => msg._id === data.message._id);
      if (alreadyExists) return prev; // ✅ Prevent duplicate
      return [...prev, data.message]; // ✅ Add only if new
    });
  }
            
            // Update unread count for the chat that received the message
            setChats(prevChats => {
              if (!mountedRef.current) return prevChats;
              
              return prevChats.map(chat => {
                if (chat._id === data.chat) {
                  // Increment unread count for current user if they're not the sender
                  const updatedChat = { ...chat };
                  if (updatedChat.unreadCount && user._id && data.message?.sender?._id !== user._id) {
                    const currentUnread = updatedChat.unreadCount.get ? 
                      updatedChat.unreadCount.get(user._id) || 0 : 
                      updatedChat.unreadCount[user._id] || 0;
                    
                    if (typeof updatedChat.unreadCount.set === 'function') {
                      updatedChat.unreadCount.set(user._id, currentUnread + 1);
                    } else {
                      updatedChat.unreadCount[user._id] = currentUnread + 1;
                    }
                  }
                  // Update last message
                  if (data.message?.content) {
                    updatedChat.lastMessage = data.message.content;
                  }
                  return updatedChat;
                }
                return chat;
              });
            });
          });

          // Listen for message sent confirmation
          socket.on('message_sent', (message) => {
  if (!mountedRef.current || !message?._id) return;

  if (selectedChatRef.current && selectedChatRef.current._id === message.chatId) {
    setMessages(prev => {
      const alreadyExists = prev.some(m => m._id === message._id);
      if (alreadyExists) return prev; // ✅ Avoid adding again
      return [...prev, message];
    });
  }
          });

          // Listen for messages read confirmation
          socket.on('messages_read', (data) => {
            if (!mountedRef.current) return;
            
            // Update unread count for the chat
            setChats(prevChats => {
              return prevChats.map(chat => {
                if (chat._id === data.chatId) {
                  const updatedChat = { ...chat };
                  if (updatedChat.unreadCount && data.userId) {
                    if (typeof updatedChat.unreadCount.set === 'function') {
                      updatedChat.unreadCount.set(data.userId, 0);
                    } else {
                      updatedChat.unreadCount[data.userId] = 0;
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
  }, [user]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && mountedRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Update selectedChatRef when selectedChat changes
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const fetchChats = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await chatAPI.getChats();
      if (mountedRef.current) {
        const chatsData = response.data?.data || [];
        setChats(chatsData);
        
        // If no specific user is selected and we have chats, select the first one
        if (!userId && chatsData.length > 0) {
          setSelectedChat(chatsData[0]);
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        setError('Failed to fetch chats');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId || !mountedRef.current) return;
    
    try {
      const response = await chatAPI.getMessages(chatId);
      if (mountedRef.current) {
        // Ensure messages is always an array
        const messagesData = response.data?.data;
        setMessages(Array.isArray(messagesData) ? messagesData : []);
        
        // Update unread count locally instead of refetching all chats
        setChats(prevChats => 
          prevChats.map(chat => {
            if (chat._id === chatId && user?._id) {
              // Reset unread count for current user when messages are fetched
              const updatedChat = { ...chat };
              if (updatedChat.unreadCount) {
                if (typeof updatedChat.unreadCount.set === 'function') {
                  updatedChat.unreadCount.set(user._id, 0);
                } else if (typeof updatedChat.unreadCount === 'object') {
                  updatedChat.unreadCount[user._id] = 0;
                }
              }
              return updatedChat;
            }
            return chat;
          })
        );
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Error fetching messages:', error);
        setError('Failed to fetch messages');
        setMessages([]); // Set empty array on error
      }
    }
  }, [user?._id]);

  useEffect(() => {
    if (selectedChat && mountedRef.current) {
      fetchMessages(selectedChat._id);
      
      // Mark messages as read when chat is selected
      const markMessagesAsRead = async () => {
        try {
          if (selectedChat._id) {
            await chatAPI.markAsRead(selectedChat._id);
            
            // Emit socket event to mark messages as read
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('mark_messages_read', {
                chatId: selectedChat._id
              });
            }
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      markMessagesAsRead();
    }
  }, [selectedChat, fetchMessages]);

  useEffect(() => {
    if (userId && mountedRef.current && !isCreatingChat) {
      // If userId is provided in URL, try to find existing chat first
      if (chats.length > 0) {
        const existingChat = chats.find(c => c.participants?.some(p => p._id === userId));
        if (existingChat) {
          setSelectedChat(existingChat);
          if (isMobile) {
            setMobileOpen(false);
          }
          return; // Exit early if chat found
        }
      }
      
      // If no existing chat found, create a new one
      const createNewChat = async () => {
        if (isCreatingChat) return; // Prevent multiple calls
        
        try {
          setIsCreatingChat(true);
          setLoading(true);
          const response = await chatAPI.getOrCreateChat(userId);
          if (mountedRef.current) {
            const newChat = response.data.data;
            
            // Check if this chat already exists in our list
            const existingChat = chats.find(c => c._id === newChat._id);
            if (existingChat) {
              // If chat already exists, just select it
              setSelectedChat(existingChat);
            } else {
              // If it's truly a new chat, add it to the list
              setChats(prev => [newChat, ...prev]);
              setSelectedChat(newChat);
            }
            
            if (isMobile) {
              setMobileOpen(false);
            }
          }
        } catch (error) {
          if (mountedRef.current) {
            console.error('Error creating new chat:', error);
            setError('Failed to create new conversation');
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false);
            setIsCreatingChat(false);
          }
        }
      };
      
      createNewChat();
    }
  }, [userId, isMobile, isCreatingChat]); // Added isCreatingChat to dependencies

  const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedChat || !mountedRef.current) return;

  const messageData = {
    chatId: selectedChat._id,
    content: newMessage.trim(),
  };

  try {
    // Send message via API
    await chatAPI.sendMessage(messageData);

    if (mountedRef.current) {
      setNewMessage(''); // Just clear input, don't add to state

      // Update chat's last message
      setChats(prev => prev.map(chat =>
        chat._id === selectedChat._id
          ? { ...chat, lastMessage: messageData.content }
          : chat
      ));

      // Emit via socket
      if (socketRef.current && socketRef.current.connected) {
        const otherParticipant = getOtherParticipant(selectedChat);
        if (otherParticipant) {
          socketRef.current.emit('send_message', {
            chatId: selectedChat._id,
            content: messageData.content,
            receiverId: otherParticipant._id
          });
        }
      }
    }
  } catch (error) {
    if (mountedRef.current) {
      setError('Failed to send message');
    }
  }
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = useCallback((chat) => {
    if (!chat?.participants || !Array.isArray(chat.participants) || !user?._id) {
      return null;
    }
    return chat.participants.find(p => p && p._id && p._id !== user._id);
  }, [user?._id]);

  const handleDrawerToggle = useCallback(() => {
    if (mountedRef.current) {
      setMobileOpen(!mobileOpen);
    }
  }, [mobileOpen]);

  // Memoize the chat list to prevent unnecessary re-renders
  const chatList = useMemo(() => {
    if (loading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flex: 1 
        }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Chat List Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Conversations
          </Typography>
        </Box>

        {/* Chat List */}
        {chats.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            p: 3
          }}>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              No conversations yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ flex: 1, overflow: 'auto' }}>
            {chats
              .filter((chat, index, self) => 
                // Remove duplicates based on chat ID
                chat && chat._id && index === self.findIndex(c => c._id === chat._id)
              )
              .map((chat) => {
              // Add null checks for chat
              if (!chat || !chat._id) {
                return null;
              }
              
              const otherUser = getOtherParticipant(chat);
              const lastMessage = chat.lastMessage;
              // Extract unread count for this user
              let unread = 0;
              if (chat.unreadCount && user?._id) {
                if (typeof chat.unreadCount.get === 'function') {
                  unread = chat.unreadCount.get(user._id) || 0;
                } else if (typeof chat.unreadCount === 'object') {
                  unread = chat.unreadCount[user._id] || 0;
                }
              }
              const isUnread = unread > 0;

              return (
                <ListItem
                  key={chat._id}
                  button
                  onClick={() => {
                    if (mountedRef.current) {
                      setSelectedChat(chat);
                      // Update URL to reflect the selected chat
                      const otherUser = chat.participants?.find(p => p._id !== user?._id);
                      if (otherUser) {
                        window.history.replaceState(null, '', `/chat/${otherUser._id}`);
                      }
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }
                  }}
                  selected={selectedChat?._id === chat._id}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: isUnread ? 'action.hover' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={unread}
                      color="error"
                      invisible={unread === 0}
                    >
                      <Avatar>
                        {otherUser?.fullName?.charAt(0) || 'U'}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: isUnread ? 'bold' : 'normal',
                          color: isUnread ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {otherUser?.fullName || 'Unknown User'}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isUnread ? 'bold' : 'normal',
                          color: isUnread ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {lastMessage || 'No messages yet'}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    );
  }, [chats, loading, selectedChat, getOtherParticipant, user, isMobile]);

  const chatMessages = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {selectedChat ? (
        <>
          {/* Chat Header */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: 'white',
              borderRadius: 1,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            {isMobile && (
              <IconButton onClick={handleDrawerToggle}>
                <ArrowBack />
              </IconButton>
            )}
            <Avatar
              src={getOtherParticipant(selectedChat)?.avatar || ''}
              alt={getOtherParticipant(selectedChat)?.fullName || 'User'}
              sx={{ mr: 2 }}
            />
            <Typography 
              variant={isMobile ? "h6" : "h6"}
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              {getOtherParticipant(selectedChat)?.fullName || 'Unknown User'}
              {getOtherParticipant(selectedChat)?.userType === 'mechanic' && ' (Mechanic)'}
            </Typography>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            {Array.isArray(messages) && messages.map((message) => {
              // Add null checks for message and sender
              if (!message || !message.sender) {
                return null;
              }
              
              return (
                <Box
                  key={message._id || Math.random()}
                  sx={{
                    display: 'flex',
                    justifyContent: message.sender._id === user?._id ? 'flex-end' : 'flex-start',
                    mb: 1
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      maxWidth: '70%',
                      backgroundColor: message.sender._id === user?._id ? 'primary.main' : 'grey.100',
                      color: message.sender._id === user?._id ? 'white' : 'text.primary',
                      borderRadius: 2,
                      wordBreak: 'break-word'
                    }}
                  >
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        lineHeight: 1.4
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                sx={{ 
                  minWidth: 'auto',
                  px: { xs: 2, sm: 3 }
                }}
              >
                <Send />
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          p: 3
        }}>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Select a conversation to start messaging
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Defensive: Only render chat list if user and chats are valid
  if (!user || !Array.isArray(chats)) {
    return null;
  }

  // Early return if user is not available
  if (!user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 120px)',
        p: 3
      }}>
        <Typography variant="body1" color="text.secondary">
          Please log in to access chat
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex' }}>
      {/* Desktop Layout */}
      <Box sx={{ 
        display: { xs: 'none', md: 'flex' }, 
        width: '100%',
        height: '100%'
      }}>
        <Box sx={{ width: '30%', borderRight: 1, borderColor: 'divider' }}>
          {chatList}
        </Box>
        <Box sx={{ width: '70%', bgcolor: '#f5f5f5' }}>
          {chatMessages}
        </Box>
      </Box>

      {/* Mobile Layout */}
      <Box sx={{ 
        display: { xs: 'block', md: 'none' }, 
        width: '100%',
        height: '100%'
      }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: '80%',
              maxWidth: 320
            },
          }}
        >
          {chatList}
        </Drawer>
        
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          bgcolor: '#f5f5f5'
        }}>
          {chatMessages}
        </Box>
      </Box>
    </Box>
  );
};

export default Chat;
