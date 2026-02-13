const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const ChatPaso = require('../models/ChatPaso');
const TipoHabitacion = require('../models/RoomType');
const Habitacion = require('../models/Habitacion');

dotenv.config({ path: path.join(__dirname, '../.env') });

const semillaDatos = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB conectado');

        await ChatPaso.deleteMany({});
        await TipoHabitacion.deleteMany({});
        await Habitacion.deleteMany({});

        // Tipos de habitación
        const tiposHabitacion = [
            // Económicas
            { nombre: 'Habitación Compartida (litera)', precioBase: 30000, capacidad: 1, permiteMascotas: false, caracteristicas: ['Cama litera', 'Baño compartido', 'WiFi'], categoria: 'Económica' },
            { nombre: 'Individual Básica', precioBase: 45000, capacidad: 1, permiteMascotas: false, caracteristicas: ['Cama sencilla', 'Baño privado', 'WiFi'], categoria: 'Económica' },
            { nombre: 'Doble Económica', precioBase: 60000, capacidad: 2, permiteMascotas: false, caracteristicas: ['Cama doble', 'Baño privado', 'TV', 'WiFi'], categoria: 'Económica' },
            { nombre: 'Triple Económica', precioBase: 90000, capacidad: 3, permiteMascotas: false, caracteristicas: ['1 cama doble + 1 sencilla', 'Baño privado', 'WiFi'], categoria: 'Económica' },

            // Confort (algunas con mascotas)
            { nombre: 'Doble Confort', precioBase: 120000, capacidad: 2, permiteMascotas: true, caracteristicas: ['Cama doble', 'Chimenea', 'TV Smart', 'Área mascotas'], categoria: 'Confort' },
            { nombre: 'Familiar Estándar', precioBase: 180000, capacidad: 4, permiteMascotas: false, caracteristicas: ['2 camas dobles', 'Chimenea', 'TV', 'WiFi'], categoria: 'Confort' },
            { nombre: 'Doble Premium', precioBase: 140000, capacidad: 2, permiteMascotas: true, caracteristicas: ['Cama king', 'Balcón', 'Minibar', 'TV Smart'], categoria: 'Confort' },
            { nombre: 'Familiar Confort', precioBase: 220000, capacidad: 4, permiteMascotas: true, caracteristicas: ['2 camas dobles', 'Chimenea', 'Balcón', 'Área mascotas'], categoria: 'Confort' },
            { nombre: 'Triple Confort', precioBase: 170000, capacidad: 3, permiteMascotas: true, caracteristicas: ['1 cama doble + 1 sencilla', 'Área mascotas', 'Chimenea'], categoria: 'Confort' },

            // Premium (todas con mascotas)
            { nombre: 'Familiar Premium', precioBase: 350000, capacidad: 4, permiteMascotas: true, caracteristicas: ['2 camas dobles', 'Chimenea', 'Minibar', 'Balcón', 'TV Smart'], categoria: 'Premium' },
            { nombre: 'Triple Premium', precioBase: 280000, capacidad: 3, permiteMascotas: true, caracteristicas: ['1 cama doble + 1 sencilla', 'Jacuzzi', 'Chimenea', 'TV Smart'], categoria: 'Premium' },
            { nombre: 'Suite Familiar', precioBase: 480000, capacidad: 6, permiteMascotas: true, caracteristicas: ['3 camas dobles', '2 baños', 'Sala', 'Cocina', 'Balcón'], categoria: 'Premium' },
            { nombre: 'Suite Ejecutiva', precioBase: 420000, capacidad: 2, permiteMascotas: true, caracteristicas: ['Cama king', 'Jacuzzi', 'Escritorio', 'Sala', 'Minibar'], categoria: 'Premium' }
        ];

        const tiposInsertados = await TipoHabitacion.insertMany(tiposHabitacion);
        console.log('Tipos de habitación insertados');

        // Generar instancias de habitaciones físicas (Inventario)
        const habitacionesFisicas = [];
        let contador = 101;

        tiposInsertados.forEach(tipo => {
            // Creamos 3 habitaciones de cada tipo como inventario inicial
            for (let i = 0; i < 3; i++) {
                habitacionesFisicas.push({
                    numero: `${contador++}`,
                    tipo: tipo._id,
                    estado: 'disponible'
                });
            }
        });

        await Habitacion.insertMany(habitacionesFisicas);
        console.log(`Inventario creado: ${habitacionesFisicas.length} habitaciones físicas insertadas.`);

        // Nodos de conversación
        const nodosChat = [
            {
                id: 'bienvenida',
                mensaje: "🏨 **Hotel de Villa de Leyva**\n\n¡Bienvenido! Nos alegra que nos elijas en el corazón del pueblo más hermoso de Boyacá.\n\n**¿Qué deseas hacer?**",
                tipo: 'payment_selection',
                opciones: [
                    { etiqueta: "Hacer una reserva ✅", valor: "1", siguiente_id: "preguntar_fechas" }
                ]
            },
            {
                id: 'preguntar_fechas',
                mensaje: "📅 **Fechas de tu Estancia**\n\nPor favor ingresa tu fecha de ingreso y salida:\nFormato: DD/MM/AAAA - DD/MM/AAAA\nEjemplo: 20/03/2026 - 23/03/2026",
                tipo: 'input_date',
                variable: 'rangoFechas',
                siguiente_id: 'preguntar_cantidad_personas'
            },
            {
                id: 'preguntar_cantidad_personas',
                mensaje: "👥 **Número de Personas**\n\n¿Para cuántas personas es la reserva?\n1. 1 persona\n2. 2 personas\n3. 3 personas\n4. 4 personas\n5. 5 personas\n6. 6 o más personas (especifica número)\n\nResponde con el número de tu opción (1-6)",
                tipo: 'input_number',
                variable: 'totalPersonas',
                siguiente_id: 'preguntar_distribucion_personas'
            },
            {
                id: 'preguntar_distribucion_personas',
                mensaje: "👨‍👩‍👧‍👦 **Distribución de Personas**\n\nDe las {totalPeople} personas, ¿cuántos son adultos y cuántos niños?\n\nUsa este formato: \"Adultos: X, Niños: Y\"\nEjemplo: Adultos: 2, Niños: 1",
                tipo: 'input_people_distribution',
                variable: 'distribucionPersonas',
                siguiente_id: 'preguntar_mascotas'
            },
            {
                id: 'preguntar_mascotas',
                mensaje: "🐾 **¿Viajas con Mascotas?**",
                tipo: 'payment_selection',
                opciones: [
                    { etiqueta: "No", valor: "no", siguiente_id: "preguntar_habitaciones" },
                    { etiqueta: "Sí", valor: "yes", siguiente_id: "preguntar_cantidad_mascotas" }
                ]
            },
            {
                id: 'preguntar_cantidad_mascotas',
                mensaje: "🐕 **Número de Mascotas**\n\n¡Perfecto! Aceptamos mascotas con mucho gusto.\n\n¿Cuántas mascotas traerás?\n\n💰 Nota: $30,000 adicionales por seguro para tu mascota por noche",
                tipo: 'payment_selection',
                variable: 'numMascotas',
                opciones: [
                    { etiqueta: "1 mascota 🐕", valor: "1", siguiente_id: "preguntar_habitaciones" },
                    { etiqueta: "2 mascotas 🐕🐕", valor: "2", siguiente_id: "preguntar_habitaciones" },
                    { etiqueta: "3 mascotas 🐕🐕🐕", valor: "3", siguiente_id: "preguntar_habitaciones" }
                ]
            },
            {
                id: 'sin_disponibilidad_mascotas',
                mensaje: "❌ **Sin Habitaciones para Mascotas**\n\nLo sentimos, no tenemos habitaciones disponibles para {totalPeople} personas que admitan mascotas.\n\n**¿Qué deseas hacer?**\n1. Modificar número de personas\n2. No viajar con mascotas\n3. Cancelar reserva\n\nResponde con el número de tu opción (1-3)",
                opciones: [
                    { etiqueta: "1", valor: "1", siguiente_id: "preguntar_cantidad_personas" },
                    { etiqueta: "2", valor: "2", siguiente_id: "preguntar_mascotas" },
                    { etiqueta: "3", valor: "3", siguiente_id: "bienvenida" }
                ]
            },
            {
                id: 'preguntar_habitaciones',
                mensaje: "🏠 **Número de Habitaciones**\n\n¿Cuántas habitaciones necesitas?\n\nIngresa el número de habitaciones (1 a 20).",
                tipo: 'input_number',
                variable: 'numHabitaciones',
                siguiente_id: 'mostrar_opciones'
            },
            {
                id: 'mostrar_opciones',
                mensaje: "🔍 **Buscando Opciones...**\n\nCalculando las mejores opciones para tu reserva...",
                tipo: 'dynamic_options',
                variable: 'opcionSeleccionada',
                siguiente_id: 'elegir_habitacion'
            },
            {
                id: 'elegir_habitacion',
                mensaje: "🏨 **Selecciona tu Habitación**\n\nPor favor, selecciona el número de la opción que prefieres:",
                tipo: 'input_number',
                variable: 'habitacionElegida',
                siguiente_id: 'preguntar_plan_alimentacion'
            },
            {
                id: 'preguntar_plan_alimentacion',
                mensaje: "🍽️ **Plan Alimentación**\n\n⭐ **El desayuno ya está incluido en todas nuestras habitaciones**\n\n¿Deseas agregar algún plan adicional?\n1. Solo desayuno (incluido) - $0\n2. Desayuno + Almuerzo ($25,000 por persona/noche)\n3. Desayuno + Almuerzo + Cena ($35,000 por persona/noche)\n\nResponde con el número de tu opción (1-3)",
                tipo: 'payment_selection',
                variable: 'planAlimentacion',
                opciones: [
                    { etiqueta: "1", valor: "solo_desayuno", siguiente_id: "preguntar_nombre" },
                    { etiqueta: "2", valor: "desayuno_almuerzo", siguiente_id: "preguntar_nombre" },
                    { etiqueta: "3", valor: "completo", siguiente_id: "preguntar_nombre" }
                ]
            },
            {
                id: 'preguntar_nombre',
                mensaje: "📝 **Datos Personales**\n\nPara finalizar tu reserva, necesitamos tus datos.\n\n¿Cuál es tu nombre y apellidos completos?",
                tipo: 'input_text',
                variable: 'nombreUsuario',
                siguiente_id: 'preguntar_telefono'
            },
            {
                id: 'preguntar_telefono',
                mensaje: "📞 **Número de Teléfono**\n\nGracias, {nombreUsuario}\n\n¿Cuál es tu número de teléfono?",
                tipo: 'input_text',
                variable: 'telefonoUsuario',
                siguiente_id: 'preguntar_correo'
            },
            {
                id: 'preguntar_correo',
                mensaje: "📧 **Correo Electrónico**\n\nPerfecto\n\n¿Cuál es tu correo para enviarte la confirmación?",
                tipo: 'input_text',
                variable: 'correoUsuario',
                siguiente_id: 'mostrar_resumen'
            },

            {
                id: 'mostrar_resumen',
                mensaje: "📋 **RESUMEN DE TU RESERVA**\n\n**👤 DATOS PERSONALES**\nNombre: {nombreUsuario}\nTeléfono: {telefonoUsuario}\nCorreo: {correoUsuario}\n\n**🏨 DETALLES**\nFechas: {startDate} al {endDate}\nPersonas: {totalPeople} ({peopleBreakdown})\nMascotas: {hasPetsStatus}\nHabitación: {roomType}\nNoches: {noches}\nPlan: {mealPlanName}\n\n**💰 COSTOS**\n• Habitación: ${roomPricePerNight} x {noches} noches = ${roomTotal}\n• Alimentación: {mealPlanCost}\n• Mascotas: {petCost}\n• **Total: {totalPrice}**\n\n**💳 Método de Pago** (selecciona abajo) Nequi 💚 \n\n Bancolombia 💙\n\n Daviplata 💛\n\n Banco Mundo Mujer 💜\n\n Tarjeta de crédito/débito 💳\n\nPara cambios: 312 345 6789",
                tipo: 'payment_selection',
                variable: 'metodoPago',
                opciones: [
                    { etiqueta: "Nequi 💚", valor: "Nequi", siguiente_id: "mostrar_detalles_pago" },
                    { etiqueta: "Bancolombia 💙", valor: "Bancolombia", siguiente_id: "mostrar_detalles_pago" },
                    { etiqueta: "Daviplata 💛", valor: "Daviplata", siguiente_id: "mostrar_detalles_pago" },
                    { etiqueta: "Mundo Mujer 💜", valor: "Banco Mundo Mujer", siguiente_id: "mostrar_detalles_pago" },
                    { etiqueta: "Tarjeta 💳", valor: "Tarjeta de crédito/débito", siguiente_id: "mostrar_detalles_pago" }
                ]
            },
            {
                id: 'mostrar_detalles_pago',
                mensaje: "💳 **Datos de Pago**\n\nHas seleccionado: {paymentMethod}\n\n**Datos para transferencia:**\nBanco: {paymentMethod}\nTipo: Ahorros\nNúmero: 123-456789-01\nTitular: Hotel de Villa de Leyva\nNIT: 900.123.456-7\nMonto: {totalPrice}\n\n¿Confirmas tu reserva?",
                tipo: 'payment_selection',
                variable: 'confirmacion_pago',
                opciones: [
                    { etiqueta: "Aceptar ✅", valor: "aceptar", siguiente_id: "confirmar_reserva" },
                    { etiqueta: "Rechazar ❌", valor: "rechazar", siguiente_id: "mostrar_resumen" }
                ]
            },
            {
                id: 'confirmar_reserva',
                mensaje: "🎉 **RESERVA CONFIRMADA**\n\n¡Gracias por elegir Hotel de Villa de Leyva!\nNos encanta recibirte en nuestro hermoso pueblo colonial.\n\n**📄 DETALLES FINALES**\nNombre: {nombreUsuario}\nTeléfono: {telefonoUsuario}\nCorreo: {correoUsuario}\nIngreso: {startDate}\nSalida: {endDate}\nPersonas: {totalPeople} ({peopleBreakdown})\nMascotas: {hasPetsStatus}\nHabitación: {selectedOptionName}\nPlan: {mealPlanName}\n\n**🏨 SERVICIOS INCLUIDOS**\n• 🍳 Desayuno buffet incluido\n• WiFi en todas las áreas\n• Acceso a áreas comunes\n• Atención 24 horas\n• {additionalServices}\n\n**🌟 ¡Te esperamos el {startDate}!**\n\nPara cualquier cambio o modificación, contáctanos al **312 345 6789**",
                tipo: 'static'
            }
        ];

        await ChatPaso.insertMany(nodosChat);
        console.log('Pasos de chat insertados');

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

semillaDatos();
