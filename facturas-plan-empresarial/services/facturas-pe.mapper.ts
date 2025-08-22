// services/facturas-pe.mapper.ts
import {
    AutorizacionEstado,
    DetalleLiquidacionPE,
    EstadoLiquidacionPE,
    FacturaPE,
    Moneda,
} from '../models/facturas-pe.models';

const toInt = (v: any, def = 0) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
};
const toFloat = (v: any, def = 0) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
};

function mapEstadoLiquidacion(api: any): EstadoLiquidacionPE {
    const s = ((api as string) || '').toLowerCase();
    if (s.includes('revisión') || s.includes('revision')) return EstadoLiquidacionPE.EnRevision;
    if (s.includes('liquidado')) return EstadoLiquidacionPE.Liquidado;
    return EstadoLiquidacionPE.Pendiente;
}

function mapAutorizacionEstado(api: any): AutorizacionEstado {
    const s = ((api as string) || '').toLowerCase();
    if (!s) return AutorizacionEstado.Ninguna;
    if (s === 'aprobada') return AutorizacionEstado.Aprobada;
    if (s === 'rechazada') return AutorizacionEstado.Rechazada;
    if (s === 'pendiente') return AutorizacionEstado.Pendiente;
    return AutorizacionEstado.Ninguna;
}

function mapDetalle(d: any): DetalleLiquidacionPE {
    return {
        id: toInt(d.id),
        factura_id: toInt(d.factura_id),
        numero_orden: toInt(d.numero_orden),
        agencia: d.agencia ?? '',
        descripcion: d.descripcion ?? '',
        monto: toFloat(d.monto),
        correo_proveedor: d.correo_proveedor ?? '',
        forma_pago: d.forma_pago ?? '',
        banco: d.banco ?? '',
        cuenta: d.cuenta ?? '',
        fecha_creacion: d.fecha_creacion ?? null,
    };
}

export function mapFacturaApi(api: any, monedaFallback: Moneda = 'GTQ'): FacturaPE {
    return {
        id: toInt(api.id),
        numero_dte: api.numero_dte ?? '',
        fecha_emision: api.fecha_emision ?? '',
        numero_autorizacion: api.numero_autorizacion ?? '',
        tipo_dte: api.tipo_dte ?? '',
        nombre_emisor: api.nombre_emisor ?? '',
        monto_total: toFloat(api.monto_total, 0),
        moneda: (api.moneda as Moneda) || monedaFallback,
        estado: api.estado ?? '',
        estado_id: toInt(api.estado_id, 1),
        estado_liquidacion: mapEstadoLiquidacion(api.estado_liquidacion),
        monto_liquidado: toFloat(api.monto_liquidado, 0),

        dias_transcurridos: api.dias_transcurridos ?? null,
        tiene_autorizacion_tardanza: (api.tiene_autorizacion_tardanza ?? 0) === 1,
        autorizacion_id: api.autorizacion_id ?? null,
        estado_autorizacion: mapAutorizacionEstado(api.estado_autorizacion),
        motivo_autorizacion: api.motivo_autorizacion ?? null,
        solicitado_por: api.solicitado_por ?? null,
        fecha_solicitud: api.fecha_solicitud ?? null,
        autorizado_por: api.autorizado_por ?? null,
        fecha_autorizacion: api.fecha_autorizacion ?? null,
        comentarios_autorizacion: api.comentarios_autorizacion ?? null,

        detalles_liquidacion: Array.isArray(api.detalles_liquidacion)
            ? api.detalles_liquidacion.map(mapDetalle)
            : [],
    };
}