// ============================================================================
// MODELOS Y TIPOS - PLAN EMPRESARIAL UNIFICADO
// ============================================================================

// ============================================================================
// TIPOS BÁSICOS
// ============================================================================

export type Moneda = 'GTQ' | 'USD';

export enum EstadoLiquidacionId {
    Pendiente = 1,
    Liquidado = 2,
    EnRevision = 3
}

export type EstadoLiquidacionTexto = 'Pendiente' | 'Liquidado' | 'En Revisión';

export enum AutorizacionEstado {
    Aprobada = 'aprobada',
    Rechazada = 'rechazada',
    Pendiente = 'pendiente',
    Ninguna = 'ninguna'
}

export type TipoPagoId = 'deposito' | 'transferencia' | 'cheque' | 'tarjeta' | 'anticipo';

export enum TipoAnticipo {
    CHEQUE = 'CHEQUE',
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum EstadoLiquidacion {
    NO_LIQUIDADO = 'NO_LIQUIDADO',
    RECIENTE = 'RECIENTE',
    EN_TIEMPO = 'EN_TIEMPO',
    FUERA_DE_TIEMPO = 'FUERA_DE_TIEMPO',
    LIQUIDADO = 'LIQUIDADO'
}

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

export interface OrdenPlanEmpresarial {
    numeroOrden: number;
    total: number;
    montoLiquidado: number;
    montoPendiente: number;
    totalAnticipos: number;
    anticiposPendientesOTardios: number;
    area?: string | null;
    presupuesto?: string | null;
}

export interface FacturaPE {
    id?: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    estado: string;
    estado_id?: EstadoLiquidacionId;
    estado_liquidacion?: EstadoLiquidacionTexto;
    monto_liquidado?: number;
    moneda?: Moneda;

