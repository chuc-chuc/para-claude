// ============================================================================
// MODELOS CONSOLIDADOS - PLAN EMPRESARIAL UNIFICADO
// ============================================================================

/**
 * Tipos y enums base del sistema
 */
export type Moneda = 'GTQ' | 'USD';
export type TipoPagoId = 'deposito' | 'transferencia' | 'cheque' | 'tarjeta' | 'anticipo';

/**
 * Estados de liquidación según el backend
 */
export enum EstadoLiquidacionId {
    Pendiente = 1,
    Liquidado = 2,
    EnRevision = 3
}

export type EstadoLiquidacionTexto = 'Pendiente' | 'Liquidado' | 'En Revisión';

/**
 * Estados de autorización para facturas fuera de tiempo
 */
export enum AutorizacionEstado {
    Aprobada = 'aprobada',
    Rechazada = 'rechazada',
    Pendiente = 'pendiente',
    Ninguna = 'ninguna'
}

/**
 * Estados de liquidación para anticipos
 */
export enum EstadoLiquidacionAnticipo {
    NO_LIQUIDADO = 'NO_LIQUIDADO',
    RECIENTE = 'RECIENTE',
    EN_TIEMPO = 'EN_TIEMPO',
    FUERA_DE_TIEMPO = 'FUERA_DE_TIEMPO',
    LIQUIDADO = 'LIQUIDADO'
}

/**
 * Tipos de anticipo disponibles
 */
export enum TipoAnticipo {
    CHEQUE = 'CHEQUE',
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA'
}

// ============================================================================
// INTERFACES PRINCIPALES DEL DOMINIO
// ============================================================================

/**
 * Configuración de tipos de pago
 */
export interface TipoPago {
    id: TipoPagoId;
    nombre: string;
    requiereFormulario?: boolean;
    icono?: string;
    color?: string;
}

/**
 * Factura del Plan Empresarial
 */
export interface FacturaPE {
    // Datos básicos de la factura
    id?: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: Moneda;

    // Estados y control
    estado: string;
    estado_id: EstadoLiquidacionId;
    estado_liquidacion: EstadoLiquidacionTexto;
    monto_liquidado: number;

    // Datos de autorización por tardanza
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

    // Relaciones
    detalles_liquidacion?: DetalleLiquidacionPE[];
}

/**
 * Orden del Plan Empresarial
 */
export interface OrdenPE {
    id: number;
    numero_orden: string;
    total: number;
    monto_liquidado: number;
    monto_pendiente: number;
    total_anticipos: number;
    anticipos_pendientes: number;
    area?: string | null;
    presupuesto?: string | null;
    estado: 'autorizada' | 'pendiente' | 'completada';
    puede_liquidar: boolean;
}

/**
 * Detalle de liquidación
 */
export interface DetalleLiquidacionPE {
    // Identificación
    id?: number;
    factura_id?: number;

    // Datos principales
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string;
    forma_pago: TipoPagoId;

    // Datos bancarios básicos
    banco?: string;
    cuenta?: string;

    // Metadatos
    fecha_creacion?: string;
    fecha_actualizacion?: string;

    // Estados de edición (UI)
    _editando?: boolean;
    _editandoMonto?: boolean;
    _montoTemp?: number;
    _editandoAgencia?: boolean;
    _agenciaTemp?: string;

    // Datos específicos por tipo de pago
    datos_especificos?: DatosEspecificosPago;
    informacion_adicional?: InformacionAdicionalDetalle;
}

/**
 * Datos específicos según el tipo de pago
 */
export interface DatosEspecificosPago {
    // Para depósitos
    id_socio?: string;
    nombre_socio?: string;
    numero_cuenta_deposito?: string;
    producto_cuenta?: string;

    // Para transferencias
    nombre_cuenta?: string;
    numero_cuenta?: string;
    banco_id?: number;
    tipo_cuenta_id?: number;

    // Para cheques
    nombre_beneficiario?: string;
    consignacion?: 'Negociable' | 'No Negociable';
    no_negociable?: boolean;

    // Para tarjeta/anticipo
    nota?: string;

    // Observaciones generales
    observaciones?: string;
}

/**
 * Información adicional de contexto
 */
