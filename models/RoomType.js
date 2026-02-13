const mongoose = require('mongoose');

const EsquemaTipoHabitacion = new mongoose.Schema({
    nombre: { type: String, required: true },
    precioBase: { type: Number, required: true }, // Precio por noche
    capacidad: { type: Number, required: true },
    permiteMascotas: { type: Boolean, default: false },
    caracteristicas: [String], // Array de características
    categoria: String, // Categoría: Económica, Confort, Premium
    descripcion: { type: String }
});

// Índices para consultas ultra rápidas
EsquemaTipoHabitacion.index({ capacidad: 1 }); // Para búsqueda por capacidad
EsquemaTipoHabitacion.index({ permiteMascotas: 1 }); // Para búsqueda por mascotas
EsquemaTipoHabitacion.index({ capacidad: 1, permiteMascotas: 1 }); // Índice compuesto para búsquedas combinadas

module.exports = mongoose.model('TipoHabitacion', EsquemaTipoHabitacion);
