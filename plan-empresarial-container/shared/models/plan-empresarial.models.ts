// ============================================================================
// MODELO ÚNICO CONSOLIDADO - Plan Empresarial - CORREGIDO
// ============================================================================

/** Moneda usada en facturas */
export type Moneda = 'GTQ' | 'USD';

/** Estados de liquidación (según backend) */
export enum EstadoLiquidacionId {
    Pendiente = 1,
    Liquidado = 2,
    EnRevision = 3
}

/** Estado legible (UI) */
export type EstadoLiquidacionTexto = 'Pendiente' | 'Liquidado' | 'En Revisión';

export enum EstadoLiquidacionPE {
    Pendiente = 'Pendiente',
    EnRevision = 'En Revisión',
    Liquidado = 'Liquidado',
}

export enum AutorizacionEstado {
    Aprobada = 'aprobada',
    Rechazada = 'rechazada',
    Pendiente = 'pendiente',
    Ninguna = 'ninguna', // cuando no existe solicitud
}

/** Tipos de pago admitidos en la UI */
export type TipoPagoId = 'deposito' | 'transferencia' | 'cheque' | 'tarjeta' | 'anticipo';

export interface TipoPago {
    id: TipoPagoId;
    nombre: string;
    requiereFormulario?: boolean; // true = abre su propio formulario
}

/** Catálogo por defecto */
export const TIPOS_PAGO_DEFAULT: TipoPago[] = [
    { id: 'deposito', nombre: 'Por depósito a cuenta', requiereFormulario: true },
    { id: 'transferencia', nombre: 'Por transferencia', requiereFormulario: true },
    { id: 'cheque', nombre: 'Por cheque', requiereFormulario: true },
    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiereFormulario: false },
    { id: 'anticipo', nombre: 'Por anticipo', requiereFormulario: false },
];

// ============================================================================
// FACTURA UNIFICADA
// ============================================================================

export interface FacturaPE {
    id?: number;
    numero_dte: string;
    fecha_emision: string;           // ISO yyyy-mm-dd
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    estado: string;
    estado_id?: EstadoLiquidacionId;
    estado_liquidacion?: EstadoLiquidacionTexto;
    monto_liquidado?: number;
    moneda?: Moneda;

    // Campos específicos de autorización por tardanza
    dias_transcurridos?: number | null;
    tiene_autorizacion_tardanza?: boolean;
    autorizacion_id?: number | null;
    estado_autorizacion?: AutorizacionEstado;
    motivo_autorizacion?: string | null;
    solicitado_por?: string | null;
    fecha_solicitud?: string | null;
    autorizado_por?: string | null;
    fecha_autorizacion?: string | null;
    comentarios_autorizacion?: string | null;

    // El detalle puede venir del backend pero en UI se maneja aparte
    detalles_liquidacion?: DetalleLiquidacionPE[];
}

// ============================================================================
// DETALLE DE LIQUIDACIÓN
// ============================================================================

export interface DetalleLiquidacionPE {
    id?: number;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor: string;
    forma_pago: TipoPagoId | string;
    banco: string;
    cuenta: string;
    factura_id?: number | null;
    fecha_creacion?: string | null;
}

// ============================================================================
// ÓRDENES PLAN EMPRESARIAL
// ============================================================================

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
    LIQUIDADO = 'LIQUIDADO'
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

    // campos útiles para UI/negocio
    estadoSolicitud?: number | null;       // 1 = creada, 2 = pendiente, etc.
    requiereAutorizacion?: boolean | null; // true/false
    diasPermitidos?: number | null;        // ej. 26
    motivoInclusion?: string | null;       // ej. "FUERA_DE_TIEMPO"
    ultimoSeguimiento?: UltimoSeguimientoPE | null;
}

/** Resumen para cabecera/pie de tabla */
export interface ResumenOrdenesPE {
    totalOrdenes: number;
    totalPendientes: number;
}

// ============================================================================
// PAYLOADS PARA APIs
// ============================================================================

export interface RegistrarFacturaPayload {
    numero_dte: string;
    fecha_emision: string; // YYYY-MM-DD
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: Moneda;
}

export interface SolicitarAutorizacionPayload {
    numero_dte: string;
    motivo: string;
    dias_transcurridos: number;
}

/** Payload para solicitar autorización de anticipo tardío */
export interface SolicitudAutorizacionPayload {
    id_solicitud: number;
    justificacion: string;
    tipo: 'autorizacion';
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

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

export interface BuscarFacturaResponse {
    respuesta: 'success' | 'error' | 'info';
    datos?: FacturaApi[];
    mensaje?: string;
}

export interface FacturaApi {
    id: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: string; // viene como string en el backend
    estado: string;
    estado_id: number;
    estado_liquidacion?: string;
    moneda?: 'GTQ' | 'USD';
    monto_liquidado?: string;

    // Campos de autorización
    dias_transcurridos?: number | null;
    tiene_autorizacion_tardanza?: number; // 0 o 1 del backend
    autorizacion_id?: number | null;
    estado_autorizacion?: string;
    motivo_autorizacion?: string | null;
    solicitado_por?: string | null;
    fecha_solicitud?: string | null;
    autorizado_por?: string | null;
    fecha_autorizacion?: string | null;
    comentarios_autorizacion?: string | null;

    // Puede venir, pero la UI nueva no lo usa directamente:
    detalles_liquidacion?: DetalleLiquidacionApi[];
}

export interface DetalleLiquidacionApi {
    id: number;
    factura_id: number;
    numero_orden: number | string;
    agencia: string;
    descripcion: string;
    monto: string;
    correo_proveedor: string;
    forma_pago: string;
    banco: string;
    cuenta: string;
    fecha_creacion?: string;
}

/** Respuesta genérica simple */
export interface GenericApiResponse<T = any> {
    respuesta: 'success' | 'error';
    datos?: T;
    mensaje?: string;
}

// ============================================================================
// ENDPOINTS CORREGIDOS - ✅ SOLO CONTABILIDAD
// ============================================================================

/** Endpoints unificados - usando solo contabilidad/ */
export const PLAN_EMPRESARIAL_ENDPOINTS = {
    // Facturas
    BUSCAR_FACTURA: 'facturas/buscarPorNumeroDte',
    REGISTRAR_FACTURA: 'facturas/registro/facturaManual',
    SOLICITAR_AUTORIZACION: 'facturas/solicitarAutorizacionTardanza',

    // ✅ LIQUIDACIONES - CORREGIDAS TODAS A CONTABILIDAD
    OBTENER_DETALLES: 'contabilidad/obtenerDetallesLiquidacion',
    GUARDAR_DETALLE: 'contabilidad/guardarDetalleLiquidacion',
    ELIMINAR_DETALLE: 'contabilidad/eliminarDetalleLiquidacion',
    ACTUALIZAR_DETALLE: 'contabilidad/actualizarMontoAgencia',

    // Órdenes
    LISTAR_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    LISTAR_ANTICIPOS_PENDIENTES: 'contabilidad/obtenerSolicitudesPendientesAnticipos',
    SOLICITAR_AUTORIZACION_ANTICIPO: 'contabilidad/solicitarAutorizacionAnticiposPendientes',

    // ✅ CATÁLOGOS - CORREGIDOS A CONTABILIDAD
    OBTENER_AGENCIAS: 'contabilidad/buscarNombreLiquidacion',
    OBTENER_TIPOS_PAGO: 'contabilidad/obtenerTiposPago'
} as const;