export interface InformacionAdicionalDetalle {
    forma_pago_texto?: string;
    tipo_detalle?: string;
    nombre_banco?: string;
    nombre_tipo_cuenta?: string;
    requiere_validacion?: boolean;
    es_negociable?: boolean;
}

/**
 * Anticipo pendiente de autorización
 */
export interface AnticipoPendientePE {
    id_solicitud: number;
    numero_orden: number;
    tipo_anticipo: TipoAnticipo;
    monto: number;
    fecha_liquidacion?: string | null;
    dias_transcurridos?: number | null;
    dias_permitidos?: number | null;
    estado_liquidacion: EstadoLiquidacionAnticipo;
    estado_solicitud?: number | null;
    requiere_autorizacion?: boolean;
    motivo_inclusion?: string | null;
    ultimo_seguimiento?: SeguimientoAnticipo | null;
}

/**
 * Seguimiento de solicitud de anticipo
 */
export interface SeguimientoAnticipo {
    fecha_seguimiento?: string | null;
    id_estado?: number | null;
    nombre_estado?: string | null;
    descripcion_estado?: string | null;
    comentario_solicitante?: string | null;
    fecha_autorizacion?: string | null;
    comentario_autorizador?: string | null;
}

// ============================================================================
// CATÁLOGOS Y REFERENCIAS
// ============================================================================

/**
 * Agencia para liquidaciones
 */
export interface AgenciaPE {
    id: number;
    nombre_liquidacion: string;
    activa?: boolean;
}

/**
 * Banco del sistema
 */
export interface BancoPE {
    id_banco: number;
    nombre: string;
    codigo?: string;
    activo?: boolean;
}

/**
 * Tipo de cuenta bancaria
 */
export interface TipoCuentaPE {
    id_tipo_cuenta: number;
    nombre: string;
    codigo?: string;
    activo?: boolean;
}

/**
 * Socio para depósitos
 */
export interface SocioPE {
    id_socio: string;
    nombre: string;
    numero_identificacion?: string;
    activo?: boolean;
}

/**
 * Cuenta de socio
 */
export interface CuentaSocioPE {
    NumeroCuenta: number;
    Producto: string;
    Estado: string;
    descripcion_producto?: string;
}

// ============================================================================
// PAYLOADS PARA APIs
// ============================================================================

/**
 * Payload para registrar factura manualmente
 */
export interface RegistrarFacturaPayload {
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: Moneda;
}

/**
 * Payload para solicitar autorización de factura tardía
 */
export interface SolicitarAutorizacionFacturaPayload {
    numero_dte: string;
    motivo: string;
    dias_transcurridos: number;
}

/**
 * Payload para guardar detalle de liquidación
 */
export interface GuardarDetalleLiquidacionPayload {
    id?: number | null;
    numero_factura: string;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string | null;
    forma_pago: TipoPagoId;
    banco?: string | null;
    cuenta?: string | null;

    // Campos específicos que se agregan según el tipo
    [key: string]: any;
}

/**
 * Payload para solicitar autorización de anticipo
 */
export interface SolicitarAutorizacionAnticipoPayload {
    id_solicitud: number;
    justificacion: string;
    tipo: 'autorizacion';
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error' | 'info';
    datos?: T;
    mensaje?: string | string[];
}

/**
 * Respuesta de búsqueda de facturas
 */
export interface BuscarFacturaResponse extends ApiResponse<FacturaApi[]> { }

/**
 * Factura como viene del backend
 */
export interface FacturaApi {
    id: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: string; // Viene como string
    estado: string;
    estado_id: number;
    estado_liquidacion?: string;
    moneda?: Moneda;
    monto_liquidado?: string;

    // Campos de autorización
    dias_transcurridos?: number | null;
    tiene_autorizacion_tardanza?: number; // 0 o 1
    autorizacion_id?: number | null;
    estado_autorizacion?: string;
    motivo_autorizacion?: string | null;
    solicitado_por?: string | null;
    fecha_solicitud?: string | null;
    autorizado_por?: string | null;
    fecha_autorizacion?: string | null;
    comentarios_autorizacion?: string | null;
}

/**
 * Detalle como viene del backend
 */
