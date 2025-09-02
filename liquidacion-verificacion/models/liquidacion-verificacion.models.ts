// ============================================================================
// MODELOS SIMPLIFICADOS - LIQUIDACIÓN Y VERIFICACIÓN
// ============================================================================

/** Estados de verificación */
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/** Información básica de factura */
export interface FacturaLiquidacion {
    numero_dte: string;
    fecha_emision: string;
    nombre_emisor: string;
    monto_total: number;
}

/** Detalle de liquidación */
export interface DetalleLiquidacion {
    id: number;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    forma_pago: string;

    // Campos de verificación
    comprobante_contabilidad?: string;
    fecha_registro_contabilidad?: string;
    numero_acta?: string;
    estado_verificacion: EstadoVerificacion;
    verificado_por?: string;
}

/** Tipo de retención */
export interface TipoRetencion {
    id: number;
    codigo: string;
    nombre: string;
    porcentaje_default?: number;
}

/** Retención de factura */
export interface Retencion {
    id: number;
    tipo_retencion_id: number;
    numero_retencion: string;
    monto: number;
    porcentaje?: number;
    fecha_retencion: string;

    // Información del tipo
    tipo_codigo?: string;
    tipo_nombre?: string;
}

/** Liquidación completa */
export interface LiquidacionCompleta {
    factura: FacturaLiquidacion;
    detalles: DetalleLiquidacion[];
    retenciones: Retencion[];

    // Totales calculados
    total_detalles: number;
    total_retenciones: number;
    monto_neto: number;

    // Estadísticas básicas
    total_verificados: number;
    total_pendientes: number;
    porcentaje_completado: number;
}

// ============================================================================
// PAYLOADS PARA API
// ============================================================================

export interface VerificarDetallePayload {
    id: number;
    comprobante_contabilidad: string;
    fecha_registro_contabilidad?: string;
    numero_acta?: string;
    estado_verificacion: EstadoVerificacion;
}

export interface CrearRetencionPayload {
    numero_factura: string;
    tipo_retencion_id: number;
    numero_retencion: string;
    monto: number;
    porcentaje?: number;
    fecha_retencion: string;
}

export interface ActualizarRetencionPayload {
    id: number;
    tipo_retencion_id?: number;
    numero_retencion?: string;
    monto?: number;
    porcentaje?: number;
    fecha_retencion?: string;
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error';
    mensaje?: string | string[];
    datos?: T;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const ESTADOS_VERIFICACION = {
    pendiente: 'Pendiente',
    verificado: 'Verificado',
    rechazado: 'Rechazado'
};

export const COLORES_ESTADO = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    verificado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800'
};

// ============================================================================
// UTILIDADES
// ============================================================================

export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ'
    }).format(monto);
}

export function formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '-';
    try {
        return new Date(fecha).toLocaleDateString('es-GT');
    } catch {
        return '-';
    }
}

export function obtenerTextoEstado(estado: EstadoVerificacion): string {
    return ESTADOS_VERIFICACION[estado] || estado;
}

export function obtenerColorEstado(estado: EstadoVerificacion): string {
    return COLORES_ESTADO[estado] || COLORES_ESTADO.pendiente;
}