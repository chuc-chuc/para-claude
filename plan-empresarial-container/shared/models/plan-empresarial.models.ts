// shared/models/plan-empresarial.models.ts

/** Moneda usada en facturas */
export type Moneda = 'GTQ' | 'USD';

/** Estados de liquidación (según tu backend) */
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
    requiereFormulario: boolean; // true = abre su propio formulario (depósito/transferencia/cheque)
}

/** Catálogo por defecto (puedes sobreescribir desde el backend si quieres) */
export const TIPOS_PAGO_DEFAULT: TipoPago[] = [
    { id: 'deposito', nombre: 'Por depósito a cuenta', requiereFormulario: true },
    { id: 'transferencia', nombre: 'Por transferencia', requiereFormulario: true },
    { id: 'cheque', nombre: 'Por cheque', requiereFormulario: true },
    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiereFormulario: false },
    { id: 'anticipo', nombre: 'Por anticipo', requiereFormulario: false },
];

/** Factura unificada que combina ambas definiciones */
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

/** Detalle de liquidación en la UI */
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

/** Orden del Plan Empresarial ya autorizada/activa para gestión */
export interface OrdenPlanEmpresarial {
    numeroOrden: number;
    total: number;
    montoLiquidado: number;
    montoPendiente: number;
    totalAnticipos: number;
    anticiposPendientesOTardios: number;
}

// === Interfaces para payloads ===

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

// === Interfaces para respuestas del backend ===

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
    monto_total: string; // viene como string en tu backend
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