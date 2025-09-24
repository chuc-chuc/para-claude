// ============================================================================
// MODELOS TYPESCRIPT ACTUALIZADOS CON CAMPO RETENCIÓN
// ============================================================================

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

export interface FacturaPendiente {
    factura_id: number;
    numero_dte: string;
    fecha_emision: string;
    nombre_emisor: string;
    monto_total: number;
    retencion: number; // NUEVO CAMPO
    tipo_dte: string;
    estado_liquidacion: 'Pendiente' | 'Verificado' | 'Liquidado' | 'Pagado';
    detalles: DetalleConOrden[];
}

export interface DetalleConOrden {
    detalle_id: number;
    numero_orden: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string | null;
    forma_pago: string;
    estado_verificacion: 'pendiente' | 'verificado' | 'rechazado';
    comprobante_contabilidad?: string;
    agencia_gasto_id?: number;
    agencia_gasto_nombre?: string;
    nombre_gasto?: string;
    solicitante?: string;
    tiene_cambios_pendientes: boolean;
    cambios_pendientes_count: number;
    id_socio?: string; // NUEVO CAMPO
    nombre_socio?: string; // NUEVO CAMPO
    numero_cuenta_deposito?: string; // NUEVO CAMPO
    comprobante_tesoreria?: string; // NUEVO CAMPO
    fecha_transferencia?: string; // NUEVO CAMPO
    banco_transferencia_nombre?: string; // NUEVO CAMPO

    // Datos de la orden
    orden: {
        total: number;
        monto_liquidado: number;
        area_nombre: string;
        tipo_presupuesto: string;
        total_anticipos: number;
    };
}

export interface Agencia {
    id: number;
    nombre: string;
    direccion?: string;
}

export interface CambioSolicitado {
    id: number;
    detalle_liquidacion_id: number;
    numero_factura: string;
    tipo_cambio: 'correccion_monto' | 'correccion_descripcion' | 'correccion_agencia' | 'otros';
    descripcion_cambio: string;
    valor_anterior?: string;
    valor_solicitado?: string;
    justificacion?: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    solicitado_por: string;
    fecha_solicitud: string;
    aprobado_por?: string;
    fecha_aprobacion?: string;
    observaciones_aprobacion?: string;

    // Datos del detalle
    numero_orden?: string;
    detalle_descripcion?: string;
}

export interface RetencionFactura {
    id: number;
    tipo_retencion_id: number;
    numero_retencion: string;
    monto: number;
    porcentaje?: number;
    fecha_retencion: string;
    tipo_codigo?: string;
    tipo_nombre?: string;
}

// ============================================================================
// NUEVAS INTERFACES PARA ESTADÍSTICAS Y VALIDACIONES
// ============================================================================

export interface EstadisticasFactura {
    numero_dte: string;
    monto_total: number;
    retencion: number;
    total_liquidado: number;
    total_detalles: number;
    detalles_verificados: number;
    detalles_con_comprobante: number;
    estado_actual: string;
    montos_cuadran: boolean;
    diferencia: number;
    puede_verificarse: boolean;
    puede_pagarse: boolean;
}

export interface ResumenSeleccion {
    total_detalles: number;
    total_monto: number;
    facturas_afectadas: string[];
    ordenes_involucradas: string[];
    estados_verificacion: {
        pendiente: number;
        verificado: number;
        rechazado: number;
    };
    con_comprobante: number;
    sin_comprobante: number;
}

// ============================================================================
// PAYLOADS PARA API (ACTUALIZADOS)
// ============================================================================

export interface SolicitarCambioPayload {
    detalle_id: number;
    tipo_cambio: 'correccion_monto' | 'correccion_descripcion' | 'correccion_agencia' | 'otros';
    descripcion_cambio: string;
    valor_anterior?: string;
    valor_solicitado?: string;
    justificacion?: string;
}

export interface AsignarComprobantePayload {
    comprobante_contabilidad: string;
    agencia_gasto_id?: number;
    fecha_registro_contabilidad?: string;
}

