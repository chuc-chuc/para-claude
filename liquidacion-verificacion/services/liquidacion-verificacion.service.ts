// ============================================================================
// SERVICIO ANGULAR - SISTEMA DE LIQUIDACIÓN
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, tap } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    FacturaPendiente,
    Agencia,
    CambioSolicitado,
    RetencionFactura,
    FacturasResponse,
    PaginacionResponse,
    SolicitarCambioPayload,
    AsignarComprobantePayload,
    AsignarComprobanteMasivoPayload,
    CargarFacturasParams,
    ApiResponse,
    MENSAJES
} from '../models/liquidacion-verificacion.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _facturas$ = new BehaviorSubject<FacturaPendiente[]>([]);
    private readonly _agencias$ = new BehaviorSubject<Agencia[]>([]);
    private readonly _paginacion$ = new BehaviorSubject<PaginacionResponse | null>(null);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly facturas$ = this._facturas$.asObservable();
    readonly agencias$ = this._agencias$.asObservable();
    readonly paginacion$ = this._paginacion$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Cargar facturas pendientes con paginación
     */
    cargarFacturasPendientes(params: CargarFacturasParams): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'contabilidad/obtenerFacturasPendientesCompletas',
            tipo: 'post',
            body: params
        }).pipe(
            map((response: ApiResponse<FacturasResponse>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._facturas$.next(response.datos.facturas);
                    this._paginacion$.next(response.datos.paginacion);
                    return true;
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            }),
            catchError((error) => {
                console.error('Error al cargar facturas:', error);
                this._error$.next(MENSAJES.ERROR.CARGAR_FACTURAS);
                this.api.mensajeServidor('error', MENSAJES.ERROR.CARGAR_FACTURAS);
                return of(false);
            }),
            tap(() => this._cargando$.next(false))
        );
    }

    /**
     * Cargar catálogo de agencias
     */
    cargarAgencias(): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/obtenerAgenciasGasto',
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<Agencia[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._agencias$.next(response.datos);
                    return true;
                } else {
                    throw new Error('Error al obtener agencias');
                }
            }),
            catchError((error) => {
                console.error('Error al cargar agencias:', error);
                this._error$.next(MENSAJES.ERROR.CARGAR_AGENCIAS);
                return of(false);
            })
        );
    }

    /**
     * Validar detalle de liquidación
     */
    validarDetalle(detalleId: number): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/validarDetalle',
            tipo: 'post',
            body: { detalle_id: detalleId }
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarEstadoDetalleLocal(detalleId, 'verificado');
                    this.api.mensajeServidor('success', MENSAJES.EXITO.DETALLE_VALIDADO);
                    return true;
                } else {
                    throw new Error('Error al validar detalle');
                }
            }),
            catchError((error) => {
                console.error('Error al validar detalle:', error);
                this.api.mensajeServidor('error', MENSAJES.ERROR.VALIDAR_DETALLE);
                return of(false);
            })
        );
    }

    /**
     * Solicitar cambio para un detalle
     */
    solicitarCambioDetalle(payload: SolicitarCambioPayload): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/solicitarCambioDetalle',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.marcarCambiosPendientesLocal(payload.detalle_id, true);
                    this.api.mensajeServidor('success', MENSAJES.EXITO.CAMBIO_SOLICITADO);
                    return true;
                } else {
                    throw new Error('Error al solicitar cambio');
                }
            }),
            catchError((error) => {
                console.error('Error al solicitar cambio:', error);
                this.api.mensajeServidor('error', MENSAJES.ERROR.SOLICITAR_CAMBIO);
                return of(false);
            })
        );
    }

    /**
     * Obtener cambios solicitados para un detalle
     */
    obtenerCambiosDetalle(detalleId: number): Observable<CambioSolicitado[]> {
        return this.api.query({
            ruta: 'contabilidad/obtenerCambiosDetalle',
            tipo: 'post',
            body: { detalle_id: detalleId }
        }).pipe(
            map((response: ApiResponse<CambioSolicitado[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos;
                } else {
                    throw new Error('Error al obtener cambios');
                }
            }),
            catchError((error) => {
                console.error('Error al obtener cambios:', error);
                this.api.mensajeServidor('error', 'Error al cargar el historial de cambios');
                return of([]);
            })
        );
    }

    /**
     * Asignar comprobante a detalle individual
     */
    asignarComprobanteDetalle(payload: AsignarComprobantePayload & { detalle_id: number }): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/asignarComprobanteDetalle',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarComprobanteDetalleLocal(payload.detalle_id, payload);
                    this.api.mensajeServidor('success', MENSAJES.EXITO.COMPROBANTE_ASIGNADO);
                    return true;
                } else {
                    throw new Error('Error al asignar comprobante');
                }
            }),
            catchError((error) => {
                console.error('Error al asignar comprobante:', error);
                this.api.mensajeServidor('error', MENSAJES.ERROR.ASIGNAR_COMPROBANTE);
                return of(false);
            })
        );
    }

    /**
     * Asignar comprobante a múltiples detalles
     */
    asignarComprobanteMasivo(payload: AsignarComprobanteMasivoPayload): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/asignarComprobanteMasivo',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarComprobanteMasivoLocal(payload.detalles_ids, payload);
                    this.api.mensajeServidor('success',
                        `Comprobante asignado a ${payload.detalles_ids.length} detalles correctamente`);
                    return true;
                } else {
                    throw new Error('Error al asignar comprobante masivo');
                }
            }),
            catchError((error) => {
                console.error('Error al asignar comprobante masivo:', error);
                this.api.mensajeServidor('error', MENSAJES.ERROR.ASIGNAR_COMPROBANTE);
                return of(false);
            })
        );
    }

    /**
     * Obtener retenciones de una factura
     */
    obtenerRetencionesFactura(numeroFactura: string): Observable<RetencionFactura[]> {
        return this.api.query({
            ruta: 'contabilidad/obtenerRetencionesFactura',
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            map((response: ApiResponse<RetencionFactura[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos;
                } else {
                    throw new Error('Error al obtener retenciones');
                }
            }),
            catchError((error) => {
                console.error('Error al obtener retenciones:', error);
                this.api.mensajeServidor('error', 'Error al cargar las retenciones');
                return of([]);
            })
        );
    }

    // ============================================================================
    // MÉTODOS DE ACTUALIZACIÓN LOCAL
    // ============================================================================

    private actualizarEstadoDetalleLocal(detalleId: number, nuevoEstado: string): void {
        const facturas = this._facturas$.value;
        const facturasActualizadas = facturas.map(factura => ({
            ...factura,
            detalles: factura.detalles.map(detalle =>
                detalle.detalle_id === detalleId
                    ? { ...detalle, estado_verificacion: nuevoEstado as any }
                    : detalle
            )
        }));

        this._facturas$.next(facturasActualizadas);
    }

    private marcarCambiosPendientesLocal(detalleId: number, tieneCambios: boolean): void {
        const facturas = this._facturas$.value;
        const facturasActualizadas = facturas.map(factura => ({
            ...factura,
            detalles: factura.detalles.map(detalle =>
                detalle.detalle_id === detalleId
                    ? {
                        ...detalle,
                        tiene_cambios_pendientes: tieneCambios,
                        cambios_pendientes_count: tieneCambios ? detalle.cambios_pendientes_count + 1 : 0
                    }
                    : detalle
            )
        }));

        this._facturas$.next(facturasActualizadas);
    }

    private actualizarComprobanteDetalleLocal(
        detalleId: number,
        datos: Partial<AsignarComprobantePayload>
    ): void {
        const facturas = this._facturas$.value;
        const agencias = this._agencias$.value;

        const agenciaSeleccionada = datos.agencia_gasto_id ?
            agencias.find(a => a.id === datos.agencia_gasto_id) : null;

        const facturasActualizadas = facturas.map(factura => ({
            ...factura,
            detalles: factura.detalles.map(detalle =>
                detalle.detalle_id === detalleId
                    ? {
                        ...detalle,
                        comprobante_contabilidad: datos.comprobante_contabilidad || detalle.comprobante_contabilidad,
                        agencia_gasto_id: datos.agencia_gasto_id || detalle.agencia_gasto_id,
                        agencia_gasto_nombre: agenciaSeleccionada?.nombre || detalle.agencia_gasto_nombre
                    }
                    : detalle
            )
        }));

        this._facturas$.next(facturasActualizadas);
    }

    private actualizarComprobanteMasivoLocal(
        detallesIds: number[],
        datos: Partial<AsignarComprobantePayload>
    ): void {
        const facturas = this._facturas$.value;
        const agencias = this._agencias$.value;

        const agenciaSeleccionada = datos.agencia_gasto_id ?
            agencias.find(a => a.id === datos.agencia_gasto_id) : null;

        const facturasActualizadas = facturas.map(factura => ({
            ...factura,
            detalles: factura.detalles.map(detalle =>
                detallesIds.includes(detalle.detalle_id)
                    ? {
                        ...detalle,
                        comprobante_contabilidad: datos.comprobante_contabilidad || detalle.comprobante_contabilidad,
                        agencia_gasto_id: datos.agencia_gasto_id || detalle.agencia_gasto_id,
                        agencia_gasto_nombre: agenciaSeleccionada?.nombre || detalle.agencia_gasto_nombre
                    }
                    : detalle
            )
        }));

        this._facturas$.next(facturasActualizadas);
    }

    // ============================================================================
    // MÉTODOS DE UTILIDAD
    // ============================================================================

    /**
     * Limpiar estado del servicio
     */
    limpiarEstado(): void {
        this._facturas$.next([]);
        this._paginacion$.next(null);
        this._error$.next(null);
    }

    /**
     * Obtener facturas actuales
     */
    obtenerFacturasActuales(): FacturaPendiente[] {
        return this._facturas$.value;
    }

    /**
     * Obtener agencias actuales
     */
    obtenerAgenciasActuales(): Agencia[] {
        return this._agencias$.value;
    }

    /**
     * Verificar si hay operación en curso
     */
    estaOcupado(): boolean {
        return this._cargando$.value;
    }

    /**
     * Buscar detalle por ID en todas las facturas
     */
    buscarDetallePorId(detalleId: number): { factura: FacturaPendiente; detalle: any } | null {
        const facturas = this._facturas$.value;

        for (const factura of facturas) {
            const detalle = factura.detalles.find(d => d.detalle_id === detalleId);
            if (detalle) {
                return { factura, detalle };
            }
        }

        return null;
    }

    /**
     * Obtener estadísticas generales
     */
    obtenerEstadisticas(): {
        totalFacturas: number;
        totalDetalles: number;
        detallesVerificados: number;
        detallesPendientes: number;
        detallesConCambios: number;
    } {
        const facturas = this._facturas$.value;

        const totalFacturas = facturas.length;
        const totalDetalles = facturas.reduce((sum, f) => sum + f.detalles.length, 0);
        const detallesVerificados = facturas.reduce((sum, f) =>
            sum + f.detalles.filter(d => d.estado_verificacion === 'verificado').length, 0);
        const detallesPendientes = facturas.reduce((sum, f) =>
            sum + f.detalles.filter(d => d.estado_verificacion === 'pendiente').length, 0);
        const detallesConCambios = facturas.reduce((sum, f) =>
            sum + f.detalles.filter(d => d.tiene_cambios_pendientes).length, 0);

        return {
            totalFacturas,
            totalDetalles,
            detallesVerificados,
            detallesPendientes,
            detallesConCambios
        };
    }

    /**
     * Validar si se puede realizar una acción masiva
     */
    validarAccionMasiva(detallesIds: number[]): { valido: boolean; mensaje?: string } {
        if (detallesIds.length === 0) {
            return { valido: false, mensaje: 'No hay detalles seleccionados' };
        }

        if (detallesIds.length > 100) {
            return { valido: false, mensaje: 'No se pueden procesar más de 100 detalles a la vez' };
        }

        const facturas = this._facturas$.value;
        const detallesEncontrados = [];

        for (const factura of facturas) {
            for (const detalle of factura.detalles) {
                if (detallesIds.includes(detalle.detalle_id)) {
                    detallesEncontrados.push(detalle);
                }
            }
        }

        if (detallesEncontrados.length !== detallesIds.length) {
            return { valido: false, mensaje: 'Algunos detalles seleccionados no se encontraron' };
        }

        return { valido: true };
    }

    // ============================================================================
    // MÉTODOS DE DEBUG
    // ============================================================================

    /**
     * Obtener información de debug del estado actual
     */
    obtenerInfoDebug(): any {
        return {
            facturas: this._facturas$.value,
            agencias: this._agencias$.value,
            paginacion: this._paginacion$.value,
            cargando: this._cargando$.value,
            error: this._error$.value,
            estadisticas: this.obtenerEstadisticas()
        };
    }

    /**
     * Logs para debugging
     */
    private log(mensaje: string, datos?: any): void {
        if (datos) {
            console.log(`[LiquidacionService] ${mensaje}`, datos);
        } else {
            console.log(`[LiquidacionService] ${mensaje}`);
        }
    }

    /**
     * Refrescar datos después de cambios
     */
    refrescarDatos(params: CargarFacturasParams): Observable<boolean> {
        this.log('Refrescando datos con parámetros:', params);
        return this.cargarFacturasPendientes(params);
    }

    // ============================================================================
    // MÉTODOS DE CACHÉ Y OPTIMIZACIÓN
    // ============================================================================

    /**
     * Verificar si los datos están obsoletos
     */
    private ultimaActualizacion = new Date();

    datosObsoletos(minutos: number = 5): boolean {
        const ahora = new Date();
        const diferencia = (ahora.getTime() - this.ultimaActualizacion.getTime()) / 1000 / 60;
        return diferencia > minutos;
    }

    /**
     * Marcar datos como actualizados
     */
    private marcarActualizado(): void {
        this.ultimaActualizacion = new Date();
    }

    /**
     * Optimizar carga solo si es necesario
     */
    cargarSiEsNecesario(params: CargarFacturasParams, forzar = false): Observable<boolean> {
        if (!forzar && !this.datosObsoletos()) {
            return of(true);
        }

        return this.cargarFacturasPendientes(params).pipe(
            tap(() => this.marcarActualizado())
        );
    }
}