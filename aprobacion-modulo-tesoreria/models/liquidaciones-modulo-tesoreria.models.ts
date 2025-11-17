// ============================================================================
// MODELOS PARA LIQUIDACIONES-MODULO-TESORERÍA
// ============================================================================

/**
 * ============================================================================
 * TIPOS Y ENUMS
 * ============================================================================
 */



/**
 * Tipo de liquidación
 */
export type TipoLiquidacion = 'plan' | 'presupuesto';

/**
 * Tipo de orden (valor numérico en BD)
 */
export type TipoOrden = 1 | 2; // 1 = Plan, 2 = Presupuesto

/**
 * Estados de solicitud de transferencia
 */
export type EstadoSolicitud = 
    | 'pendiente_aprobacion'
    | 'aprobado'
    | 'rechazado'
    | 'completado'
    | 'cancelado';

/**
 * Áreas que pueden aprobar solicitudes
 */
export type AreaAprobacion = 'gerencia_financiera' | 'jefe_contabilidad';

/**
 * ============================================================================
 * INTERFACES PRINCIPALES
 * ============================================================================
 */

/**
 * Respuesta estándar del API
 */
export interface ApiResponse<T = any> {
    respuesta: 'success' | 'fail';
    mensajes: string[];
    datos?: T;
}

/**
 * Detalle de transferencia
 */
export interface DetalleTransferencia {
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
 * Retención de factura
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
 * Solicitud de transferencia
 */
export interface SolicitudTransferencia {
    id: number;
    codigo_solicitud: string;
    banco_origen_id: number;
    banco_nombre?: string;
    banco_cuenta?: string;
    area_aprobacion: AreaAprobacion;
    monto_total_solicitud: number;
    estado: EstadoSolicitud;
    numero_registro_transferencia?: string;
    fecha_transferencia?: string;
    referencia_bancaria?: string;
    observaciones_transferencia?: string;
    creado_por: number;
    fecha_creacion: string;
    actualizado_por?: number;
    fecha_actualizacion?: string;
    
    creado_por_nombre?: string;
    creado_por_puesto?: string;
}

/**
 * Factura con toda su información y solicitud asociada (si existe)
 * Esta es la entidad principal que maneja el frontend
 */
export interface FacturaConSolicitud {
    // ===== DATOS DE LA FACTURA =====
    numero_factura: string;
    nombre_emisor: string;
    tipo_dte: string;
    fecha_emision: string;
    monto_total_factura: number;
    estado_liquidacion: string;
    tipo_liquidacion: TipoLiquidacion;
    tipo_orden: TipoOrden;
    
    // ===== TRANSFERENCIAS =====
    transferencias: DetalleTransferencia[];
    
    // ===== RETENCIONES =====
    retenciones: RetencionFactura[];
    
    // ===== CÁLCULOS =====
    monto_total_transferencias: number;
    monto_total_retenciones: number;
    monto_pendiente_pago: number;
    primer_detalle_id: number;
    
    // ===== SOLICITUD (si existe) =====
    solicitud: SolicitudTransferencia | null;
}

/**
 * Resumen estadístico
 */
export interface ResumenEstadisticas {
    // Por estado de solicitud
    sin_solicitud: { cantidad: number; monto: number };
    pendiente_aprobacion: { cantidad: number; monto: number };
    aprobado: { cantidad: number; monto: number };
    completado: { cantidad: number; monto: number };
    rechazado: { cantidad: number; monto: number };
    cancelado: { cantidad: number; monto: number };
    
    // Por tipo de liquidación
    plan: { cantidad: number; monto: number };
    presupuesto: { cantidad: number; monto: number };
    
    // Totales
    total_facturas: number;
    monto_total: number;
}

/**
 * Respuesta del endpoint principal
 */
export interface RespuestaFacturasConSolicitudes {
    facturas: FacturaConSolicitud[];
    resumen: ResumenEstadisticas;
}

/**
 * Banco de uso para pagos
 */
export interface BancoUsoPago {
    id: number;
    nombre: string;
    cuenta: string;
    activo: number;
}

/**
 * Archivo adjunto
 */
export interface ArchivoTransferencia {
    id: number;
    solicitud_transferencia_id: number;
    drive_id: string;
    nombre_original: string;
    nombre_en_drive: string;
    tipo_mime: string;
    tamano_bytes: number;
    subido_por: number;
    fecha_subida: string;
    viewer_url?: string;
}

/**
 * Aprobación/Rechazo de solicitud
 */
export interface AprobacionTransferencia {
    id: number;
    solicitud_transferencia_id: number;
    aprobador_id: number;
    puesto_aprobador: string;
    area_aprobador: AreaAprobacion;
    accion: 'aprobado' | 'rechazado';
    comentario?: string;
    fecha_aprobacion: string;

