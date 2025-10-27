// ============================================================================
// SERVICIO PARA LIQUIDACIONES POR PRESUPUESTO - ACTUALIZADO
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, tap, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    LiquidacionPorFactura,
    DetalleLiquidacion,
    CambioSolicitado,
    ApiResponse,
    RespuestaLiquidaciones,
    VerificarDetallePayload,
    VerificarDetalleMasivoPayload,
    AsignarComprobantePayload,
    AsignarComprobanteMasivoPayload,
    CrearCambioSolicitadoPayload,
    ActualizarCambioPayload,
    FiltrosLiquidacion,
    Agencia,
    MENSAJES_LIQUIDACIONES
} from '../models/liquidaciones-presupuesto.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionesPresupuestoService {

    private readonly api = inject(ServicioGeneralService);

    // Constante para localStorage
    private readonly FECHA_STORAGE_KEY = 'liquidaciones_fecha_filtro';

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _liquidaciones$ = new BehaviorSubject<LiquidacionPorFactura[]>([]);
    private readonly _liquidacionesFiltradas$ = new BehaviorSubject<LiquidacionPorFactura[]>([]);
    private readonly _agencias$ = new BehaviorSubject<Agencia[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);
    private readonly _filtros$ = new BehaviorSubject<FiltrosLiquidacion>({});

    // Observables públicos
    readonly liquidaciones$ = this._liquidaciones$.asObservable();
    readonly liquidacionesFiltradas$ = this._liquidacionesFiltradas$.asObservable();
    readonly agencias$ = this._agencias$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();
    readonly filtros$ = this._filtros$.asObservable();

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Cargar liquidaciones por presupuesto para el área 77
     * ACTUALIZADO: Ahora acepta filtro de fecha
     */
    cargarLiquidaciones(fechaDesde?: string): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        const body: any = { area: 77 };
        if (fechaDesde) {
            body.fecha_hasta = fechaDesde;
        }

        return this.api.query({
            ruta: 'contabilidad/obtenerLiquidacionesPorPresupuestoN',
            tipo: 'post',
            body
        }).pipe(
            map((response: ApiResponse<RespuestaLiquidaciones>) => {
                if (response.respuesta === 'success' && response.datos) {
                    let liquidaciones = response.datos.liquidaciones || [];

                    // NUEVO: Ordenar por fecha de creación del detalle más antiguo
                    liquidaciones = this._ordenarPorFechaCreacion(liquidaciones);

                    this._liquidaciones$.next(liquidaciones);
                    this._aplicarFiltros();
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error en la respuesta del servidor');
                }
            }),
            catchError((error) => {
                console.error('Error al cargar liquidaciones:', error);
                this._error$.next(MENSAJES_LIQUIDACIONES.ERROR.CARGAR_LIQUIDACIONES);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.CARGAR_LIQUIDACIONES);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * NUEVO: Ordenar liquidaciones por fecha de creación del detalle más antiguo (descendente)
     */
    private _ordenarPorFechaCreacion(liquidaciones: LiquidacionPorFactura[]): LiquidacionPorFactura[] {
        return liquidaciones.sort((a, b) => {
            // Obtener la fecha más antigua de cada factura
            const fechaA = this._obtenerFechaMasAntiguaDetalle(a.detalles);
            const fechaB = this._obtenerFechaMasAntiguaDetalle(b.detalles);

            // Ordenar descendente (más antigua primero)
            return new Date(fechaA).getTime() - new Date(fechaB).getTime();
        });
    }

    /**
     * NUEVO: Obtener la fecha más antigua de los detalles de una factura
     */
    private _obtenerFechaMasAntiguaDetalle(detalles: DetalleLiquidacion[]): string {
        if (detalles.length === 0) return new Date().toISOString();

        return detalles.reduce((fechaMasAntigua, detalle) => {
            const fechaDetalle = new Date(detalle.fecha_creacion).getTime();
            const fechaActual = new Date(fechaMasAntigua).getTime();
            return fechaDetalle < fechaActual ? detalle.fecha_creacion : fechaMasAntigua;
        }, detalles[0].fecha_creacion);
    }

    /**
     * Verificar detalle individual con SweetAlert
     */
    verificarDetalle(detalleId: number): Observable<boolean> {
        const payload: VerificarDetallePayload = { id: detalleId };

        return this.api.query({
            ruta: 'contabilidad/verificarDetalleUnitarioPorPresupuestoN',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this._actualizarEstadoDetalleLocal(detalleId, 'verificado');
                    this.api.mensajeServidor('success', MENSAJES_LIQUIDACIONES.EXITO.DETALLE_VERIFICADO);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al verificar detalle');
                }
            }),
            catchError((error) => {
                console.error('Error al verificar detalle:', error);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.VERIFICAR_DETALLE);
                return of(false);
            })
        );
    }

    /**
     * Verificar múltiples detalles con SweetAlert
     */
    verificarDetallesMasivo(detallesIds: number[]): Observable<boolean> {
        const payload: VerificarDetalleMasivoPayload = { detalles_ids: detallesIds };

        return this.api.query({
            ruta: 'contabilidad/verificarDetalleMasivoPorPresupuestoN',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    detallesIds.forEach(id => this._actualizarEstadoDetalleLocal(id, 'verificado'));
                    this.api.mensajeServidor('success',
                        `${detallesIds.length} ${MENSAJES_LIQUIDACIONES.EXITO.DETALLES_VERIFICADOS}`);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al verificar detalles');
                }
            }),
            catchError((error) => {
                console.error('Error al verificar detalles:', error);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.VERIFICAR_DETALLE);
                return of(false);
            })
        );
    }

    /**
     * Asignar comprobante a detalle individual
     */
    asignarComprobante(detalleId: number, datos: AsignarComprobantePayload): Observable<boolean> {
        const payload = { ...datos, id: detalleId };

        return this.api.query({
            ruta: 'contabilidad/asignarComprobanteUnitarioPorPresupuestoN',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this._actualizarComprobanteDetalleLocal(detalleId, datos);
                    this.api.mensajeServidor('success', MENSAJES_LIQUIDACIONES.EXITO.COMPROBANTE_ASIGNADO);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al asignar comprobante');
                }
            }),
            catchError((error) => {
                console.error('Error al asignar comprobante:', error);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.ASIGNAR_COMPROBANTE);
                return of(false);
            })
        );
    }

    /**
     * Asignar comprobante a múltiples detalles
     */
    asignarComprobanteMasivo(detallesIds: number[], datos: AsignarComprobanteMasivoPayload): Observable<boolean> {
        const payload = { ...datos, detalles_ids: detallesIds };

        return this.api.query({
            ruta: 'contabilidad/asignarComprobanteMasivoPorPresupuestoN',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    detallesIds.forEach(id => this._actualizarComprobanteDetalleLocal(id, datos));
                    this.api.mensajeServidor('success',
                        `Comprobante asignado a ${detallesIds.length} detalles correctamente`);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al asignar comprobante');
                }
            }),
            catchError((error) => {
                console.error('Error al asignar comprobante masivo:', error);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.ASIGNAR_COMPROBANTE);
                return of(false);
            })
        );
    }

    /**
     * Crear cambio solicitado (adaptado a tu modal simple)
     */
    crearCambioSolicitado(detalle: DetalleLiquidacion, descripcionCambio: string): Observable<boolean> {
        const payload: CrearCambioSolicitadoPayload = {
            detalle_liquidacion_id: detalle.id,
            numero_factura: detalle.numero_factura,
            tipo_cambio: 'otros',
            descripcion_cambio: descripcionCambio,
            valor_anterior: `${detalle.descripcion} - ${detalle.monto}`,
            valor_solicitado: 'Ver descripción del cambio',
            justificacion: descripcionCambio
        };

        return this.api.query({
            ruta: 'contabilidad/crearCambioSolicitadoPorPresupuestoN',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this._actualizarCambiosPendientesLocal(detalle.id, true);
                    this.api.mensajeServidor('success', MENSAJES_LIQUIDACIONES.EXITO.CAMBIO_CREADO);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al crear cambio');
                }
            }),
            catchError((error) => {
                console.error('Error al crear cambio:', error);
                this.api.mensajeServidor('error', MENSAJES_LIQUIDACIONES.ERROR.CREAR_CAMBIO);
                return of(false);
            })
        );
    }

    /**
     * Obtener cambios solicitados para un detalle (compatibilidad con tu modal)
     */
    obtenerCambiosDetalle(detalleId: number): Observable<CambioSolicitado[]> {
        return this.api.query({
            ruta: 'contabilidad/obtenerCambiosSolicitadosPorDetalle',
            tipo: 'post',
            body: { detalle_liquidacion_id: detalleId }
        }).pipe(
            map((response: ApiResponse<{ cambios: CambioSolicitado[] }>) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos.cambios || [];
                }
                return [];
            }),
            catchError((error) => {
                console.error('Error al obtener cambios:', error);
                return of([]);
            })
        );
    }

    /**
     * Cargar catálogo de agencias (si lo necesitas para el modal)
     */
    cargarAgencias(): Observable<boolean> {
        // Implementa según tu API de agencias o usa datos estáticos
        const agenciasMock: Agencia[] = [
            { id: 1, nombre: 'Central' },
            { id: 2, nombre: 'Zona Norte' },
            { id: 3, nombre: 'Zona Sur' },
            { id: 99, nombre: 'Sin asignar' }
        ];

        this._agencias$.next(agenciasMock);
        return of(true);
    }

    // ============================================================================
    // SISTEMA DE FILTROS - ACTUALIZADO
    // ============================================================================

    /**
     * Aplicar filtros de búsqueda - ACTUALIZADO CON NUEVO SISTEMA
     */
    aplicarFiltros(filtros: Partial<FiltrosLiquidacion>): void {
        const filtrosActuales = this._filtros$.value;
        const nuevosFiltros = { ...filtrosActuales, ...filtros };
        this._filtros$.next(nuevosFiltros);
        this._aplicarFiltros();
    }

    /**
     * Limpiar todos los filtros
     */
    limpiarFiltros(): void {
        this._filtros$.next({});
        this._aplicarFiltros();
    }

    /**
     * Aplicar filtros a las liquidaciones - ACTUALIZADO
     */
    private _aplicarFiltros(): void {
        const liquidaciones = this._liquidaciones$.value;
        const filtros = this._filtros$.value;

        if (Object.keys(filtros).length === 0) {
            this._liquidacionesFiltradas$.next(liquidaciones);
            return;
        }

        const liquidacionesFiltradas = liquidaciones.map(liquidacion => {
            // Filtrar detalles dentro de cada factura
            const detallesFiltrados = liquidacion.detalles.filter(detalle => {
                // FILTRO LOCAL: Filtro por tipo de búsqueda y valor
                if (filtros.tipoBusqueda && filtros.valorBusqueda) {
                    const valorBusqueda = filtros.valorBusqueda.toLowerCase();

                    switch (filtros.tipoBusqueda) {
                        case 'factura':
                            if (!detalle.numero_factura.toLowerCase().includes(valorBusqueda)) {
                                return false;
                            }
                            break;
                        case 'orden':
                            if (!detalle.numero_orden.toString().includes(filtros.valorBusqueda)) {
                                return false;
                            }
                            break;
                        case 'usuario':
                            if (!detalle.usuario.toLowerCase().includes(valorBusqueda)) {
                                return false;
                            }
                            break;
                    }
                }

                // FILTRO LOCAL: Filtro por método de pago
                if (filtros.metodoPago && detalle.forma_pago !== filtros.metodoPago) {
                    return false;
                }

                // FILTRO LOCAL: Filtro por estado de verificación
                if (filtros.estadoVerificacion && detalle.estado_verificacion !== filtros.estadoVerificacion) {
                    return false;
                }

                // FILTRO LOCAL: Filtro por estado de liquidación de la factura
                if (filtros.estadoLiquidacion && liquidacion.factura.estado_liquidacion !== filtros.estadoLiquidacion) {
                    return false;
                }

                return true;
            });

            return {
                ...liquidacion,
                detalles: detallesFiltrados
            };
        }).filter(liquidacion => liquidacion.detalles.length > 0); // Solo mostrar facturas con detalles

        this._liquidacionesFiltradas$.next(liquidacionesFiltradas);
    }

    // ============================================================================
    // MÉTODOS DE SELECCIÓN
    // ============================================================================

    /**
     * Seleccionar/deseleccionar detalle individual
     */
    toggleSeleccionDetalle(detalleId: number): void {
        const liquidaciones = this._liquidacionesFiltradas$.value;
        const liquidacionesActualizadas = liquidaciones.map(liquidacion => ({
            ...liquidacion,
            detalles: liquidacion.detalles.map(detalle =>
                detalle.id === detalleId
                    ? { ...detalle, seleccionado: !detalle.seleccionado }
                    : detalle
            )
        }));

        this._liquidacionesFiltradas$.next(liquidacionesActualizadas);
    }

    /**
     * Seleccionar/deseleccionar todos los detalles de una factura
     */
    toggleSeleccionFactura(numeroFactura: string): void {
        const liquidaciones = this._liquidacionesFiltradas$.value;

        // Verificar si todos los detalles de la factura están seleccionados
        const factura = liquidaciones.find(liq => liq.factura.numero_dte === numeroFactura);
        if (!factura) return;

        const todosSeleccionados = factura.detalles.every(detalle => detalle.seleccionado);

        const liquidacionesActualizadas = liquidaciones.map(liquidacion =>
            liquidacion.factura.numero_dte === numeroFactura
                ? {
                    ...liquidacion,
                    detalles: liquidacion.detalles.map(detalle => ({
                        ...detalle,
                        seleccionado: !todosSeleccionados
                    }))
                }
                : liquidacion
        );

        this._liquidacionesFiltradas$.next(liquidacionesActualizadas);
    }

    /**
     * Seleccionar/deseleccionar todos los detalles globalmente
     */
    toggleSeleccionGlobal(): void {
        const liquidaciones = this._liquidacionesFiltradas$.value;

        // Verificar si todos los detalles están seleccionados
        const todosLosDetalles = liquidaciones.flatMap(liq => liq.detalles);
        const todosSeleccionados = todosLosDetalles.every(detalle => detalle.seleccionado);

        const liquidacionesActualizadas = liquidaciones.map(liquidacion => ({
            ...liquidacion,
            detalles: liquidacion.detalles.map(detalle => ({
                ...detalle,
                seleccionado: !todosSeleccionados
            }))
        }));

        this._liquidacionesFiltradas$.next(liquidacionesActualizadas);
    }

    /**
     * Limpiar todas las selecciones
     */
    limpiarSelecciones(): void {
        const liquidaciones = this._liquidacionesFiltradas$.value;
        const liquidacionesActualizadas = liquidaciones.map(liquidacion => ({
            ...liquidacion,
            detalles: liquidacion.detalles.map(detalle => ({
                ...detalle,
                seleccionado: false
            }))
        }));

        this._liquidacionesFiltradas$.next(liquidacionesActualizadas);
    }

    /**
     * Obtener detalles seleccionados
     */
    obtenerDetallesSeleccionados(): DetalleLiquidacion[] {
        const liquidaciones = this._liquidacionesFiltradas$.value;
        return liquidaciones.flatMap(liq => liq.detalles.filter(detalle => detalle.seleccionado));
    }

    /**
     * Contar detalles seleccionados
     */
    contarSeleccionados(): number {
        return this.obtenerDetallesSeleccionados().length;
    }

    // ============================================================================
    // MÉTODOS DE ACTUALIZACIÓN LOCAL
    // ============================================================================

    /**
     * Actualizar estado de verificación de un detalle localmente
     */
    private _actualizarEstadoDetalleLocal(detalleId: number, nuevoEstado: 'pendiente' | 'verificado'): void {
        this._actualizarDetalleEnEstado(detalleId, detalle => ({
            ...detalle,
            estado_verificacion: nuevoEstado,
            fecha_actualizacion: new Date().toISOString()
        }));
    }

    /**
     * Actualizar comprobante de un detalle localmente
     */
    private _actualizarComprobanteDetalleLocal(detalleId: number, datos: Partial<AsignarComprobantePayload>): void {
        this._actualizarDetalleEnEstado(detalleId, detalle => ({
            ...detalle,
            comprobante_contabilidad: datos.comprobante_contabilidad || detalle.comprobante_contabilidad,
            fecha_registro_contabilidad: datos.fecha_registro_contabilidad || detalle.fecha_registro_contabilidad,
            agencia_gasto_id: datos.agencia_gasto_id || detalle.agencia_gasto_id,
            fecha_actualizacion: new Date().toISOString()
        }));
    }

    /**
     * Actualizar estado de cambios pendientes de un detalle localmente
     */
    private _actualizarCambiosPendientesLocal(detalleId: number, tieneChangesPendientes: boolean): void {
        this._actualizarDetalleEnEstado(detalleId, detalle => ({
            ...detalle,
            tiene_cambios_pendientes: tieneChangesPendientes,
            fecha_actualizacion: new Date().toISOString()
        }));
    }

    /**
     * Método auxiliar para actualizar un detalle en el estado
     */
    private _actualizarDetalleEnEstado(detalleId: number, actualizacion: (detalle: DetalleLiquidacion) => DetalleLiquidacion): void {
        // Actualizar en liquidaciones originales
        const liquidaciones = this._liquidaciones$.value;
        const liquidacionesActualizadas = liquidaciones.map(liquidacion => ({
            ...liquidacion,
            detalles: liquidacion.detalles.map(detalle =>
                detalle.id === detalleId ? actualizacion(detalle) : detalle
            )
        }));
        this._liquidaciones$.next(liquidacionesActualizadas);

        // Actualizar en liquidaciones filtradas
        const liquidacionesFiltradas = this._liquidacionesFiltradas$.value;
        const liquidacionesFiltradasActualizadas = liquidacionesFiltradas.map(liquidacion => ({
            ...liquidacion,
            detalles: liquidacion.detalles.map(detalle =>
                detalle.id === detalleId ? actualizacion(detalle) : detalle
            )
        }));
        this._liquidacionesFiltradas$.next(liquidacionesFiltradasActualizadas);
    }

    // ============================================================================
    // MÉTODOS DE UTILIDAD
    // ============================================================================

    /**
     * Buscar un detalle por ID en todas las liquidaciones
     */
    buscarDetallePorId(detalleId: number): { liquidacion: LiquidacionPorFactura; detalle: DetalleLiquidacion } | null {
        const liquidaciones = this._liquidacionesFiltradas$.value;

        for (const liquidacion of liquidaciones) {
            const detalle = liquidacion.detalles.find(d => d.id === detalleId);
            if (detalle) {
                return { liquidacion, detalle };
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
        detallesConComprobante: number;
        detallesSeleccionados: number;
    } {
        const liquidaciones = this._liquidacionesFiltradas$.value;

        const totalFacturas = liquidaciones.length;
        const todosLosDetalles = liquidaciones.flatMap(liq => liq.detalles);
        const totalDetalles = todosLosDetalles.length;
        const detallesVerificados = todosLosDetalles.filter(d => d.estado_verificacion === 'verificado').length;
        const detallesPendientes = todosLosDetalles.filter(d => d.estado_verificacion === 'pendiente').length;
        const detallesConComprobante = todosLosDetalles.filter(d => d.comprobante_contabilidad?.trim()).length;
        const detallesSeleccionados = todosLosDetalles.filter(d => d.seleccionado).length;

        return {
            totalFacturas,
            totalDetalles,
            detallesVerificados,
            detallesPendientes,
            detallesConComprobante,
            detallesSeleccionados
        };
    }

    /**
     * Validar si se puede realizar una acción sobre detalles seleccionados
     */
    validarAccion(accion: 'verificar' | 'comprobante', detalles?: DetalleLiquidacion[]): { valido: boolean; mensaje?: string } {
        const detallesAValidar = detalles || this.obtenerDetallesSeleccionados();

        if (detallesAValidar.length === 0) {
            return { valido: false, mensaje: 'No hay detalles seleccionados' };
        }

        if (accion === 'verificar') {
            const noVerificables = detallesAValidar.filter(d =>
                d.estado_verificacion !== 'pendiente' || d.tiene_cambios_pendientes
            );

            if (noVerificables.length > 0) {
                return {
                    valido: false,
                    mensaje: `${noVerificables.length} detalle(s) no se pueden verificar (ya verificados o con cambios pendientes)`
                };
            }
        }

        if (accion === 'comprobante') {
            const noComprobables = detallesAValidar.filter(d =>
                d.estado_verificacion !== 'verificado' || d.comprobante_contabilidad?.trim()
            );

            if (noComprobables.length > 0) {
                return {
                    valido: false,
                    mensaje: `${noComprobables.length} detalle(s) no se pueden asignar comprobante (no verificados o ya tienen comprobante)`
                };
            }
        }

        return { valido: true };
    }

    /**
     * Limpiar estado del servicio
     */
    limpiarEstado(): void {
        this._liquidaciones$.next([]);
        this._liquidacionesFiltradas$.next([]);
        this._error$.next(null);
        this._filtros$.next({});
    }

    /**
     * Obtener liquidaciones actuales
     */
    obtenerLiquidacionesActuales(): LiquidacionPorFactura[] {
        return this._liquidacionesFiltradas$.value;
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
     * Refrescar datos después de cambios - ACTUALIZADO
     */
    refrescarDatos(fechaDesde?: string): Observable<boolean> {
        return this.cargarLiquidaciones(fechaDesde);
    }

    // ============================================================================
    // MÉTODOS PARA MANEJAR FECHA EN LOCALSTORAGE
    // ============================================================================

    /**
     * Guardar fecha en localStorage
     */
    guardarFechaEnStorage(fecha: string): void {
        if (fecha) {
            localStorage.setItem(this.FECHA_STORAGE_KEY, fecha);
        } else {
            this.eliminarFechaDeStorage();
        }
    }

    /**
     * Obtener fecha guardada en localStorage
     */
    obtenerFechaDeStorage(): string | null {
        return localStorage.getItem(this.FECHA_STORAGE_KEY);
    }

    /**
     * Eliminar fecha de localStorage
     */
    eliminarFechaDeStorage(): void {
        localStorage.removeItem(this.FECHA_STORAGE_KEY);
    }

    /**
     * Verificar si hay fecha guardada
     */
    tieneFechaGuardada(): boolean {
        return !!this.obtenerFechaDeStorage();
    }
}