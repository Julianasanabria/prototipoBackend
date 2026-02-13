const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log('Intentando conectar a:', process.env.MONGO_URI.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('✅ Conexión exitosa');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error de conexión:', err.message);
        if (err.reason) console.error('Razón:', err.reason);
        process.exit(1);
    });