    aprobador_nombre?: string;
    aprobador_puesto?: string;
}

export interface FacturaDetalleAPI {
    numero_factura: string;
    tipo_dte: string;
    fecha_emision: string;
    nombre_emisor: string;
    nit_emisor: string;
    monto_total_factura: number;
    monto_pendiente_pago: number;
    tipo_liquidacion: TipoLiquidacion;
    tipo_orden: number;
    primer_detalle_id: number;

    // Estos campos vienen del backend en el detalle
    transferencias?: DetalleTransferencia[];
    retenciones?: RetencionFactura[];
    monto_total_transferencias?: number;
    monto_total_retenciones?: number;
}
/**
 * Detalle completo de solicitud (para modal)
 */
export interface DetalleSolicitudCompleto {
    solicitud: SolicitudTransferencia;
    facturas_detalle: any[]; // Detalles de facturas asociadas
    aprobacion?: AprobacionTransferencia;
    archivos: ArchivoTransferencia[];
}

/**
 * ============================================================================
 * PAYLOADS PARA EL API
 * ============================================================================
 */

/**
 * Payload para obtener facturas con solicitudes
 */
export interface ObtenerFacturasPayload {
    tipo_orden?: TipoOrden | null; // 1 = Plan, 2 = Presupuesto, null = ambos
}

/**
 * Payload para solicitar corrección
 */
export interface SolicitarCorreccionPayload {
    detalle_liquidacion_id: number;
    numero_factura: string;
    descripcion_cambio: string;
}

/**
 * Payload para crear solicitud de transferencia
 */
export interface CrearSolicitudTransferenciaPayload {
    facturas: {
        numero_factura: string;
        detalle_liquidacion_id: number;
    }[];
    banco_origen_id: number;
    area_aprobacion: AreaAprobacion;
    monto_total_solicitud: number;
}

/**
 * Payload para editar solicitud rechazada
 */
export interface EditarSolicitudTransferenciaPayload {
    solicitud_id: number;
    facturas?: {
        numero_factura: string;
        detalle_liquidacion_id: number;
    }[];
    banco_origen_id?: number;
    area_aprobacion?: AreaAprobacion;
    monto_total_solicitud?: number;
}

/**
 * Payload para registrar comprobante
 */
export interface RegistrarComprobantePayload {
    solicitud_id: number;
    numero_registro_transferencia: string;
    fecha_transferencia: string;
    referencia_bancaria?: string;
    observaciones?: string;
}

/**
 * Payload para aprobar solicitud
 */
export interface AprobarSolicitudPayload {
    solicitud_id: number;
    comentario?: string;
}

/**
 * Payload para rechazar solicitud
 */
export interface RechazarSolicitudPayload {
    solicitud_id: number;
    comentario: string; // Obligatorio
}

/**
 * Payload para cancelar solicitud
 */
export interface CancelarSolicitudPayload {
    solicitud_id: number;
    motivo: string;
}
// En liquidaciones-modulo-tesoreria.models.ts

/**
 * Payload para editar comprobante
 */
export interface EditarComprobantePayload {
    solicitud_id: number;
    numero_registro_transferencia: string;
    fecha_transferencia: string;
    referencia_bancaria?: string;
    observaciones?: string;
}
/**
 * ============================================================================
 * CONSTANTES Y MAPEOS
 * ============================================================================
 */

/**
 * Etiquetas legibles para tipos de liquidación
 */
export const ETIQUETAS_TIPO_LIQUIDACION: Record<TipoLiquidacion, string> = {
    plan: 'Plan Empresarial',
    presupuesto: 'Presupuesto'
};

/**
 * Mapeo de tipo_orden a tipo_liquidacion
 */
export const TIPO_ORDEN_A_LIQUIDACION: Record<TipoOrden, TipoLiquidacion> = {
    1: 'plan',
    2: 'presupuesto'
};

/**
 * Etiquetas legibles para estados de solicitud
 */
export const ETIQUETAS_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
    pendiente_aprobacion: 'Pendiente de Aprobación',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    completado: 'Completado',
    cancelado: 'Cancelado'
};

/**
 * Colores para badges de estado (Tailwind)
 */
export const COLORES_ESTADO_SOLICITUD: Record<EstadoSolicitud, { bg: string; text: string }> = {
    pendiente_aprobacion: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    aprobado: { bg: 'bg-green-100', text: 'text-green-800' },
    rechazado: { bg: 'bg-red-100', text: 'text-red-800' },
    completado: { bg: 'bg-blue-100', text: 'text-blue-800' },
    cancelado: { bg: 'bg-gray-100', text: 'text-gray-800' }
};

