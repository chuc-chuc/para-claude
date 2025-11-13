// ============================================================================
// MODELOS PARA LIQUIDACIONES DE TESORERÍA
// ============================================================================

/**
 * Respuesta estándar del API
 */
export interface ApiResponse<T = any> {
    respuesta: 'success' | 'consulta_ok' | 'operacion_exitosa' | 'operacion_fallida' | 'campo_requerido';
    mensajes: string[];
    datos?: T;
}

/**
 * Respuesta de listado de transferencias de tesorería
 */
export interface RespuestaTransferenciasTesoreria {
    facturas_transferencias: FacturaTransferenciaTesoreria[];
    resumen: {
        total_facturas: number;
        total_detalles_transferencia: number;
        monto_total_transferencias: number;
        monto_total_retenciones: number;
        monto_total_pendiente: number;
    };
}

/**
 * Factura con detalles de transferencia agrupados
 */
export interface FacturaTransferenciaTesoreria {
    // Datos de la factura
    numero_factura: string;
    nombre_emisor: string;
    tipo_dte: string;
    fecha_emision: string;
    monto_total_factura: number;
    estado_liquidacion: string;

    // Datos agrupados de transferencias
    transferencias: DatosTransferencia[];

    // Retenciones de la factura
    retenciones: RetencionFactura[];

    // Totales calculados
    monto_total_transferencias: number;
    monto_total_retenciones: number;
    monto_pendiente_pago: number; // transferencias - retenciones

    // Primer detalle de liquidación (para solicitud de cambios)
    primer_detalle_id: number;
}

/**
 * Datos de transferencia (pueden ser múltiples por factura)
 */
export interface DatosTransferencia {
    detalle_liquidacion_id: number;
    numero_orden: number;
    nombre_cuenta: string;
    numero_cuenta: string;
    nombre_banco: string;
    tipo_cuenta: string;
    correo_proveedor?: string;
    observaciones?: string;
    monto: number;
}

/**
 * Información de retención de factura
 */
export interface RetencionFactura {
    id: number;
    numero_factura: string;
    monto: number;
    numero_retencion?: string;
    fecha_retencion: string;
    porcentaje?: number;
    nombre: string;
    descripcion?: string;
}

/**
 * Payload para solicitar cambio desde tesorería
 */
export interface SolicitarCambioTesoreriaPayload {
    detalle_liquidacion_id: number;
    numero_factura: string;
    descripcion_cambio: string;
}

/**
 * Utilidades para formateo
 */
export class FormatHelper {
    static formatMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ'
        }).format(monto);
    }

    static formatFecha(fecha: string): string {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-GT');
    }

    static truncateText(text: string, length: number = 50): string {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}

/**
 * Constantes para mensajes del sistema
 */
export const MENSAJES_TESORERIA = {
    EXITO: {
        CAMBIO_SOLICITADO: 'Corrección solicitada correctamente'
    },
    ERROR: {
        CARGAR_TRANSFERENCIAS: 'Error al cargar transferencias',
        SOLICITAR_CAMBIO: 'Error al solicitar corrección'
    },
    CONFIRMACION: {
        SOLICITAR_CAMBIO: '¿Confirma que desea solicitar esta corrección?'
    }
} as const;