// ============================================================================
// MODELOS - LIQUIDACIÓN Y VERIFICACIÓN CON RETENCIONES
// ============================================================================

/** Estados de verificación de detalle */
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado';

/** Estados generales de liquidación */
export type EstadoLiquidacionGeneral = 'pendiente' | 'parcial' | 'completo';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/** Información básica de factura para liquidación */
export interface FacturaLiquidacion {
    id: number;
    numero_dte: string;
    fecha_emision: string;
    nombre_emisor: string;
    monto_total: number;
    estado: string;
    estado_id: number;
}

/** Detalle de liquidación con campos de verificación */
export interface DetalleLiquidacionVerificacion {
    id: number;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor: string;
    forma_pago: string;
    banco: string;
    cuenta: string;

    // Campos de verificación contable
    comprobante_contabilidad?: string | null;
    fecha_registro_contabilidad?: string | null;
    numero_acta?: string | null;
    estado_verificacion: EstadoVerificacion;
    fecha_verificacion?: string | null;
    verificado_por?: string | null;

    // Metadatos
    fecha_creacion: string;
    fecha_actualizacion: string;

    // Para edición inline
    _editando?: boolean;
    _datosTemp?: Partial<DetalleLiquidacionVerificacion>;
}

/** Tipo de retención */
export interface TipoRetencion {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    porcentaje_default?: number | null;
    requiere_autorizacion: boolean;
    activo: boolean;
}

/** Retención aplicada a factura */
export interface RetencionFactura {
    id: number;
    numero_factura: string;
    tipo_retencion_id: number;
    numero_retencion: string;
    monto: number;
    porcentaje?: number | null;
    base_calculo?: number | null;
    detalles?: string | null;
    fecha_retencion: string;
    documento_soporte?: string | null;
    creado_por?: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;

    // Información del tipo (JOIN)
    tipo_codigo?: string;
    tipo_nombre?: string;
    tipo_descripcion?: string;
}

/** Estadísticas de verificación */
export interface EstadisticasVerificacion {
    total: number;
    verificados: number;
    pendientes: number;
    rechazados: number;
    porcentaje_verificados: number;
    porcentaje_pendientes: number;
}

/** Totales de liquidación */
export interface TotalesLiquidacion {
    total_detalles: number;
    total_retenciones: number;
    monto_neto: number;
    cantidad_detalles: number;
    cantidad_retenciones: number;
}

/** Respuesta completa de liquidación */
export interface LiquidacionCompleta {
    factura: FacturaLiquidacion;
    detalles: DetalleLiquidacionVerificacion[];
    retenciones: RetencionFactura[];
    totales: TotalesLiquidacion;
    estadisticas_verificacion: EstadisticasVerificacion;
}

// ============================================================================
// PAYLOADS PARA APIS
// ============================================================================

/** Payload para verificar detalle */
export interface VerificarDetallePayload {
    id: number;
    comprobante_contabilidad: string;
    fecha_registro_contabilidad?: string;
    numero_acta?: string;
    estado_verificacion?: EstadoVerificacion;
}

/** Payload para crear retención */
export interface CrearRetencionPayload {
    numero_factura: string;
    tipo_retencion_id: number;
    numero_retencion: string;
    monto: number;
    porcentaje?: number;
    base_calculo?: number;
    detalles?: string;
    fecha_retencion: string;
    documento_soporte?: string;
}

/** Payload para actualizar retención */
export interface ActualizarRetencionPayload {
    id: number;
    tipo_retencion_id?: number;
    numero_retencion?: string;
    monto?: number;
    porcentaje?: number;
    base_calculo?: number;
    detalles?: string;
    fecha_retencion?: string;
    documento_soporte?: string;
}

/** Payload para buscar liquidación */
export interface BuscarLiquidacionPayload {
    numero_factura: string;
}

/** Payload para resumen de liquidaciones */
export interface ResumenLiquidacionesPayload {
    fecha_inicio?: string;
    fecha_fin?: string;
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error' | 'info';
    mensaje?: string | string[];
    datos?: T;
}

export interface LiquidacionCompletaResponse extends ApiResponse<LiquidacionCompleta> { }

export interface TiposRetencionResponse extends ApiResponse<TipoRetencion[]> { }

export interface CrearRetencionResponse extends ApiResponse<{ retencion_id: number }> { }

// ============================================================================
// RESUMEN Y LISTADOS
// ============================================================================

/** Item de resumen de liquidaciones */
export interface ResumenLiquidacionItem {
    numero_factura: string;
    nombre_emisor: string;
    monto_factura: number;
    total_detalles: number;
    total_liquidado: number;
    total_retenciones: number;
    monto_neto: number;
    detalles_verificados: number;
    detalles_pendientes: number;
    estado_verificacion_general: EstadoLiquidacionGeneral;
    primera_liquidacion: string;
    ultima_actualizacion: string;
}

/** Totales del resumen */
export interface TotalesResumen {
    total_facturas: number;
    total_liquidado: number;
    total_retenciones: number;
    total_neto: number;
    facturas_completas: number;
    facturas_pendientes: number;
}

