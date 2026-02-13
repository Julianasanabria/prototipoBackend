// Middleware de validación simple para el prototipo
const validateChatMessage = (req, res, next) => {
    const { idSesion, entradaUsuario } = req.body;
    
    // Validar que idSesion exista y sea string
    if (!idSesion || typeof idSesion !== 'string') {
        return res.status(400).json({
            error: 'Se requiere idSesion válido',
            mensaje: 'El ID de sesión es obligatorio'
        });
    }
    
    // Validar que entradaUsuario sea string si existe
    if (entradaUsuario && typeof entradaUsuario !== 'string') {
        return res.status(400).json({
            error: 'Entrada inválida',
            mensaje: 'La entrada debe ser texto'
        });
    }
    
    // Limpiar entrada para evitar inyección básica
    if (entradaUsuario) {
        req.body.entradaUsuario = entradaUsuario.trim().substring(0, 500); // Limitar a 500 caracteres
    }
    
    next();
};

const validateResetChat = (req, res, next) => {
    const { idSesion } = req.body;
    
    if (!idSesion || typeof idSesion !== 'string') {
        return res.status(400).json({
            error: 'Se requiere idSesion válido',
            mensaje: 'El ID de sesión es obligatorio para reiniciar'
        });
    }
    
    next();
};

module.exports = {
    validateChatMessage,
    validateResetChat
};
