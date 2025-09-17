// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/**
 * Formatea un monto como moneda guatemalteca
 */
export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(monto);
}

/**
 * Formatea una fecha en formato local guatemalteco
 */
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

/**
 * Formatea fecha y hora completa
 */
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

/**
 * Formatea un número como porcentaje
 */
export function formatearPorcentaje(valor: number, decimales: number = 1): string {
    return new Intl.NumberFormat('es-GT', {
        style: 'percent',
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valor / 100);
}

/**
 * Formatea un número con separadores de miles
 */
export function formatearNumero(numero: number, decimales: number = 0): string {
    return new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(numero);
}

/**
 * Trunca un texto con elipsis
 */
export function truncarTexto(texto: string, longitud: number = 50): string {
    if (!texto) return '';
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud).trim() + '...';
}

/**
 * Formatea un texto para mostrar como título
 */
export function formatearTitulo(texto: string): string {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Convierte bytes a formato legible
 */
export function formatearTamanoArchivo(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formatea tiempo transcurrido de forma relativa
 */
export function formatearTiempoRelativo(fecha: string | Date): string {
    const ahora = new Date();
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const diferencia = ahora.getTime() - fechaObj.getTime();

    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    if (horas < 24) return `hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias < 30) return `hace ${dias} día${dias !== 1 ? 's' : ''}`;

    return formatearFecha(fechaObj.toISOString());
}

/**
 * Valida formato de comprobante
 */
export function validarFormatoComprobante(comprobante: string): boolean {
    if (!comprobante) return false;
    // Formato típico: letras, números y guiones
    const patron = /^[A-Za-z0-9\-_]+$/;
    return patron.test(comprobante) && comprobante.length >= 3 && comprobante.length <= 50;
}

/**
 * Genera un ID único simple
 */
export function generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizarPalabras(texto: string): string {
    if (!texto) return '';
    return texto.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Formatea un estado para mostrar
 */
export function formatearEstado(estado: string): string {
    if (!estado) return '';
    return estado
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Limpia y normaliza texto para búsqueda
 */
export function normalizarTextoParaBusqueda(texto: string): string {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}

/**
 * Convierte valor a boolean de forma segura
 */
export function aBoolean(valor: any): boolean {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'string') {
        return ['true', '1', 'yes', 'si', 'sí'].includes(valor.toLowerCase());
    }
    if (typeof valor === 'number') return valor !== 0;
    return false;
}

/**
 * Formatea diferencia de tiempo en palabras
 */
export function formatearDiferenciaTiempo(fechaInicio: Date, fechaFin: Date): string {
    const diferencia = fechaFin.getTime() - fechaInicio.getTime();
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

    if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''}`;
    if (horas > 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
    if (minutos > 0) return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    return 'menos de un minuto';
}