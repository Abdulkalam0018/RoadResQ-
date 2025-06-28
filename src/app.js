import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// CORS configuration to support multiple origins
const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    })
})

// API root endpoint
app.get('/api/v1', (req, res) => {
    res.status(200).json({ 
        message: 'RoadResQ API v1',
        endpoints: {
            users: '/api/v1/users',
            mechanics: '/api/v1/mechanics',
            chats: '/api/v1/chats'
        }
    })
})

// routes
import userRouter from "./routes/user.routes.js"
import mechanicRouter from "./routes/mechanic.routes.js"
import chatRouter from "./routes/chat.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/mechanics", mechanicRouter)
app.use("/api/v1/chats", chatRouter)

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    })
})

// Global error handler
app.use((error, req, res, next) => {
    // Handle authentication errors
    if (
        (error.message && (
            error.message.includes('Unauthorised Access') ||
            error.message.includes('jwt malformed') ||
            error.message.includes('Invalid token') ||
            error.message.includes('Token expired') ||
            error.message.includes('Invalid Access Token')
        )) ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
    ) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Unauthorized'
        });
    }

    // Handle ApiError instances (custom errors)
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message || 'An error occurred'
        });
    }

    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

export default app