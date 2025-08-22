// services/plan-empresarial-container.facade.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, tap, map, catchError, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../servicios/servicio-general.service';

// Usar modelos compartidos
import {
    OrdenPlanEmpresarial,
    FacturaPE,
    DetalleLiquidacionPE,
    TIPOS_PAGO_DEFAULT,
    TipoPago,
    AutorizacionEstado,
    EstadoLiquidacionTexto,
    EstadoLiquidacionId
} from './shared/models/plan-empresarial.models';

import { mapOrdenesApi } from '../liquidacion-plan-empresarial/services/ordenes-pe.mapper';

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

    readonly agencias$ = this._agencias$.asObservable();
    readonly tiposPago$ = this._tiposPago$.asObservable();

    // Total calculado de los detalles
    readonly total$ = this.detallesLiquidacion$.pipe(
        map(detalles => detalles.reduce((acc, d) => acc + (Number(d.monto) || 0), 0))
    );

    constructor(private api: ServicioGeneralService) { }

    // === ÓRDENES ===
    cargarOrdenes(): void {
        this._cargandoOrdenes$.next(true);

        this.api.query({
            ruta: 'contabilidad/obtenerOrdenesAutorizadas',
            tipo: 'get'
        }).pipe(
            map((resp: any) => {
                if (resp?.respuesta === 'success') {
                    return mapOrdenesApi(resp.datos || []);
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

    // === FACTURAS ===
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
            ruta: 'facturas/buscarPorNumeroDte',
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

    // === LIQUIDACIONES ===
    private cargarDetallesInterno(facturaId: number): Observable<DetalleLiquidacionPE[]> {
        this._loadingDetalles$.next(true);

        return this.api.query({
            ruta: 'facturas/obtenerDetallesLiquidacion',
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
            ruta: 'facturas/liquidacion/eliminarDetalle',
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
                ruta: 'facturas/liquidacion/guardarDetalle',
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

    // === CATÁLOGOS ===
    cargarCatalogos(): void {
        this.api.query({
            ruta: 'facturas/buscarNombreLiquidacion',
            tipo: 'get'
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    this._agencias$.next(res.datos);
                }
            }),
            catchError(() => of(null))
        ).subscribe();
    }

    // === UTILIDADES ===
    limpiarDatos(): void {
        this._factura$.next(null);
        this._detallesLiquidacion$.next([]);
    }

    // === MAPPERS INTERNOS ===
    private mapFacturaApi(api: any): FacturaPE {
        const toNumberSafe = (n: any, fallback = 0): number => {
            const v = typeof n === 'string' ? parseFloat(n) : n;
            return isNaN(v) ? fallback : v;
        };

        const mapEstadoTexto = (estadoId?: number, estado_liquidacion?: string): EstadoLiquidacionTexto | undefined => {
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
            monto_total: toNumberSafe(api.monto_total, 0),
            estado: api.estado ?? '',
            estado_id: api.estado_id as any,
            estado_liquidacion: mapEstadoTexto(api.estado_id, api.estado_liquidacion),
            monto_liquidado: toNumberSafe(api.monto_liquidado ?? 0, 0),
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
        const toNumberSafe = (n: any, fallback = 0): number => {
            const v = typeof n === 'string' ? parseFloat(n) : n;
            return isNaN(v) ? fallback : v;
        };

        return {
            id: api.id,
            numero_orden: String(api.numero_orden ?? ''),
            agencia: api.agencia ?? '',
            descripcion: api.descripcion ?? '',
            monto: toNumberSafe(api.monto, 0),
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

    /** Helper centralizado de error */
    private mensajeError(error: any, fallback: string): void {
        const msg =
            (Array.isArray(error?.mensaje) ? error.mensaje.join(', ') : (error?.mensaje ?? null)) ||
            (Array.isArray(error?.error?.mensaje) ? error.error.mensaje.join(', ') : (error?.error?.mensaje ?? null)) ||
            (error?.message ?? fallback);
        this.api.mensajeServidor('error', msg, 'Error');
    }
}