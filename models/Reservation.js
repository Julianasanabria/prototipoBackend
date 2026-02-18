const mongoose = require('mongoose');

const validarNombre = function (nombre) {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(nombre);
};

const validarTelefono = function (telefono) {
    const regex = /^[0-9]{10}$/;
    return regex.test(telefono);
};

const validarCorreo = function (correo) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
};

const EsquemaReserva = new mongoose.Schema({
    idSesionUsuario: { type: String, required: true },
    nombreUsuario: {
        type: String,
        required: false,
        validate: {
            validator: function (nombre) {
                if (!nombre) return true;
                return validarNombre(nombre);
            },
            message: 'El nombre solo puede contener letras y espacios'
        },
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    telefonoUsuario: {
        type: String,
        required: false,
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
        required: false,
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
        required: false,
        validate: {
            validator: function (fecha) {
                if (!fecha) return true; // Permitir vacío durante el proceso
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                return fecha >= hoy;
            },
            message: 'La fecha de inicio debe ser hoy o una fecha posterior'
        }
    },
    fechaFin: {
        type: Date,
        required: false,
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
        required: false,
        min: [1, 'Debe haber al menos 1 adulto'],
        max: [100, 'El número máximo de adultos es 100']
    },
    numNinos: {
        type: Number,
        min: [0, 'El número de niños no puede ser negativo'],
        max: [100, 'El número máximo de niños es 100']
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
                if (num === undefined || num === null) return true;
                return !this.tieneMascotas || num > 0;
            },
            message: 'Si viajas con mascotas, el número debe ser al menos 1'
        }
    },
    numHabitaciones: {
        type: Number,
        required: false,
        min: [1, 'Debe haber al menos 1 habitación'],
        max: [20, 'El número máximo de habitaciones es 20']
    },
    opcionSeleccionada: Object,
    opcionesSimuladas: Object,
    habitacionesElegidas: [{
        tipo: mongoose.Schema.Types.ObjectId,
        cantidad: Number,
        capacidad: Number,
        precioBase: Number,
        nombre: String
    }],
    habitacionElegida: mongoose.Schema.Types.ObjectId,
    precioTotal: {
        type: Number,
        min: [0, 'El precio total no puede ser negativo']
    },
    metodoPago: {
        type: String,
        required: false,
        enum: {
            values: ['Nequi', 'Bancolombia', 'Daviplata', 'Banco Mundo Mujer', 'Tarjeta de crédito/débito'],
            message: 'Método de pago no válido'
        }
    },
    planAlimentacion: { type: String, enum: ['solo_desayuno', 'desayuno_almuerzo', 'completo', 'ninguno'], default: 'ninguno' },
    erroresConsecutivos: { type: Number, default: 0 },
    ultimoError: String,
    ultimoMensajeOpciones: String,
    estado: { type: String, enum: ['pendiente', 'confirmada'], default: 'pendiente' },
    idPasoActual: { type: String, default: 'bienvenida' },
    indiceOpcionActual: { type: Number, default: 0 },
    habitacionesAsignadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' }],
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reserva', EsquemaReserva);