export interface AsignarComprobanteMasivoPayload {
    detalles_ids: number[];
    comprobante_contabilidad: string;
    agencia_gasto_id?: number;
    fecha_registro_contabilidad?: string;
}

export interface ValidarDetallesMasivoPayload {
    detalles_ids: number[];
}

export interface CargarFacturasParams {
    limite: number;
    offset: number;
    filtro: string;
}

export interface PaginacionResponse {
    total: number;
    limite: number;
    offset: number;
    pagina_actual: number;
    total_paginas: number;
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error';
    mensaje?: string | string[];
    datos?: T;
}

export interface FacturasResponse {
    facturas: FacturaPendiente[];
    paginacion: PaginacionResponse;
}

// ============================================================================
// TIPOS DE CAMBIO Y ESTADOS
// ============================================================================

export const TIPOS_CAMBIO = {
    'correccion_monto': 'Corrección de Monto',
    'correccion_descripcion': 'Corrección de Descripción',
    'correccion_agencia': 'Corrección de Agencia',
    'otros': 'Otros Cambios'
} as const;

export const ESTADOS_CAMBIO = {
    'pendiente': 'Pendiente',
    'aprobado': 'Aprobado',
    'rechazado': 'Rechazado'
} as const;

export const ESTADOS_VERIFICACION = {
    'pendiente': 'Pendiente',
    'verificado': 'Verificado',
    'rechazado': 'Rechazado'
} as const;

export const ESTADOS_LIQUIDACION = {
    'Pendiente': 'Pendiente',
    'Verificado': 'Verificado',
    'Liquidado': 'Liquidado',
    'Pagado': 'Pagado'
} as const;

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(monto);
}

export function formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '-';
    try {
        return new Date(fecha).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch {
        return '-';
    }
}

export function formatearFechaHora(fecha: string | null | undefined): string {
    if (!fecha) return '-';
    try {
        return new Date(fecha).toLocaleString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
}

export function formatearPorcentaje(valor: number, decimales: number = 1): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'percent',
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valor / 100);
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

export function validarComprobante(comprobante: string): { valido: boolean; mensaje?: string } {
    if (!comprobante || comprobante.trim().length === 0) {
        return { valido: false, mensaje: 'El comprobante es obligatorio' };
    }

    if (comprobante.trim().length < 3) {
        return { valido: false, mensaje: 'El comprobante debe tener al menos 3 caracteres' };
    }

    if (comprobante.trim().length > 50) {
        return { valido: false, mensaje: 'El comprobante no puede exceder 50 caracteres' };
    }

    // Validar formato básico (letras, números, guiones)
    const patron = /^[A-Za-z0-9\-_]+$/;
    if (!patron.test(comprobante.trim())) {
        return { valido: false, mensaje: 'El comprobante solo puede contener letras, números y guiones' };
    }

    return { valido: true };
}

export function validarDescripcionCambio(descripcion: string): { valido: boolean; mensaje?: string } {
    if (!descripcion || descripcion.trim().length === 0) {
        return { valido: false, mensaje: 'La descripción del cambio es obligatoria' };
    }

    if (descripcion.trim().length < 10) {
        return { valido: false, mensaje: 'La descripción debe tener al menos 10 caracteres' };
    }

    if (descripcion.trim().length > 500) {
        return { valido: false, mensaje: 'La descripción no puede exceder 500 caracteres' };
    }

    return { valido: true };
}

// ============================================================================
// NUEVAS UTILIDADES PARA VALIDACIÓN DE ESTADOS DE FACTURAS
// ============================================================================

