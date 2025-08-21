// services/liquidaciones-pe.mapper.ts
import {
    DetalleLiquidacionApi,
    DetalleLiquidacionPE,
    EstadoLiquidacionId,
    EstadoLiquidacionTexto,
    FacturaApi,
    FacturaPE,
    Moneda,
    TipoPagoId,
} from '../models/liquidaciones-pe.models';

function toNumberSafe(n: any, fallback = 0): number {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return isNaN(v) ? fallback : v;
}

function mapEstadoTexto(estadoId?: number, estado_liquidacion?: string): EstadoLiquidacionTexto | undefined {
    if (estadoId === EstadoLiquidacionId.EnRevision) return 'En Revisión';
    if (estadoId === EstadoLiquidacionId.Liquidado) return 'Liquidado';
    if (estadoId === EstadoLiquidacionId.Pendiente) return 'Pendiente';

    if (estado_liquidacion) {
        const s = estado_liquidacion.toLowerCase();
        if (s.includes('revisión') || s.includes('revision')) return 'En Revisión';
        if (s.includes('liquidado')) return 'Liquidado';
        return 'Pendiente';
    }
    return undefined;
}

export function mapFacturaApi(api: FacturaApi): FacturaPE {
    return {
        id: api.id,
        numero_dte: api.numero_dte,
        fecha_emision: api.fecha_emision,
        numero_autorizacion: api.numero_autorizacion,
        tipo_dte: api.tipo_dte,
        nombre_emisor: api.nombre_emisor,
        monto_total: toNumberSafe(api.monto_total, 0),
        estado: api.estado,
        estado_id: api.estado_id as any,
        estado_liquidacion: mapEstadoTexto(api.estado_id, api.estado_liquidacion),
        monto_liquidado: toNumberSafe(api.monto_liquidado ?? 0, 0),
        moneda: (api.moneda as Moneda) ?? 'GTQ'
    };
}

export function mapDetalleApi(api: DetalleLiquidacionApi): DetalleLiquidacionPE {
    return {
        id: api.id,
        numero_orden: String(api.numero_orden ?? ''),
        agencia: api.agencia ?? '',
        descripcion: api.descripcion ?? '',
        monto: toNumberSafe(api.monto, 0),
        correo_proveedor: api.correo_proveedor ?? '',
        forma_pago: (api.forma_pago?.toLowerCase?.() as TipoPagoId) ?? 'deposito',
        banco: api.banco ?? '',
        cuenta: api.cuenta ?? '',
        factura_id: api.factura_id ?? null
    };
}

/** Prepara payload para guardar un detalle */
export function mapDetalleToPayload(detalle: DetalleLiquidacionPE) {
    return {
        id: detalle.id ?? null,
        factura_id: detalle.factura_id ?? null,
        numero_orden: detalle.numero_orden,
        agencia: detalle.agencia,
        descripcion: detalle.descripcion,
        monto: detalle.monto,
        correo_proveedor: detalle.correo_proveedor,
        forma_pago: detalle.forma_pago,
        banco: detalle.banco,
        cuenta: detalle.cuenta,
    };
}