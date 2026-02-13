const mongoose = require('mongoose');

const EsquemaChatPaso = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    mensaje: { type: String, required: true },
    tipo: {
        type: String,
        enum: ['static', 'input_text', 'input_date', 'input_number', 'input_people_distribution', 'dynamic_options', 'dynamic_pet_check', 'payment_selection'],
        default: 'static'
    },
    variable: { type: String },
    opciones: [{
        etiqueta: String,
        valor: mongoose.Schema.Types.Mixed,
        siguiente_id: String
    }],
    siguiente_id: { type: String }
});

module.exports = mongoose.model('ChatPaso', EsquemaChatPaso);
