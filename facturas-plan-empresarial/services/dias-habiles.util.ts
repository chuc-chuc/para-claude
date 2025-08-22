// services/dias-habiles.util.ts
/**
 * Calcula días hábiles entre dos fechas (excluye sábados y domingos).
 * Fechas en formato YYYY-MM-DD.
 */
export function diasHabilesEntre(fechaInicioISO: string, fechaFinISO?: string): number {
    const start = new Date(fechaInicioISO + 'T00:00:00');
    const end = fechaFinISO ? new Date(fechaFinISO + 'T00:00:00') : new Date();

    // normaliza horas
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let count = 0;
    const dir = start <= end ? 1 : -1;
    for (let d = new Date(start); dir > 0 ? d <= end : d >= end; d.setDate(d.getDate() + dir)) {
        const day = d.getDay(); // 0 Dom, 6 Sáb
        if (day !== 0 && day !== 6) count += 1;
    }
    return Math.max(0, count - 1); // excluye el mismo día inicial
}

export function requiereAutorizacion(diasTranscurridos: number | null, limite = 5): boolean {
    if (diasTranscurridos === null || diasTranscurridos === undefined) return false;
    return diasTranscurridos > limite;
}