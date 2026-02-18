const validateChatMessage = (req, res, next) => {
    const { idSesion, entradaUsuario } = req.body;

    if (!idSesion || typeof idSesion !== 'string') {
        return res.status(400).json({
            error: 'Se requiere idSesion válido',
            mensaje: 'El ID de sesión es obligatorio'
        });
    }

    if (entradaUsuario && typeof entradaUsuario !== 'string') {
        return res.status(400).json({
            error: 'Entrada inválida',
            mensaje: 'La entrada debe ser texto'
        });
    }

    if (entradaUsuario) {
        req.body.entradaUsuario = entradaUsuario.trim().substring(0, 500);
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
