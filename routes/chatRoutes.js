const express = require('express');
const router = express.Router();
const { validateChatMessage, validateResetChat } = require('../middleware/validation');

const { manejarMensaje, reiniciarChat } = require('../controllers/chatController');

// Ruta base para verificar que el router de chat funciona
router.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Chat activa y funcionando',
        endpoints: ['/mensaje (POST)', '/reiniciar (POST)', '/usuario (GET)']
    });
});

router.post('/mensaje', validateChatMessage, manejarMensaje);
router.post('/reiniciar', validateResetChat, reiniciarChat);
router.get('/usuario', (req, res) => {
    res.json({
        userId: 'user_' + Date.now(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
