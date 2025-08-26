// ============================================================================
// FACADE PRINCIPAL UNIFICADO - CON GETTERS PARA VALORES ACTUALES
// ============================================================================

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, tap, map, catchError, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../servicios/servicio-general.service';

// USAR SOLO EL MODELO UNIFICADO
import {
    OrdenPlanEmpresarial,
    FacturaPE,
    DetalleLiquidacionPE,
    TIPOS_PAGO_DEFAULT,
    TipoPago,
    AutorizacionEstado,
    EstadoLiquidacionTexto,
    EstadoLiquidacionId,
    PLAN_EMPRESARIAL_ENDPOINTS,
    RegistrarFacturaPayload,
    SolicitarAutorizacionPayload,
    AnticipoPendientePE,
    SolicitudAutorizacionPayload,
    ResumenOrdenesPE
} from './shared/models/plan-empresarial.models';

@Injectable({ providedIn: 'root' })
export class PlanEmpresarialContainerFacade {

    // === ORDENES ===
    private readonly _ordenes$ = new BehaviorSubject<OrdenPlanEmpresarial[]>([]);
    private readonly _cargandoOrdenes$ = new BehaviorSubject<boolean>(false);

    // === FACTURAS ===
    private readonly _factura$ = new BehaviorSubject<FacturaPE | null>(null);
    private readonly _loadingFactura$ = new BehaviorSubject<boolean>(false);

    // === LIQUIDACIONES ===
    private readonly _detallesLiquidacion$ = new BehaviorSubject<DetalleLiquidacionPE[]>([]);
    private readonly _loadingDetalles$ = new BehaviorSubject<boolean>(false);
    private readonly _savingDetalles$ = new BehaviorSubject<boolean>(false);

    // === ANTICIPOS ===
    private readonly _anticipos$ = new BehaviorSubject<AnticipoPendientePE[]>([]);
    private readonly _cargandoAnticipos$ = new BehaviorSubject<boolean>(false);
    private readonly _enviandoSolicitud$ = new BehaviorSubject<boolean>(false);

    // === CATALOGOS ===
    private readonly _agencias$ = new BehaviorSubject<{ id: number; nombre: string }[]>([]);
    private readonly _tiposPago$ = new BehaviorSubject<TipoPago[]>(TIPOS_PAGO_DEFAULT);

    // === STREAMS PÚBLICOS ===
    readonly ordenes$ = this._ordenes$.asObservable();
    readonly cargandoOrdenes$ = this._cargandoOrdenes$.asObservable();

    readonly factura$ = this._factura$.asObservable();
    readonly loadingFactura$ = this._loadingFactura$.asObservable();

    readonly detallesLiquidacion$ = this._detallesLiquidacion$.asObservable();
    readonly loadingDetalles$ = this._loadingDetalles$.asObservable();
    readonly savingDetalles$ = this._savingDetalles$.asObservable();

    readonly anticipos$ = this._anticipos$.asObservable();
    readonly cargandoAnticipos$ = this._cargandoAnticipos$.asObservable();
    readonly enviandoSolicitud$ = this._enviandoSolicitud$.asObservable();

    readonly agencias$ = this._agencias$.asObservable();
    readonly tiposPago$ = this._tiposPago$.asObservable();

    // Total calculado de los detalles
    readonly total$ = this.detallesLiquidacion$.pipe(
        map(detalles => detalles.reduce((acc, d) => acc + (Number(d.monto) || 0), 0))
    );

    constructor(private api: ServicioGeneralService) { }

    // ============================================================================
    // GETTERS PARA VALORES ACTUALES - ✅ CORREGIDOS
    // ============================================================================

    /**
     * Obtiene la factura actual sin suscripción
     */
    getFacturaActual(): FacturaPE | null {
        return this._factura$.value;
    }

    /**
     * Obtiene los detalles actuales sin suscripción
     */
    getDetallesActuales(): DetalleLiquidacionPE[] {
        return this._detallesLiquidacion$.value;
    }

    /**
     * Obtiene las órdenes actuales sin suscripción
     */
    getOrdenesActuales(): OrdenPlanEmpresarial[] {
        return this._ordenes$.value;
    }

    /**
     * Obtiene los anticipos actuales sin suscripción
     */
    getAnticiposActuales(): AnticipoPendientePE[] {
        return this._anticipos$.value;
    }

