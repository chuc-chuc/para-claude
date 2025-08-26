// ============================================================================
// FACADE OPTIMIZADO - PLAN EMPRESARIAL
// ============================================================================

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, tap, map, catchError, finalize, share } from 'rxjs';
import { ServicioGeneralService } from '../../servicios/servicio-general.service';
import {
    OrdenPlanEmpresarial, FacturaPE, DetalleLiquidacionPE, TIPOS_PAGO_DEFAULT, TipoPago,
    AutorizacionEstado, EstadoLiquidacionTexto, EstadoLiquidacionId, PLAN_EMPRESARIAL_ENDPOINTS,
    RegistrarFacturaPayload, SolicitarAutorizacionPayload, AnticipoPendientePE,
    SolicitudAutorizacionPayload, ResumenOrdenesPE
} from './shared/models/plan-empresarial.models';

@Injectable({ providedIn: 'root' })
export class PlanEmpresarialContainerFacade {

    // === SUBJECTS PRIVADOS ===
    private readonly _ordenes$ = new BehaviorSubject<OrdenPlanEmpresarial[]>([]);
    private readonly _cargandoOrdenes$ = new BehaviorSubject<boolean>(false);
    private readonly _factura$ = new BehaviorSubject<FacturaPE | null>(null);
    private readonly _loadingFactura$ = new BehaviorSubject<boolean>(false);
    private readonly _detallesLiquidacion$ = new BehaviorSubject<DetalleLiquidacionPE[]>([]);
    private readonly _loadingDetalles$ = new BehaviorSubject<boolean>(false);
    private readonly _savingDetalles$ = new BehaviorSubject<boolean>(false);
    private readonly _anticipos$ = new BehaviorSubject<AnticipoPendientePE[]>([]);
    private readonly _cargandoAnticipos$ = new BehaviorSubject<boolean>(false);
    private readonly _enviandoSolicitud$ = new BehaviorSubject<boolean>(false);
    private readonly _agencias$ = new BehaviorSubject<{ id: number; nombre_liquidacion: string }[]>([]);
    private readonly _tiposPago$ = new BehaviorSubject<TipoPago[]>(TIPOS_PAGO_DEFAULT);

    // === CACHE ===
    private ultimaBusquedaDte = '';
    private facturaEnCache: FacturaPE | null = null;

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
    readonly total$ = this.detallesLiquidacion$.pipe(
        map(detalles => detalles.reduce((acc, d) => acc + (Number(d.monto) || 0), 0))
    );

    constructor(private api: ServicioGeneralService) { }

    // === GETTERS ===
    getFacturaActual(): FacturaPE | null { return this._factura$.value; }
    getDetallesActuales(): DetalleLiquidacionPE[] { return this._detallesLiquidacion$.value; }
    getOrdenesActuales(): OrdenPlanEmpresarial[] { return this._ordenes$.value; }
    getAnticiposActuales(): AnticipoPendientePE[] { return this._anticipos$.value; }
    tieneFactura(): boolean { return this._factura$.value !== null; }
    getTotalActual(): number { return this._detallesLiquidacion$.value.reduce((acc, d) => acc + (Number(d.monto) || 0), 0); }

