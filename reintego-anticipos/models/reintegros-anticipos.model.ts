// ============================================
// MODELOS E INTERFACES - REINTEGROS DE ANTICIPOS
// Sistema de Contabilidad - TypeScript Models
// ============================================

/**
 * Estados posibles de un reintegro
 */
export type EstadoReintegro = 'pendiente' | 'en_revision' | 'verificado' | 'rechazado' | 'eliminado';

/**
 * Tipos de orden disponibles
 */
export type TipoOrden = 'compra' | 'servicio' | 'gasto' | 'otros';

/**
 * Tipos de búsqueda para el historial
 */
export type TipoBusquedaHistorial = 'fecha_verificacion' | 'numero_boleta' | 'usuario';

/**
 * Interface principal para un reintegro de anticipo
 */
export interface ReintegroAnticipo {
    id?: number;
    usuario_registra: string;
    monto_anticipo: number;
    numero_orden: string;
    tipo_orden: TipoOrden;
    numero_boleta: string;
    fecha_registro_transaccion: string;
    usuario_verificador?: string;
    fecha_verificacion?: string;
    estado: EstadoReintegro;
    comentario_registro?: string;
    comentario_verificacion?: string;
    observaciones_correccion?: string;
    banco_origen?: string;
    referencia_bancaria?: string;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    activo?: boolean;
}

/**
 * Interface para el reintegro con datos formateados (para mostrar en UI)
 */
export interface ReintegroAnticipoFormatted extends ReintegroAnticipo {
    nombre_usuario_registra?: string;
    nombre_verificador?: string;
    monto_anticipo_formatted?: string;
    fecha_registro_formatted?: string;
    fecha_verificacion_formatted?: string;
    fecha_creacion_formatted?: string;
    dias_pendientes?: number;
}

/**
 * Interface para crear un nuevo reintegro
 */
export interface NuevoReintegro {
    usuario_registra: string;
    monto_anticipo: number;
    numero_orden: string;
    tipo_orden: TipoOrden;
    numero_boleta: string;
    fecha_registro_transaccion: string;
    comentario_registro?: string;
    banco_origen?: string;
    referencia_bancaria?: string;
}

/**
 * Interface para actualizar un reintegro
 */
export interface ActualizarReintegro {
    id: number;
    usuario_registra: string;
    monto_anticipo?: number;
    numero_orden?: string;
    tipo_orden?: TipoOrden;
    numero_boleta?: string;
    fecha_registro_transaccion?: string;
    comentario_registro?: string;
    banco_origen?: string;
    referencia_bancaria?: string;
}

/**
 * Interface para verificar un reintegro
 */
export interface VerificarReintegro {
    id: number;
    usuario_verificador: string;
    comentario_verificacion?: string;
}

/**
 * Interface para solicitar correcciones
 */
export interface SolicitarCorreccion {
    id: number;
    usuario_verificador: string;
    observaciones_correccion: string;
}

/**
 * Interface para filtros de listado
 */
export interface FiltrosReintegros {
    usuario_registra?: string;
    estado?: EstadoReintegro;
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_orden?: TipoOrden;
}

/**
 * Interface para criterios de búsqueda en historial
 */
export interface CriteriosBusquedaHistorial {
    tipo_busqueda: TipoBusquedaHistorial;
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_boleta?: string;
    usuario_id?: string;
}

/**
 * Interface para estadísticas de reintegros
 */
export interface EstadisticasReintegros {
    total: number;
    verificados: number;
    rechazados: number;
    pendientes: number;
    monto_total: number;
    monto_total_formatted: string;
    monto_promedio: number;
    monto_promedio_formatted: string;
}

/**
 * Interface para respuesta del API
 */
export interface RespuestaAPI<T = any> {
    respuesta: string;
    mensaje?: string[];
    datos?: T;
    metadata?: {
        total_encontrados?: number;
        estadisticas?: EstadisticasReintegros;
    };
}

/**
 * Interface para opciones de select
 */
export interface OpcionSelect {
    valor: string;
    etiqueta: string;
    descripcion?: string;
}

/**
 * Constantes para opciones de formulario
 */
export const TIPOS_ORDEN: OpcionSelect[] = [
    { valor: 'compra', etiqueta: 'Compra', descripcion: 'Orden de compra de bienes' },
    { valor: 'servicio', etiqueta: 'Servicio', descripcion: 'Orden de servicios contratados' },
    { valor: 'gasto', etiqueta: 'Gasto', descripcion: 'Orden de gastos operativos' },
    { valor: 'otros', etiqueta: 'Otros', descripcion: 'Otros tipos de orden' }
];

