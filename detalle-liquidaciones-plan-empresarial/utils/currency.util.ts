// utils/currency.util.ts

/** Redondea a 2 decimales con corrección de precisión */
export function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convierte string/number a número válido */
export function toNumberSafe(n: any, fallback = 0): number {
    if (typeof n === 'number') return isNaN(n) ? fallback : n;
    if (typeof n === 'string') {
        const x = parseFloat(n.replace(/,/g, ''));
        return isNaN(x) ? fallback : x;
    }
    return fallback;
}

/** Formatea a dinero con 2 decimales sin símbolo */
export function formatMoney(n: any): string {
    const v = round2(toNumberSafe(n, 0));
    return v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Suma segura (mantiene 2 decimales) */
export function sumMoney(a: any, b: any): number {
    return round2(toNumberSafe(a, 0) + toNumberSafe(b, 0));
}

/** Resta segura (mantiene 2 decimales) */
export function subMoney(a: any, b: any): number {
    return round2(toNumberSafe(a, 0) - toNumberSafe(b, 0));
}