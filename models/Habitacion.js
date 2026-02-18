const mongoose = require('mongoose');

const EsquemaHabitacion = new mongoose.Schema({
    numero: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    tipo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TipoHabitacion',
        required: true
    },
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'ocupada', 'fuera_de_servicio'],
        default: 'disponible'
    },
    notas: String,
    ultimaLimpieza: Date
}, {
    timestamps: true
});

EsquemaHabitacion.index({ tipo: 1, estado: 1 });

module.exports = mongoose.model('Habitacion', EsquemaHabitacion);
