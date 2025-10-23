// ============================================================================
// MODELOS E INTERFACES PARA LIQUIDACIONES POR PRESUPUESTO
// ============================================================================

/**
 * Respuesta estándar del API
 */
export interface ApiResponse<T = any> {
    respuesta: 'success'|'consulta_ok' | 'operacion_exitosa' | 'operacion_fallida' | 'campo_requerido';
    mensajes: string[];
    datos?: T;
}

/**
 * Respuesta de listado de liquidaciones
 */
export interface RespuestaLiquidaciones {
    liquidaciones: LiquidacionPorFactura[];
    resumen: {
        total_facturas: number;
        total_detalles: number;
        area_consultada: number;
    };
}

/**
 * Estructura principal de liquidación organizada por factura
 */
export interface LiquidacionPorFactura {
    factura: FacturaResumen;
    detalles: DetalleLiquidacion[];
    retenciones: RetencionFactura[];
}

/**
 * Resumen de información de factura
 */
export interface FacturaResumen {
    id: number;
    numero_dte: string;
    nombre_emisor: string;
    tipo_dte: string;
    fecha_emision: string;
    monto_total: number;
    estado_liquidacion: EstadoLiquidacion;
    estado: string;
    monto_total_liquidado: number;
    monto_total_retencion: number;
    total_a_depositar: number;
}

/**
 * Detalle individual de liquidación
 */
export interface DetalleLiquidacion {
    id: number;
    numero_factura: string;
    numero_orden: number;
    nombre_gasto: string;
    agencia_gasto: string;
    agencia_gasto_id?: number;
    descripcion: string;
    monto: number;
    forma_pago: FormaPago;
    fecha_creacion: string;
    fecha_actualizacion: string;
    usuario: string;
    estado_verificacion: EstadoVerificacion;
    comprobante_contabilidad?: string;
    fecha_registro_contabilidad?: string ;

    // Datos de depósito
    id_socio?: string;
    nombre_socio?: string;
    numero_cuenta_deposito?: string;
    observaciones_deposito?: string;

    // Datos de transferencia
    nombre_cuenta?: string;
    numero_cuenta?: string;
    nombre_banco?: string;
    tipo?: string;
    observaciones_transferencia?: string;

    // Datos de cheque
    nombre_beneficiario?: string;
    consignacion?: string;
    no_negociable?: string;
    observaciones_cheque?: string;

    // Información de presupuesto
    nombre_presupuesto?: string;
    cuenta_contable?: string;
    area_presupuesto?: string;
    total_anticipos: number;
    total_anticipo_reintegrado: number;
    cantidad_cambios: number;
    id_area?: number;
    area?: string;

    // Datos de tesorería
    comprobante_tesoreria?: string;
    fecha_transferencia?: string;
    nombre?: string; // nombre del banco
    tiene_cambios_pendientes: boolean;

    // Estado local para UI
    seleccionado?: boolean;
    procesando?: boolean;
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
    base_calculo?: number;
    detalles?: string;
    documento_soporte?: string;
    codigo?: string;
    nombre: string;
    descripcion?: string;
    cuenta_contable?: string;
    creado_por_nombre?: string;
}

/**
 * Estructura para cambio solicitado
 */
export interface CambioSolicitado {
    id?: number;
    detalle_liquidacion_id: number;
    numero_factura: string;
    tipo_cambio: TipoCambio;
    descripcion_cambio: string;
    valor_anterior: string;
    valor_solicitado: string;
    justificacion: string;
    estado: EstadoCambio;
    solicitado_por?: string;
    fecha_solicitud?: string;
    aprobado_por?: string;
    fecha_aprobacion?: string;
    observaciones_aprobacion?: string;

    // Datos del detalle para contexto
    descripcion_detalle?: string;
    monto_detalle?: number;
    agencia_detalle?: string;
}

/**
 * Payload para crear cambio solicitado (adaptado a tu modal)
 */
export interface CrearCambioSolicitadoPayload {
    detalle_liquidacion_id: number;
    numero_factura: string;
    tipo_cambio: 'otros'; // Por defecto, ya que tu modal es simple
    descripcion_cambio: string;
    valor_anterior: string;
    valor_solicitado: string;
    justificacion: string;
}

