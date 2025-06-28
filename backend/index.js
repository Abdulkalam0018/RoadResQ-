import 'dotenv/config'
import connectDB from "./db/index.js";
import app from './app.js'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { User } from './models/user.model.js'
import { ApiError } from './utils/ApiError.js';
import jwt from 'jsonwebtoken'
import cookie from 'cookie'

const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5273",
        credentials: true
    },
    pingTimeout: 60000, 
    pingInterval: 25000 
})

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
    try {
        // Get cookies from handshake headers
        const cookies = cookie.parse(socket.handshake.headers.cookie || '')
        const accessToken = cookies.accessToken

        if (!accessToken) {
            return next(new ApiError(401, "Authentication error: No token provided"))
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decoded._id).select("-password -refreshToken")
        
        if (!user) {
            return next(new ApiError(401, "Authentication error: User not found"))
        }

        socket.user = user
        next()
    } catch (error) {
        next(new ApiError(401, "Authentication error: Invalid token"))
    }
})

io.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error)
})

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id)

    socket.on("register", (userId) => {
        try {
            // Verify that the userId matches the authenticated user
            if (userId !== socket.user._id.toString()) {
                throw new Error(`Unauthorized: User ID mismatch, ${userId}, ${socket.user._id.toString()}`)
            }
            
            socket.join(userId)
            console.log("User registered:", userId)
        } catch (error) {
            console.error('Error in register event:', error)
            socket.emit('error', error.message)
        }
    })

    // Chat message handling
    socket.on('send_message', async (data) => {
        try {
            const { chatId, content, receiverId } = data
            
            if (!chatId || !content || !receiverId) {
                throw new Error('Missing required message data')
            }

            // Import models here to avoid circular dependencies
            const { Message } = await import('./models/message.model.js')
            const { Chat } = await import('./models/chat.model.js')
            
            // Create message
            const message = await Message.create({
                sender: socket.user._id,
                receiver: receiverId,
                content,
                chatId
            })

            // Update chat with last message and increment unread count
            const chat = await Chat.findById(chatId)
            if (chat) {
                chat.lastMessage = content
                const currentUnreadCount = chat.unreadCount.get(receiverId) || 0
                chat.unreadCount.set(receiverId, currentUnreadCount + 1)
                chat.updatedAt = Date.now()
                await chat.save()
            }

            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'username fullName avatar')

            // Emit to receiver
            io.to(receiverId).emit('new_message', {
                message: populatedMessage,
                chat: chatId
            })

            // Confirm to sender
            socket.emit('message_sent', populatedMessage)
        } catch (error) {
            console.error('Error sending message:', error)
            socket.emit('error', error.message)
        }
    })

    // Mark messages as read
    socket.on('mark_messages_read', async (data) => {
        try {
            const { chatId } = data
            
            if (!chatId) {
                throw new Error('Chat ID is required')
            }

            // Import models
            const { Message } = await import('./models/message.model.js')
            const { Chat } = await import('./models/chat.model.js')
            
            // Mark messages as read
            await Message.updateMany(
                { 
                    chatId,
                    receiver: socket.user._id,
                    read: false 
                },
                { read: true }
            )

            // Reset unread count for this user
            const chat = await Chat.findById(chatId)
            if (chat) {
                const userId = socket.user._id.toString()
                chat.unreadCount.set(userId, 0)
                await chat.save()

                // Notify the sender that messages were read
                const otherParticipant = chat.participants.find(
                    id => id.toString() !== userId
                )
                if (otherParticipant) {
                    io.to(otherParticipant.toString()).emit('messages_read', { chatId, userId })
                }
            }
        } catch (error) {
            console.error('Error marking messages as read:', error)
            socket.emit('error', error.message)
        }
    })

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
    })

    socket.on('error', (error) => {
        console.error('Socket error:', error)
        socket.emit('error', 'An error occurred')
    })
})

connectDB()
.then(() => {
    const port = process.env.PORT || 9000
    httpServer.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })

    httpServer.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });
})
.catch((error) => {
    console.error("Connection error in DB", error);
})

export { io }