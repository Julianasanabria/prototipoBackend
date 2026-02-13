const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { securityMiddleware, rateLimitSimple } = require('./middleware/security');

const app = express();

connectDB();

// Middleware de seguridad
app.use(securityMiddleware);
app.use(rateLimitSimple(200, 15 * 60 * 1000)); // 200 solicitudes por 15 minutos

// Configuración CORS dinámica para desarrollo y producción
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    'http://localhost:5173'
];

// Añadir URL de producción si existe
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Limitar tamaño de peticiones
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/chat', require('./routes/chatRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

