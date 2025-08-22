// models/facturas-pe.models.ts
export type Moneda = 'GTQ' | 'USD';

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

export interface DetalleLiquidacionPE {
    id: number;
    factura_id: number;
    numero_orden: number;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor: string;
    forma_pago: string;
    banco: string;
    cuenta: string;
    fecha_creacion?: string | null;
}

export interface FacturaPE {
    id: number;
    numero_dte: string;
    fecha_emision: string;
    numero_autorizacion: string;
    tipo_dte: string;
    nombre_emisor: string;
    monto_total: number;
    moneda: Moneda;
    estado: string;
    estado_id: number;
    estado_liquidacion: EstadoLiquidacionPE;
    monto_liquidado: number;

    dias_transcurridos: number | null;
    tiene_autorizacion_tardanza: boolean;
    autorizacion_id: number | null;
    estado_autorizacion: AutorizacionEstado;
    motivo_autorizacion: string | null;
    solicitado_por: string | null;
    fecha_solicitud: string | null;
    autorizado_por: string | null;
    fecha_autorizacion: string | null;
    comentarios_autorizacion: string | null;

    detalles_liquidacion: DetalleLiquidacionPE[];
}

export interface BuscarFacturaResponse {
    respuesta: 'success' | 'error' | 'info';
    mensaje?: string;
    datos?: any[];
}

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