    /**
     * Verifica si hay una factura cargada
     */
    tieneFactura(): boolean {
        return this._factura$.value !== null;
    }

    /**
     * Obtiene el total actual sin suscripción
     */
    getTotalActual(): number {
        return this._detallesLiquidacion$.value.reduce((acc, d) => acc + (Number(d.monto) || 0), 0);
    }

    // ============================================================================
    // ÓRDENES
    // ============================================================================

    cargarOrdenes(): void {
        this._cargandoOrdenes$.next(true);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((resp: any) => {
                if (resp?.respuesta === 'success') {
                    return this.mapOrdenesApi(resp.datos || []);
                }
                throw resp;
            }),
            catchError((error) => {
                this.mensajeError(error, 'No se pudieron cargar las órdenes');
                return of([] as OrdenPlanEmpresarial[]);
            }),
            finalize(() => this._cargandoOrdenes$.next(false))
        ).subscribe((lista) => this._ordenes$.next(lista));
    }

    // ============================================================================
    // FACTURAS
    // ============================================================================

    buscarFactura(numeroDte: string): void {
        if (!numeroDte || !numeroDte.trim()) {
            this._factura$.next(null);
            this._detallesLiquidacion$.next([]);
            return;
        }

        this._loadingFactura$.next(true);
        this._factura$.next(null);
        this._detallesLiquidacion$.next([]);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.BUSCAR_FACTURA,
            tipo: 'post',
            body: { texto: numeroDte.trim() }
        }).pipe(
            switchMap((res: any) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos) && res.datos.length) {
                    const factura = this.mapFacturaApi(res.datos[0]);
                    this._factura$.next(factura);

                    // Cargar detalles automáticamente si la factura tiene ID
                    if (factura.id) {
                        return this.cargarDetallesInterno(factura.id).pipe(map(() => factura));
                    }
                    return of(factura);
                }
                throw new Error(res.mensaje || 'Factura no encontrada');
            }),
            catchError((err) => {
                this.api.mensajeServidor('info', err.message || 'Factura no encontrada', 'Información');
                return of(null);
            }),
            finalize(() => this._loadingFactura$.next(false))
        ).subscribe();
    }

    registrarFactura(payload: RegistrarFacturaPayload, onSuccess?: () => void): void {
        this._loadingFactura$.next(true);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.REGISTRAR_FACTURA,
            tipo: 'post',
            body: payload
        }).pipe(
            finalize(() => this._loadingFactura$.next(false)),
            catchError((e) => {
                const errorMsg = e?.error?.mensaje || e?.message || 'Error al registrar la factura';
                this.api.mensajeServidor('error', errorMsg);
                return of({ respuesta: 'error', mensaje: errorMsg });
            })
        ).subscribe((res) => {
            if (res.respuesta === 'success') {
                this.api.mensajeServidor('success', 'Factura registrada correctamente');
                if (onSuccess) onSuccess();
                // Buscar automáticamente la factura recién registrada
                setTimeout(() => this.buscarFactura(payload.numero_dte), 500);
            } else {
                this.api.mensajeServidor('error', res.mensaje || 'No se pudo registrar la factura');
            }
        });
    }

    solicitarAutorizacion(payload: SolicitarAutorizacionPayload, onSuccess?: () => void): void {
        this._loadingFactura$.next(true);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.SOLICITAR_AUTORIZACION,
            tipo: 'post',
            body: payload
        }).pipe(
            finalize(() => this._loadingFactura$.next(false)),
            catchError((e) => {
                const errorMsg = e?.error?.mensaje || e?.message || 'Error al enviar la solicitud';
                this.api.mensajeServidor('error', errorMsg);
                return of({ respuesta: 'error', mensaje: errorMsg });
            })
        ).subscribe((r) => {
            if (r.respuesta === 'success') {
                this.api.mensajeServidor('success', 'Solicitud enviada correctamente');
                if (onSuccess) onSuccess();
                // Refrescar factura
                setTimeout(() => this.buscarFactura(payload.numero_dte), 500);
            } else {
                this.api.mensajeServidor('error', r.mensaje || 'No se pudo enviar la solicitud');
            }
        });
    }

    // ============================================================================
    // LIQUIDACIONES
    // ============================================================================

    private cargarDetallesInterno(facturaId: number): Observable<DetalleLiquidacionPE[]> {
        this._loadingDetalles$.next(true);

        return this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.OBTENER_DETALLES,
            tipo: 'post',
            body: { facturaId }
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    const mapped = (res.datos ?? []).map((item: any) => this.mapDetalleApi(item));
                    const withFactura = mapped.map((d: DetalleLiquidacionPE) => ({ ...d, factura_id: facturaId }));
                    this._detallesLiquidacion$.next(withFactura);
                } else {
                    this._detallesLiquidacion$.next([]);
                }
                this._loadingDetalles$.next(false);
            }),
            map(() => this._detallesLiquidacion$.value),
            catchError(err => {
                console.error('cargarDetalles error', err);
                this._loadingDetalles$.next(false);
                this._detallesLiquidacion$.next([]);
                return of([]);
            })
        );
    }

    agregarDetalle(base?: Partial<DetalleLiquidacionPE>): void {
        const facturaId = this._factura$.value?.id ?? null;
        const nuevo: DetalleLiquidacionPE = {
            id: undefined,
            numero_orden: String(base?.numero_orden ?? ''),
            agencia: String(base?.agencia ?? ''),
            descripcion: String(base?.descripcion ?? ''),
            monto: Number(base?.monto ?? 0),
            correo_proveedor: String(base?.correo_proveedor ?? ''),
            forma_pago: (base?.forma_pago as any) ?? 'deposito',
            banco: String(base?.banco ?? ''),
            cuenta: String(base?.cuenta ?? ''),
            factura_id: facturaId
        };
        this._detallesLiquidacion$.next([...this._detallesLiquidacion$.value, nuevo]);
    }

    copiarDetalle(index: number): void {
        const list = [...this._detallesLiquidacion$.value];
        if (index < 0 || index >= list.length) return;

        const copia = { ...list[index] };
        delete (copia as any).id;
        list.splice(index + 1, 0, copia);
        this._detallesLiquidacion$.next(list);
    }

    actualizarDetalle(index: number, patch: Partial<DetalleLiquidacionPE>): void {
        const list = [...this._detallesLiquidacion$.value];
        if (index < 0 || index >= list.length) return;

        list[index] = { ...list[index], ...patch };
        this._detallesLiquidacion$.next(list);
    }

    eliminarDetalle(index: number): void {
        const list = [...this._detallesLiquidacion$.value];
        if (index < 0 || index >= list.length) return;

        const item = list[index];
        if (!item.id) {
            // Sin ID = solo local
            list.splice(index, 1);
            this._detallesLiquidacion$.next(list);
            return;
        }

        // Con ID = eliminar del servidor
        this._savingDetalles$.next(true);
        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.ELIMINAR_DETALLE,
            tipo: 'post',
            body: { id: item.id }
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    list.splice(index, 1);
                    this._detallesLiquidacion$.next(list);
                    this.api.mensajeServidor('success', 'Detalle eliminado correctamente');
                } else {
                    this.api.mensajeServidor('error', res.mensaje || 'Error al eliminar');
                }
                this._savingDetalles$.next(false);
            }),
            catchError(err => {
                console.error('eliminarDetalle error', err);
                this.api.mensajeServidor('error', 'Error al eliminar el detalle');
                this._savingDetalles$.next(false);
                return of(null);
            })
        ).subscribe();
    }

    guardarTodosLosDetalles(): Observable<boolean> {
        const facturaId = this._factura$.value?.id;
        if (!facturaId) return of(false);

        const detalles = this._detallesLiquidacion$.value;
        if (!detalles.length) return of(true);

        this._savingDetalles$.next(true);

        const peticiones = detalles.map(d =>
            this.api.query({
                ruta: PLAN_EMPRESARIAL_ENDPOINTS.GUARDAR_DETALLE,
                tipo: 'post',
                body: this.mapDetalleToPayload(d)
            })
        );

        return new Observable<boolean>(observer => {
            Promise.all(peticiones.map(req => req.toPromise()))
                .then(() => {
                    this.cargarDetallesInterno(facturaId).subscribe({
                        next: () => {
                            this.api.mensajeServidor('success', 'Detalles guardados correctamente');
                            observer.next(true);
                            observer.complete();
                        },
                        error: (err) => {
                            console.error('Error al recargar detalles:', err);
                            observer.next(false);
                            observer.complete();
                        }
                    });
                })
                .catch(err => {
                    console.error('guardarTodosLosDetalles error', err);
                    this.api.mensajeServidor('error', 'Error al guardar los detalles');
                    observer.next(false);
                    observer.complete();
                })
                .finally(() => {
                    this._savingDetalles$.next(false);
                });
        });
    }

    cambiarFormaPago(index: number, tipo: string): void {
        this.actualizarDetalle(index, { forma_pago: tipo });
    }

    // ============================================================================
    // ANTICIPOS (INTEGRADO)
    // ============================================================================

    cargarAnticipos(numeroOrden: number): void {
        if (!numeroOrden || numeroOrden <= 0) {
            this._anticipos$.next([]);
            return;
        }

        this._cargandoAnticipos$.next(true);

        this.api.query({
            ruta: `${PLAN_EMPRESARIAL_ENDPOINTS.LISTAR_ANTICIPOS_PENDIENTES}?numeroOrden=${numeroOrden}`,
            tipo: 'get'
        }).pipe(
            map((resp: any) => {
                if (resp?.respuesta === 'success') {
                    return this.mapAnticiposApi(resp.datos || []);
                }
                throw resp;
            }),
            catchError((error) => {
                this.mensajeError(error, 'Error al cargar anticipos');
                return of([] as AnticipoPendientePE[]);
            }),
            finalize(() => this._cargandoAnticipos$.next(false))
        ).subscribe((lista) => this._anticipos$.next(lista));
    }

    solicitarAutorizacionAnticipo(payload: SolicitudAutorizacionPayload, onSuccess?: () => void): void {
        this._enviandoSolicitud$.next(true);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.SOLICITAR_AUTORIZACION_ANTICIPO,
            tipo: 'post',
            body: payload
        }).pipe(
            map((resp: any) => {
                if (resp?.respuesta === 'success') return true;
                throw resp;
            }),
            catchError((error) => {
                this.mensajeError(error, 'No se pudo enviar la solicitud');
                return of(false);
            }),
            finalize(() => this._enviandoSolicitud$.next(false))
        ).subscribe((ok) => {
            if (ok) {
                this.api.mensajeServidor('success', 'Solicitud enviada correctamente', 'Solicitud Procesada');
                onSuccess?.();
            }
        });
    }

    // ============================================================================
    // CATÁLOGOS
    // ============================================================================

    cargarCatalogos(): void {
        // Cargar agencias
        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.OBTENER_AGENCIAS,
            tipo: 'get'
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    this._agencias$.next(res.datos);
                }
            }),
            catchError(() => of(null))
        ).subscribe();

        // Cargar tipos de pago
        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.OBTENER_TIPOS_PAGO,
            tipo: 'get'
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    this._tiposPago$.next(res.datos);
                }
            }),
            catchError(() => of(null))
        ).subscribe();
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    limpiarDatos(): void {
        this._factura$.next(null);
        this._detallesLiquidacion$.next([]);
        this._anticipos$.next([]);
    }

    getResumenOrdenes(lista: OrdenPlanEmpresarial[]): ResumenOrdenesPE {
        const totalOrdenes = lista.length;
        const totalPendientes = lista.filter(o => o.montoPendiente > 0).length;
        return { totalOrdenes, totalPendientes };
    }

    // ============================================================================
    // MAPPERS INTERNOS
    // ============================================================================

    private mapOrdenesApi(data: any[]): OrdenPlanEmpresarial[] {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            numeroOrden: this.toInt(item?.numero_orden),
            total: this.toFloat(item?.total),
            montoLiquidado: this.toFloat(item?.monto_liquidado),
            montoPendiente: this.toFloat(item?.monto_pendiente),
            totalAnticipos: this.toFloat(item?.total_anticipos),
            anticiposPendientesOTardios: this.toInt(item?.anticipos_pendientes_o_tardios)
        })).filter(o => o.numeroOrden > 0);
    }

    private mapFacturaApi(api: any): FacturaPE {
        const mapEstadoTexto = (estadoId?: number, estado_liquidacion?: string): EstadoLiquidacionTexto => {
            if (estadoId === EstadoLiquidacionId.EnRevision) return 'En Revisión';
            if (estadoId === EstadoLiquidacionId.Liquidado) return 'Liquidado';
            if (estadoId === EstadoLiquidacionId.Pendiente) return 'Pendiente';

            if (estado_liquidacion) {
                const s = estado_liquidacion.toLowerCase();
                if (s.includes('revisión') || s.includes('revision')) return 'En Revisión';
                if (s.includes('liquidado')) return 'Liquidado';
                return 'Pendiente';
            }
            return 'Pendiente';
        };

        const mapAutorizacionEstado = (api: any): AutorizacionEstado => {
            const s = ((api as string) || '').toLowerCase();
            if (!s) return AutorizacionEstado.Ninguna;
            if (s === 'aprobada') return AutorizacionEstado.Aprobada;
            if (s === 'rechazada') return AutorizacionEstado.Rechazada;
            if (s === 'pendiente') return AutorizacionEstado.Pendiente;
            return AutorizacionEstado.Ninguna;
        };

        return {
            id: api.id,
            numero_dte: api.numero_dte ?? '',
            fecha_emision: api.fecha_emision ?? '',
            numero_autorizacion: api.numero_autorizacion ?? '',
            tipo_dte: api.tipo_dte ?? '',
            nombre_emisor: api.nombre_emisor ?? '',
            monto_total: this.toNumberSafe(api.monto_total, 0),
            estado: api.estado ?? '',
            estado_id: api.estado_id as any,
            estado_liquidacion: mapEstadoTexto(api.estado_id, api.estado_liquidacion),
            monto_liquidado: this.toNumberSafe(api.monto_liquidado ?? 0, 0),
            moneda: (api.moneda as any) ?? 'GTQ',

            // Campos de autorización
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
                ? api.detalles_liquidacion.map((d: any) => this.mapDetalleApi(d))
                : [],
        };
    }

    private mapDetalleApi(api: any): DetalleLiquidacionPE {
        return {
            id: api.id,
            numero_orden: String(api.numero_orden ?? ''),
            agencia: api.agencia ?? '',
            descripcion: api.descripcion ?? '',
            monto: this.toNumberSafe(api.monto, 0),
            correo_proveedor: api.correo_proveedor ?? '',
            forma_pago: (api.forma_pago?.toLowerCase?.() as any) ?? 'deposito',
            banco: api.banco ?? '',
            cuenta: api.cuenta ?? '',
            factura_id: api.factura_id ?? null,
            fecha_creacion: api.fecha_creacion ?? null,
        };
    }

    private mapDetalleToPayload(detalle: DetalleLiquidacionPE) {
        return {
            id: detalle.id ?? null,
            factura_id: detalle.factura_id ?? null,
            numero_orden: detalle.numero_orden,
            agencia: detalle.agencia,
            descripcion: detalle.descripcion,
            monto: detalle.monto,
            correo_proveedor: detalle.correo_proveedor,
            forma_pago: detalle.forma_pago,
            banco: detalle.banco,
            cuenta: detalle.cuenta,
        };
    }

    private mapAnticiposApi(data: any[]): AnticipoPendientePE[] {
        // Implementar mapper de anticipos según la lógica existente
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            idSolicitud: this.toInt(item?.id_solicitud),
            numeroOrden: this.toInt(item?.numero_orden),
            tipoAnticipo: item?.tipo_anticipo ?? 'CHEQUE',
            monto: this.toFloat(item?.monto),
            fechaLiquidacion: item?.fecha_liquidacion ?? null,
            diasTranscurridos: item?.dias_transcurridos ?? null,
            estadoLiquidacion: item?.estado_liquidacion ?? 'NO_LIQUIDADO',
            estadoSolicitud: item?.estado_solicitud ?? null,
            requiereAutorizacion: item?.requiere_autorizacion ?? null,
            diasPermitidos: item?.dias_permitidos ?? null,
            motivoInclusion: item?.motivo_inclusion ?? null,
            ultimoSeguimiento: item?.ultimo_seguimiento ?? null
        })).filter(a => a.idSolicitud > 0);
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    private toInt = (v: any, def = 0) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : def;
    };

    private toFloat = (v: any, def = 0) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : def;
    };

    private toNumberSafe = (n: any, fallback = 0): number => {
        const v = typeof n === 'string' ? parseFloat(n) : n;
        return isNaN(v) ? fallback : v;
    };

    private mensajeError(error: any, fallback: string): void {
        const msg =
            (Array.isArray(error?.mensaje) ? error.mensaje.join(', ') : (error?.mensaje ?? null)) ||
            (Array.isArray(error?.error?.mensaje) ? error.error.mensaje.join(', ') : (error?.error?.mensaje ?? null)) ||
            (error?.message ?? fallback);
        this.api.mensajeServidor('error', msg, 'Error');
    }
}