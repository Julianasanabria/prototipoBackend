const ChatPaso = require('../models/ChatPaso');
const Reserva = require('../models/Reservation');
const TipoHabitacion = require('../models/RoomType');
const Habitacion = require('../models/Habitacion');

const obtenerInventarioDisponible = async (inicio, fin) => {
    const habitacionesActivas = await Habitacion.find({
        estado: { $in: ['disponible', 'ocupada'] } // 'ocupada' se incluye porque puede desocuparse
    }).lean();

    const reservasSolapadas = await Reserva.find({
        estado: 'confirmada',
        $or: [
            { fechaInicio: { $lt: fin, $gte: inicio } },
            { fechaFin: { $gt: inicio, $lte: fin } },
            { fechaInicio: { $lte: inicio }, fechaFin: { $gte: fin } }
        ]
    }).lean();

    const idsHabitacionesOcupadas = new Set();
    reservasSolapadas.forEach(res => {
        if (res.habitacionesAsignadas) {
            res.habitacionesAsignadas.forEach(id => idsHabitacionesOcupadas.add(id.toString()));
        }
    });

    const inventario = {};
    habitacionesActivas.forEach(hab => {
        if (!idsHabitacionesOcupadas.has(hab._id.toString())) {
            const tipoId = hab.tipo.toString();
            inventario[tipoId] = (inventario[tipoId] || 0) + 1;
        }
    });

    return inventario;
};

const normalizarOpciones = (opciones) => {
    if (!Array.isArray(opciones)) return [];

    const copia = opciones.map(o => ({
        etiqueta: o?.etiqueta,
        valor: o?.valor,
        siguiente_id: o?.siguiente_id
    }));
    copia.sort((a, b) => {
        const aEtiqueta = a?.etiqueta;
        const bEtiqueta = b?.etiqueta;
        const aNum = typeof aEtiqueta === 'string' ? parseInt(aEtiqueta, 10) : NaN;
        const bNum = typeof bEtiqueta === 'string' ? parseInt(bEtiqueta, 10) : NaN;
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(aEtiqueta ?? '').localeCompare(String(bEtiqueta ?? ''), 'es', { numeric: true, sensitivity: 'base' });
    });
    return copia;
};

const respuestaChat = ({ mensaje, idPasoActual, tipo, opciones, ...resto }) => {
    return {
        mensaje: mensaje ?? '',
        idPasoActual: idPasoActual ?? null,
        tipo: tipo || 'static',
        opciones: normalizarOpciones(opciones),
        ...resto
    };
};

const calcularNoches = (rangoFechasStr) => {
    try {
        const [inicioStr, finStr] = rangoFechasStr.split('-').map(s => s.trim());
        const [d1, m1, y1] = inicioStr.split('/').map(Number);
        const [d2, m2, y2] = finStr.split('/').map(Number);
        const inicio = new Date(y1, m1 - 1, d1);
        const fin = new Date(y2, m2 - 1, d2);
        return Math.ceil(Math.abs(fin - inicio) / (1000 * 60 * 60 * 24));
    } catch (e) {
        return 0;
    }
};

