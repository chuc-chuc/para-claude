// ============================================
// SERVICIO ANGULAR - REINTEGROS DE ANTICIPOS
// Sistema de Contabilidad - ReintegrosService COMPLETO ACTUALIZADO
// ============================================

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
    ReintegroAnticipo,
    ReintegroAnticipoFormatted,
    NuevoReintegro,
    ActualizarReintegro,
    VerificarReintegro,
    SolicitarCorreccion,
    FiltrosReintegros,
    CriteriosBusquedaHistorial,
    RespuestaAPI,
    OrdenPorTipo,
    ValidacionOrdenPorTipo,
    FiltrosOrdenesPorTipo
} from '../models/reintegros-anticipos.model';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

/**
 * Servicio para gestionar reintegros de anticipos
 */
@Injectable({
    providedIn: 'root'
})
export class ReintegrosService {

    // Cache para órdenes elegibles
    private cacheOrdenesPorTipo = new Map<string, {
        data: OrdenPorTipo[];
        timestamp: number;
    }>();

    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    constructor(private servicioGeneral: ServicioGeneralService) { }

    /**
     * Lista reintegros con filtros opcionales
     */
    listarReintegros(filtros?: FiltrosReintegros): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/listarReintegros',
            tipo: 'post',
            body: filtros || {}
        });
    }

    /**
     * Obtiene los reintegros del usuario actual
     */
    obtenerMisReintegros(usuarioId: string, estado?: string): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        const filtros: FiltrosReintegros = {
            usuario_registra: usuarioId
        };

        if (estado) {
            filtros.estado = estado as any;
        }

        return this.listarReintegros(filtros);
    }

    /**
     * Obtiene reintegros pendientes de verificación
     */
    obtenerReintegrosPendientesVerificacion(): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.listarReintegros({ estado: 'pendiente' });
    }

    /**
     * Crea un nuevo reintegro
     */
    crearReintegro(reintegro: NuevoReintegro): Observable<RespuestaAPI<{ id: number }>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/crearReintegro',
            tipo: 'post',
            body: reintegro
        });
    }

    /**
     * Actualiza un reintegro existente
     */
    actualizarReintegro(reintegro: ActualizarReintegro): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/actualizarReintegro',
            tipo: 'post',
            body: reintegro
        });
    }

    /**
     * Elimina lógicamente un reintegro
     */
    eliminarReintegro(id: number, usuarioId: string): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/eliminarReintegro',
            tipo: 'post',
            body: { id, usuario_registra: usuarioId }
        });
    }

    /**
     * Obtiene un reintegro específico
     */
    obtenerReintegro(id: number): Observable<RespuestaAPI<ReintegroAnticipoFormatted>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/obtenerReintegro',
            tipo: 'post',
            body: { id }
        });
    }

    /**
     * Verifica/aprueba un reintegro
     */
    verificarReintegro(datos: VerificarReintegro): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/verificarReintegro',
            tipo: 'post',
            body: datos
        });
    }

    /**
     * Solicita correcciones en un reintegro
     */
    solicitarCorreccion(datos: SolicitarCorreccion): Observable<RespuestaAPI> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/solicitarCorreccionReintegro',
            tipo: 'post',
            body: datos
        });
    }

    /**
     * Busca en el historial de reintegros
     */
    buscarHistorialReintegros(criterios: CriteriosBusquedaHistorial): Observable<RespuestaAPI<ReintegroAnticipoFormatted[]>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/buscarHistorialReintegros',
            tipo: 'post',
            body: criterios
        });
    }

    /**
     * Valida un número de boleta (verifica que no esté duplicado)
     */
    validarNumeroBoleta(numeroBoleta: string, idExcluir?: number): Observable<boolean> {
        return this.listarReintegros().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const duplicado = response.datos.find(r =>
                        r.numero_boleta === numeroBoleta &&
                        (idExcluir ? r.id !== idExcluir : true)
                    );
                    return !duplicado; // Retorna true si NO hay duplicado
                }
                return true;
            }),
            catchError(() => {
                // En caso de error, asumir que es válido
                return [true];
            })
        );
    }

    /**
     * Obtiene estadísticas de reintegros para dashboard
     */
    obtenerEstadisticas(): Observable<any> {
        return this.listarReintegros().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const datos = response.datos;

                    return {
                        total: datos.length,
                        pendientes: datos.filter(r => r.estado === 'pendiente').length,
                        verificados: datos.filter(r => r.estado === 'verificado').length,
                        rechazados: datos.filter(r => r.estado === 'rechazado').length,
                        montoTotal: datos.reduce((sum, r) => sum + (r.monto_anticipo || 0), 0),
                        porTipoOrden: this.agruparPorTipo(datos, 'tipo_orden'),
                        porEstado: this.agruparPorTipo(datos, 'estado')
                    };
                }
                return null;
            })
        );
    }

    /**
     * Agrupa datos por un campo específico
     */
    private agruparPorTipo(datos: ReintegroAnticipoFormatted[], campo: keyof ReintegroAnticipoFormatted): any {
        return datos.reduce((acc, item) => {
            const valor = item[campo] as string;
            if (!acc[valor]) {
                acc[valor] = { cantidad: 0, monto: 0 };
            }
            acc[valor].cantidad++;
            acc[valor].monto += item.monto_anticipo || 0;
            return acc;
        }, {} as any);
    }

    /**
     * Exporta reintegros a formato CSV
     */
    exportarReintegros(datos: ReintegroAnticipoFormatted[]): void {
        const headers = [
            'ID', 'Usuario Registra', 'Monto', 'No. Orden', 'Tipo Orden',
            'No. Boleta', 'Fecha Transacción', 'Verificador', 'Fecha Verificación',
            'Estado', 'Banco Origen', 'Referencia Bancaria', 'Comentario'
        ];

        const csvContent = [
            headers.join(','),
            ...datos.map(row => [
                row.id,
                `"${row.nombre_usuario_registra || row.usuario_registra}"`,
                row.monto_anticipo,
                `"${row.numero_orden}"`,
                row.tipo_orden,
                `"${row.numero_boleta}"`,
                row.fecha_registro_transaccion,
                `"${row.nombre_verificador || ''}"`,
                row.fecha_verificacion || '',
                row.estado,
                `"${row.banco_origen || ''}"`,
                `"${row.referencia_bancaria || ''}"`,
                `"${row.comentario_registro || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `reintegros_anticipos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Formateo de datos para uso en componentes
     */
    formatearParaTabla(datos: ReintegroAnticipoFormatted[]): any[] {
        return datos.map(item => ({
            ...item,
            estado_formatted: this.obtenerEtiquetaEstado(item.estado),
            tipo_orden_formatted: this.obtenerEtiquetaTipoOrden(item.tipo_orden),
            puede_editar: this.puedeEditar(item.estado),
            puede_eliminar: this.puedeEliminar(item.estado),
            puede_verificar: this.puedeVerificar(item.estado)
        }));
    }

    /**
     * Obtiene la etiqueta de un estado
     */
    private obtenerEtiquetaEstado(estado: string): string {
        const estados: { [key: string]: string } = {
            'pendiente': 'Pendiente',
            'en_revision': 'En Revisión',
            'verificado': 'Verificado',
            'rechazado': 'Rechazado',
            'eliminado': 'Eliminado'
        };
        return estados[estado] || estado;
    }

    /**
     * Obtiene la etiqueta de un tipo de orden
     */
    private obtenerEtiquetaTipoOrden(tipo: string): string {
        const tipos: { [key: string]: string } = {
            'compra': 'Compra',
            'servicio': 'Servicio',
            'gasto': 'Gasto',
            'otros': 'Otros'
        };
        return tipos[tipo] || tipo;
    }

    /**
     * Validaciones de estado
     */
    private puedeEditar(estado: string): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    private puedeEliminar(estado: string): boolean {
        return ['pendiente', 'rechazado'].includes(estado);
    }

    private puedeVerificar(estado: string): boolean {
        return ['pendiente', 'en_revision'].includes(estado);
    }

    // ============================================
    // MÉTODOS NUEVOS PARA ÓRDENES ELEGIBLES
    // ============================================

    /**
     * Obtiene órdenes elegibles para reintegro
     */
    obtenerOrdenesPorTipo(filtros?: FiltrosOrdenesPorTipo): Observable<RespuestaAPI<OrdenPorTipo[]>> {
        if (filtros && Object.keys(filtros).length > 0) {
            return this.servicioGeneral.query({
                ruta: 'contabilidad/obtenerOrdenesPorTipo',
                tipo: 'post',
                body: filtros
            });
        }

        return this.servicioGeneral.query({
            ruta: 'contabilidad/obtenerOrdenesPorTipo',
            tipo: 'get'
        });
    }

    /**
     * Valida que una orden específica sea elegible para reintegro
     */
    validarOrdenPorTipo(numeroOrden: number, idExcluir?: number): Observable<RespuestaAPI<ValidacionOrdenPorTipo>> {
        return this.servicioGeneral.query({
            ruta: 'contabilidad/validarOrdenPorTipo',
            tipo: 'post',
            body: {
                numero_orden: numeroOrden,
                id_excluir: idExcluir
            }
        });
    }

    /**
     * Obtiene órdenes elegibles filtradas por tipo
     */
    obtenerOrdenesPorTipoPorTipo(tipoOrden: string): Observable<RespuestaAPI<OrdenPorTipo[]>> {
        return this.obtenerOrdenesPorTipo({ tipo_orden: tipoOrden });
    }

    /**
     * Obtiene órdenes elegibles con cache
     */
    obtenerOrdenesPorTipoConCache(filtros?: FiltrosOrdenesPorTipo): Observable<RespuestaAPI<OrdenPorTipo[]>> {
        const cacheKey = JSON.stringify(filtros || {});
        const cached = this.cacheOrdenesPorTipo.get(cacheKey);

        // Verificar si el cache es válido
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            return of({
                respuesta: 'success',
                mensaje: [],
                datos: cached.data
            } as RespuestaAPI<OrdenPorTipo[]>);
        }

        // Obtener datos frescos y guardar en cache
        return this.obtenerOrdenesPorTipo(filtros).pipe(
            tap(response => {
                if (response.respuesta === 'success' && response.datos) {
                    this.cacheOrdenesPorTipo.set(cacheKey, {
                        data: response.datos,
                        timestamp: Date.now()
                    });
                }
            })
        );
    }

    /**
     * Limpia el cache de órdenes elegibles
     */
    limpiarCacheOrdenesPorTipo(): void {
        this.cacheOrdenesPorTipo.clear();
    }

    /**
     * Formatea órdenes elegibles para uso en componentes
     */
    formatearOrdenesParaSelect(ordenes: OrdenPorTipo[]): any[] {
        return ordenes.map(orden => ({
            value: orden.numero_orden,
            label: this.formatearOrdenParaSelect(orden),
            disabled: orden.saldo_pendiente <= 0,
            orden: orden // Mantener referencia completa
        }));
    }

    /**
     * Formatea una orden para mostrar en select
     */
    private formatearOrdenParaSelect(orden: OrdenPorTipo): string {
        return `Orden #${orden.numero_orden} - Saldo: ${orden.saldo_pendiente_formatted}`;
    }

    /**
     * Valida que el monto no exceda el saldo pendiente
     */
    validarMontoContraSaldo(numeroOrden: number, monto: number): Observable<boolean> {
        return this.obtenerOrdenesPorTipo().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const orden = response.datos.find(o => o.numero_orden === numeroOrden);
                    return orden ? (orden.saldo_pendiente >= monto) : false;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    /**
     * Obtiene información detallada de una orden específica
     */
    obtenerInfoOrden(numeroOrden: number): Observable<OrdenPorTipo | null> {
        return this.obtenerOrdenesPorTipo().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos.find(o => o.numero_orden === numeroOrden) || null;
                }
                return null;
            }),
            catchError(() => of(null))
        );
    }

    /**
     * Valida si una orden tiene saldo suficiente
     */
    validarSaldoDisponible(numeroOrden: number, montoRequerido: number): Observable<{
        tieneSaldo: boolean;
        saldoDisponible: number;
        diferencia: number;
    }> {
        return this.obtenerInfoOrden(numeroOrden).pipe(
            map(orden => {
                if (!orden) {
                    return {
                        tieneSaldo: false,
                        saldoDisponible: 0,
                        diferencia: montoRequerido
                    };
                }

                return {
                    tieneSaldo: orden.saldo_pendiente >= montoRequerido,
                    saldoDisponible: orden.saldo_pendiente,
                    diferencia: montoRequerido - orden.saldo_pendiente
                };
            }),
            catchError(() => of({
                tieneSaldo: false,
                saldoDisponible: 0,
                diferencia: montoRequerido
            }))
        );
    }

    /**
     * Refresca el cache y obtiene órdenes actualizadas
     */
    refrescarOrdenesPorTipo(filtros?: FiltrosOrdenesPorTipo): Observable<RespuestaAPI<OrdenPorTipo[]>> {
        // Limpiar cache específico
        const cacheKey = JSON.stringify(filtros || {});
        this.cacheOrdenesPorTipo.delete(cacheKey);

        // Obtener datos frescos
        return this.obtenerOrdenesPorTipo(filtros).pipe(
            tap(response => {
                if (response.respuesta === 'success' && response.datos) {
                    this.cacheOrdenesPorTipo.set(cacheKey, {
                        data: response.datos,
                        timestamp: Date.now()
                    });
                }
            })
        );
    }

    /**
     * Obtiene estadísticas de órdenes elegibles
     */
    obtenerEstadisticasOrdenesPorTipo(): Observable<{
        totalOrdenes: number;
        totalSaldoPendiente: number;
        promedioSaldoPorOrden: number;
        ordenConMayorSaldo: OrdenPorTipo | null;
        ordenesConSaldoBajo: OrdenPorTipo[];
    }> {
        return this.obtenerOrdenesPorTipo().pipe(
            map(response => {
                if (response.respuesta === 'success' && response.datos) {
                    const ordenes = response.datos;
                    const totalSaldoPendiente = ordenes.reduce((sum, o) => sum + o.saldo_pendiente, 0);
                    const promedioSaldoPorOrden = ordenes.length > 0 ? totalSaldoPendiente / ordenes.length : 0;

                    const ordenConMayorSaldo = ordenes.reduce((max, current) =>
                        max.saldo_pendiente > current.saldo_pendiente ? max : current, ordenes[0] || null);

                    const ordenesConSaldoBajo = ordenes.filter(o => o.saldo_pendiente < 1000); // Menor a Q1,000

                    return {
                        totalOrdenes: ordenes.length,
                        totalSaldoPendiente,
                        promedioSaldoPorOrden,
                        ordenConMayorSaldo,
                        ordenesConSaldoBajo
                    };
                }

                return {
                    totalOrdenes: 0,
                    totalSaldoPendiente: 0,
                    promedioSaldoPorOrden: 0,
                    ordenConMayorSaldo: null,
                    ordenesConSaldoBajo: []
                };
            }),
            catchError(() => of({
                totalOrdenes: 0,
                totalSaldoPendiente: 0,
                promedioSaldoPorOrden: 0,
                ordenConMayorSaldo: null,
                ordenesConSaldoBajo: []
            }))
        );
    }
}