/**
 * Payload para verificación unitaria
 */
export interface VerificarDetallePayload {
    id: number;
}

/**
 * Payload para verificación masiva
 */
export interface VerificarDetalleMasivoPayload {
    detalles_ids: number[];
}

/**
 * Payload para asignar comprobante unitario (adaptado a tu modal)
 */
export interface AsignarComprobantePayload {
    id: number;
    comprobante_contabilidad: string;
    fecha_registro_contabilidad?: string;
    agencia_gasto_id?: number;
}

/**
 * Payload para asignar comprobante masivo (adaptado a tu modal)
 */
export interface AsignarComprobanteMasivoPayload {
    detalles_ids: number[];
    comprobante_contabilidad: string;
    fecha_registro_contabilidad?: string;
    agencia_gasto_id?: number;
}

/**
 * Payload para actualizar cambio solicitado
 */
export interface ActualizarCambioPayload {
    id: number;
    estado: EstadoCambio;
    observaciones_aprobacion?: string;
}

/**
 * Estados de liquidación de factura
 */
export type EstadoLiquidacion =
    | 'Pendiente'
    | 'Correcion'
    | 'Verificado'
    | 'Liquidado'
    | 'Pagado';

/**
 * Estados de verificación de detalle
 */
export type EstadoVerificacion =
    | 'pendiente'
    | 'verificado';

/**
 * Formas de pago
 */
export type FormaPago =
    | 'anticipo'
    | 'costoasumido'
    | 'deposito'
    | 'transferencia'
    | 'cheque'
    | 'tarjeta'
    | 'contrasena';

/**
 * Tipos de cambio solicitado
 */
export type TipoCambio =
    | 'monto'
    | 'forma_pago'
    | 'beneficiario'
    | 'cuenta'
    | 'descripcion'
    | 'otro';

/**
 * Estados de cambio solicitado
 */
export type EstadoCambio =
    | 'pendiente'
    | 'realizado';

/**
 * Filtros para búsqueda
 */
export interface FiltrosLiquidacion {
    factura?: string;
    orden?: string;
    usuario?: string;
    metodoPago?: FormaPago;
    estadoVerificacion?: EstadoVerificacion;
    estadoLiquidacion?: EstadoLiquidacion;
}

/**
 * Agencias para el select (compatibilidad con tus modales)
 */
export interface Agencia {
    id: number;
    nombre: string;
}

/**
 * Constantes para mensajes del sistema
 */
export const MENSAJES_LIQUIDACIONES = {
    EXITO: {
        DETALLE_VERIFICADO: 'Detalle verificado correctamente',
        DETALLES_VERIFICADOS: 'Detalles verificados correctamente',
        COMPROBANTE_ASIGNADO: 'Comprobante asignado correctamente',
        COMPROBANTES_ASIGNADOS: 'Comprobantes asignados correctamente',
        CAMBIO_CREADO: 'Cambio solicitado creado correctamente',
        CAMBIO_ACTUALIZADO: 'Estado del cambio actualizado correctamente'
    },
    ERROR: {
        CARGAR_LIQUIDACIONES: 'Error al cargar las liquidaciones',
        VERIFICAR_DETALLE: 'Error al verificar el detalle',
        ASIGNAR_COMPROBANTE: 'Error al asignar comprobante',
        CREAR_CAMBIO: 'Error al crear cambio solicitado',
        DATOS_INCOMPLETOS: 'Faltan datos requeridos',
        OPERACION_NO_PERMITIDA: 'Operación no permitida en el estado actual'
    },
    CONFIRMACION: {
        VERIFICAR_DETALLE: '¿Confirma que desea verificar este detalle?',
        VERIFICAR_MULTIPLE: '¿Confirma que desea verificar los detalles seleccionados?',
        ASIGNAR_COMPROBANTE: '¿Confirma que desea asignar el comprobante?',
        CREAR_CAMBIO: '¿Confirma que desea solicitar este cambio?'
    }
} as const;

/**
 * Utilidades para trabajar con los estados
 */
export class EstadosHelper {

    /**
     * Verifica si un detalle puede ser verificado
     */
    static puedeVerificar(detalle: DetalleLiquidacion): boolean {
        return detalle.estado_verificacion === 'pendiente' &&
            !detalle.tiene_cambios_pendientes;
    }