    // Campos de autorización por tardanza
    dias_transcurridos?: number | null;
    tiene_autorizacion_tardanza?: boolean;
    autorizacion_id?: number | null;
    estado_autorizacion?: string;
    motivo_autorizacion?: string | null;
    solicitado_por?: string | null;
    fecha_solicitud?: string | null;
    autorizado_por?: string | null;
    fecha_autorizacion?: string | null;
    comentarios_autorizacion?: string | null;
}

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

export interface UltimoSeguimientoPE {
    fechaSeguimiento: string | null;
    idEstado: number | null;
    nombreEstado: string | null;
    descripcionEstado: string | null;
    comentarioSolicitante: string | null;
    fechaAutorizacion: string | null;
    comentarioAutorizador: string | null;
}

export interface AnticipoPendientePE {
    idSolicitud: number;
    numeroOrden: number;
    tipoAnticipo: string;
    monto: number;
    fechaLiquidacion: string | null;
    diasTranscurridos: number | null;
    estadoLiquidacion: string;
    estadoSolicitud?: number | null;
    requiereAutorizacion?: boolean | null;
    diasPermitidos?: number | null;
    motivoInclusion?: string | null;
    ultimoSeguimiento?: UltimoSeguimientoPE | null;
}

// ============================================================================
// CATÁLOGOS
// ============================================================================

export interface TipoPago {
    id: TipoPagoId;
    nombre: string;
    requiereFormulario?: boolean;
}

export interface AgenciaPE {
    id: number;
    nombre_liquidacion: string;
}

export interface BancoPE {
    id_banco: number;
    nombre: string;
}

export interface TipoCuentaPE {
    id_tipo_cuenta: number;
    nombre: string;
}

export interface OrdenAutorizadaPE {
    id: number;
    numero_orden: string;
    estado: string;
    total: number;
    total_liquidado?: number;
    monto_pendiente?: number;
    puede_finalizar?: boolean;
    anticipos_pendientes_o_tardios?: number;
    area?: string | null;
    presupuesto?: string | null;
}

// ============================================================================
// PAYLOADS PARA APIs
// ============================================================================

export interface RegistrarFacturaPayload {
    numero_dte: string;
    fecha_emision: string;
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

export interface SolicitudAutorizacionPayload {
    id_solicitud: number;
    justificacion: string;
    tipo: 'autorizacion';
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error' | 'info';
    datos?: T;
    mensaje?: string | string[];
}

// ============================================================================
// INTERFACES PARA FORMULARIOS ESPECÍFICOS
// ============================================================================

export interface DatosDepositoForm {
    id_socio?: string;
    nombre_socio?: string;
    numero_cuenta_deposito?: string;
    producto_cuenta?: string;
    observaciones?: string;
}

export interface DatosTransferenciaForm {
    nombre_cuenta: string;
    numero_cuenta: string;
    banco: number;
    tipo_cuenta: number;
    observaciones?: string;
}

export interface DatosChequeForm {
    nombre_beneficiario: string;
    consignacion: 'Negociable' | 'No Negociable';
    observaciones?: string;
}

export interface DatosTarjetaForm {
    nota?: string;
}

export interface DatosAnticipoForm {
    nota?: string;
}

// ============================================================================
// INTERFACES PARA MODALES
// ============================================================================

export interface ModalDetalleLiquidacion {
    visible: boolean;
    modo: 'crear' | 'editar';
    detalle: DetalleLiquidacionPE | null;
}

export interface ModalAnticipos {
    visible: boolean;
    numeroOrden: number;
}

// ============================================================================
// VALIDACIONES
// ============================================================================

export interface ValidadorMonto {
    esValido: boolean;
    mensaje?: string;
    montoDisponible?: number;
}

export interface EstadoDetalle {
    esCompleto: boolean;
    camposFaltantes: string[];
    requiereGuardado: boolean;
}

export interface ValidacionVencimiento {
    excedeDias: boolean;
    diasTranscurridos: number;
    requiereAutorizacion: boolean;
    mensaje: string;
    fechaInicioCalculo?: Date;
    claseCSS: string;
}

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

export const ENDPOINTS = {
    // Órdenes
    LISTAR_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    LISTAR_ANTICIPOS: 'contabilidad/obtenerSolicitudesPendientesAnticipos',
    SOLICITAR_AUTORIZACION_ANTICIPO: 'contabilidad/solicitarAutorizacionAnticiposPendientes',

    // Facturas
    BUSCAR_FACTURA: 'contabilidad/buscarPorNumeroDte',
    REGISTRAR_FACTURA: 'facturas/registro/facturaManual',
    SOLICITAR_AUTORIZACION: 'facturas/solicitarAutorizacionTardanza',

    // Liquidaciones
    OBTENER_DETALLES: 'contabilidad/obtenerDetallesLiquidacion',
    GUARDAR_DETALLE: 'contabilidad/guardarDetalleLiquidacion',
    ACTUALIZAR_DETALLE: 'contabilidad/actualizarDetalleLiquidacion',
    COPIAR_DETALLE: 'contabilidad/copiarDetalleLiquidacion',
    ELIMINAR_DETALLE: 'contabilidad/eliminarDetalleLiquidacion',
    OBTENER_DETALLE_COMPLETO: 'contabilidad/obtenerDetalleCompleto',

    // Catálogos
    OBTENER_AGENCIAS: 'contabilidad/buscarNombreLiquidacion',
    OBTENER_TIPOS_PAGO: 'contabilidad/obtenerTiposPago',
    LISTA_BANCOS: 'facturas/bancos/lista',
    LISTA_TIPOS_CUENTA: 'facturas/tiposCuenta/lista',

    // Servicios adicionales
    BUSCAR_SOCIOS: 'contabilidad/buscar_socios',
    BUSCAR_CUENTAS: 'contabilidad/buscar_cuentas',
    OBTENER_SOCIO: 'contabilidad/obtener_socio'
} as const;

export const TIPOS_PAGO_DEFAULT: TipoPago[] = [
    { id: 'deposito', nombre: 'Por depósito a cuenta', requiereFormulario: true },
    { id: 'transferencia', nombre: 'Por transferencia', requiereFormulario: true },
    { id: 'cheque', nombre: 'Por cheque', requiereFormulario: true },
    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiereFormulario: false },
    { id: 'anticipo', nombre: 'Por anticipo', requiereFormulario: false }
];

export const COLORES_ESTADO_LIQUIDACION = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'En Revisión': 'bg-blue-100 text-blue-800',
    'Liquidado': 'bg-green-100 text-green-800'
} as const;

export const COLORES_AUTORIZACION = {
    'aprobada': 'bg-green-100 text-green-800',
    'pendiente': 'bg-amber-100 text-amber-800',
    'rechazada': 'bg-red-100 text-red-800',
    'ninguna': 'bg-gray-100 text-gray-800'
} as const;

export const COLORES_TIPO_PAGO = {
    'deposito': 'bg-blue-100 text-blue-800',
    'transferencia': 'bg-green-100 text-green-800',
    'cheque': 'bg-purple-100 text-purple-800',
    'tarjeta': 'bg-yellow-100 text-yellow-800',
    'anticipo': 'bg-orange-100 text-orange-800'
} as const;

export const COLORES_TIPO_ANTICIPO = {
    [TipoAnticipo.CHEQUE]: 'bg-blue-100 text-blue-800',
    [TipoAnticipo.EFECTIVO]: 'bg-green-100 text-green-800',
    [TipoAnticipo.TRANSFERENCIA]: 'bg-purple-100 text-purple-800'
} as const;