/**
 * Colores para badges de tipo de liquidación
 */
export const COLORES_TIPO_LIQUIDACION: Record<TipoLiquidacion, { bg: string; text: string }> = {
    plan: { bg: 'bg-purple-100', text: 'text-purple-800' },
    presupuesto: { bg: 'bg-cyan-100', text: 'text-cyan-800' }
};

/**
 * Etiquetas para áreas de aprobación
 */
export const ETIQUETAS_AREA_APROBACION: Record<AreaAprobacion, string> = {
    gerencia_financiera: 'Gerencia Financiera',
    jefe_contabilidad: 'Jefe de Contabilidad'
};

/**
 * Iconos por estado (Lucide)
 */
export const ICONOS_ESTADO: Record<EstadoSolicitud, string> = {
    pendiente_aprobacion: 'Clock',
    aprobado: 'CheckCircle',
    rechazado: 'XCircle',
    completado: 'CheckCircle2',
    cancelado: 'Ban'
};

/**
 * ============================================================================
 * MENSAJES DEL SISTEMA
 * ============================================================================
 */

export const MENSAJES_TESORERIA = {
    EXITO: {
        CARGAR_FACTURAS: 'Facturas cargadas correctamente',
        CREAR_SOLICITUD: 'Solicitud de transferencia creada correctamente',
        EDITAR_SOLICITUD: 'Solicitud actualizada correctamente',
        REGISTRAR_COMPROBANTE: 'Comprobante registrado y solicitud completada',
        SOLICITAR_CORRECCION: 'Corrección solicitada correctamente',
        CANCELAR_SOLICITUD: 'Solicitud cancelada correctamente',
        APROBAR_SOLICITUD: 'Solicitud aprobada correctamente',
        RECHAZAR_SOLICITUD: 'Solicitud rechazada correctamente',
    },
    ERROR: {
        CARGAR_FACTURAS: 'Error al cargar facturas',
        CREAR_SOLICITUD: 'Error al crear solicitud',
        EDITAR_SOLICITUD: 'Error al editar solicitud',
        REGISTRAR_COMPROBANTE: 'Error al registrar comprobante',
        SOLICITAR_CORRECCION: 'Error al solicitar corrección',
        CANCELAR_SOLICITUD: 'Error al cancelar solicitud',
        APROBAR_SOLICITUD: 'Error al aprobar la solicitud',
        RECHAZAR_SOLICITUD: 'Error al rechazar la solicitud',
    },
    CONFIRMACION: {
        CREAR_SOLICITUD: '¿Confirma que desea crear esta solicitud de transferencia?',
        REGISTRAR_COMPROBANTE: '¿Confirma que desea registrar el comprobante y completar la solicitud?',
        SOLICITAR_CORRECCION: '¿Confirma que desea solicitar esta corrección?',
        CANCELAR_SOLICITUD: '¿Confirma que desea cancelar esta solicitud?'
    }
} as const;

/**
 * ============================================================================
 * HELPERS DE FORMATO
 * ============================================================================
 */

