// ============================================================================
// SERVICIO FACTURAS PLAN EMPRESARIAL - CORREGIDO Y MEJORADO
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, tap, finalize, switchMap } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    FacturaPE,
    DetalleLiquidacionPE,
    OrdenPE,
    AgenciaPE,
    BancoPE,
    TipoCuentaPE,
    ApiResponse,
    BuscarFacturaPayload,
    RegistrarFacturaPayload,
    SolicitarAutorizacionPayload,
    LiquidarFacturaPayload,
    GuardarDetalleLiquidacionPayload,
    ENDPOINTS
} from '../models/facturas-plan-empresarial.models';

@Injectable({
    providedIn: 'root'
})
export class FacturasPlanEmpresarialService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _facturaActual$ = new BehaviorSubject<FacturaPE | null>(null);
    private readonly _detallesLiquidacion$ = new BehaviorSubject<DetalleLiquidacionPE[]>([]);
    private readonly _ordenes$ = new BehaviorSubject<OrdenPE[]>([]);
    private readonly _agencias$ = new BehaviorSubject<AgenciaPE[]>([]);
    private readonly _bancos$ = new BehaviorSubject<BancoPE[]>([]);
    private readonly _tiposCuenta$ = new BehaviorSubject<TipoCuentaPE[]>([]);

    // Estados de carga
    private readonly _cargandoFactura$ = new BehaviorSubject<boolean>(false);
    private readonly _cargandoDetalles$ = new BehaviorSubject<boolean>(false);
    private readonly _procesandoLiquidacion$ = new BehaviorSubject<boolean>(false);
    private readonly _cargandoCatalogos$ = new BehaviorSubject<boolean>(false);
    private readonly _cargandoBancos$ = new BehaviorSubject<boolean>(false);
    private readonly _cargandoTiposCuenta$ = new BehaviorSubject<boolean>(false);

    // ============================================================================
    // OBSERVABLES PÚBLICOS
    // ============================================================================

    readonly facturaActual$ = this._facturaActual$.asObservable();
    readonly detallesLiquidacion$ = this._detallesLiquidacion$.asObservable();
    readonly ordenes$ = this._ordenes$.asObservable();
    readonly agencias$ = this._agencias$.asObservable();
    readonly bancos$ = this._bancos$.asObservable();
    readonly tiposCuenta$ = this._tiposCuenta$.asObservable();

    readonly cargandoFactura$ = this._cargandoFactura$.asObservable();
    readonly cargandoDetalles$ = this._cargandoDetalles$.asObservable();
    readonly procesandoLiquidacion$ = this._procesandoLiquidacion$.asObservable();
    readonly cargandoCatalogos$ = this._cargandoCatalogos$.asObservable();
    readonly cargandoBancos$ = this._cargandoBancos$.asObservable();
    readonly cargandoTiposCuenta$ = this._cargandoTiposCuenta$.asObservable();

    // ============================================================================
    // MÉTODOS PRINCIPALES - FACTURAS
    // ============================================================================

    /**
     * Buscar factura por número DTE
     */
    buscarFactura(numeroDte: string): Observable<boolean> {
        const numeroLimpio = numeroDte.trim();

        if (!numeroLimpio) {
            this.limpiarFactura();
            return of(false);
        }

        this._cargandoFactura$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.BUSCAR_FACTURA,
            tipo: 'post',
            body: { texto: numeroLimpio } as BuscarFacturaPayload
        }).pipe(
            switchMap((response: ApiResponse<FacturaPE[]>) => {
                if (response.respuesta === 'success' && response.datos && response.datos.length > 0) {
                    const factura = this.mapearFacturaApi(response.datos[0]);
                    this._facturaActual$.next(factura);
                    // Cargar detalles después de establecer la factura
                    return this.cargarDetallesLiquidacion(factura.numero_dte).pipe(
                        map(() => true)
                    );
                } else {
                    this.limpiarFactura();
                    this.api.mensajeServidor('info', 'Factura no encontrada');
                    return of(false);
                }
            }),
            catchError((error) => {
                console.error('Error al buscar factura:', error);
                this.limpiarFactura();
                this.api.mensajeServidor('error', 'Error al buscar la factura');
                return of(false);
            }),
            finalize(() => this._cargandoFactura$.next(false))
        );
    }

    /**
     * Registrar nueva factura
     */
    registrarFactura(payload: RegistrarFacturaPayload): Observable<boolean> {
        this._cargandoFactura$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.REGISTRAR_FACTURA,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Factura registrada correctamente');
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al registrar la factura');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al registrar factura:', error);
                this.api.mensajeServidor('error', 'Error al registrar la factura');
                return of(false);
            }),
            finalize(() => this._cargandoFactura$.next(false))
        );
    }

    /**
     * Liquidar factura
     */
    liquidarFactura(numeroDte: string): Observable<boolean> {
        this._procesandoLiquidacion$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.LIQUIDAR_FACTURA,
            tipo: 'post',
            body: { numero_dte: numeroDte, confirmar: true } as LiquidarFacturaPayload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Factura liquidada correctamente');
                    // Recargar la factura para actualizar el estado
                    this.buscarFactura(numeroDte).subscribe();
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al liquidar la factura');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al liquidar factura:', error);
                this.api.mensajeServidor('error', 'Error al liquidar la factura');
                return of(false);
            }),
            finalize(() => this._procesandoLiquidacion$.next(false))
        );
    }

    /**
     * Solicitar autorización por tardanza
     */
    solicitarAutorizacion(payload: SolicitarAutorizacionPayload): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.SOLICITAR_AUTORIZACION,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Solicitud de autorización enviada correctamente');
                    // Recargar la factura para actualizar el estado
                    this.buscarFactura(payload.numero_dte).subscribe();
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al enviar la solicitud');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al solicitar autorización:', error);
                this.api.mensajeServidor('error', 'Error al enviar la solicitud de autorización');
                return of(false);
            })
        );
    }

    // ============================================================================
    // MÉTODOS PRINCIPALES - DETALLES DE LIQUIDACIÓN
    // ============================================================================

    /**
     * Cargar detalles de liquidación de una factura
     */
    cargarDetallesLiquidacion(numeroFactura: string): Observable<DetalleLiquidacionPE[]> {
        this._cargandoDetalles$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.OBTENER_DETALLES,
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            map((response: ApiResponse<DetalleLiquidacionPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const detalles = response.datos.map(detalle => this.mapearDetalleApi(detalle));
                    this._detallesLiquidacion$.next(detalles);
                    return detalles;
                }
                this._detallesLiquidacion$.next([]);
                return [];
            }),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al cargar detalles de liquidación');
                this._detallesLiquidacion$.next([]);
                return of([]);
            }),
            finalize(() => this._cargandoDetalles$.next(false))
        );
    }

    /**
     * Guardar detalle de liquidación
     */
    guardarDetalle(payload: GuardarDetalleLiquidacionPayload): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.GUARDAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Detalle guardado correctamente');
                    // Recargar detalles
                    const factura = this._facturaActual$.value;
                    if (factura) {
                        this.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
                    }
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al guardar detalle');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al guardar detalle:', error);
                this.api.mensajeServidor('error', 'Error al guardar detalle');
                return of(false);
            })
        );
    }

    /**
     * Eliminar detalle de liquidación
     */
    eliminarDetalle(id: number): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.ELIMINAR_DETALLE,
            tipo: 'post',
            body: { id }
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Detalle eliminado correctamente');
                    // Recargar detalles
                    const factura = this._facturaActual$.value;
                    if (factura) {
                        this.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
                    }
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al eliminar detalle');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al eliminar detalle:', error);
                this.api.mensajeServidor('error', 'Error al eliminar detalle');
                return of(false);
            })
        );
    }

    /**
     * Actualizar detalle de liquidación
     */
    actualizarDetalle(payload: Partial<GuardarDetalleLiquidacionPayload>): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.ACTUALIZAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Detalle actualizado correctamente');
                    // Recargar detalles
                    const factura = this._facturaActual$.value;
                    if (factura) {
                        this.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
                    }
                    return true;
                } else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al actualizar detalle');
                    return false;
                }
            }),
            catchError((error) => {
                console.error('Error al actualizar detalle:', error);
                this.api.mensajeServidor('error', 'Error al actualizar detalle');
                return of(false);
            })
        );
    }

    // ============================================================================
    // CATÁLOGOS
    // ============================================================================

    /**
     * Cargar todos los catálogos necesarios
     */
    cargarCatalogos(): Observable<boolean> {
        this._cargandoCatalogos$.next(true);

        return new Observable(observer => {
            Promise.all([
                this.cargarOrdenes().toPromise(),
                this.cargarAgencias().toPromise(),
                this.cargarBancos().toPromise(),
                this.cargarTiposCuenta().toPromise()
            ]).then(() => {
                observer.next(true);
                observer.complete();
            }).catch(() => {
                observer.next(false);
                observer.complete();
            }).finally(() => {
                this._cargandoCatalogos$.next(false);
            });
        });
    }

    /**
     * Cargar órdenes autorizadas
     */
    cargarOrdenes(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_ORDENES,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<OrdenPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._ordenes$.next(response.datos.map(orden => this.mapearOrdenApi(orden)));
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    /**
     * Cargar agencias
     */
    private cargarAgencias(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_AGENCIAS,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<AgenciaPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._agencias$.next(response.datos);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    /**
     * Cargar bancos
     */
    private cargarBancos(): Observable<boolean> {
        this._cargandoBancos$.next(true);
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_BANCOS,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<BancoPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._bancos$.next(response.datos);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false)),
            finalize(() => this._cargandoBancos$.next(false))
        );
    }

    /**
     * Cargar tipos de cuenta
     */
    private cargarTiposCuenta(): Observable<boolean> {
        this._cargandoTiposCuenta$.next(true);
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_TIPOS_CUENTA,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<TipoCuentaPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._tiposCuenta$.next(response.datos);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false)),
            finalize(() => this._cargandoTiposCuenta$.next(false))
        );
    }

    // ============================================================================
    // MÉTODOS DE UTILIDAD
    // ============================================================================

    /**
     * Limpiar estado de facturas
     */
    limpiarFactura(): void {
        this._facturaActual$.next(null);
        this._detallesLiquidacion$.next([]);
    }

    /**
     * Limpiar todo el estado
     */
    limpiarEstado(): void {
        this.limpiarFactura();
        this._ordenes$.next([]);
        this._agencias$.next([]);
        this._bancos$.next([]);
        this._tiposCuenta$.next([]);
    }

    /**
     * Obtener valores actuales
     */
    obtenerFacturaActual(): FacturaPE | null {
        return this._facturaActual$.value;
    }

    obtenerDetallesActuales(): DetalleLiquidacionPE[] {
        return this._detallesLiquidacion$.value;
    }

    obtenerOrdenesActuales(): OrdenPE[] {
        return this._ordenes$.value;
    }

    estaOcupado(): boolean {
        return this._cargandoFactura$.value ||
            this._cargandoDetalles$.value ||
            this._procesandoLiquidacion$.value ||
            this._cargandoCatalogos$.value;
    }

    // ============================================================================
    // MAPPERS PRIVADOS
    // ============================================================================

    private mapearFacturaApi(api: any): FacturaPE {
        return {
            id: api.id,
            numero_dte: api.numero_dte || '',
            fecha_emision: api.fecha_emision || '',
            numero_autorizacion: api.numero_autorizacion || '',
            tipo_dte: api.tipo_dte || '',
            nombre_emisor: api.nombre_emisor || '',
            monto_total: this.toNumber(api.monto_total),
            monto_liquidado: this.toNumber(api.monto_liquidado),
            estado_liquidacion: this.mapearEstadoLiquidacion(api.estado_liquidacion || api.estado),
            moneda: (api.moneda as 'GTQ' | 'USD') || 'GTQ',
            dias_transcurridos: api.dias_transcurridos || 0,
            estado_autorizacion: this.mapearEstadoAutorizacion(api.estado_autorizacion),
            motivo_autorizacion: api.motivo_autorizacion,
            fecha_solicitud: api.fecha_solicitud,
            fecha_autorizacion: api.fecha_autorizacion,
            comentarios_autorizacion: api.comentarios_autorizacion
        };
    }

    private mapearDetalleApi(api: any): DetalleLiquidacionPE {
        return {
            id: api.id,
            numero_orden: String(api.numero_orden || ''),
            agencia: api.agencia || '',
            descripcion: api.descripcion || '',
            monto: this.toNumber(api.monto),
            correo_proveedor: api.correo_proveedor || '',
            forma_pago: (api.forma_pago as any) || 'deposito',
            banco: api.banco || '',
            cuenta: api.cuenta || '',
            editando: false,
            guardando: false
        };
    }

    private mapearOrdenApi(api: any): OrdenPE {
        return {
            numero_orden: this.toNumber(api.numero_orden),
            total: this.toNumber(api.total),
            monto_liquidado: this.toNumber(api.monto_liquidado),
            monto_pendiente: this.toNumber(api.monto_pendiente),
            anticipos_pendientes: this.toNumber(api.anticipos_pendientes_o_tardios),
            area: api.area || null,
            presupuesto: api.presupuesto || null
        };
    }

    private mapearEstadoLiquidacion(estado: string): 'Pendiente' | 'En Revisión' | 'Liquidado' {
        const s = (estado || '').toLowerCase();
        if (s.includes('liquidado')) return 'Liquidado';
        if (s.includes('revisión') || s.includes('revision')) return 'En Revisión';
        return 'Pendiente';
    }

    private mapearEstadoAutorizacion(estado: string): 'ninguna' | 'pendiente' | 'aprobada' | 'rechazada' {
        const s = (estado || '').toLowerCase();
        if (!s || s === 'null' || s === 'undefined') return 'ninguna';
        if (s === 'aprobada' || s === 'autorizada') return 'aprobada';
        if (s === 'rechazada') return 'rechazada';
        if (s === 'pendiente') return 'pendiente';
        return 'ninguna';
    }

    private toNumber(value: any): number {
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
    }
}