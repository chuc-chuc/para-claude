import {
    AnticipoPendientePE,
    EstadoLiquidacion,
    OrdenPlanEmpresarial,
    TipoAnticipo,
    UltimoSeguimientoPE
} from '../models/ordenes-pe.models';

const toInt = (v: any, def = 0) => {
    const n = parseInt(v);
    return Number.isFinite(n) ? n : def;
};
const toFloat = (v: any, def = 0) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
};

// === ORDENES ===
function mapOrdenApi(item: any): OrdenPlanEmpresarial {
    return {
        numeroOrden: toInt(item?.numero_orden),
        total: toFloat(item?.total),
        montoLiquidado: toFloat(item?.monto_liquidado),
        montoPendiente: toFloat(item?.monto_pendiente),
        totalAnticipos: toFloat(item?.total_anticipos),
        anticiposPendientesOTardios: toInt(item?.anticipos_pendientes_o_tardios)
    };
}

/** Export requerido por la fachada */
export function mapOrdenesApi(data: any[]): OrdenPlanEmpresarial[] {
    if (!Array.isArray(data)) return [];
    return data.map(mapOrdenApi).filter(o => o.numeroOrden > 0);
}

// === ANTICIPOS ===
function normalizarEstadoLiquidacion(apiEstado: any, dias: number | null): EstadoLiquidacion {
    const fromApi = (apiEstado as string) || '';
    const up = fromApi.toUpperCase();

    if (up === 'LIQUIDADO') return EstadoLiquidacion.LIQUIDADO;
    if (up === 'NO_LIQUIDADO' || up === '') {
        if (dias === null) return EstadoLiquidacion.NO_LIQUIDADO;
        if (dias >= 15) return EstadoLiquidacion.FUERA_DE_TIEMPO;
        if (dias >= 9) return EstadoLiquidacion.EN_TIEMPO;
        return EstadoLiquidacion.RECIENTE;
    }

    // Si el backend manda algún otro string, caemos al cálculo por días.
    if (dias === null) return EstadoLiquidacion.NO_LIQUIDADO;
    if (dias >= 15) return EstadoLiquidacion.FUERA_DE_TIEMPO;
    if (dias >= 9) return EstadoLiquidacion.EN_TIEMPO;
    return EstadoLiquidacion.RECIENTE;
}

function mapUltimoSeguimiento(api: any): UltimoSeguimientoPE | null {
    if (!api || typeof api !== 'object') return null;
    return {
        fechaSeguimiento: api.fecha_seguimiento ?? null,
        idEstado: api.id_estado ?? null,
        nombreEstado: api.nombre_estado ?? null,
        descripcionEstado: api.descripcion_estado ?? null,
        comentarioSolicitante: api.comentario_solicitante ?? null,
        fechaAutorizacion: api.fecha_autorizacion ?? null,
        comentarioAutorizador: api.comentario_autorizador ?? null
    };
}

/** Export usado por la fachada y el componente */
export function mapAnticipoApi(item: any): AnticipoPendientePE {
    const dias = (item?.dias_transcurridos === null || item?.dias_transcurridos === undefined)
        ? null
        : toInt(item.dias_transcurridos);

    const estado = normalizarEstadoLiquidacion(item?.estado_liquidacion, dias);

    return {
        idSolicitud: toInt(item?.id_solicitud),
        numeroOrden: toInt(item?.numero_orden),
        tipoAnticipo: (item?.tipo_anticipo as TipoAnticipo) ?? TipoAnticipo.CHEQUE,
        monto: toFloat(item?.monto),
        fechaLiquidacion: item?.fecha_liquidacion ?? null,
        diasTranscurridos: dias,
        estadoLiquidacion: estado,

        // extras
        estadoSolicitud: item?.estado_solicitud ?? null,
        requiereAutorizacion: item?.requiere_autorizacion ?? null,
        diasPermitidos: item?.dias_permitidos ?? null,
        motivoInclusion: item?.motivo_inclusion ?? null,
        ultimoSeguimiento: mapUltimoSeguimiento(item?.ultimo_seguimiento)
    };
}

/** Export requerido por la fachada */
export function mapAnticiposApi(data: any[]): AnticipoPendientePE[] {
    if (!Array.isArray(data)) return [];
    return data.map(mapAnticipoApi).filter(a => a.idSolicitud > 0);
}