export function validarEstadoFactura(factura: FacturaPendiente): EstadisticasFactura {
    const totalLiquidado = factura.detalles.reduce((sum, d) => sum + d.monto, 0);
    const detallesVerificados = factura.detalles.filter(d => d.estado_verificacion === 'verificado').length;
    const detallesConComprobante = factura.detalles.filter(d => d.comprobante_contabilidad?.trim()).length;

    const diferencia = Math.abs(factura.monto_total - (totalLiquidado + factura.retencion));
    const tolerancia = 0.01; // 1 centavo de tolerancia
    const montosCuadran = diferencia <= tolerancia;

    const todosVerificados = detallesVerificados === factura.detalles.length;
    const todosConComprobante = detallesConComprobante === factura.detalles.length;

    return {
        numero_dte: factura.numero_dte,
        monto_total: factura.monto_total,
        retencion: factura.retencion,
        total_liquidado: totalLiquidado,
        total_detalles: factura.detalles.length,
        detalles_verificados: detallesVerificados,
        detalles_con_comprobante: detallesConComprobante,
        estado_actual: factura.estado_liquidacion,
        montos_cuadran: montosCuadran,
        diferencia: diferencia,
        puede_verificarse: todosVerificados && montosCuadran,
        puede_pagarse: todosVerificados && todosConComprobante && montosCuadran
    };
}

export function obtenerProximoEstado(estadisticas: EstadisticasFactura): string | null {
    if (estadisticas.puede_pagarse) {
        return 'Pagado';
    } else if (estadisticas.puede_verificarse) {
        return 'Verificado';
    }
    return null;
}

export function analizarSeleccion(detalles: DetalleConOrden[], facturas: FacturaPendiente[]): ResumenSeleccion {
    const facturasAfectadas = new Set<string>();
    const ordenesInvolucradas = new Set<string>();
    const estadosVerificacion = { pendiente: 0, verificado: 0, rechazado: 0 };
    let conComprobante = 0;
    let sinComprobante = 0;
    const totalMonto = detalles.reduce((sum, d) => sum + d.monto, 0);

    detalles.forEach(detalle => {
        // Encontrar la factura a la que pertenece
        const factura = facturas.find(f =>
            f.detalles.some(d => d.detalle_id === detalle.detalle_id)
        );

        if (factura) {
            facturasAfectadas.add(factura.numero_dte);
        }

        ordenesInvolucradas.add(detalle.numero_orden);
        estadosVerificacion[detalle.estado_verificacion]++;

        if (detalle.comprobante_contabilidad?.trim()) {
            conComprobante++;
        } else {
            sinComprobante++;
        }
    });

    return {
        total_detalles: detalles.length,
        total_monto: totalMonto,
        facturas_afectadas: Array.from(facturasAfectadas),
        ordenes_involucradas: Array.from(ordenesInvolucradas),
        estados_verificacion: estadosVerificacion,
        con_comprobante: conComprobante,
        sin_comprobante: sinComprobante
    };
}

// ============================================================================
// UTILIDADES DE COLORES Y ESTILOS
// ============================================================================

