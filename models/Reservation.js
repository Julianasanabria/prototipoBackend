const mongoose = require('mongoose');

// Validador para nombres (solo letras y espacios)
const validarNombre = function (nombre) {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(nombre);
};

// Validador para teléfono colombiano (10 dígitos numéricos)
const validarTelefono = function (telefono) {
    const regex = /^[0-9]{10}$/;
    return regex.test(telefono);
};

// Validador para correo electrónico
const validarCorreo = function (correo) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
};

const EsquemaReserva = new mongoose.Schema({
    idSesionUsuario: { type: String, required: true },
    nombreUsuario: {
        type: String,
        required: false, // Se hará requerido solo al finalizar
        validate: {
            validator: function (nombre) {
                if (!nombre) return true; // Permitir vacío durante el proceso
                return validarNombre(nombre);
            },
            message: 'El nombre solo puede contener letras y espacios'
        },
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    telefonoUsuario: {
        type: String, // Cambiar a String para manejar mejor la validación
        required: false, // Se hará requerido solo al finalizar
        validate: {
            validator: function (telefono) {
                if (!telefono) return true; // Permitir vacío durante el proceso
                return validarTelefono(telefono);
            },
            message: 'El teléfono debe tener exactamente 10 dígitos numéricos'
        }
    },
    correoUsuario: {
        type: String,
        required: false, // Se hará requerido solo al finalizar
        validate: {
            validator: function (correo) {
                if (!correo) return true; // Permitir vacío durante el proceso
                return validarCorreo(correo);
            },
            message: 'El formato del correo electrónico no es válido'
        },
        lowercase: true,
        trim: true
    },
    fechaInicio: {
        type: Date,
        required: false, // Se hará requerido solo al finalizar
        validate: {
            validator: function (fecha) {
                if (!fecha) return true; // Permitir vacío durante el proceso
                return fecha > new Date();
            },
            message: 'La fecha de inicio debe ser posterior a la fecha actual'
        }
    },
    fechaFin: {
        type: Date,
        required: false, // Se hará requerido solo al finalizar
        validate: {
            validator: function (fecha) {
                if (!fecha) return true; // Permitir vacío durante el proceso
                if (!this.fechaInicio) return true; // Si no hay fecha inicio, no validar
                return fecha > this.fechaInicio;
            },
            message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        }
    },
    numAdultos: {
        type: Number,
        required: false, // Se hará requerido solo al finalizar
        min: [1, 'Debe haber al menos 1 adulto'],
        max: [100, 'El número máximo de adultos es 100'] // Aumentado para grupos grandes
    },
    numNinos: {
        type: Number,
        min: [0, 'El número de niños no puede ser negativo'],
        max: [100, 'El número máximo de niños es 100'] // Aumentado para grupos grandes
    },
    tieneMascotas: {
        type: Boolean,
        default: false
    },
    numMascotas: {
        type: Number,
        min: [0, 'El número de mascotas no puede ser negativo'],
        max: [10, 'El número máximo de mascotas es 10'],
        validate: {
            validator: function (num) {
                return !this.tieneMascotas || num > 0;
            },
            message: 'Si tieneMascotas es true, numMascotas debe ser mayor a 0'
        }
    },
    numHabitaciones: {
        type: Number,
        required: false, // Se hará requerido solo al finalizar
        min: [1, 'Debe haber al menos 1 habitación'],
        max: [20, 'El número máximo de habitaciones es 20'] // Límite real del hotel
    },
    opcionSeleccionada: Object, // Almacena la combinación de habitación elegida
    opcionesSimuladas: Object, // Para recuperar precios mostrados
    habitacionesElegidas: [{ // Array de habitaciones seleccionadas (para múltiples habitaciones)
        tipo: mongoose.Schema.Types.ObjectId, // ID del tipo de habitación
        cantidad: Number, // Cantidad de habitaciones de este tipo
        capacidad: Number, // Capacidad por habitación
        precioBase: Number, // Precio base por noche
        nombre: String // Nombre del tipo de habitación
    }],
    habitacionElegida: mongoose.Schema.Types.ObjectId, // ID de la habitación seleccionada (DEPRECATED - usar habitacionesElegidas)
    precioTotal: {
        type: Number,
        min: [0, 'El precio total no puede ser negativo']
    },
    metodoPago: {
        type: String,
        required: false, // Se hará requerido solo al finalizar
        enum: {
            values: ['Nequi', 'Bancolombia', 'Daviplata', 'Banco Mundo Mujer', 'Tarjeta de crédito/débito'],
            message: 'Método de pago no válido'
        }
    },
    planAlimentacion: { type: String, enum: ['solo_desayuno', 'desayuno_almuerzo', 'completo', 'ninguno'], default: 'ninguno' },
    erroresConsecutivos: { type: Number, default: 0 }, // Para tracking de errores
    ultimoError: String, // ID del último nodo donde ocurrió error
    ultimoMensajeOpciones: String, // Para re-mostrar opciones en caso de error
    estado: { type: String, enum: ['pendiente', 'confirmada'], default: 'pendiente' },
    idPasoActual: { type: String, default: 'bienvenida' }, // Rastrear el paso actual en el flujo
    indiceOpcionActual: { type: Number, default: 0 }, // Para paginación de opciones de habitación
    habitacionesAsignadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' }], // Referencia a las habitaciones físicas reales
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reserva', EsquemaReserva);