export class FormatHelper {
    /**
     * Formatea un monto en Quetzales
     */
    static formatMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monto);
    }

    /**
     * Formatea una fecha (YYYY-MM-DD -> DD/MM/YYYY)
     */
    static formatFecha(fecha: string | Date | undefined | null): string {
        // La comprobación 'if (!fecha)' manejará correctamente undefined, null, y la cadena vacía
        if (!fecha) {
            return '-';
        }

        // Aquí TypeScript sabe que 'fecha' es string | Date (no null/undefined)
        const date = typeof fecha === 'string' ? new Date(fecha) : fecha;

        return date.toLocaleDateString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Formatea fecha y hora (ISO -> DD/MM/YYYY HH:mm)
     */
    static formatFechaHora(fecha: string | Date): string {
        if (!fecha) return '-';
        const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
        return date.toLocaleString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Trunca texto largo
     */
    static truncateText(text: string, length: number = 50): string {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    /**
     * Formatea tamaño de archivo en bytes
     */
    static formatTamano(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Obtiene etiqueta de tipo de liquidación
     */
    static getEtiquetaTipo(tipo: TipoLiquidacion): string {
        return ETIQUETAS_TIPO_LIQUIDACION[tipo] || tipo;
    }

    /**
     * Obtiene colores para badge de tipo
     */
    static getColorTipo(tipo: TipoLiquidacion): { bg: string; text: string } {
        return COLORES_TIPO_LIQUIDACION[tipo] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    }

    /**
     * Obtiene etiqueta de estado de solicitud
     */
    static getEtiquetaEstadoSolicitud(estado: EstadoSolicitud): string {
        return ETIQUETAS_ESTADO_SOLICITUD[estado] || estado;
    }

    /**
     * Obtiene colores para badge de estado
     */
    static getColorEstadoSolicitud(estado: EstadoSolicitud): { bg: string; text: string } {
        return COLORES_ESTADO_SOLICITUD[estado] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    }

    /**
     * Obtiene etiqueta de área de aprobación
     */
    static getEtiquetaArea(area: AreaAprobacion): string {
        return ETIQUETAS_AREA_APROBACION[area] || area;
    }

    /**
     * Convierte tipo_orden a tipo_liquidacion
     */
    static tipoOrdenALiquidacion(tipoOrden: TipoOrden): TipoLiquidacion {
        return TIPO_ORDEN_A_LIQUIDACION[tipoOrden];
    }
}

/**
 * ============================================================================
 * VALIDATORS
 * ============================================================================
 */

export class ValidadoresLiquidacion {
    /**
     * Valida si una factura puede crear solicitud
     */
    static puedeCrearSolicitud(factura: FacturaConSolicitud): boolean {
        return !factura.solicitud && factura.monto_pendiente_pago > 0;
    }

    /**
     * Valida si una solicitud puede editarse
     */
    static puedeEditarSolicitud(solicitud: SolicitudTransferencia | null): boolean {
        return solicitud?.estado === 'rechazado';
    }

    /**
     * Valida si una solicitud puede registrar comprobante
     */
    static puedeRegistrarComprobante(solicitud: SolicitudTransferencia | null): boolean {
        return solicitud?.estado === 'aprobado';
    }

    /**
     * Valida si una solicitud puede cancelarse
     */
    static puedeCancelarSolicitud(solicitud: SolicitudTransferencia | null): boolean {
        return solicitud?.estado === 'pendiente_aprobacion';
    }

    /**
     * Valida monto de solicitud contra monto pendiente
     */
    static validarMontoSolicitud(montoSolicitud: number, montoPendiente: number): string | null {
        if (montoSolicitud <= 0) {
            return 'El monto debe ser mayor a cero';
        }
        if (montoSolicitud > montoPendiente) {
            return `El monto no puede exceder el pendiente de pago (${FormatHelper.formatMonto(montoPendiente)})`;
        }
        return null;
    }
}

/**
 * ============================================================================
 * TIPOS AUXILIARES
 * ============================================================================
 */

/**
 * Opciones para select
 */
export interface SelectOption<T = any> {
    value: T;
    label: string;
    disabled?: boolean;
}

/**
 * Configuración de tabla
 */
export interface ConfiguracionTabla {
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    pageSize?: number;
    currentPage?: number;
}

/**
 * Errores de validación
 */
export interface ErroresValidacion {
    [key: string]: string;
}

/**
 * ============================================================================
 * OPCIONES PRE-DEFINIDAS PARA SELECTS
 * ============================================================================
 */

/**
 * Opciones de tipo de liquidación para filtro
 */
export const OPCIONES_TIPO_LIQUIDACION: SelectOption<TipoOrden | 'todos'>[] = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 1, label: 'Plan Empresarial' },
    { value: 2, label: 'Presupuesto' }
];

/**
 * Opciones de áreas de aprobación
 */
export const OPCIONES_AREA_APROBACION: SelectOption<AreaAprobacion>[] = [
    { value: 'gerencia_financiera', label: 'Gerencia Financiera' },
    { value: 'jefe_contabilidad', label: 'Jefe de Contabilidad' }
];

/**
 * ============================================================================
 * INTERFACES PARA COMPONENTES
 * ============================================================================
 */

/**
 * Props para modal de detalle de factura
 */
export interface PropsModalDetalleFactura {
    factura: FacturaConSolicitud | null;
    onCerrar: () => void;
}

/**
 * Props para modal de crear solicitud
 */
export interface PropsModalCrearSolicitud {
    factura: FacturaConSolicitud | null;
    bancos: BancoUsoPago[];
    onCerrar: () => void;
    onConfirmar: () => void;
}

/**
 * Props para modal de registrar comprobante
 */
export interface PropsModalRegistrarComprobante {
    solicitud: SolicitudTransferencia | null;
    onCerrar: () => void;
    onConfirmar: () => void;
}

/**
 * Props para modal de solicitar corrección
 */
export interface PropsModalSolicitarCorreccion {
    factura: FacturaConSolicitud | null;
    onCerrar: () => void;
    onConfirmar: () => void;
}



/**
 * ============================================================================
 * FIN DE MODELOS
 * ============================================================================
 */