export const ESTADOS_REINTEGRO: OpcionSelect[] = [
    { valor: 'pendiente', etiqueta: 'Pendiente', descripcion: 'Esperando revisión' },
    { valor: 'en_revision', etiqueta: 'En Revisión', descripcion: 'Siendo revisado por verificador' },
    { valor: 'verificado', etiqueta: 'Verificado', descripcion: 'Aprobado por verificador' },
    { valor: 'rechazado', etiqueta: 'Rechazado', descripcion: 'Requiere correcciones' },
    { valor: 'eliminado', etiqueta: 'Eliminado', descripcion: 'Eliminado por usuario' }
];

export const TIPOS_BUSQUEDA_HISTORIAL: OpcionSelect[] = [
    {
        valor: 'fecha_verificacion',
        etiqueta: 'Por Fecha de Verificación',
        descripcion: 'Buscar por rango de fechas de verificación'
    },
    {
        valor: 'numero_boleta',
        etiqueta: 'Por Número de Boleta',
        descripcion: 'Buscar por número de boleta específico'
    },
    {
        valor: 'usuario',
        etiqueta: 'Por Usuario',
        descripcion: 'Buscar por usuario registrador o verificador'
    }
];

/**
 * Clase de validadores de negocio
 */
export class ValidadoresReintegros {
    /**
     * Valida si un monto es válido
     */
    static validarMonto(monto: number): boolean {
        return monto > 0 && monto <= 999999.99;
    }

    /**
     * Valida si una fecha no es futura
     */
    static validarFechaNoFutura(fecha: string): boolean {
        if (!fecha) return false;

        const fechaTransaccion = new Date(fecha);
        const fechaHoy = new Date();
        fechaHoy.setHours(23, 59, 59, 999);

        return fechaTransaccion <= fechaHoy;
    }

    /**
     * Valida formato de número de boleta
     */
    static validarNumeroBoleta(numero: string): boolean {
        if (!numero) return false;
        return numero.trim().length >= 3 && numero.trim().length <= 100;
    }

    /**
     * Valida si se puede editar un reintegro según su estado
     */
    static puedeEditar(estado: EstadoReintegro): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    /**
     * Valida si se puede eliminar un reintegro según su estado
     */
    static puedeEliminar(estado: EstadoReintegro): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    /**
     * Valida si se puede verificar un reintegro según su estado
     */
    static puedeVerificar(estado: EstadoReintegro): boolean {
        return ['pendiente', 'en_revision'].includes(estado);
    }
}

/**
 * Clase de utilidades para formateo y helpers
 */
export class UtilidadesReintegros {
    /**
     * Formatea un monto a moneda local
     */
    static formatearMonto(monto: number): string {
        if (typeof monto !== 'number' || isNaN(monto)) {
            return 'Q 0.00';
        }

        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monto);
    }

    /**
     * Formatea una fecha a formato local
     */
    static formatearFecha(fecha: string): string {
        if (!fecha) return '';

        try {
            return new Date(fecha).toLocaleDateString('es-GT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return '';
        }
    }

    /**
     * Formatea fecha y hora
     */
    static formatearFechaHora(fecha: string): string {
        if (!fecha) return '';

        try {
            return new Date(fecha).toLocaleString('es-GT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
    }

    /**
     * Obtiene la etiqueta de un estado
     */
    static obtenerEtiquetaEstado(estado: EstadoReintegro): string {
        const estadoObj = ESTADOS_REINTEGRO.find(e => e.valor === estado);
        return estadoObj?.etiqueta || estado;
    }

    /**
     * Obtiene la etiqueta de un tipo de orden
     */
    static obtenerEtiquetaTipoOrden(tipo: TipoOrden): string {
        const tipoObj = TIPOS_ORDEN.find(t => t.valor === tipo);
        return tipoObj?.etiqueta || tipo;
    }

    /**
     * Obtiene la clase CSS para el estado
     */
    static obtenerClaseEstado(estado: EstadoReintegro): string {
        const clases: Record<EstadoReintegro, string> = {
            'pendiente': 'bg-yellow-100 text-yellow-800',
            'en_revision': 'bg-blue-100 text-blue-800',
            'verificado': 'bg-green-100 text-green-800',
            'rechazado': 'bg-red-100 text-red-800',
            'eliminado': 'bg-gray-100 text-gray-800'
        };

        return clases[estado] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Convierte fecha a formato ISO para inputs de tipo date
     */
    static fechaParaInput(fecha: string): string {
        if (!fecha) return '';

        try {
            const fechaObj = new Date(fecha);
            return fechaObj.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }

    /**
     * Valida si una cadena representa un número válido
     */
    static esNumeroValido(valor: any): boolean {
        return !isNaN(parseFloat(valor)) && isFinite(valor);
    }

    /**
     * Trunca texto a una longitud específica
     */
    static truncarTexto(texto: string, longitud: number): string {
        if (!texto || texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    }

    /**
     * Capitaliza la primera letra de cada palabra
     */
    static capitalizarTexto(texto: string): string {
        if (!texto) return '';
        return texto.replace(/\b\w/g, l => l.toUpperCase());
    }
}