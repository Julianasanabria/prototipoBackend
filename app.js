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
        // Permitir solicitudes sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);

        // Limpiar el origen entrante para comparar
        const cleanOrigin = origin.trim().replace(/\/$/, "");

        if (allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV === 'development') {
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

// Root endpoint para evitar error "Cannot GET /"
app.get('/', (req, res) => {
    res.send('Backend del Prototipo Hotel corriendo correctamente.');
});

const PORT = process.env.PORT || 3001;

// Escuchar peticiones (esencial para Render, local y otros)
// Vercel ignora esto al importar el módulo, así que es seguro dejarlo
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

