// ============================================================================
// MODELOS FACTURAS PLAN EMPRESARIAL - COMPLETO Y ACTUALIZADO
// ============================================================================

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

export interface FacturaPE {
    id?: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    monto_liquidado: number;
    estado_liquidacion: 'Pendiente' | 'En Revisión' | 'Liquidado' | 'Verificado' | 'Pagado'; // Actualizado
    moneda: 'GTQ' | 'USD';

    // Campos de autorización existentes
    dias_transcurridos?: number;
    estado_autorizacion?: 'ninguna' | 'pendiente' | 'aprobada' | 'rechazada';
    motivo_autorizacion?: string;
    fecha_solicitud?: string;
    fecha_autorizacion?: string;
    comentarios_autorizacion?: string;

    // NUEVOS campos agregados del backend
    estado_factura?: 'vigente' | 'Anulado' | 'suspendida';
    cantidad_liquidaciones?: number;
    monto_retencion?: number;
    tipo_retencion?: number;
    solicitado_por?: string;
    autorizado_por?: string;
    autorizacion_id?: number;
    tiene_autorizacion_tardanza?: number;
    estado?: string;
    estado_id?: number;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    detalles_liquidacion?: DetalleLiquidacionPE[];
}

export interface DetalleLiquidacionPE {
    id?: number;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor: string;
    forma_pago: 'deposito' | 'transferencia' | 'cheque' | 'efectivo' | '';
    banco?: string;
    cuenta?: string;

    // Estados para edición inline - PROPIEDADES NECESARIAS AGREGADAS
    editando?: boolean;
    guardando?: boolean;

    // Propiedades temporales para edición inline - AGREGADAS
    _editandoMonto?: boolean;
    _montoTemp?: number;
    _editandoAgencia?: boolean;
    _agenciaTemp?: string;

    // Campos adicionales
    factura_id?: number;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    datos_especificos?: any;
    informacion_adicional?: any;
}

export interface OrdenPE {
    numero_orden: number;
    total: number;
    monto_liquidado: number;
    monto_pendiente: number;
    anticipos_pendientes: number;
    area?: string;
    presupuesto?: string;
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

// NUEVA interfaz para permisos de edición
export interface PermisosEdicion {
    puedeVer: boolean;
    puedeEditar: boolean;
    puedeAgregar: boolean;
    puedeEliminar: boolean;
    razon: string;
    claseCSS: string;
}

// ============================================================================
// PAYLOADS PARA API
// ============================================================================

export interface BuscarFacturaPayload {
    texto: string;
}

export interface RegistrarFacturaPayload {
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: 'GTQ' | 'USD';
}

export interface SolicitarAutorizacionPayload {
    numero_dte: string;
    motivo: string;
    dias_transcurridos: number;
}

export interface LiquidarFacturaPayload {
    numero_dte: string;
    confirmar: boolean;
}

export interface GuardarDetalleLiquidacionPayload {
    id?: number;
    numero_factura: string;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string;
    forma_pago: string;
    banco?: string;
    cuenta?: string;