const generarCombinacionesHabitaciones = (habitaciones, numPersonas, numHabitaciones, tieneMascotas, inventario = {}) => {
    const combinaciones = [];

    // Filtrar tipos que no tienen disponibilidad en el inventario
    const habitacionesConStock = habitaciones.filter(h => (inventario[h._id.toString()] || 0) > 0);

    if (numHabitaciones === 1) {
        return habitacionesConStock
            .filter(h => h.capacidad >= numPersonas)
            .map(h => ({
                habitaciones: [{ tipo: h, cantidad: 1 }],
                capacidadTotal: h.capacidad,
                precioTotal: h.precioBase,
                descripcion: `1× ${h.nombre}`
            }));
    }

    habitacionesConStock.forEach(tipoHab => {
        const stockDisponible = inventario[tipoHab._id.toString()] || 0;
        if (stockDisponible >= numHabitaciones) {
            const capacidadTotal = tipoHab.capacidad * numHabitaciones;
            if (capacidadTotal >= numPersonas) {
                combinaciones.push({
                    habitaciones: [{ tipo: tipoHab, cantidad: numHabitaciones }],
                    capacidadTotal: capacidadTotal,
                    precioTotal: tipoHab.precioBase * numHabitaciones,
                    descripcion: `${numHabitaciones}× ${tipoHab.nombre}`,
                    categoria: tipoHab.categoria,
                    esMixta: false
                });
            }
        }
    });

    if (numHabitaciones >= 2) {
        for (let i = 0; i < habitacionesConStock.length; i++) {
            for (let j = i + 1; j < habitacionesConStock.length; j++) {
                const tipo1 = habitacionesConStock[i];
                const tipo2 = habitacionesConStock[j];
                const stock1 = inventario[tipo1._id.toString()] || 0;
                const stock2 = inventario[tipo2._id.toString()] || 0;

                for (let cant1 = 1; cant1 < numHabitaciones; cant1++) {
                    const cant2 = numHabitaciones - cant1;

                    if (stock1 >= cant1 && stock2 >= cant2) {
                        const capacidadTotal = (tipo1.capacidad * cant1) + (tipo2.capacidad * cant2);

                        if (capacidadTotal >= numPersonas) {
                            combinaciones.push({
                                habitaciones: [
                                    { tipo: tipo1, cantidad: cant1 },
                                    { tipo: tipo2, cantidad: cant2 }
                                ],
                                capacidadTotal: capacidadTotal,
                                precioTotal: (tipo1.precioBase * cant1) + (tipo2.precioBase * cant2),
                                descripcion: `${cant1}× ${tipo1.nombre} + ${cant2}× ${tipo2.nombre}`,
                                categoria: 'Mixta',
                                esMixta: true
                            });
                        }
                    }
                }
            }
        }
    }

    if (numHabitaciones >= 3 && habitacionesConStock.length >= 3) {
        for (let i = 0; i < habitacionesConStock.length; i++) {
            for (let j = i + 1; j < habitacionesConStock.length; j++) {
                for (let k = j + 1; k < habitacionesConStock.length; k++) {
                    const tipo1 = habitacionesConStock[i];
                    const tipo2 = habitacionesConStock[j];
                    const tipo3 = habitacionesConStock[k];
                    const stock1 = inventario[tipo1._id.toString()] || 0;
                    const stock2 = inventario[tipo2._id.toString()] || 0;
                    const stock3 = inventario[tipo3._id.toString()] || 0;

                    if (numHabitaciones === 3) {
                        if (stock1 >= 1 && stock2 >= 1 && stock3 >= 1) {
                            const capacidadTotal = tipo1.capacidad + tipo2.capacidad + tipo3.capacidad;
                            if (capacidadTotal >= numPersonas) {
                                combinaciones.push({
                                    habitaciones: [
                                        { tipo: tipo1, cantidad: 1 },
                                        { tipo: tipo2, cantidad: 1 },
                                        { tipo: tipo3, cantidad: 1 }
                                    ],
                                    capacidadTotal: capacidadTotal,
                                    precioTotal: tipo1.precioBase + tipo2.precioBase + tipo3.precioBase,
                                    descripcion: `${tipo1.nombre} + ${tipo2.nombre} + ${tipo3.nombre}`,
                                    categoria: 'Mixta',
                                    esMixta: true
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    const combinacionesUnicas = [];
    const vistos = new Set();

    combinaciones.forEach(comb => {
        // Crear clave única basada en la descripción
        const clave = comb.habitaciones
            .map(h => `${h.tipo._id}-${h.cantidad}`)
            .sort()
            .join('|');

        if (!vistos.has(clave)) {
            vistos.add(clave);
            combinacionesUnicas.push(comb);
        }
    });

    combinacionesUnicas.sort((a, b) => a.precioTotal - b.precioTotal);

    return combinacionesUnicas.slice(0, 15);
};


exports.manejarMensaje = async (req, res) => {
    let { idSesion, entradaUsuario } = req.body;

    try {
        let reserva = await Reserva.findOne({ idSesionUsuario: idSesion });

        if (!reserva) {
            reserva = new Reserva({ idSesionUsuario: idSesion, idPasoActual: 'bienvenida' });
            await reserva.save();
            const pasoBienvenida = await ChatPaso.findOne({ id: 'bienvenida' });

            if (!pasoBienvenida) {
                return res.status(500).json(respuestaChat({
                    mensaje: '⚠️ No se encontró el paso "bienvenida" en la base de datos. Ejecuta "npm run seed" en el backend para cargar el flujo del chat.',
                    idPasoActual: 'bienvenida',
                    tipo: 'static',
                    opciones: []
                }));
            }

            return res.json(respuestaChat({
                mensaje: pasoBienvenida?.mensaje,
                idPasoActual: 'bienvenida',
                tipo: pasoBienvenida?.tipo || 'static',
                opciones: pasoBienvenida?.opciones
            }));
        }

        const pasoActual = await ChatPaso.findOne({ id: reserva.idPasoActual });

        if (!pasoActual) {
            return res.status(400).json(respuestaChat({
                error: 'Paso no encontrado',
                mensaje: 'Error en el flujo de conversación. Por favor reinicia el chat.',
                idPasoActual: 'bienvenida',
                tipo: 'static',
                opciones: []
            }));
        }

        if (!entradaUsuario && reserva.idPasoActual === 'bienvenida') {
            return res.json(respuestaChat({
                mensaje: pasoActual.mensaje,
                idPasoActual: pasoActual.id,
                tipo: pasoActual.tipo || 'static',
                opciones: pasoActual.opciones
            }));
        }

        if (entradaUsuario && entradaUsuario.includes('siguiente_id')) {
            return res.json(respuestaChat({
                mensaje: "❌ **Acceso no permitido**\n\nPor favor sigue el flujo normal de la conversación.",
                idPasoActual: reserva.idPasoActual,
                tipo: pasoActual.tipo || 'static',
                opciones: pasoActual.opciones
            }));
        }

        let idSiguiente = pasoActual.siguiente_id;

        if (pasoActual.id === 'mostrar_opciones' && reserva.opcionesSimuladas) {

            if (entradaUsuario === 'siguiente_opcion') {
                reserva.indiceOpcionActual = (reserva.indiceOpcionActual || 0) + 1;
                const totalOpciones = Object.keys(reserva.opcionesSimuladas).length;
                if (reserva.indiceOpcionActual >= totalOpciones) reserva.indiceOpcionActual = 0;

                await reserva.save();
                idSiguiente = pasoActual.id;
                entradaUsuario = null;
            } else if (entradaUsuario === 'anterior_opcion') {
                reserva.indiceOpcionActual = (reserva.indiceOpcionActual || 0) - 1;
                if (reserva.indiceOpcionActual < 0) reserva.indiceOpcionActual = 0;

                await reserva.save();
                idSiguiente = pasoActual.id;
                entradaUsuario = null;
            } else if (entradaUsuario === '1') {
                const indice = (reserva.indiceOpcionActual || 0) + 1;
                const opcionValida = reserva.opcionesSimuladas[indice.toString()];

                if (opcionValida) {
                    if (Array.isArray(opcionValida)) {
                        reserva.habitacionesElegidas = opcionValida;
                    } else {
                        const habitacionDoc = await TipoHabitacion.findById(opcionValida).lean();
                        if (habitacionDoc) {
                            reserva.habitacionesElegidas = [{
                                tipo: habitacionDoc._id,
                                cantidad: 1,
                                capacidad: habitacionDoc.capacidad,
                                precioBase: habitacionDoc.precioBase,
                                nombre: habitacionDoc.nombre
                            }];
                        }
                        reserva.habitacionElegida = opcionValida;
                    }
                    idSiguiente = 'preguntar_plan_alimentacion';
                } else {
                    idSiguiente = 'mostrar_opciones';
                }
            } else if (entradaUsuario === '2') {
                idSiguiente = 'preguntar_habitaciones';
            } else {
                return res.json(respuestaChat({
                    mensaje: "❌ Opción no válida. Por favor usa los botones disponibles.",
                    idPasoActual: pasoActual.id,
                    tipo: 'dynamic_options',
                    opciones: []
                }));
            }
        }

        if (pasoActual.opciones && pasoActual.opciones.length > 0) {
            const opcionSeleccionada = pasoActual.opciones.find(o => o.etiqueta === entradaUsuario || o.valor === entradaUsuario);
            if (opcionSeleccionada) {
                idSiguiente = opcionSeleccionada.siguiente_id;
                reserva.erroresConsecutivos = 0;

                if (pasoActual.id === 'preguntar_mascotas') {
                    reserva.tieneMascotas = opcionSeleccionada.valor === 'yes';
                } else if (pasoActual.id === 'preguntar_plan_alimentacion') {
                    reserva.planAlimentacion = opcionSeleccionada.valor;
                } else if (pasoActual.id === 'mostrar_resumen') {
                    reserva.metodoPago = opcionSeleccionada.valor;
                } else if (pasoActual.id === 'preguntar_cantidad_mascotas') {
                    reserva.numMascotas = parseInt(opcionSeleccionada.valor);
                } else if (pasoActual.id === 'mostrar_detalles_pago') {
                    idSiguiente = opcionSeleccionada.siguiente_id;
                }
            } else {
                reserva.erroresConsecutivos += 1;
                if (reserva.erroresConsecutivos === 1) {
                    const opcionesValidas = pasoActual.opciones.map(o => o.etiqueta).join(', ');
                    return res.json(respuestaChat({
                        mensaje: `Opción no válida. Por favor responde únicamente con [${opcionesValidas}].\n` + pasoActual.mensaje,
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                } else {
                    return res.json(respuestaChat({
                        mensaje: "Has ingresado una opción inválida dos veces.\n\nPor favor selecciona:\n1. Intentar nuevamente\n2. Regresar al menú principal",
                        idPasoActual: pasoActual.id,
                        tipo: 'static',
                        opciones: [
                            { etiqueta: "1", valor: "1", siguiente_id: pasoActual.id },
                            { etiqueta: "2", valor: "2", siguiente_id: "bienvenida" }
                        ]
                    }));
                }
            }
        }

        if (pasoActual.variable) {
            if (pasoActual.id === 'preguntar_fechas') {
                const entradaStr = String(entradaUsuario || '').trim();
                if (!entradaStr || !entradaStr.includes('-')) {
                    return res.json(respuestaChat({
                        mensaje: "Formato incorrecto. Usa el ícono de calendario o escribe: DD/MM/AAAA - DD/MM/AAAA",
                        idPasoActual: pasoActual.id,
                        tipo: 'input_date',
                        opciones: pasoActual.opciones || []
                    }));
                }

                const partes = entradaStr.split(/\s*-\s*/);
                const inicioStr = partes[0]?.trim();
                const finStr = partes[1]?.trim();
                if (!inicioStr || !finStr || partes.length !== 2) {
                    return res.json(respuestaChat({
                        mensaje: "Formato incorrecto. Usa: DD/MM/AAAA - DD/MM/AAAA\nEjemplo: 20/03/2026 - 23/03/2026",
                        idPasoActual: pasoActual.id,
                        tipo: 'input_date',
                        opciones: pasoActual.opciones || []
                    }));
                }
                const parsearFecha = (str) => {
                    if (!str || typeof str !== 'string') return null;
                    const limpio = str.trim().replace(/\s+/g, '');
                    let dia, mes, anio;
                    if (limpio.includes('/')) {
                        const partes = limpio.split('/').map(p => parseInt(p, 10));
                        if (partes.length !== 3 || partes.some(isNaN)) return null;
                        [dia, mes, anio] = partes;
                    } else if (limpio.includes('-')) {
                        const partes = limpio.split('-').map(p => parseInt(p, 10));
                        if (partes.length !== 3 || partes.some(isNaN)) return null;
                        if (partes[0] > 31) {
                            [anio, mes, dia] = partes;
                        } else {
                            [dia, mes, anio] = partes;
                        }
                    } else return null;
                    if (anio < 100) anio += 2000;
                    const fecha = new Date(anio, mes - 1, dia);
                    if (isNaN(fecha.getTime()) || fecha.getDate() !== dia || fecha.getMonth() !== mes - 1) return null;
                    return fecha;
                };

                const fechaInicio = parsearFecha(inicioStr);
                const fechaFin = parsearFecha(finStr);

                if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
                    return res.json(respuestaChat({
                        mensaje: "Fechas inválidas. La fecha de salida debe ser posterior a la de ingreso. Usa el ícono de calendario para seleccionar.",
                        idPasoActual: pasoActual.id,
                        tipo: 'input_date',
                        opciones: pasoActual.opciones || []
                    }));
                }

                reserva.fechaInicio = fechaInicio;
                reserva.fechaFin = fechaFin;
                reserva.idPasoActual = 'preguntar_cantidad_personas';

            } else if (pasoActual.id === 'preguntar_cantidad_personas') {
                const numPersonas = parseInt(entradaUsuario);
                if (isNaN(numPersonas) || numPersonas < 1) {
                    return res.json(respuestaChat({
                        mensaje: "Por favor ingresa un número válido de personas (1, 2, 3...)",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                reserva.numAdultos = numPersonas;
            } else if (pasoActual.id === 'preguntar_distribucion_personas') {
                const adultos = entradaUsuario.match(/Adultos:\s*(\d+)/i);
                const ninos = entradaUsuario.match(/Niños:\s*(\d+)/i);

                if (!adultos || !ninos) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Formato inválido**\n\nPor favor ingresa ambos valores en el formato:\nAdultos: X, Niños: Y\n\nEjemplo: Adultos: 2, Niños: 1",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }

                const numAdultos = parseInt(adultos[1]);
                const numNinos = parseInt(ninos[1]);
                const totalPersonas = numAdultos + numNinos;

                if (totalPersonas !== reserva.numAdultos) {
                    return res.json(respuestaChat({
                        mensaje: `❌ **Cantidad incorrecta**\n\nLa suma de adultos (${numAdultos}) y niños (${numNinos}) es ${totalPersonas}, pero anteriormente indicaste ${reserva.numAdultos} personas.\n\nPor favor corrige la distribución para que sume ${reserva.numAdultos} personas.`,
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }

                if (numAdultos < 1) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Adultos insuficientes**\n\nDebe haber al menos 1 adulto en la reserva.\n\nPor favor ingresa una distribución válida.",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }

                if (numAdultos < 0 || numNinos < 0) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Valores inválidos**\n\nLas cantidades no pueden ser negativas.\n\nPor favor ingresa números válidos.",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }

                reserva.numAdultos = numAdultos;
                reserva.numNinos = numNinos;
            } else if (pasoActual.id === 'preguntar_cantidad_mascotas') {
            } else if (pasoActual.id === 'preguntar_habitaciones') {
                const numHabitaciones = parseInt(entradaUsuario);
                if (isNaN(numHabitaciones) || numHabitaciones < 1) {
                    return res.json(respuestaChat({
                        mensaje: "Por favor ingresa un número válido de habitaciones (1 a 20).",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                if (numHabitaciones > 20) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Sin Capacidad**\n\nLo sentimos, no tenemos capacidad para más de 20 habitaciones.\n\nPor favor ingresa un número entre 1 y 20.",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                reserva.numHabitaciones = numHabitaciones;
            } else if (pasoActual.id === 'preguntar_nombre') {
                const nombreLimpio = entradaUsuario.trim();
                const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
                if (!regexNombre.test(nombreLimpio)) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Nombre inválido**\n\nEl nombre solo puede contener letras y espacios.\n\nPor favor ingresa tu nombre y apellidos completos:",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                const palabras = nombreLimpio.split(/\s+/).filter(p => p.length > 0);
                if (palabras.length < 2) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Nombre incompleto**\n\nPor favor ingresa tu nombre y apellidos (al menos dos palabras).\n\nEjemplo: María García López",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                if (nombreLimpio.length < 2 || nombreLimpio.length > 100) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Longitud inválida**\n\nEl nombre debe tener entre 2 y 100 caracteres.\n\nPor favor ingresa tu nombre y apellidos completos:",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                reserva.nombreUsuario = nombreLimpio;
            } else if (pasoActual.id === 'preguntar_telefono') {
                const regexTelefono = /^[0-9]{10}$/;
                if (!regexTelefono.test(entradaUsuario.trim())) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Teléfono inválido**\n\nEl teléfono debe tener exactamente 10 dígitos numéricos.\n\nEjemplo: 3211234567\n\nPor favor ingresa tu número de teléfono:",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                reserva.telefonoUsuario = entradaUsuario.trim();
            } else if (pasoActual.id === 'preguntar_correo') {
                const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!regexCorreo.test(entradaUsuario.trim())) {
                    return res.json(respuestaChat({
                        mensaje: "❌ **Correo inválido**\n\nPor favor ingresa un correo electrónico válido.\n\nEjemplo: usuario@ejemplo.com",
                        idPasoActual: pasoActual.id,
                        tipo: pasoActual.tipo || 'static',
                        opciones: pasoActual.opciones
                    }));
                }
                reserva.correoUsuario = entradaUsuario.trim().toLowerCase();
            } else if (pasoActual.id === 'preguntar_plan_alimentacion') {
                const opcionSeleccionada = pasoActual.opciones.find(o => o.etiqueta === entradaUsuario || o.valor === entradaUsuario);
                if (opcionSeleccionada) {
                    reserva.planAlimentacion = opcionSeleccionada.valor;
                }
            } else if (pasoActual.id === 'mostrar_resumen') {
                reserva.metodoPago = entradaUsuario;
            }
        }

        if (pasoActual.id === 'preguntar_cantidad_personas') {
            idSiguiente = 'preguntar_distribucion_personas';
        }

        if (pasoActual.id === 'preguntar_habitaciones') {
            idSiguiente = 'mostrar_opciones';
        }

        if (idSiguiente === 'mostrar_resumen') {
            const camposFaltantes = [];

            if (!reserva.nombreUsuario || reserva.nombreUsuario.trim() === '') {
                camposFaltantes.push('nombre');
            }
            if (!reserva.telefonoUsuario || reserva.telefonoUsuario.trim() === '') {
                camposFaltantes.push('teléfono');
            }
            if (!reserva.correoUsuario || reserva.correoUsuario.trim() === '') {
                camposFaltantes.push('correo');
            }
            if (!reserva.fechaInicio) {
                camposFaltantes.push('fecha de inicio');
            }
            if (!reserva.fechaFin) {
                camposFaltantes.push('fecha de fin');
            }
            if (!reserva.numAdultos || reserva.numAdultos < 1) {
                camposFaltantes.push('número de adultos');
            }
            if (!reserva.numHabitaciones || reserva.numHabitaciones < 1) {
                camposFaltantes.push('número de habitaciones');
            }
            if ((!reserva.habitacionesElegidas || reserva.habitacionesElegidas.length === 0) && !reserva.habitacionElegida) {
                camposFaltantes.push('selección de habitación');
            }

            if (camposFaltantes.length > 0) {
                return res.json(respuestaChat({
                    mensaje: `❌ **Información incompleta**\n\nFaltan los siguientes datos obligatorios:\n${camposFaltantes.map(campo => `• ${campo}`).join('\n')}\n\nPor favor completa toda la información antes de continuar.`,
                    idPasoActual: reserva.idPasoActual,
                    tipo: pasoActual.tipo || 'static',
                    opciones: pasoActual.opciones
                }));
            }
        }

        reserva.idPasoActual = idSiguiente;

        if (idSiguiente === 'confirmar_reserva') {
            reserva.estado = 'confirmada';

            try {
                const inicio = reserva.fechaInicio;
                const fin = reserva.fechaFin;

                const habitacionesActivas = await Habitacion.find({
                    estado: { $in: ['disponible', 'ocupada'] }
                }).lean();

                const reservasSolapadas = await Reserva.find({
                    estado: 'confirmada',
                    $or: [
                        { fechaInicio: { $lt: fin, $gte: inicio } },
                        { fechaFin: { $gt: inicio, $lte: fin } },
                        { fechaInicio: { $lte: inicio }, fechaFin: { $gte: fin } }
                    ]
                }).lean();

                const idsOcupadas = new Set();
                reservasSolapadas.forEach(r => {
                    if (r.habitacionesAsignadas) {
                        r.habitacionesAsignadas.forEach(id => idsOcupadas.add(id.toString()));
                    }
                });

                const asignadas = [];
                for (const habInfo of (reserva.habitacionesElegidas || [])) {
                    const disponiblesDeEsteTipo = habitacionesActivas.filter(h =>
                        h.tipo.toString() === habInfo.tipo.toString() &&
                        !idsOcupadas.has(h._id.toString()) &&
                        !asignadas.includes(h._id)
                    );

                    for (let i = 0; i < habInfo.cantidad; i++) {
                        if (disponiblesDeEsteTipo[i]) {
                            asignadas.push(disponiblesDeEsteTipo[i]._id);
                        }
                    }
                }
                reserva.habitacionesAsignadas = asignadas;

                if (asignadas.length > 0) {
                    await Habitacion.updateMany(
                        { _id: { $in: asignadas } },
                        { $set: { estado: 'ocupada' } }
                    );
                }

                console.log(`Habitaciones asignadas y bloqueadas para reserva ${reserva._id}:`, asignadas);
            } catch (err) {
                console.error('Error al asignar/bloquear habitaciones:', err);
            }
        }

        await reserva.save();

        const pasoSiguiente = await ChatPaso.findOne({ id: idSiguiente });
        if (!pasoSiguiente) {
            return res.status(400).json(respuestaChat({
                mensaje: "Error: Paso no encontrado",
                idPasoActual: reserva.idPasoActual,
                tipo: 'static',
                opciones: []
            }));
        }

        let mensajeRespuesta = pasoSiguiente.mensaje;

        const totalPersonas = (reserva.numAdultos || 0) + (reserva.numNinos || 0);
        const noches = reserva.fechaInicio && reserva.fechaFin ?
            Math.ceil((reserva.fechaFin - reserva.fechaInicio) / (1000 * 60 * 60 * 24)) : 0;

        let precioTotal = 0;
        let precioHabitacion = 0;
        let costoAlimentacion = 0;
        let costoMascotas = 0;
        let nombreHabitacion = 'No seleccionada';

        if (reserva.habitacionesElegidas && reserva.habitacionesElegidas.length > 0) {
            for (const habInfo of reserva.habitacionesElegidas) {
                precioHabitacion += habInfo.precioBase * habInfo.cantidad;
            }
            precioTotal += precioHabitacion * noches;

            if (reserva.habitacionesElegidas.length === 1) {
                const hab = reserva.habitacionesElegidas[0];
                nombreHabitacion = hab.cantidad > 1
                    ? `${hab.cantidad}× ${hab.nombre}`
                    : hab.nombre;
            } else {
                nombreHabitacion = reserva.habitacionesElegidas
                    .map(h => `${h.cantidad}× ${h.nombre}`)
                    .join(' + ');
            }
        } else if (reserva.habitacionElegida) {
            const habitacionSeleccionada = await TipoHabitacion.findById(reserva.habitacionElegida).lean();

            if (habitacionSeleccionada) {
                nombreHabitacion = habitacionSeleccionada.nombre;
                precioHabitacion = habitacionSeleccionada.precioBase;
                precioTotal += precioHabitacion * noches * (reserva.numHabitaciones || 1);
            }
        }

        if (reserva.planAlimentacion) {
            switch (reserva.planAlimentacion) {
                case 'solo_desayuno':
                    costoAlimentacion = 0;
                    break;
                case 'desayuno_almuerzo':
                    costoAlimentacion = 25000 * totalPersonas * noches;
                    break;
                case 'completo':
                    costoAlimentacion = 35000 * totalPersonas * noches;
                    break;
                case 'ninguno':
                    costoAlimentacion = 0;
                    break;
            }
            precioTotal += costoAlimentacion;
        }

        // Calcular costo de mascotas
        if (reserva.tieneMascotas && reserva.numMascotas) {
            costoMascotas = 30000 * reserva.numMascotas * noches;
            precioTotal += costoMascotas;
        }

        // Nombres descriptivos para planes
        const nombresPlanes = {
            'solo_desayuno': 'Solo desayuno (Lo esencial) ☕',
            'desayuno_almuerzo': 'Desayuno + Almuerzo (¡Ideal para recorrer!) 🍛',
            'completo': 'Plan Gourmet Completo ⭐',
            'ninguno': 'Sin alimentación'
        };

        // Obtener números de habitaciones físicas si ya fueron asignadas
        let numerosHabitacionesStr = 'Pendiente de asignación';
        if (reserva.habitacionesAsignadas && reserva.habitacionesAsignadas.length > 0) {
            const habsFisicas = await Habitacion.find({ _id: { $in: reserva.habitacionesAsignadas } }).lean();
            numerosHabitacionesStr = habsFisicas.map(h => h.numero).sort().join(', ');
        }

        mensajeRespuesta = mensajeRespuesta
            .replace(/{startDate}/g, reserva.fechaInicio ? reserva.fechaInicio.toLocaleDateString('es-ES') : '')
            .replace(/{endDate}/g, reserva.fechaFin ? reserva.fechaFin.toLocaleDateString('es-ES') : '')
            .replace(/{totalPeople}/g, totalPersonas)
            .replace(/{peopleBreakdown}/g, `${reserva.numAdultos || 0} adultos, ${reserva.numNinos || 0} niños`)
            .replace(/{hasPetsStatus}/g, reserva.tieneMascotas ? `Sí (${reserva.numMascotas || 0} 🐾)` : 'No')
            .replace(/{nombreUsuario}/g, reserva.nombreUsuario || '')
            .replace(/{telefonoUsuario}/g, reserva.telefonoUsuario || '')
            .replace(/{correoUsuario}/g, reserva.correoUsuario || '')
            .replace(/{paymentMethod}/g, reserva.metodoPago || 'No seleccionado')
            .replace(/{totalPrice}/g, `$${precioTotal.toLocaleString()}`)
            .replace(/{roomType}/g, nombreHabitacion)
            .replace(/{roomNumbers}/g, numerosHabitacionesStr)
            .replace(/{roomPricePerNight}/g, `$${precioHabitacion.toLocaleString()}`)
            .replace(/{roomTotal}/g, `$${(precioHabitacion * noches * (reserva.numHabitaciones || 1)).toLocaleString()}`)
            .replace(/{noches}/g, noches)
            .replace(/{mealPlanName}/g, nombresPlanes[reserva.planAlimentacion] || 'No seleccionado')
            .replace(/{mealPlanCost}/g, `$${costoAlimentacion.toLocaleString()}`)
            .replace(/{petCost}/g, `$${costoMascotas.toLocaleString()}`)
            .replace(/{selectedOptionName}/g, nombreHabitacion)
            .replace(/{additionalServices}/g, reserva.tieneMascotas ? 'Área especial para mascotas 🐾' : 'Servicios estándar');

        // Procesar opciones dinámicas
        if (pasoSiguiente.tipo === 'dynamic_options') {
            const numHabitacionesSolicitadas = reserva.numHabitaciones || 1;

            // Obtener todas las habitaciones disponibles
            let todasHabitaciones = await TipoHabitacion.find({}).lean();

            if (reserva.tieneMascotas) {
                todasHabitaciones = todasHabitaciones.filter(h => h.permiteMascotas);
            }

            if (todasHabitaciones.length === 0) {
                return res.json(respuestaChat({
                    mensaje: `❌ **Sin Habitaciones Disponibles**\n\nLo sentimos, no tenemos habitaciones${reserva.tieneMascotas ? ' que admitan mascotas' : ''} disponibles.\n\n**Opciones:**\n1. ${reserva.tieneMascotas ? 'No viajar con mascotas' : 'Modificar búsqueda'}\n2. Cancelar reserva`,
                    idPasoActual: 'sin_disponibilidad',
                    tipo: 'static',
                    opciones: [
                        { etiqueta: "1", valor: "1", siguiente_id: reserva.tieneMascotas ? "preguntar_mascotas" : "preguntar_cantidad_personas" },
                        { etiqueta: "2", valor: "2", siguiente_id: "bienvenida" }
                    ]
                }));
            }

            // Generar combinaciones
            const inventario = await obtenerInventarioDisponible(reserva.fechaInicio, reserva.fechaFin);
            const combinaciones = generarCombinacionesHabitaciones(
                todasHabitaciones,
                totalPersonas,
                numHabitacionesSolicitadas,
                reserva.tieneMascotas,
                inventario
            );

            if (combinaciones.length === 0) {
                return res.json(respuestaChat({
                    mensaje: `❌ **Sin Combinaciones Disponibles**\n\nLo sentimos, no podemos acomodar ${totalPersonas} personas en ${numHabitacionesSolicitadas} habitación(es)${reserva.tieneMascotas ? ' con mascotas' : ''}.\n\n**Sugerencias:**\n1. Aumentar número de habitaciones\n2. Reducir número de personas\n${reserva.tieneMascotas ? '3. No viajar con mascotas\n4. Cancelar reserva' : '3. Cancelar reserva'}`,
                    idPasoActual: 'sin_combinaciones',
                    tipo: 'static',
                    opciones: [
                        { etiqueta: "1", valor: "1", siguiente_id: "preguntar_habitaciones" },
                        { etiqueta: "2", valor: "2", siguiente_id: "preguntar_cantidad_personas" },
                        reserva.tieneMascotas ? { etiqueta: "3", valor: "3", siguiente_id: "preguntar_mascotas" } : { etiqueta: "3", valor: "3", siguiente_id: "bienvenida" },
                        ...(reserva.tieneMascotas ? [{ etiqueta: "4", valor: "4", siguiente_id: "bienvenida" }] : [])
                    ]
                }));
            }

            // --- LÓGICA DE PAGINACIÓN ---
            const totalOpciones = combinaciones.length;
            let indiceActual = reserva.indiceOpcionActual || 0;
            if (indiceActual >= totalOpciones) indiceActual = 0;
            reserva.indiceOpcionActual = indiceActual; // Asegurar consistencia

            // Seleccionar SOLO la combinación actual
            const comb = combinaciones[indiceActual];
            const precioTotalNoches = comb.precioTotal * noches;

            let mensajeOpciones = `✨ **He encontrado esta opción ideal para ti** basándome en tu búsqueda.\n\n`;

            mensajeOpciones += `✨ **Opción ${indiceActual + 1} de ${totalOpciones}**\n\n`;

            if (comb.esMixta) {
                mensajeOpciones += `🔀 **COMBINACIÓN MIXTA**\n`;
            } else {
                if (numHabitacionesSolicitadas === 1) {
                    mensajeOpciones += `📦 **HABITACIÓN INDIVIDUAL**\n`;
                } else {
                    mensajeOpciones += `📦 **COMBINACIÓN HOMOGÉNEA**\n`;
                }
            }

            mensajeOpciones += `**${comb.descripcion}**\n\n`; // Título principal

            // Detalle de habitaciones
            comb.habitaciones.forEach(habInfo => {
                mensajeOpciones += `• ${habInfo.cantidad}× ${habInfo.tipo.nombre}\n`;
                mensajeOpciones += `   Capacidad: ${habInfo.tipo.capacidad} pers. c/u\n`;
                mensajeOpciones += `   ${habInfo.tipo.caracteristicas ? habInfo.tipo.caracteristicas.join(', ') : ''}\n`;
            });

            mensajeOpciones += `\n👥 Capacidad total: ${comb.capacidadTotal} personas\n`;

            if (numHabitacionesSolicitadas > 1) {
                const personasPorHab = Math.ceil(totalPersonas / numHabitacionesSolicitadas);
                mensajeOpciones += `📊 Distribución sugerida: ~${personasPorHab} personas/habitación\n`;
            }

            const permiteMascotas = comb.habitaciones.every(h => h.tipo.permiteMascotas);
            mensajeOpciones += `🐾 Mascotas: ${permiteMascotas ? 'Sí ✅' : 'No ❌'}\n`;

            mensajeOpciones += `\n💰 Precio/noche: $${comb.precioTotal.toLocaleString()}\n`;
            mensajeOpciones += `📅 Total (${noches} noches): $${precioTotalNoches.toLocaleString()}\n\n`;

            mensajeOpciones += `👇 **¿Te gustaría asegurar esta estancia única ahora?**`;

            // Construir botones de navegación
            const opciones = [];

            // 1. Selector principal (PERSUASIVO)
            opciones.push({
                etiqueta: "¡Me encanta, la quiero! 💖",
                valor: "1",
                siguiente_id: "preguntar_plan_alimentacion"
            });

            // 2. Siguiente (si hay más)
            if (totalOpciones > 1) {
                opciones.push({
                    etiqueta: "Muéstrame otra opción  ➡️",
                    valor: "siguiente_opcion",
                    siguiente_id: "mostrar_opciones"
                });
            }

            // 3. Anterior (si no estamos en la primera)
            if (indiceActual > 0) {
                opciones.push({
                    etiqueta: "⬅️ Volver a la anterior",
                    valor: "anterior_opcion",
                    siguiente_id: "mostrar_opciones"
                });
            }

            // 4. Cancelar
            opciones.push({
                etiqueta: "Cancelar / Volver al inicio",
                valor: "2",
                siguiente_id: "preguntar_habitaciones"
            });


            // Guardar opciones simuladas (necesario para cuando el usuario elija "1")
            reserva.opcionesSimuladas = {};
            // Solo necesitamos mapear el índice actual + 1 para que coincida con la lógica de entrada "1"
            const indexKey = (indiceActual + 1).toString();
            reserva.opcionesSimuladas[indexKey] = comb.habitaciones.map(habInfo => ({
                tipo: habInfo.tipo._id,
                cantidad: habInfo.cantidad,
                capacidad: habInfo.tipo.capacidad,
                precioBase: habInfo.tipo.precioBase,
                nombre: habInfo.tipo.nombre
            }));

            // También guardamos TOOOODAS las simulaciones por si acaso la lógica cambia,
            // pero para esta implementación específica de "ver una por una", lo crítico es que '1' funcione.
            // Para robustez, guardemos todas indexadas por su posición real 1..N
            combinaciones.forEach((c, idx) => {
                reserva.opcionesSimuladas[(idx + 1).toString()] = c.habitaciones.map(h => ({
                    tipo: h.tipo._id,
                    cantidad: h.cantidad,
                    capacidad: h.tipo.capacidad,
                    precioBase: h.tipo.precioBase,
                    nombre: h.tipo.nombre
                }));
            });

            reserva.ultimoMensajeOpciones = mensajeOpciones;
            await reserva.save();

            return res.json(respuestaChat({
                mensaje: mensajeOpciones,
                idPasoActual: pasoSiguiente.id,
                tipo: 'dynamic_options',
                opciones: opciones
            }));
        }

        // Respuesta normal
        return res.json(respuestaChat({
            mensaje: mensajeRespuesta,
            idPasoActual: pasoSiguiente.id,
            tipo: pasoSiguiente.tipo || 'text',
            opciones: pasoSiguiente.opciones || []
        }));

    } catch (error) {
        console.error('Error en manejarMensaje:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json(respuestaChat({
            mensaje: "Error en el servidor",
            idPasoActual: null,
            tipo: 'static',
            opciones: [],
            error: error.message
        }));
    }
};

// Reiniciar chat
exports.reiniciarChat = async (req, res) => {
    const { idSesion } = req.body;

    try {
        await Reserva.deleteOne({ idSesionUsuario: idSesion });
        res.json({
            mensaje: "Chat reiniciado correctamente",
            idSesion: idSesion
        });
    } catch (error) {
        console.error('Error reiniciando chat:', error);
        res.status(500).json({ message: "Error reiniciando chat" });
    }
};