    /**
     * Verifica si un detalle puede recibir comprobante
     */
    static puedeAsignarComprobante(detalle: DetalleLiquidacion): boolean {
        return detalle.estado_verificacion === 'verificado' &&
            !detalle.comprobante_contabilidad;
    }

    /**
     * Verifica si se puede solicitar cambio en un detalle
     */
    static puedeSolicitarCambio(detalle: DetalleLiquidacion): boolean {
        return !detalle.comprobante_contabilidad; // No debe estar pagado
    }

    /**
     * Obtiene el color de badge según el estado de verificación
     */
    static getColorEstadoVerificacion(estado: EstadoVerificacion): string {
        switch (estado) {
            case 'pendiente': return 'bg-yellow-100 text-yellow-700';
            case 'verificado': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    /**
     * Obtiene el color de badge según el estado de liquidación
     */
    static getColorEstadoLiquidacion(estado: EstadoLiquidacion): string {
        switch (estado) {
            case 'Pendiente': return 'bg-yellow-100 text-yellow-700';
            case 'Correcion': return 'bg-red-100 text-red-700';
            case 'Verificado': return 'bg-blue-100 text-blue-700';
            case 'Liquidado': return 'bg-indigo-100 text-indigo-700';
            case 'Pagado': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    /**
     * Obtiene el color de badge según la forma de pago
     */
    static getColorFormaPago(forma: FormaPago): string {
        switch (forma) {
            case 'deposito': return 'bg-blue-100 text-blue-700';
            case 'transferencia': return 'bg-green-100 text-green-700';
            case 'cheque': return 'bg-purple-100 text-purple-700';
            case 'tarjeta': return 'bg-orange-100 text-orange-700';
            case 'costoasumido': return 'bg-red-100 text-red-700'
            case 'anticipo': return 'bg-indigo-100 text-indigo-700';
            case 'contrasena': return 'bg-violet-100 text-violet-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    /**
     * Obtiene el color de badge según el estado de cambio
     */
    static getColorEstadoCambio(estado: EstadoCambio): string {
        switch (estado) {
            case 'pendiente': return 'bg-yellow-100 text-yellow-700';
            case 'realizado': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    /**
     * Obtiene el texto readable para tipo de cambio
     */
    static getTextoTipoCambio(tipo: TipoCambio): string {
        switch (tipo) {
            case 'monto': return 'Monto';
            case 'forma_pago': return 'Forma de Pago';
            case 'beneficiario': return 'Beneficiario';
            case 'cuenta': return 'Cuenta';
            case 'descripcion': return 'Descripción';
            case 'otro': return 'Otro';
            default: return 'Desconocido';
        }
    }

    /**
     * Obtiene el texto readable para estado de cambio
     */
    static getTextoEstadoCambio(estado: EstadoCambio): string {
        switch (estado) {
            case 'pendiente': return 'Pendiente';
            case 'realizado': return 'Realizado';
            default: return 'Desconocido';
        }
    }
}

/**
 * Utilidades para formateo
 */
export class FormatHelper {

    /**
     * Formatea un monto a moneda local
     */
    static formatMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ'
        }).format(monto);
    }

    /**
     * Formatea una fecha a formato local
     */
    static formatFecha(fecha: string): string {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-GT');
    }

    /**
     * Formatea fecha y hora
     */
    static formatFechaHora(fecha: string): string {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleString('es-GT');
    }

    /**
     * Trunca texto a longitud especificada
     */
    static truncateText(text: string, length: number = 50): string {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}

/**
 * Funciones auxiliares compatibles con tus modales existentes
 */
export const formatearMonto = FormatHelper.formatMonto;
export const formatearFecha = FormatHelper.formatFecha;
export const formatearFechaHora = FormatHelper.formatFechaHora;
export const obtenerTextoTipoCambio = EstadosHelper.getTextoTipoCambio;
export const obtenerTextoEstadoCambio = EstadosHelper.getTextoEstadoCambio;
export const obtenerColorEstadoCambio = EstadosHelper.getColorEstadoCambio;

/**
 * Alias para compatibilidad con tus modales
 */
export type DetalleConOrden = DetalleLiquidacion;