    // Campos específicos según tipo de pago
    datos_especificos?: any;
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T = any> {
    respuesta: 'success' | 'error';
    datos?: T;
    mensaje?: string | string[];
}

// ============================================================================
// CONSTANTES Y CATÁLOGOS
// ============================================================================

export const TIPOS_DTE = [
    { codigo: '1', nombre: 'RECIBO' },
    { codigo: '2', nombre: 'FACT' }
];

export const AUTORIZACIONES = [
    { codigo: '1', nombre: 'COOPERATIVA EL BIENESTAR' },
    { codigo: '2', nombre: 'PEDRO NOE YAC' }
];

export const MONEDAS: Array<'GTQ' | 'USD'> = ['GTQ', 'USD'];

export const FORMAS_PAGO = [
    { id: 'deposito', nombre: 'Depósito' },
    { id: 'transferencia', nombre: 'Transferencia' },
    { id: 'cheque', nombre: 'Cheque' },
    { id: 'anticipo', nombre: 'Anticipo' },
    { id: 'tarjeta', nombre: 'Tarjeta de Credito' },
    { id: 'contrasena', nombre: 'Pago por Contraseña' },
    { id: 'costoasumido', nombre: 'Costo Asumido por el Colaborador' }
];

// NUEVOS estados agregados
export const ESTADOS_LIQUIDACION_TODOS = [
    { codigo: 'Pendiente', nombre: 'Pendiente' },
    { codigo: 'En Revisión', nombre: 'En Revisión' },
    { codigo: 'Verificado', nombre: 'Verificado' },
    { codigo: 'Liquidado', nombre: 'Liquidado' },
    { codigo: 'Pagado', nombre: 'Pagado' }
];

export const ESTADOS_FACTURA = [
    { codigo: 'vigente', nombre: 'Vigente' },
    { codigo: 'anulada', nombre: 'Anulada' },
    { codigo: 'suspendida', nombre: 'Suspendida' }
];

export const ENDPOINTS = {
    BUSCAR_FACTURA: 'contabilidad/buscarPorNumeroDte',
    REGISTRAR_FACTURA: 'facturas/registro/facturaManual',
    LIQUIDAR_FACTURA: 'contabilidad/liquidarFactura',
    SOLICITAR_AUTORIZACION: 'facturas/solicitarAutorizacionTardanza',
    OBTENER_DETALLES: 'contabilidad/obtenerDetallesLiquidacion',
    GUARDAR_DETALLE: 'contabilidad/guardarDetalleLiquidacion',
    ELIMINAR_DETALLE: 'contabilidad/eliminarDetalleLiquidacion',
    ACTUALIZAR_DETALLE: 'contabilidad/actualizarDetalleLiquidacion',
    OBTENER_ORDENES: 'contabilidad/obtenerOrdenesAutorizadas',
    OBTENER_AGENCIAS: 'contabilidad/buscarNombreLiquidacion',
    OBTENER_BANCOS: 'facturas/bancos/lista',
    OBTENER_TIPOS_CUENTA: 'facturas/tiposCuenta/lista',
    REALIZAR_COPIA: 'contabilidad/copiarDetalleLiquidacion',
    OBTENER_DETALLE_COMPLETO: 'contabilidad/obtenerDetalleCompleto',
    ACTUALIZAR_MONTO_AGENCIA: 'contabilidad/actualizarMontoAgencia'
} as const;

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(monto);
}

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

export function formatearFechaHora(fecha: string | null | undefined): string {
    if (!fecha) return '-';
    try {
        return new Date(fecha).toLocaleString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch {
        return '-';
    }
}

export function truncarTexto(texto: string, longitud: number = 50): string {
    if (!texto) return '';
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud).trim() + '...';
}

// ============================================================================
// UTILIDADES DE COLORES Y ESTILOS
// ============================================================================

export function obtenerColorEstadoLiquidacion(estado: string): string {
    const colores = {
        'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'En Revisión': 'bg-blue-100 text-blue-800 border-blue-200',
        'Verificado': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'Liquidado': 'bg-green-100 text-green-800 border-green-200',
        'Pagado': 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
    return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function obtenerColorEstadoAutorizacion(estado: string): string {
    const colores = {
        'aprobada': 'bg-green-100 text-green-800 border-green-200',
        'pendiente': 'bg-amber-100 text-amber-800 border-amber-200',
        'rechazada': 'bg-red-100 text-red-800 border-red-200',
        'ninguna': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-700 border-gray-200';
}

// NUEVA función para estado de factura
export function obtenerColorEstadoFactura(estado: string): string {
    const colores = {
        'vigente': 'bg-green-100 text-green-800 border-green-200',
        'anulada': 'bg-red-100 text-red-800 border-red-200',
        'suspendida': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function obtenerColorFormaPago(formaPago: string): string {
    const colores = {
        'deposito': 'bg-blue-100 text-blue-800',
        'transferencia': 'bg-green-100 text-green-800',
        'cheque': 'bg-purple-100 text-purple-800',
        'efectivo': 'bg-orange-100 text-orange-800'
    };
    return colores[formaPago as keyof typeof colores] || 'bg-gray-100 text-gray-800';
}

// ============================================================================
// VALIDACIONES
// ============================================================================

export function validarFactura(factura: Partial<RegistrarFacturaPayload>): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!factura.numero_dte?.trim()) {
        errores.push('Número DTE es requerido');
    } else if (factura.numero_dte.trim().length < 3) {
        errores.push('Número DTE debe tener al menos 3 caracteres');
    } else if (factura.numero_dte.trim().length > 25) {
        errores.push('Número DTE no puede exceder 25 caracteres');
    }

    if (!factura.fecha_emision) {
        errores.push('Fecha de emisión es requerida');
    } else {
        const fecha = new Date(factura.fecha_emision);
        const hoy = new Date();
        if (fecha > hoy) {
            errores.push('La fecha de emisión no puede ser futura');
        }
    }

    if (!factura.numero_autorizacion?.trim()) {
        errores.push('Número de autorización es requerido');
    }

    if (!factura.tipo_dte?.trim()) {
        errores.push('Tipo DTE es requerido');
    }

    if (!factura.nombre_emisor?.trim()) {
        errores.push('Nombre del emisor es requerido');
    } else if (factura.nombre_emisor.trim().length < 3) {
        errores.push('Nombre del emisor debe tener al menos 3 caracteres');
    } else if (factura.nombre_emisor.trim().length > 200) {
        errores.push('Nombre del emisor no puede exceder 200 caracteres');
    }

    if (!factura.monto_total || factura.monto_total <= 0) {
        errores.push('Monto total debe ser mayor a 0');
    } else if (factura.monto_total > 999999999.99) {
        errores.push('Monto total excede el límite permitido');
    }

    if (!factura.moneda || !['GTQ', 'USD'].includes(factura.moneda)) {
        errores.push('Moneda debe ser GTQ o USD');
    }

    return { valido: errores.length === 0, errores };
}

export function validarAutorizacion(payload: Partial<SolicitarAutorizacionPayload>): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!payload.numero_dte?.trim()) {
        errores.push('Número DTE es requerido');
    }

    if (!payload.motivo?.trim()) {
        errores.push('Motivo es requerido');
    } else if (payload.motivo.trim().length < 10) {
        errores.push('Motivo debe tener al menos 10 caracteres');
    } else if (payload.motivo.trim().length > 500) {
        errores.push('Motivo no puede exceder 500 caracteres');
    }

    if (!payload.dias_transcurridos || payload.dias_transcurridos < 0) {
        errores.push('Días transcurridos debe ser un número válido');
    }

    return { valido: errores.length === 0, errores };
}

export function validarDetalleLiquidacion(detalle: Partial<DetalleLiquidacionPE>): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!detalle.numero_orden?.trim()) {
        errores.push('Número de orden es requerido');
    }