export const COLORES_ESTADO_LIQUIDACION = {
    'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Verificado': 'bg-blue-100 text-blue-800 border-blue-200',
    'Liquidado': 'bg-green-100 text-green-800 border-green-200',
    'Pagado': 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

export const COLORES_ESTADO_VERIFICACION = {
    'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'verificado': 'bg-green-100 text-green-800 border-green-200',
    'rechazado': 'bg-red-100 text-red-800 border-red-200'
} as const;

export const COLORES_ESTADO_CAMBIO = {
    'pendiente': 'bg-orange-100 text-orange-800 border-orange-200',
    'aprobado': 'bg-green-100 text-green-800 border-green-200',
    'rechazado': 'bg-red-100 text-red-800 border-red-200'
} as const;

export const ICONOS_TIPO_CAMBIO = {
    'correccion_monto': '💰',
    'correccion_descripcion': '📝',
    'correccion_agencia': '🏢',
    'otros': '📋'
} as const;

export const ICONOS_ESTADO_LIQUIDACION = {
    'Pendiente': '⏳',
    'Verificado': '✅',
    'Liquidado': '💵',
    'Pagado': '✨'
} as const;

// ============================================================================
// UTILIDADES DE DATOS
// ============================================================================

export function obtenerTextoTipoCambio(tipo: string): string {
    return TIPOS_CAMBIO[tipo as keyof typeof TIPOS_CAMBIO] || tipo;
}

export function obtenerTextoEstadoCambio(estado: string): string {
    return ESTADOS_CAMBIO[estado as keyof typeof ESTADOS_CAMBIO] || estado;
}

export function obtenerTextoEstadoVerificacion(estado: string): string {
    return ESTADOS_VERIFICACION[estado as keyof typeof ESTADOS_VERIFICACION] || estado;
}

export function obtenerTextoEstadoLiquidacion(estado: string): string {
    return ESTADOS_LIQUIDACION[estado as keyof typeof ESTADOS_LIQUIDACION] || estado;
}

export function obtenerIconoTipoCambio(tipo: string): string {
    return ICONOS_TIPO_CAMBIO[tipo as keyof typeof ICONOS_TIPO_CAMBIO] || '📋';
}

export function obtenerIconoEstadoLiquidacion(estado: string): string {
    return ICONOS_ESTADO_LIQUIDACION[estado as keyof typeof ICONOS_ESTADO_LIQUIDACION] || '❓';
}

export function obtenerColorEstadoLiquidacion(estado: string): string {
    return COLORES_ESTADO_LIQUIDACION[estado as keyof typeof COLORES_ESTADO_LIQUIDACION] ||
        'bg-gray-100 text-gray-800 border-gray-200';
}

export function obtenerColorEstadoVerificacion(estado: string): string {
    return COLORES_ESTADO_VERIFICACION[estado as keyof typeof COLORES_ESTADO_VERIFICACION] ||
        'bg-gray-100 text-gray-800 border-gray-200';
}

export function obtenerColorEstadoCambio(estado: string): string {
    return COLORES_ESTADO_CAMBIO[estado as keyof typeof COLORES_ESTADO_CAMBIO] ||
        'bg-gray-100 text-gray-800 border-gray-200';
}

// ============================================================================
// UTILIDADES DE CÁLCULO
// ============================================================================

export function calcularTotalFactura(factura: FacturaPendiente): {
    totalDetalles: number;
    detallesVerificados: number;
    detallePendientes: number;
    porcentajeCompletado: number;
    diferenciaMonto: number;
    estadisticas: EstadisticasFactura;
} {
    const totalDetalles = factura.detalles.reduce((sum, d) => sum + d.monto, 0);
    const detallesVerificados = factura.detalles.filter(d => d.estado_verificacion === 'verificado').length;
    const detallePendientes = factura.detalles.filter(d => d.estado_verificacion === 'pendiente').length;
    const porcentajeCompletado = factura.detalles.length > 0 ?
        Math.round((detallesVerificados / factura.detalles.length) * 100) : 0;
    const diferenciaMonto = Math.abs(factura.monto_total - (totalDetalles + factura.retencion));
    const estadisticas = validarEstadoFactura(factura);

    return {
        totalDetalles,
        detallesVerificados,
        detallePendientes,
        porcentajeCompletado,
        diferenciaMonto,
        estadisticas
    };
}

export function obtenerResumenSeleccion(detalles: DetalleConOrden[], facturas: FacturaPendiente[]): ResumenSeleccion {
    return analizarSeleccion(detalles, facturas);
}

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

export const CONFIGURACION = {
    LIMITE_PAGINACION_DEFAULT: 20,
    LIMITE_COMPROBANTE_MIN: 3,
    LIMITE_COMPROBANTE_MAX: 50,
    LIMITE_DESCRIPCION_CAMBIO_MIN: 10,
    LIMITE_DESCRIPCION_CAMBIO_MAX: 500,
    LIMITE_JUSTIFICACION_MAX: 1000,
    DEBOUNCE_FILTRO_MS: 500,
    TIMEOUT_LOADING_MS: 30000,
    TOLERANCIA_DIFERENCIA_MONTO: 0.01, // 1 centavo
    LIMITE_SELECCION_MASIVA: 100
} as const;

export const MENSAJES = {
    CONFIRMACION: {
        VALIDAR_DETALLE: '¿Está seguro de validar este detalle?',
        VALIDAR_DETALLES_MASIVO: '¿Confirma que desea validar todos los detalles seleccionados?',
        ASIGNAR_COMPROBANTE_MASIVO: '¿Asignar comprobante a los detalles seleccionados?',
        ELIMINAR_SELECCION: '¿Desea deseleccionar todos los elementos?'
    },
    ERROR: {
        CARGAR_FACTURAS: 'Error al cargar las facturas pendientes',
        CARGAR_AGENCIAS: 'Error al cargar el catálogo de agencias',
        VALIDAR_DETALLE: 'Error al validar el detalle',
        VALIDAR_DETALLES_MASIVO: 'Error al validar los detalles seleccionados',
        SOLICITAR_CAMBIO: 'Error al solicitar el cambio',
        ASIGNAR_COMPROBANTE: 'Error al asignar el comprobante',
        LIMITE_SELECCION: 'Ha superado el límite máximo de selección',
        MONTOS_NO_CUADRAN: 'Los montos de la factura no cuadran con la liquidación'
    },
    EXITO: {
        DETALLE_VALIDADO: 'Detalle validado correctamente',
        DETALLES_VALIDADOS: 'Detalles validados correctamente',
        CAMBIO_SOLICITADO: 'Cambio solicitado correctamente',
        COMPROBANTE_ASIGNADO: 'Comprobante asignado correctamente',
        FACTURA_VERIFICADA: 'Factura actualizada a estado Verificado',
        FACTURA_PAGADA: 'Factura actualizada a estado Pagado'
    },
    INFO: {
        SELECCION_VACIA: 'No hay elementos seleccionados',
        FACTURA_YA_VERIFICADA: 'Esta factura ya está verificada',
        FACTURA_YA_PAGADA: 'Esta factura ya está pagada',
        DIFERENCIA_MONTOS: 'Existe una diferencia en los montos que debe revisarse'
    }
} as const;

// ============================================================================
// TIPOS HELPER
// ============================================================================

export type EstadoLiquidacion = keyof typeof COLORES_ESTADO_LIQUIDACION;
export type EstadoVerificacion = keyof typeof COLORES_ESTADO_VERIFICACION;
export type EstadoCambio = keyof typeof COLORES_ESTADO_CAMBIO;
export type TipoCambio = keyof typeof TIPOS_CAMBIO;

// ============================================================================
// UTILIDADES PARA MANEJO DE ERRORES Y VALIDACIONES
// ============================================================================

export function validarSeleccionMasiva(detallesIds: number[]): { valido: boolean; mensaje?: string } {
    if (!detallesIds || detallesIds.length === 0) {
        return { valido: false, mensaje: MENSAJES.INFO.SELECCION_VACIA };
    }

    if (detallesIds.length > CONFIGURACION.LIMITE_SELECCION_MASIVA) {
        return {
            valido: false,
            mensaje: `Máximo ${CONFIGURACION.LIMITE_SELECCION_MASIVA} detalles por operación`
        };
    }

    // Verificar que no haya IDs duplicados
    const idsUnicos = new Set(detallesIds);
    if (idsUnicos.size !== detallesIds.length) {
        return { valido: false, mensaje: 'Hay elementos duplicados en la selección' };
    }

    return { valido: true };
}

export function obtenerMensajeEstadoFactura(estadisticas: EstadisticasFactura): string {
    if (estadisticas.puede_pagarse) {
        return 'Esta factura puede marcarse como Pagada';
    } else if (estadisticas.puede_verificarse) {
        return 'Esta factura puede marcarse como Verificada';
    } else if (!estadisticas.montos_cuadran) {
        return `Diferencia de ${formatearMonto(estadisticas.diferencia)} entre factura y liquidación`;
    } else if (estadisticas.detalles_verificados < estadisticas.total_detalles) {
        const faltantes = estadisticas.total_detalles - estadisticas.detalles_verificados;
        return `Faltan ${faltantes} detalle(s) por verificar`;
    } else if (estadisticas.detalles_con_comprobante < estadisticas.total_detalles) {
        const faltantes = estadisticas.total_detalles - estadisticas.detalles_con_comprobante;
        return `Faltan ${faltantes} comprobante(s) por asignar`;
    }

    return 'Factura procesada correctamente';
}

export function esFacturaCompleta(factura: FacturaPendiente): boolean {
    const estadisticas = validarEstadoFactura(factura);
    return estadisticas.puede_pagarse;
}

export function puedeValidarseFactura(factura: FacturaPendiente): boolean {
    const estadisticas = validarEstadoFactura(factura);
    return estadisticas.puede_verificarse;
}

// ============================================================================
// UTILIDADES DE FILTRADO Y BÚSQUEDA
// ============================================================================

export function filtrarFacturasPorEstado(facturas: FacturaPendiente[], estado: EstadoLiquidacion): FacturaPendiente[] {
    return facturas.filter(f => f.estado_liquidacion === estado);
}

export function filtrarDetallesPorEstado(detalles: DetalleConOrden[], estado: EstadoVerificacion): DetalleConOrden[] {
    return detalles.filter(d => d.estado_verificacion === estado);
}

export function buscarFacturaPorNumero(facturas: FacturaPendiente[], numeroFactura: string): FacturaPendiente | null {
    return facturas.find(f => f.numero_dte.toLowerCase().includes(numeroFactura.toLowerCase())) || null;
}

export function buscarDetallePorOrden(facturas: FacturaPendiente[], numeroOrden: string): DetalleConOrden[] {
    const detalles: DetalleConOrden[] = [];

    facturas.forEach(factura => {
        factura.detalles.forEach(detalle => {
            if (detalle.numero_orden.toLowerCase().includes(numeroOrden.toLowerCase())) {
                detalles.push(detalle);
            }
        });
    });

    return detalles;
}

// ============================================================================
// UTILIDADES DE EXPORTACIÓN Y REPORTES
// ============================================================================

export function generarResumenFacturas(facturas: FacturaPendiente[]): {
    total_facturas: number;
    total_monto: number;
    total_retencion: number;
    por_estado: Record<string, number>;
    diferencias_detectadas: number;
} {
    const resumen = {
        total_facturas: facturas.length,
        total_monto: 0,
        total_retencion: 0,
        por_estado: {} as Record<string, number>,
        diferencias_detectadas: 0
    };

    facturas.forEach(factura => {
        resumen.total_monto += factura.monto_total;
        resumen.total_retencion += factura.retencion;

        // Contar por estado
        if (resumen.por_estado[factura.estado_liquidacion]) {
            resumen.por_estado[factura.estado_liquidacion]++;
        } else {
            resumen.por_estado[factura.estado_liquidacion] = 1;
        }

        // Detectar diferencias
        const estadisticas = validarEstadoFactura(factura);
        if (!estadisticas.montos_cuadran) {
            resumen.diferencias_detectadas++;
        }
    });

    return resumen;
}

export function generarDatosExportacion(facturas: FacturaPendiente[]): any[] {
    const datos: any[] = [];

    facturas.forEach(factura => {
        const estadisticas = validarEstadoFactura(factura);

        factura.detalles.forEach(detalle => {
            datos.push({
                numero_factura: factura.numero_dte,
                fecha_emision: factura.fecha_emision,
                nombre_emisor: factura.nombre_emisor,
                monto_factura: factura.monto_total,
                retencion: factura.retencion,
                estado_liquidacion: factura.estado_liquidacion,
                numero_orden: detalle.numero_orden,
                descripcion_detalle: detalle.descripcion,
                monto_detalle: detalle.monto,
                estado_verificacion: detalle.estado_verificacion,
                comprobante: detalle.comprobante_contabilidad || '',
                agencia_gasto: detalle.agencia_gasto_nombre || '',
                forma_pago: detalle.forma_pago,
                area: detalle.orden.area_nombre,
                tipo_presupuesto: detalle.orden.tipo_presupuesto,
                cambios_pendientes: detalle.cambios_pendientes_count,
                solicitante: detalle.solicitante || '',
                diferencia_monto: estadisticas.diferencia,
                montos_cuadran: estadisticas.montos_cuadran ? 'Sí' : 'No'
            });
        });
    });

    return datos;
}