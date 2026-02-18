const mongoose = require('mongoose');

const EsquemaTipoHabitacion = new mongoose.Schema({
    nombre: { type: String, required: true },
    precioBase: { type: Number, required: true },
    capacidad: { type: Number, required: true },
    permiteMascotas: { type: Boolean, default: false },
    caracteristicas: [String],
    categoria: String,
    descripcion: { type: String }
});

EsquemaTipoHabitacion.index({ capacidad: 1 });
EsquemaTipoHabitacion.index({ permiteMascotas: 1 });
EsquemaTipoHabitacion.index({ capacidad: 1, permiteMascotas: 1 });

module.exports = mongoose.model('TipoHabitacion', EsquemaTipoHabitacion);