    // ============================================================================
    // ÓRDENES
    // ============================================================================
    cargarOrdenes(): void {
        this._cargandoOrdenes$.next(true);
        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((resp: any) => resp?.respuesta === 'success' ? this.mapOrdenesApi(resp.datos || []) : []),
            catchError(() => of([] as OrdenPlanEmpresarial[])),
            finalize(() => this._cargandoOrdenes$.next(false))
        ).subscribe(lista => this._ordenes$.next(lista));
    }

    // ============================================================================
    // FACTURAS
    // ============================================================================
    buscarFactura(numeroDte: string): void {
        const dteNormalizado = (numeroDte || '').trim();

        if (!dteNormalizado) {
            this.limpiarBusqueda();
            return;
        }

        if (this.ultimaBusquedaDte === dteNormalizado && this.facturaEnCache) return;

        this.ultimaBusquedaDte = dteNormalizado;
        this._loadingFactura$.next(true);

        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.BUSCAR_FACTURA,
            tipo: 'post',
            body: { texto: dteNormalizado }
        }).pipe(
            switchMap((res: any) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos) && res.datos.length) {
                    const factura = this.mapFacturaApi(res.datos[0]);
                    this.facturaEnCache = factura;
                    this._factura$.next(factura);
                    return this.cargarDetallesDirecto(factura.numero_dte);
                }
                throw new Error(res.mensaje || 'Factura no encontrada');
            }),
            catchError((err) => {
                this.facturaEnCache = null;
                this._factura$.next(null);
                this._detallesLiquidacion$.next([]);
                this.api.mensajeServidor('info', err.message || 'Factura no encontrada', 'Información');
                return of(null);
            }),
            finalize(() => this._loadingFactura$.next(false)),
            share()
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
                this.api.mensajeServidor('error', e?.error?.mensaje || e?.message || 'Error al registrar la factura');
                return of({ respuesta: 'error' });
            })
        ).subscribe((res) => {
            if (res.respuesta === 'success') {
                this.api.mensajeServidor('success', 'Factura registrada correctamente');
                if (onSuccess) onSuccess();
                this.limpiarBusqueda();
                setTimeout(() => this.buscarFactura(payload.numero_dte), 500);
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
                this.api.mensajeServidor('error', e?.error?.mensaje || e?.message || 'Error al enviar la solicitud');
                return of({ respuesta: 'error' });
            })
        ).subscribe((r) => {
            if (r.respuesta === 'success') {
                this.api.mensajeServidor('success', 'Solicitud enviada correctamente');
                if (onSuccess) onSuccess();
                this.limpiarBusqueda();
                setTimeout(() => this.buscarFactura(payload.numero_dte), 500);
            }
        });
    }

    // ============================================================================
    // LIQUIDACIONES
    // ============================================================================
    recargarDetalles(): void {
        const factura = this._factura$.value;
        if (factura?.numero_dte) {
            this.cargarDetallesDirecto(factura.numero_dte).subscribe();
        }
    }

    agregarDetalle(): void {
        // Solo para compatibilidad - el backend maneja la creación
    }

    copiarDetalle(index: number): void {
        const list = this._detallesLiquidacion$.value;
        if (index < 0 || index >= list.length) return;

        const detalleOriginal = list[index];

        if (detalleOriginal.id) {
            this.api.query({
                ruta: 'contabilidad/copiarDetalleLiquidacion',
                tipo: 'post',
                body: { id: detalleOriginal.id }
            }).pipe(
                catchError(() => {
                    this.api.mensajeServidor('error', 'Error al copiar detalle');
                    return of(null);
                })
            ).subscribe((res: any) => {
                if (res?.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Detalle copiado correctamente');
                    this.recargarDetalles();
                }
            });
        } else {
            // Fallback para detalles sin ID
            const copia: DetalleLiquidacionPE = {
                ...detalleOriginal,
                id: undefined,
                descripcion: '[COPIA] ' + detalleOriginal.descripcion
            };
            list.splice(index + 1, 0, copia);
            this._detallesLiquidacion$.next([...list]);
        }
    }

    actualizarDetalle(index: number, patch: Partial<DetalleLiquidacionPE>): void {
        const list = [...this._detallesLiquidacion$.value];
        if (index < 0 || index >= list.length) return;

        const detalleActual = list[index];

        if (detalleActual.id && (patch.monto !== undefined || patch.agencia !== undefined)) {
            const payload: any = { id: detalleActual.id };
            if (patch.monto !== undefined) payload.monto = patch.monto;
            if (patch.agencia !== undefined) payload.agencia = patch.agencia;

            this.api.query({
                ruta: 'contabilidad/actualizarMontoAgencia',
                tipo: 'post',
                body: payload
            }).pipe(
                catchError(() => {
                    this.api.mensajeServidor('error', 'Error al actualizar');
                    return of(null);
                })
            ).subscribe((res: any) => {
                if (res?.respuesta === 'success') {
                    list[index] = { ...list[index], ...patch };
                    this._detallesLiquidacion$.next(list);
                }
            });
        } else {
            list[index] = { ...list[index], ...patch };
            this._detallesLiquidacion$.next(list);
        }
    }

    eliminarDetalle(index: number): void {
        const list = [...this._detallesLiquidacion$.value];
        if (index < 0 || index >= list.length) return;

        const item = list[index];
        if (!item.id) {
            list.splice(index, 1);
            this._detallesLiquidacion$.next(list);
            return;
        }

        this._savingDetalles$.next(true);
        this.api.query({
            ruta: 'contabilidad/eliminarDetalleLiquidacion',
            tipo: 'post',
            body: { id: item.id }
        }).pipe(
            finalize(() => this._savingDetalles$.next(false)),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al eliminar detalle');
                return of(null);
            })
        ).subscribe((res: any) => {
            if (res?.respuesta === 'success') {
                list.splice(index, 1);
                this._detallesLiquidacion$.next(list);
                this.api.mensajeServidor('success', 'Detalle eliminado correctamente');
            }
        });
    }

    guardarTodosLosDetalles(): Observable<boolean> {
        const factura = this._factura$.value;
        if (!factura?.numero_dte) return of(false);

        const detalles = this._detallesLiquidacion$.value;
        const detallesSinId = detalles.filter(d => !d.id);

        if (detallesSinId.length === 0) {
            this.api.mensajeServidor('info', 'Todos los detalles ya están guardados', 'Información');
            return of(true);
        }

        this._savingDetalles$.next(true);
        const peticiones = detallesSinId.map(d =>
            this.api.query({
                ruta: 'contabilidad/guardarDetalleLiquidacion',
                tipo: 'post',
                body: this.mapDetalleToPayload(d, factura.numero_dte)
            })
        );

        return new Observable<boolean>(observer => {
            Promise.all(peticiones.map(req => req.toPromise()))
                .then((resultados) => {
                    const exitosos = resultados.filter((r: any) => r?.respuesta === 'success').length;
                    const errores = resultados.length - exitosos;

                    if (errores === 0) {
                        this.api.mensajeServidor('success', `${exitosos} detalles guardados correctamente`);
                        this.recargarDetalles();
                        observer.next(true);
                    } else {
                        this.api.mensajeServidor('warning', `${exitosos} guardados, ${errores} con errores`);
                        observer.next(false);
                    }
                })
                .catch(() => {
                    this.api.mensajeServidor('error', 'Error al guardar detalles');
                    observer.next(false);
                })
                .finally(() => {
                    this._savingDetalles$.next(false);
                    observer.complete();
                });
        });
    }

    cambiarFormaPago(index: number, tipo: string): void {
        this.actualizarDetalle(index, { forma_pago: tipo });
    }

    // ============================================================================
    // ANTICIPOS
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
            map((resp: any) => resp?.respuesta === 'success' ? this.mapAnticiposApi(resp.datos || []) : []),
            catchError(() => of([] as AnticipoPendientePE[])),
            finalize(() => this._cargandoAnticipos$.next(false))
        ).subscribe(lista => this._anticipos$.next(lista));
    }

    solicitarAutorizacionAnticipo(payload: SolicitudAutorizacionPayload, onSuccess?: () => void): void {
        this._enviandoSolicitud$.next(true);
        this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.SOLICITAR_AUTORIZACION_ANTICIPO,
            tipo: 'post',
            body: payload
        }).pipe(
            finalize(() => this._enviandoSolicitud$.next(false)),
            catchError(() => of(false))
        ).subscribe((resp: any) => {
            if (resp?.respuesta === 'success') {
                this.api.mensajeServidor('success', 'Solicitud enviada correctamente');
                onSuccess?.();
            }
        });
    }

    // ============================================================================
    // CATÁLOGOS
    // ============================================================================
    cargarCatalogos(): void {
        // Agencias
        this.api.query({
            ruta: 'contabilidad/buscarNombreLiquidacion',
            tipo: 'get'
        }).pipe(
            catchError(() => of({ respuesta: 'error', datos: [] }))
        ).subscribe((res: any) => {
            if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                const agencias = res.datos.map((item: any) => ({
                    id: item.id || 0,
                    nombre_liquidacion: item.nombre_liquidacion || 'Sin nombre'
                }));
                this._agencias$.next(agencias);
            }
        });

        // Tipos de pago
        this.api.query({
            ruta: 'contabilidad/obtenerTiposPago',
            tipo: 'get'
        }).pipe(
            catchError(() => of({ respuesta: 'error', datos: [] }))
        ).subscribe((res: any) => {
            if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                const tiposBackend: TipoPago[] = res.datos.map((item: any) => ({
                    id: item.id || item.tipo || 'deposito',
                    nombre: item.nombre || item.descripcion || 'Sin nombre',
                    requiereFormulario: item.requiere_formulario || false
                }));

                const tiposCombinados = [...TIPOS_PAGO_DEFAULT];
                tiposBackend.forEach((tipo: TipoPago) => {
                    if (!tiposCombinados.find(t => t.id === tipo.id)) {
                        tiposCombinados.push(tipo);
                    }
                });

                this._tiposPago$.next(tiposCombinados);
            } else {
                this._tiposPago$.next(TIPOS_PAGO_DEFAULT);
            }
        });
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================
    limpiarDatos(): void {
        this.limpiarBusqueda();
        this._anticipos$.next([]);
    }

    getResumenOrdenes(lista: OrdenPlanEmpresarial[]): ResumenOrdenesPE {
        return {
            totalOrdenes: lista.length,
            totalPendientes: lista.filter(o => o.montoPendiente > 0).length
        };
    }

    // ============================================================================
    // MÉTODOS PRIVADOS
    // ============================================================================
    private limpiarBusqueda(): void {
        this.ultimaBusquedaDte = '';
        this.facturaEnCache = null;
        this._factura$.next(null);
        this._detallesLiquidacion$.next([]);
    }

    private cargarDetallesDirecto(numeroDte: string): Observable<FacturaPE | null> {
        this._loadingDetalles$.next(true);

        return this.api.query({
            ruta: PLAN_EMPRESARIAL_ENDPOINTS.OBTENER_DETALLES,
            tipo: 'post',
            body: { numero_factura: numeroDte }
        }).pipe(
            tap((res: any) => {
                const mapped = res.respuesta === 'success'
                    ? (res.datos ?? []).map((item: any) => this.mapDetalleApi(item))
                    : [];
                this._detallesLiquidacion$.next(mapped);
                this._loadingDetalles$.next(false);
            }),
            map(() => this.facturaEnCache),
            catchError(() => {
                this._loadingDetalles$.next(false);
                this._detallesLiquidacion$.next([]);
                return of(this.facturaEnCache);
            }),
            share()
        );
    }

    // ============================================================================
    // MAPPERS
    // ============================================================================
    private mapOrdenesApi(data: any[]): OrdenPlanEmpresarial[] {
        return data.map(item => ({
            numeroOrden: this.toInt(item?.numero_orden),
            total: this.toFloat(item?.total),
            montoLiquidado: this.toFloat(item?.monto_liquidado),
            montoPendiente: this.toFloat(item?.monto_pendiente || (item?.total - item?.monto_liquidado)),
            totalAnticipos: this.toFloat(item?.total_anticipos),
            anticiposPendientesOTardios: this.toInt(item?.anticipos_pendientes_o_tardios)
        })).filter(o => o.numeroOrden > 0);
    }

    private mapFacturaApi(api: any): FacturaPE {
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
            estado_liquidacion: this.mapEstadoTexto(api.estado_id, api.estado_liquidacion),
            monto_liquidado: this.toNumberSafe(api.monto_liquidado ?? 0, 0),
            moneda: (api.moneda as any) ?? 'GTQ',
            dias_transcurridos: api.dias_transcurridos ?? null,
            tiene_autorizacion_tardanza: (api.tiene_autorizacion_tardanza ?? 0) === 1,
            autorizacion_id: api.autorizacion_id ?? null,
            estado_autorizacion: this.mapAutorizacionEstado(api.estado_autorizacion),
            motivo_autorizacion: api.motivo_autorizacion ?? null,
            solicitado_por: api.solicitado_por ?? null,
            fecha_solicitud: api.fecha_solicitud ?? null,
            autorizado_por: api.autorizado_por ?? null,
            fecha_autorizacion: api.fecha_autorizacion ?? null,
            comentarios_autorizacion: api.comentarios_autorizacion ?? null,
            detalles_liquidacion: []
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
            fecha_creacion: api.fecha_creacion ?? null
        };
    }

    private mapDetalleToPayload(detalle: DetalleLiquidacionPE, numeroFactura: string) {
        return {
            id: detalle.id ?? null,
            numero_factura: numeroFactura,
            numero_orden: detalle.numero_orden,
            agencia: detalle.agencia,
            descripcion: detalle.descripcion,
            monto: detalle.monto,
            correo_proveedor: detalle.correo_proveedor || null,
            forma_pago: detalle.forma_pago,
            banco: detalle.banco || null,
            cuenta: detalle.cuenta || null
        };
    }

    private mapAnticiposApi(data: any[]): AnticipoPendientePE[] {
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

    private mapEstadoTexto(estadoId?: number, estado_liquidacion?: string): EstadoLiquidacionTexto {
        if (estadoId === EstadoLiquidacionId.EnRevision) return 'En Revisión';
        if (estadoId === EstadoLiquidacionId.Liquidado) return 'Liquidado';
        if (estadoId === EstadoLiquidacionId.Pendiente) return 'Pendiente';

        if (estado_liquidacion) {
            const s = estado_liquidacion.toLowerCase();
            if (s.includes('revisión') || s.includes('revision')) return 'En Revisión';
            if (s.includes('liquidado')) return 'Liquidado';
        }
        return 'Pendiente';
    }

    private mapAutorizacionEstado(api: any): AutorizacionEstado {
        const s = ((api as string) || '').toLowerCase();
        if (!s || s === 'null' || s === 'undefined') return AutorizacionEstado.Ninguna;
        if (s === 'aprobada' || s === 'autorizada') return AutorizacionEstado.Aprobada;
        if (s === 'rechazada') return AutorizacionEstado.Rechazada;
        if (s === 'pendiente') return AutorizacionEstado.Pendiente;
        return AutorizacionEstado.Ninguna;
    }

    // === HELPERS ===
    private toInt = (v: any, def = 0) => Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : def;
    private toFloat = (v: any, def = 0) => Number.isFinite(parseFloat(v)) ? parseFloat(v) : def;
    private toNumberSafe = (n: any, fallback = 0): number => {
        const v = typeof n === 'string' ? parseFloat(n) : n;
        return isNaN(v) ? fallback : v;
    };
}