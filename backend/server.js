const dotenv = require('dotenv');
// Load environment variables before initializing the database connection and routes
dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const aiRoutes = require('./routes/aiRoutes.js');
const storyRoutes = require('./routes/storyRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');

const app = express();
const server = http.createServer(app);

// CORS configuration supporting local development and environment overrides
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Socket.IO configuration with CORS matching frontend
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // User room for private messages
    socket.on('setup', (userData) => {
        if (userData && userData._id) {
            socket.join(userData._id);
            socket.emit('connected');
        }
    });

    socket.on('join_chat', (room) => {
        socket.join(room);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

// Pass io to request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);

// Health-check endpoint: reports connection status without revealing credentials
app.get('/api/health', (req, res) => {
    const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;

    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? 'healthy' : 'unhealthy',
        database: {
            status: stateMap[readyState] || 'unknown',
            readyState
        },
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send('Postify API is running...');
});

const PORT = process.env.PORT || 5000;

// Start server only after MongoDB connection succeeds
const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
    } catch (error) {
        console.error('Fatal: Server startup aborted because MongoDB connection failed.');
        process.exit(1);
    }
};

// Safe shutdown handling
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        try {
            await mongoose.connection.close(false);
            console.log('MongoDB connection closed cleanly.');
            process.exit(0);
        } catch (err) {
            console.error('Error closing MongoDB connection:', err.message);
            process.exit(1);
        }
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
