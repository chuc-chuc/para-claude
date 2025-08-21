// models/liquidaciones-pe.models.ts

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

/** Factura en la UI */
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
    // El detalle puede venir del backend pero en UI se maneja aparte
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
}

/** ==== Interfaces para respuestas del backend ==== */

export interface BuscarFacturaResponse {
    respuesta: 'success' | 'error';
    datos: FacturaApi[];
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