    if (!detalle.agencia?.trim()) {
        errores.push('Agencia es requerida');
    }

    if (!detalle.descripcion?.trim()) {
        errores.push('Descripción es requerida');
    } else if (detalle.descripcion.trim().length < 5) {
        errores.push('Descripción debe tener al menos 5 caracteres');
    }

    if (!detalle.monto || detalle.monto <= 0) {
        errores.push('Monto debe ser mayor a 0');
    }

    if (!detalle.forma_pago?.trim()) {
        errores.push('Forma de pago es requerida');
    }

    return { valido: errores.length === 0, errores };
}

// ============================================================================
// NUEVAS FUNCIONES PARA VALIDAR PERMISOS
// ============================================================================

export function validarPermisosEdicion(
    factura: FacturaPE | null,
    validacionDiasHabiles: any = null
): PermisosEdicion {
    const permisos: PermisosEdicion = {
        puedeVer: true,
        puedeEditar: false,
        puedeAgregar: false,
        puedeEliminar: false,
        razon: 'Sin factura seleccionada',
        claseCSS: 'text-gray-600 bg-gray-50 border-gray-200'
    };

    if (!factura) {
        return permisos;
    }

    // 1. PRIMERA VALIDACIÓN: Verificar si la factura está vigente
    if (factura.estado_factura !== 'vigente') {
        permisos.razon = `Factura ${factura.estado_factura || 'no vigente'} - Solo lectura`;
        permisos.claseCSS = 'text-red-700 bg-red-50 border-red-200';
        return permisos;
    }

    // 2. SEGUNDA VALIDACIÓN: Verificar si el estado de liquidación es "Pendiente"
    if (factura.estado_liquidacion !== 'Pendiente') {
        permisos.razon = `Estado '${factura.estado_liquidacion}' - Solo lectura`;
        permisos.claseCSS = 'text-blue-700 bg-blue-50 border-blue-200';
        return permisos;
    }

    // 3. TERCERA VALIDACIÓN: Verificar si tiene detalles de liquidación registrados
    const tieneDetalles = factura.cantidad_liquidaciones && factura.cantidad_liquidaciones > 0;

    if (tieneDetalles) {
        // Si tiene detalles registrados previamente, permitir todas las acciones
        permisos.puedeEditar = true;
        permisos.puedeAgregar = true;
        permisos.puedeEliminar = true;
        permisos.razon = `Edición permitida - ${factura.cantidad_liquidaciones} liquidaciones registradas`;
        permisos.claseCSS = 'text-green-700 bg-green-50 border-green-200';
        return permisos;
    }

    // 4. CUARTA VALIDACIÓN: Para facturas sin detalles previos, verificar tiempo
    if (!validacionDiasHabiles) {
        permisos.razon = 'Validando tiempo de liquidación...';
        permisos.claseCSS = 'text-yellow-700 bg-yellow-50 border-yellow-200';
        return permisos;
    }

    const enTiempo = !validacionDiasHabiles.excedeDias;

    if (enTiempo) {
        // Está dentro del tiempo permitido
        permisos.puedeEditar = true;
        permisos.puedeAgregar = true;
        permisos.puedeEliminar = true;
        permisos.razon = `Edición permitida - ${validacionDiasHabiles.mensaje}`;
        permisos.claseCSS = 'text-green-700 bg-green-50 border-green-200';
        return permisos;
    }

    // 5. QUINTA VALIDACIÓN: Fuera de tiempo, verificar autorización
    const tieneAutorizacionAprobada = factura.estado_autorizacion === 'aprobada';

    if (tieneAutorizacionAprobada) {
        // Tiene autorización aprobada para liquidación tardía
        permisos.puedeEditar = true;
        permisos.puedeAgregar = true;
        permisos.puedeEliminar = true;
        permisos.razon = `Edición permitida - Autorización aprobada para liquidación tardía`;
        permisos.claseCSS = 'text-blue-700 bg-blue-50 border-blue-200';
        return permisos;
    }

    // 6. CASO FINAL: Fuera de tiempo sin autorización
    permisos.razon = `Fuera de tiempo - Requiere autorización especial`;
    permisos.claseCSS = 'text-red-700 bg-red-50 border-red-200';
    return permisos;
}

