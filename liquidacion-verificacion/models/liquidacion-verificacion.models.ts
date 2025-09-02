// ============================================================================
// MODELOS TYPESCRIPT - SISTEMA DE LIQUIDACIÓN
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
    estado_liquidacion: 'Pendiente' | 'Verificado' | 'Liquidado' | 'Pagado';
    detalles: DetalleConOrden[];
}

export interface DetalleConOrden {
    detalle_id: number;
    numero_orden: string;
    descripcion: string;
    monto: number;
    estado_verificacion: 'pendiente' | 'verificado' | 'rechazado';
    comprobante_contabilidad?: string;
    agencia_gasto_id?: number;
    agencia_gasto_nombre?: string;
    tiene_cambios_pendientes: boolean;
    cambios_pendientes_count: number;

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
// PAYLOADS PARA API
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
    numero_acta?: string;
}

export interface AsignarComprobanteMasivoPayload {
    detalles_ids: number[];
    comprobante_contabilidad: string;
    agencia_gasto_id?: number;
    fecha_registro_contabilidad?: string;
    numero_acta?: string;
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
// TIPOS DE CAMBIO
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

export function obtenerIconoTipoCambio(tipo: string): string {
    return ICONOS_TIPO_CAMBIO[tipo as keyof typeof ICONOS_TIPO_CAMBIO] || '📋';
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
} {
    const totalDetalles = factura.detalles.reduce((sum, d) => sum + d.monto, 0);
    const detallesVerificados = factura.detalles.filter(d => d.estado_verificacion === 'verificado').length;
    const detallePendientes = factura.detalles.filter(d => d.estado_verificacion === 'pendiente').length;
    const porcentajeCompletado = factura.detalles.length > 0 ?
        Math.round((detallesVerificados / factura.detalles.length) * 100) : 0;

    return {
        totalDetalles,
        detallesVerificados,
        detallePendientes,
        porcentajeCompletado
    };
}

export function obtenerResumenSeleccion(detalles: DetalleConOrden[]): {
    totalMonto: number;
    totalDetalles: number;
    facturas: Set<string>;
    ordenes: Set<string>;
} {
    const totalMonto = detalles.reduce((sum, d) => sum + d.monto, 0);
    const totalDetalles = detalles.length;
    const facturas = new Set<string>();
    const ordenes = new Set(detalles.map(d => d.numero_orden));

    // Extraer números de factura de los detalles
    // Asumiendo que se puede obtener del contexto o agregar al modelo

    return {
        totalMonto,
        totalDetalles,
        facturas,
        ordenes
    };
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
    TIMEOUT_LOADING_MS: 30000
} as const;

export const MENSAJES = {
    CONFIRMACION: {
        VALIDAR_DETALLE: '¿Está seguro de validar este detalle?',
        ASIGNAR_COMPROBANTE_MASIVO: '¿Asignar comprobante a los detalles seleccionados?',
        ELIMINAR_SELECCION: '¿Desea deseleccionar todos los elementos?'
    },
    ERROR: {
        CARGAR_FACTURAS: 'Error al cargar las facturas pendientes',
        CARGAR_AGENCIAS: 'Error al cargar el catálogo de agencias',
        VALIDAR_DETALLE: 'Error al validar el detalle',
        SOLICITAR_CAMBIO: 'Error al solicitar el cambio',
        ASIGNAR_COMPROBANTE: 'Error al asignar el comprobante'
    },
    EXITO: {
        DETALLE_VALIDADO: 'Detalle validado correctamente',
        CAMBIO_SOLICITADO: 'Cambio solicitado correctamente',
        COMPROBANTE_ASIGNADO: 'Comprobante asignado correctamente'
    }
} as const;

// ============================================================================
// TIPOS HELPER
// ============================================================================

export type EstadoLiquidacion = keyof typeof COLORES_ESTADO_LIQUIDACION;
export type EstadoVerificacion = keyof typeof COLORES_ESTADO_VERIFICACION;
export type EstadoCambio = keyof typeof COLORES_ESTADO_CAMBIO;
export type TipoCambio = keyof typeof TIPOS_CAMBIO;