/**
 * Modelos y contratos para Órdenes – Plan Empresarial
 */

export interface ApiSuccessResponse<T = any> {
    respuesta: 'success';
    datos: T;
    mensaje?: string | string[];
}

export interface ApiErrorResponse {
    respuesta: 'error' | 'fail' | string;
    mensaje?: string | string[];
    error?: { mensaje?: string | string[] };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Orden del Plan Empresarial ya autorizada/activa para gestión */
export interface OrdenPlanEmpresarial {
    numeroOrden: number;
    total: number;
    montoLiquidado: number;
    montoPendiente: number;
    totalAnticipos: number;
    anticiposPendientesOTardios: number;
}

/** Tipos de anticipos */
export enum TipoAnticipo {
    CHEQUE = 'CHEQUE',
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA'
}

/** Estado respecto a su liquidación */
export enum EstadoLiquidacion {
    NO_LIQUIDADO = 'NO_LIQUIDADO',
    RECIENTE = 'RECIENTE',
    EN_TIEMPO = 'EN_TIEMPO',
    FUERA_DE_TIEMPO = 'FUERA_DE_TIEMPO',
    LIQUIDADO = 'LIQUIDADO' // 👈 nuevo
}
export interface UltimoSeguimientoPE {
    fechaSeguimiento: string | null;
    idEstado: number | null;
    nombreEstado: string | null;       // p.e. "pendiente"
    descripcionEstado: string | null;  // p.e. "Solicitud creada, esperando autorización"
    comentarioSolicitante: string | null;
    fechaAutorizacion: string | null;
    comentarioAutorizador: string | null;
}
/** Anticipo pendiente para una orden */
export interface AnticipoPendientePE {
    idSolicitud: number;
    numeroOrden: number;
    tipoAnticipo: TipoAnticipo;
    monto: number;
    fechaLiquidacion: string | null;
    diasTranscurridos: number | null;
    estadoLiquidacion: EstadoLiquidacion;

    // 👇 nuevos campos útiles para UI/negocio
    estadoSolicitud?: number | null;       // 1 = creada, 2 = pendiente, etc. (ajusta según backend)
    requiereAutorizacion?: boolean | null; // true/false
    diasPermitidos?: number | null;        // ej. 26
    motivoInclusion?: string | null;       // ej. "FUERA_DE_TIEMPO"
    ultimoSeguimiento?: UltimoSeguimientoPE | null;
}

/** Payload para solicitar autorización de anticipo tardío */
export interface SolicitudAutorizacionPayload {
    id_solicitud: number;
    justificacion: string;
    tipo: 'autorizacion';
}

/** Resumen para cabecera/pie de tabla */
export interface ResumenOrdenesPE {
    totalOrdenes: number;
    totalPendientes: number;
}

/** Endpoints usados por el feature (ajústalos si tu backend usa otros) */
export const ORDENES_PE_ENDPOINTS = {
    LISTAR_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    LISTAR_ANTICIPOS_PENDIENTES: 'contabilidad/obtenerSolicitudesPendientesAnticipos',
    SOLICITAR_AUTORIZACION: 'contabilidad/solicitarAutorizacionAnticiposPendientes'
} as const;