export interface DetalleLiquidacionApi {
    id: number;
    factura_id: number;
    numero_orden: number | string;
    agencia: string;
    descripcion: string;
    monto: string; // Viene como string
    correo_proveedor?: string;
    forma_pago: string;
    banco?: string;
    cuenta?: string;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    datos_especificos?: any;
    informacion_adicional?: any;
}

// ============================================================================
// UTILIDADES Y VALIDACIONES
// ============================================================================

/**
 * Resultado de validación de monto
 */
export interface ValidadorMonto {
    es_valido: boolean;
    mensaje?: string;
    monto_disponible?: number;
    monto_excedente?: number;
}

/**
 * Estado de completitud de un detalle
 */
export interface EstadoDetalle {
    es_completo: boolean;
    campos_faltantes: string[];
    requiere_guardado: boolean;
    puede_liquidar: boolean;
}

/**
 * Resumen de liquidación de una factura
 */
export interface ResumenLiquidacion {
    cantidad_detalles: number;
    total_liquidado: number;
    monto_factura: number;
    monto_pendiente: number;
    estado_monto: 'completo' | 'incompleto' | 'excedido';
    puede_completar: boolean;
}

/**
 * Estadísticas del dashboard
 */
export interface EstadisticasDashboard {
    facturas_pendientes: number;
    ordenes_con_anticipos: number;
    liquidaciones_completadas: number;
    monto_total_pendiente: number;
    alertas_vencimiento: number;
}

// ============================================================================
// CONFIGURACIONES Y CONSTANTES
// ============================================================================

/**
 * Tipos de pago por defecto del sistema
 */
export const TIPOS_PAGO_DEFAULT: TipoPago[] = [
    {
        id: 'deposito',
        nombre: 'Depósito a cuenta',
        requiereFormulario: true,
        icono: '🏦',
        color: 'blue'
    },
    {
        id: 'transferencia',
        nombre: 'Transferencia bancaria',
        requiereFormulario: true,
        icono: '💸',
        color: 'green'
    },
    {
        id: 'cheque',
        nombre: 'Cheque',
        requiereFormulario: true,
        icono: '📝',
        color: 'purple'
    },
    {
        id: 'tarjeta',
        nombre: 'Tarjeta de crédito',
        requiereFormulario: false,
        icono: '💳',
        color: 'yellow'
    },
    {
        id: 'anticipo',
        nombre: 'Anticipo',
        requiereFormulario: false,
        icono: '💰',
        color: 'orange'
    }
];

/**
 * Endpoints de la API
 */
export const API_ENDPOINTS = {
    // Facturas
    BUSCAR_FACTURA: 'contabilidad/buscarPorNumeroDte',
    REGISTRAR_FACTURA: 'facturas/registro/facturaManual',
    SOLICITAR_AUTORIZACION_FACTURA: 'facturas/solicitarAutorizacionTardanza',

    // Liquidaciones
    OBTENER_DETALLES: 'contabilidad/obtenerDetallesLiquidacion',
    GUARDAR_DETALLE: 'contabilidad/guardarDetalleLiquidacion',
    ELIMINAR_DETALLE: 'contabilidad/eliminarDetalleLiquidacion',
    ACTUALIZAR_DETALLE: 'contabilidad/actualizarMontoAgencia',
    COPIAR_DETALLE: 'contabilidad/copiarDetalleLiquidacion',
    OBTENER_DETALLE_COMPLETO: 'contabilidad/obtenerDetalleCompleto',

    // Órdenes y anticipos
    LISTAR_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    LISTAR_ANTICIPOS_PENDIENTES: 'contabilidad/obtenerSolicitudesPendientesAnticipos',
    SOLICITAR_AUTORIZACION_ANTICIPO: 'contabilidad/solicitarAutorizacionAnticiposPendientes',

    // Catálogos
    OBTENER_AGENCIAS: 'contabilidad/buscarNombreLiquidacion',
    OBTENER_TIPOS_PAGO: 'contabilidad/obtenerTiposPago',
    LISTA_BANCOS: 'facturas/bancos/lista',
    LISTA_TIPOS_CUENTA: 'facturas/tiposCuenta/lista',

    // Socios (para depósitos)
    BUSCAR_SOCIOS: 'contabilidad/buscar_socios',
    BUSCAR_CUENTAS_SOCIO: 'contabilidad/buscar_cuentas',
    OBTENER_SOCIO: 'contabilidad/obtener_socio'
} as const;

