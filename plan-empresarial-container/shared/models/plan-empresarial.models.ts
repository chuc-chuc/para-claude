// ============================================================================
// MODELO ÚNICO CONSOLIDADO - Plan Empresarial - EXPANDIDO CON CATÁLOGOS
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
// CATÁLOGOS CONSOLIDADOS (PREVIAMENTE DUPLICADOS EN COMPONENTES)
// ============================================================================

/** Banco del sistema */
export interface BancoPE {
    id_banco: number;
    nombre: string;
}

/** Tipo de cuenta bancaria */
export interface TipoCuentaPE {
    id_tipo_cuenta: number;
    nombre: string;
}

/** Agencia para liquidaciones */
export interface AgenciaPE {
    id: number;
    nombre_liquidacion: string;
}

/** Orden autorizada para liquidación */
export interface OrdenAutorizadaPE {
    id: number;
    numero_orden: string;
    estado: string;
    total: number;
    total_liquidado?: number;
    monto_pendiente?: number;
    puede_finalizar?: boolean;
    anticipos_pendientes_o_tardios?: number;
    area?: string | null;         // 👈 nuevo
    presupuesto?: string | null;  // 👈 nuevo
}

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
    fecha_actualizacion?: string | null;

    // Campos para edición inline
    _editandoMonto?: boolean;
    _montoTemp?: number;
    _editandoAgencia?: boolean;
    _agenciaTemp?: string;

    // Información específica por tipo de pago
    datos_especificos?: any;
    informacion_adicional?: any;
}

/** Detalle completo con información adicional del backend */
export interface DetalleLiquidacionCompletoPE extends DetalleLiquidacionPE {
    datos_especificos?: {
        // Para depósitos
        id_socio?: string;
        nombre_socio?: string;
        numero_cuenta_deposito?: string;
        producto_cuenta?: string;
        observaciones?: string;

        // Para transferencias
        nombre_cuenta?: string;
        numero_cuenta?: string;
        banco?: number;
        tipo_cuenta?: number;

        // Para cheques
        nombre_beneficiario?: string;
        consignacion?: string;
        no_negociable?: boolean;

        // Para tarjeta/anticipo
        nota?: string;
    };
    informacion_adicional?: {
        forma_pago_texto?: string;
        tipo_detalle?: string;
        requiere_validacion?: boolean;
        nombre_banco?: string;
        nombre_tipo_cuenta?: string;
        es_negociable?: boolean;
    };
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
    area?: string | null;         // 👈 nuevo
    presupuesto?: string | null;  // 👈 nuevo
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

/** Payload para guardar detalle de liquidación */
export interface GuardarDetalleLiquidacionPayload {
    id?: number | null;
    numero_factura: string;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string | null;
    forma_pago: string;
    banco?: string | null;
    cuenta?: string | null;

    // Campos específicos por tipo de pago
    id_socio?: string;
    nombre_socio?: string;
    numero_cuenta_deposito?: string;
    producto_cuenta?: string;
    observaciones?: string;
    nombre_cuenta?: string;
    numero_cuenta?: string;
    tipo_cuenta?: number;
    nombre_beneficiario?: string;
    consignacion?: string;
    no_negociable?: boolean;
    nota?: string;
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
    fecha_actualizacion?: string;
    datos_especificos?: any;
    informacion_adicional?: any;
}

/** Respuesta genérica simple */
export interface GenericApiResponse<T = any> {
    respuesta: 'success' | 'error';
    datos?: T;
    mensaje?: string;
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN Y FORMATEO
// ============================================================================

/** Validador de montos */
export interface ValidadorMonto {
    esValido: boolean;
    mensaje?: string;
    montoDisponible?: number;
}

/** Información de estado de detalle */
export interface EstadoDetalle {
    esCompleto: boolean;
    camposFaltantes: string[];
    requiereGuardado: boolean;
}

// ============================================================================
// ENDPOINTS CORREGIDOS - BASADOS EN TU BACKEND
// ============================================================================

/** Endpoints corregidos según la lista de interacciones de tu backend */
export const PLAN_EMPRESARIAL_ENDPOINTS = {
    // Facturas - Rutas correctas según tu backend
    BUSCAR_FACTURA: 'contabilidad/buscarPorNumeroDte',
    REGISTRAR_FACTURA: 'facturas/registro/facturaManual',
    SOLICITAR_AUTORIZACION: 'facturas/solicitarAutorizacionTardanza',
    CALCULAR_DIAS_HABILES: 'facturas/calcularDiasHabiles',

    // Liquidaciones - Rutas que realmente existen en tu backend
    OBTENER_DETALLES: 'contabilidad/obtenerDetallesLiquidacion',
    GUARDAR_DETALLE: 'contabilidad/guardarDetalleLiquidacion',
    ELIMINAR_DETALLE: 'contabilidad/eliminarDetalleLiquidacion',
    ACTUALIZAR_DETALLE: 'contabilidad/actualizarDetalleLiquidacion', // Ruta genérica de actualización
    ACTUALIZAR_MONTO_AGENCIA: 'contabilidad/actualizarMontoAgencia', // Si existe esta específica
    COPIAR_DETALLE: 'contabilidad/copiarDetalleLiquidacion',

    // Órdenes
    LISTAR_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    LISTAR_ANTICIPOS_PENDIENTES: 'contabilidad/obtenerSolicitudesPendientesAnticipos',
    SOLICITAR_AUTORIZACION_ANTICIPO: 'contabilidad/solicitarAutorizacionAnticiposPendientes',

    // Catálogos
    OBTENER_AGENCIAS: 'contabilidad/buscarNombreLiquidacion',
    OBTENER_TIPOS_PAGO: 'contabilidad/obtenerTiposPago',
    OBTENER_DETALLE_COMPLETO: 'contabilidad/obtenerDetalleCompleto',

    // Catálogos adicionales para modal
    LISTA_BANCOS: 'facturas/bancos/lista',
    LISTA_TIPOS_CUENTA: 'facturas/tiposCuenta/lista'
} as const;