/** Respuesta completa del resumen */
export interface ResumenLiquidaciones {
    liquidaciones: ResumenLiquidacionItem[];
    totales: TotalesResumen;
    filtros: {
        fecha_inicio: string;
        fecha_fin: string;
    };
}

export interface ResumenLiquidacionesResponse extends ApiResponse<ResumenLiquidaciones> { }

// ============================================================================
// UTILIDADES Y VALIDACIONES
// ============================================================================

/** Resultado de validación */
export interface ValidacionResultado {
    valido: boolean;
    mensaje?: string;
}

/** Configuración de tabla */
export interface ConfiguracionTabla {
    mostrarAcciones: boolean;
    mostrarEstados: boolean;
    permitirEdicion: boolean;
    permitirEliminacion: boolean;
}

/** Filtros para búsqueda */
export interface FiltrosLiquidacion {
    numero_factura?: string;
    estado_verificacion?: EstadoVerificacion;
    fecha_inicio?: string;
    fecha_fin?: string;
    verificado_por?: string;
}

/** Opciones de ordenamiento */
export interface OrdenamientoLiquidacion {
    campo: 'fecha_creacion' | 'fecha_verificacion' | 'monto' | 'estado_verificacion';
    direccion: 'asc' | 'desc';
}

// ============================================================================
// CONSTANTES Y ENUMS
// ============================================================================

export const ESTADOS_VERIFICACION: Record<EstadoVerificacion, string> = {
    pendiente: 'Pendiente',
    verificado: 'Verificado',
    rechazado: 'Rechazado'
};

export const ESTADOS_LIQUIDACION_GENERAL: Record<EstadoLiquidacionGeneral, string> = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    completo: 'Completo'
};

export const COLORES_ESTADO_VERIFICACION: Record<EstadoVerificacion, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    verificado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rechazado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

export const COLORES_ESTADO_GENERAL: Record<EstadoLiquidacionGeneral, string> = {
    pendiente: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    parcial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    completo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

// ============================================================================
// ENDPOINTS
// ============================================================================

export const LIQUIDACION_VERIFICACION_ENDPOINTS = {
    OBTENER_LIQUIDACION_COMPLETA: 'contabilidad/obtenerLiquidacionCompleta',
    VERIFICAR_DETALLE: 'contabilidad/verificarDetalleLiquidacion',
    CREAR_RETENCION: 'contabilidad/crearRetencion',
    ACTUALIZAR_RETENCION: 'contabilidad/actualizarRetencion',
    ELIMINAR_RETENCION: 'contabilidad/eliminarRetencion',
    OBTENER_TIPOS_RETENCION: 'contabilidad/obtenerTiposRetencion',
    OBTENER_RESUMEN_LIQUIDACIONES: 'contabilidad/obtenerResumenLiquidaciones'
} as const;

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/** Formatea un monto como moneda */
export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2
    }).format(monto);
}

/** Formatea una fecha */
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

/** Formatea fecha y hora */
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

/** Obtiene el texto de un estado de verificación */
export function obtenerTextoEstadoVerificacion(estado: EstadoVerificacion): string {
    return ESTADOS_VERIFICACION[estado] || estado;
}

/** Obtiene el color CSS de un estado de verificación */
export function obtenerColorEstadoVerificacion(estado: EstadoVerificacion): string {
    return COLORES_ESTADO_VERIFICACION[estado] || COLORES_ESTADO_VERIFICACION.pendiente;
}

/** Obtiene el texto de un estado general */
export function obtenerTextoEstadoGeneral(estado: EstadoLiquidacionGeneral): string {
    return ESTADOS_LIQUIDACION_GENERAL[estado] || estado;
}

/** Obtiene el color CSS de un estado general */
export function obtenerColorEstadoGeneral(estado: EstadoLiquidacionGeneral): string {
    return COLORES_ESTADO_GENERAL[estado] || COLORES_ESTADO_GENERAL.pendiente;
}

/** Valida un número de comprobante */
export function validarNumeroComprobante(comprobante: string): ValidacionResultado {
    if (!comprobante?.trim()) {
        return { valido: false, mensaje: 'El número de comprobante es obligatorio' };
    }

    if (comprobante.length < 3) {
        return { valido: false, mensaje: 'El número de comprobante debe tener al menos 3 caracteres' };
    }

    return { valido: true };
}

/** Valida un monto */
export function validarMonto(monto: number): ValidacionResultado {
    if (!monto || isNaN(monto) || monto <= 0) {
        return { valido: false, mensaje: 'El monto debe ser mayor a cero' };
    }

    return { valido: true };
}

/** Valida una fecha */
export function validarFecha(fecha: string): ValidacionResultado {
    if (!fecha?.trim()) {
        return { valido: false, mensaje: 'La fecha es obligatoria' };
    }

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) {
        return { valido: false, mensaje: 'La fecha no tiene un formato válido' };
    }

    return { valido: true };
}

// ============================================================================
// TRACKBY FUNCTIONS PARA ANGULAR
// ============================================================================

export function trackByDetalleId(index: number, detalle: DetalleLiquidacionVerificacion): number {
    return detalle.id;
}

export function trackByRetencionId(index: number, retencion: RetencionFactura): number {
    return retencion.id;
}

export function trackByTipoRetencionId(index: number, tipo: TipoRetencion): number {
    return tipo.id;
}