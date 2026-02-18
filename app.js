const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { securityMiddleware, rateLimitSimple } = require('./middleware/security');

const app = express();

connectDB();


app.use(securityMiddleware);
app.use(rateLimitSimple(200, 15 * 60 * 1000));

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    'http://localhost:5173'
];

if (process.env.FRONTEND_URL) {

    const frontendUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, "");
    allowedOrigins.push(frontendUrl);
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.trim().replace(/\/$/, "");
        const isVercel = /\.vercel\.app$/.test(cleanOrigin);

        if (allowedOrigins.includes(cleanOrigin) || isVercel || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.log('Bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', require('./routes/chatRoutes'));

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.send('Backend del Prototipo Hotel corriendo correctamente.');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