export const COLORES_ESTADO_LIQUIDACION_ANTICIPO = {
    [EstadoLiquidacion.NO_LIQUIDADO]: {
        texto: 'Sin liquidar',
        color: 'bg-gray-100 text-gray-800',
        dot: 'bg-gray-400'
    },
    [EstadoLiquidacion.RECIENTE]: {
        texto: 'Reciente',
        color: 'bg-green-100 text-green-800',
        dot: 'bg-green-500'
    },
    [EstadoLiquidacion.EN_TIEMPO]: {
        texto: 'En tiempo',
        color: 'bg-yellow-100 text-yellow-800',
        dot: 'bg-yellow-500'
    },
    [EstadoLiquidacion.FUERA_DE_TIEMPO]: {
        texto: 'Fuera de tiempo',
        color: 'bg-red-100 text-red-800',
        dot: 'bg-red-500'
    },
    [EstadoLiquidacion.LIQUIDADO]: {
        texto: 'Liquidado',
        color: 'bg-emerald-100 text-emerald-800',
        dot: 'bg-emerald-500'
    }
} as const;

// ============================================================================
// INTERFACES ADICIONALES PARA SOCIOS Y CUENTAS
// ============================================================================

export interface Socio {
    id_socio: number;
    nombre: string;
    numero_identificacion?: string;
}

export interface CuentaSocio {
    NumeroCuenta: number;
    Producto: string;
    Estado: string;
}

// ============================================================================
// CONFIGURACIÓN Y LÍMITES
// ============================================================================

export const CONFIGURACION = {
    DEBOUNCE_BUSQUEDA_MS: 1000,
    MIN_CARACTERES_BUSQUEDA: 3,
    LIMITE_PAGINACION_DEFAULT: 20,
    TIMEOUT_LOADING_MS: 30000,
    TOLERANCIA_DIFERENCIA_MONTO: 0.01,

    // Validaciones de formularios
    MIN_DESCRIPCION: 5,
    MAX_DESCRIPCION: 200,
    MIN_JUSTIFICACION: 20,
    MAX_JUSTIFICACION: 500,
    MIN_OBSERVACIONES: 0,
    MAX_OBSERVACIONES: 500,
    MIN_MONTO: 0.01,

    // Límites de caracteres para campos
    MAX_NUMERO_CUENTA: 20,
    MAX_NOMBRE_BENEFICIARIO: 100,
    MAX_NOMBRE_CUENTA: 100,
    MIN_NOMBRE_BENEFICIARIO: 3,
    MIN_NOMBRE_CUENTA: 3
} as const;

// ============================================================================
// MENSAJES DE VALIDACIÓN
// ============================================================================

export const MENSAJES_VALIDACION = {
    CAMPO_REQUERIDO: 'Este campo es obligatorio',
    EMAIL_INVALIDO: 'Ingrese un correo electrónico válido',
    MONTO_MINIMO: 'El monto debe ser mayor a 0',
    DESCRIPCION_MINIMA: `Mínimo ${CONFIGURACION.MIN_DESCRIPCION} caracteres`,
    DESCRIPCION_MAXIMA: `Máximo ${CONFIGURACION.MAX_DESCRIPCION} caracteres`,
    JUSTIFICACION_MINIMA: `Mínimo ${CONFIGURACION.MIN_JUSTIFICACION} caracteres`,
    JUSTIFICACION_MAXIMA: `Máximo ${CONFIGURACION.MAX_JUSTIFICACION} caracteres`,
    NOMBRE_MINIMO: 'Mínimo 3 caracteres',
    PATRON_COMPROBANTE: 'Solo letras, números y guiones',
    MONTO_EXCEDIDO: 'El monto excede el disponible',
    FECHA_INVALIDA: 'Fecha inválida',
    SELECCION_REQUERIDA: 'Debe seleccionar una opción'
} as const;

export const MENSAJES_EXITO = {
    FACTURA_REGISTRADA: 'Factura registrada correctamente',
    DETALLE_GUARDADO: 'Detalle guardado correctamente',
    DETALLE_ACTUALIZADO: 'Detalle actualizado correctamente',
    DETALLE_ELIMINADO: 'Detalle eliminado correctamente',
    DETALLE_COPIADO: 'Detalle copiado correctamente',
    AUTORIZACION_ENVIADA: 'Solicitud de autorización enviada correctamente',
    SOLICITUD_ANTICIPO_ENVIADA: 'Solicitud de autorización de anticipo enviada correctamente'
} as const;