// ============================================================================
// UTILIDADES DE DATOS
// ============================================================================

export function normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remover acentos
}

export function esNumeroOrdenValido(numeroOrden: string): boolean {
    if (!numeroOrden) return false;
    const numero = parseInt(numeroOrden, 10);
    return !isNaN(numero) && numero > 0 && numero <= 999999999;
}

export function esDteValido(numeroDte: string): boolean {
    if (!numeroDte) return false;
    const dteNormalizado = numeroDte.trim();
    return dteNormalizado.length >= 3 &&
        dteNormalizado.length <= 25 &&
        /^[A-Za-z0-9\-_]+$/.test(dteNormalizado);
}

export function calcularDiferenciaMontos(montoFactura: number, montoDetalles: number): number {
    return Math.abs(montoFactura - montoDetalles);
}

export function hayDiferenciaSignificativa(montoFactura: number, montoDetalles: number, tolerancia: number = 0.01): boolean {
    return calcularDiferenciaMontos(montoFactura, montoDetalles) > tolerancia;
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export type EstadoLiquidacion = 'Pendiente' | 'En Revisión' | 'Verificado' | 'Liquidado' | 'Pagado';
export type EstadoAutorizacion = 'ninguna' | 'pendiente' | 'aprobada' | 'rechazada';
export type EstadoFactura = 'vigente' | 'Anulado' | 'suspendida';
export type FormaPago = 'deposito' | 'transferencia' | 'cheque' | 'efectivo';
export type Moneda = 'GTQ' | 'USD';

export interface ResultadoValidacion {
    valido: boolean;
    errores: string[];
}

export interface EstadisticasFactura {
    numero_dte: string;
    monto_total: number;
    monto_liquidado: number;
    monto_retencion: number;
    cantidad_detalles: number;
    diferencia_montos: number;
    estado_liquidacion: EstadoLiquidacion;
    estado_factura: EstadoFactura;
    requiere_autorizacion: boolean;
    puede_liquidar: boolean;
}

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

export const CONFIGURACION = {
    // Límites de validación
    DTE_MIN_LENGTH: 3,
    DTE_MAX_LENGTH: 25,
    NOMBRE_EMISOR_MIN_LENGTH: 3,
    NOMBRE_EMISOR_MAX_LENGTH: 200,
    MOTIVO_MIN_LENGTH: 10,
    MOTIVO_MAX_LENGTH: 500,
    DESCRIPCION_MIN_LENGTH: 5,
    MONTO_MAX: 999999999.99,

    // Configuraciones de UI
    DEBOUNCE_BUSQUEDA_MS: 1000,
    TOLERANCIA_DIFERENCIA_MONTOS: 0.01,
    DIAS_LIMITE_AUTORIZACION: 30,

    // Estados que permiten edición
    ESTADOS_EDITABLES: ['Pendiente'],

    // Formatos
    FORMATO_FECHA: 'dd/MM/yyyy',
    FORMATO_FECHA_HORA: 'dd/MM/yyyy HH:mm',
    FORMATO_MONEDA: 'es-GT'
} as const;

export const MENSAJES = {
    EXITO: {
        FACTURA_REGISTRADA: 'Factura registrada correctamente',
        FACTURA_LIQUIDADA: 'Factura liquidada exitosamente',
        AUTORIZACION_ENVIADA: 'Solicitud de autorización enviada correctamente',
        DETALLE_GUARDADO: 'Detalle guardado correctamente'
    },
    ERROR: {
        FACTURA_NO_ENCONTRADA: 'Factura no encontrada',
        ERROR_BUSQUEDA: 'Error al buscar la factura',
        ERROR_REGISTRO: 'Error al registrar la factura',
        ERROR_LIQUIDACION: 'Error al liquidar la factura',
        ERROR_AUTORIZACION: 'Error al enviar la solicitud de autorización',
        ERROR_CONEXION: 'Error de conexión con el servidor'
    },
    INFO: {
        SIN_RESULTADOS: 'No se encontraron resultados',
        CAMPOS_REQUERIDOS: 'Complete todos los campos requeridos',
        DIFERENCIA_MONTOS: 'Hay diferencias en los montos que deben revisarse'
    },
    PERMISOS: {
        SIN_FACTURA: 'Seleccione una factura para comenzar',
        FACTURA_NO_VIGENTE: 'La factura no está vigente - Solo lectura permitida',
        ESTADO_NO_EDITABLE: 'El estado actual no permite modificaciones',
        CON_LIQUIDACIONES: 'Puede editar - Tiene liquidaciones registradas',
        EN_TIEMPO: 'Puede editar - Dentro del tiempo permitido',
        AUTORIZADO: 'Puede editar - Autorización aprobada para liquidación tardía',
        FUERA_TIEMPO: 'No puede editar - Fuera de tiempo sin autorización',
        VALIDANDO: 'Validando permisos...'
    }
} as const;

// ============================================================================
// UTILIDADES ADICIONALES
// ============================================================================

export function generarEstadisticasFactura(factura: FacturaPE, detalles: DetalleLiquidacionPE[]): EstadisticasFactura {
    const montoDetalles = detalles.reduce((total, detalle) => total + detalle.monto, 0);
    const diferencia = calcularDiferenciaMontos(factura.monto_total, montoDetalles);
    const requiereAutorizacion = (factura.dias_transcurridos || 0) > CONFIGURACION.DIAS_LIMITE_AUTORIZACION;

    return {
        numero_dte: factura.numero_dte,
        monto_total: factura.monto_total,
        monto_liquidado: montoDetalles,
        monto_retencion: factura.monto_retencion || 0,
        cantidad_detalles: detalles.length,
        diferencia_montos: diferencia,
        estado_liquidacion: factura.estado_liquidacion,
        estado_factura: factura.estado_factura || 'vigente',
        requiere_autorizacion: requiereAutorizacion,
        puede_liquidar: factura.estado_liquidacion === 'Pendiente' &&
            (!requiereAutorizacion || factura.estado_autorizacion === 'aprobada') &&
            diferencia <= CONFIGURACION.TOLERANCIA_DIFERENCIA_MONTOS
    };
}

export function obtenerTextoEstado(estado: EstadoLiquidacion): string {
    const textos = {
        'Pendiente': 'Pendiente de liquidación',
        'En Revisión': 'En proceso de revisión',
        'Verificado': 'Liquidación verificada',
        'Liquidado': 'Completamente liquidado',
        'Pagado': 'Liquidado y pagado'
    };
    return textos[estado] || estado;
}

export function obtenerTextoAutorizacion(estado: EstadoAutorizacion): string {
    const textos = {
        'ninguna': 'No requiere autorización',
        'pendiente': 'Autorización pendiente',
        'aprobada': 'Autorización aprobada',
        'rechazada': 'Autorización rechazada'
    };
    return textos[estado] || estado;
}

export function obtenerTextoEstadoFactura(estado: EstadoFactura): string {
    const textos = {
        'vigente': 'Factura vigente',
        'Anulado': 'Factura anulada',
        'suspendida': 'Factura suspendida'
    };
    return textos[estado] || estado;
}