/**
 * Configuración general del sistema
 */
export const CONFIG = {
    // Límites de validación
    MONTO_MINIMO: 0.01,
    DESCRIPCION_MIN_LENGTH: 5,
    DESCRIPCION_MAX_LENGTH: 200,
    JUSTIFICACION_MIN_LENGTH: 10,
    JUSTIFICACION_MAX_LENGTH: 500,

    // Timeouts y delays
    SEARCH_DEBOUNCE_MS: 800,
    TOAST_DURATION_MS: 3000,
    LOADING_MIN_DISPLAY_MS: 500,

    // UI
    ITEMS_PER_PAGE: 20,
    MAX_SELECTION_ITEMS: 100,
    MODAL_ANIMATION_MS: 200,

    // Formato de fechas
    DATE_FORMAT: 'yyyy-MM-dd',
    DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
    DISPLAY_DATE_FORMAT: 'dd/MM/yyyy',
    DISPLAY_DATETIME_FORMAT: 'dd/MM/yyyy HH:mm'
} as const;

/**
 * Mensajes estándar del sistema
 */
export const MENSAJES = {
    EXITO: {
        FACTURA_REGISTRADA: 'Factura registrada correctamente',
        DETALLE_GUARDADO: 'Detalle guardado correctamente',
        DETALLE_ELIMINADO: 'Detalle eliminado correctamente',
        AUTORIZACION_ENVIADA: 'Solicitud de autorización enviada',
        LIQUIDACION_COMPLETADA: 'Liquidación completada exitosamente'
    },
    ERROR: {
        FACTURA_NO_ENCONTRADA: 'Factura no encontrada',
        ERROR_CARGAR_DATOS: 'Error al cargar los datos',
        ERROR_GUARDAR: 'Error al guardar la información',
        MONTO_INVALIDO: 'El monto ingresado no es válido',
        CAMPOS_OBLIGATORIOS: 'Complete todos los campos obligatorios'
    },
    VALIDACION: {
        CAMPO_REQUERIDO: 'Este campo es obligatorio',
        MONTO_MAYOR_CERO: 'El monto debe ser mayor a cero',
        MONTO_EXCEDE_FACTURA: 'El monto excede el valor de la factura',
        EMAIL_INVALIDO: 'Ingrese un email válido',
        LONGITUD_MINIMA: 'Mínimo {min} caracteres',
        LONGITUD_MAXIMA: 'Máximo {max} caracteres'
    },
    CONFIRMACION: {
        ELIMINAR_DETALLE: '¿Está seguro de eliminar este detalle?',
        COPIAR_DETALLE: '¿Desea crear una copia de este detalle?',
        SOLICITAR_AUTORIZACION: '¿Confirma el envío de la solicitud de autorización?',
        COMPLETAR_LIQUIDACION: '¿Marcar esta liquidación como completada?'
    }
} as const;

// ============================================================================
// TIPOS HELPER Y UTILIDADES
// ============================================================================

/**
 * Estados posibles de un componente con datos
 */
export type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

/**
 * Opciones para select/dropdown
 */
export interface OpcionSelect<T = any> {
    value: T;
    label: string;
    disabled?: boolean;
    group?: string;
}

/**
 * Configuración de columna para tablas
 */
export interface ConfiguracionColumna {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'currency' | 'badge' | 'actions';
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}

/**
 * Filtros para búsquedas y listados
 */
export interface FiltrosBusqueda {
    texto?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado?: string;
    agencia?: string;
    forma_pago?: TipoPagoId;
    monto_min?: number;
    monto_max?: number;
}

/**
 * Resultado paginado
 */
export interface ResultadoPaginado<T> {
    items: T[];
    total: number;
    pagina: number;
    por_pagina: number;
    total_paginas: number;
}

/**
 * Evento de comunicación entre componentes
 */
export interface EventoComponente<T = any> {
    tipo: string;
    payload: T;
    origen?: string;
    timestamp?: number;
}

// ============================================================================
// NOTA: Todas las interfaces y tipos ya están exportados directamente 
// en sus declaraciones individuales con 'export interface' y 'export type'
// No es necesario re-exportarlos aquí para evitar conflictos de TypeScript
// ============================================================================