export const MENSAJES_ERROR = {
    ERROR_CARGAR_ORDENES: 'Error al cargar las órdenes',
    ERROR_BUSCAR_FACTURA: 'Error al buscar la factura',
    ERROR_REGISTRAR_FACTURA: 'Error al registrar la factura',
    ERROR_CARGAR_DETALLES: 'Error al cargar los detalles',
    ERROR_GUARDAR_DETALLE: 'Error al guardar el detalle',
    ERROR_ACTUALIZAR_DETALLE: 'Error al actualizar el detalle',
    ERROR_ELIMINAR_DETALLE: 'Error al eliminar el detalle',
    ERROR_COPIAR_DETALLE: 'Error al copiar el detalle',
    ERROR_CARGAR_ANTICIPOS: 'Error al cargar los anticipos',
    ERROR_SOLICITAR_AUTORIZACION: 'Error al solicitar autorización',
    ERROR_CARGAR_CATALOGOS: 'Error al cargar los catálogos',
    ERROR_VALIDAR_VENCIMIENTO: 'Error al validar vencimiento',
    FACTURA_NO_ENCONTRADA: 'Factura no encontrada',
    ORDEN_NO_ENCONTRADA: 'Orden no encontrada',
    CAMPOS_INCOMPLETOS: 'Complete todos los campos obligatorios'
} as const;

// ============================================================================
// UTILIDADES DE TIPO
// ============================================================================

export type EstadoLiquidacionKey = keyof typeof COLORES_ESTADO_LIQUIDACION;
export type AutorizacionEstadoKey = keyof typeof COLORES_AUTORIZACION;
export type TipoPagoKey = keyof typeof COLORES_TIPO_PAGO;

// Helpers para type safety
export function esTipoPagoValido(tipo: string): tipo is TipoPagoId {
    return ['deposito', 'transferencia', 'cheque', 'tarjeta', 'anticipo'].includes(tipo);
}

export function esEstadoLiquidacionValido(estado: string): estado is EstadoLiquidacionTexto {
    return ['Pendiente', 'Liquidado', 'En Revisión'].includes(estado);
}

export function esAutorizacionEstadoValido(estado: string): estado is AutorizacionEstado {
    return Object.values(AutorizacionEstado).includes(estado as AutorizacionEstado);
}

// ============================================================================
// INTERFACES PARA EVENTOS Y CALLBACKS
// ============================================================================

export interface EventoDetalle {
    tipo: 'crear' | 'editar' | 'eliminar' | 'copiar';
    detalle?: DetalleLiquidacionPE;
    index?: number;
}

export interface EventoFactura {
    tipo: 'encontrada' | 'registrada' | 'autorizada';
    factura: FacturaPE;
}

export interface EventoAnticipo {
    tipo: 'solicitud_enviada' | 'autorizado' | 'rechazado';
    numeroOrden: number;
    idSolicitud?: number;
}

// ============================================================================
// TIPOS PARA FORMULARIOS REACTIVOS
// ============================================================================

export interface FormularioRegistrarFactura {
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: Moneda;
}

export interface FormularioAutorizacion {
    motivo: string;
}

export interface FormularioDetalleLiquidacion {
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor: string;
    forma_pago: TipoPagoId;
    banco?: string;
    cuenta?: string;
}

export interface FormularioSolicitudAnticipo {
    justificacion: string;
}

// ============================================================================
// INTERFACES PARA ESTADO GLOBAL
// ============================================================================

export interface EstadoPlanEmpresarial {
    ordenes: OrdenPlanEmpresarial[];
    cargandoOrdenes: boolean;
    facturaActual: FacturaPE | null;
    cargandoFactura: boolean;
    detalles: DetalleLiquidacionPE[];
    cargandoDetalles: boolean;
    guardandoDetalles: boolean;
    anticipos: AnticipoPendientePE[];
    cargandoAnticipos: boolean;
    enviandoSolicitud: boolean;
    agencias: AgenciaPE[];
    tiposPago: TipoPago[];
    bancos: BancoPE[];
    tiposCuenta: TipoCuentaPE[];
    ordenesAutorizadas: OrdenAutorizadaPE[];
    validacionVencimiento: ValidacionVencimiento | null;
}

// ============================================================================
// TIPOS PARA TRACK BY FUNCTIONS
// ============================================================================

export type TrackByFunction<T> = (index: number, item: T) => any;

export const trackByFunctions = {
    orden: (index: number, orden: OrdenPlanEmpresarial) => orden.numeroOrden,
    detalle: (index: number, detalle: DetalleLiquidacionPE) => detalle.id || index,
    agencia: (index: number, agencia: AgenciaPE) => agencia.id,
    tipoPago: (index: number, tipo: TipoPago) => tipo.id,
    banco: (index: number, banco: BancoPE) => banco.id_banco,
    tipoCuenta: (index: number, tipo: TipoCuentaPE) => tipo.id_tipo_cuenta,
    anticipo: (index: number, anticipo: AnticipoPendientePE) => anticipo.idSolicitud,
    socio: (index: number, socio: Socio) => socio.id_socio,
    cuenta: (index: number, cuenta: CuentaSocio) => cuenta.NumeroCuenta
} as const;