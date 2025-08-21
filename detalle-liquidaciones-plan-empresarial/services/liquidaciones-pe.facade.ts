// services/liquidaciones-pe.facade.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, tap, map, catchError } from 'rxjs';
import {
    DetalleLiquidacionPE,
    FacturaPE,
    TIPOS_PAGO_DEFAULT,
    TipoPago,
} from '../models/liquidaciones-pe.models';
import { LiquidacionesPEApi } from './liquidaciones-pe.api';
import { mapDetalleApi, mapDetalleToPayload, mapFacturaApi } from './liquidaciones-pe.mapper';

@Injectable({ providedIn: 'root' })
export class LiquidacionesPEFacade {
    private _factura$ = new BehaviorSubject<FacturaPE | null>(null);
    private _detalles$ = new BehaviorSubject<DetalleLiquidacionPE[]>([]);
    private _loading$ = new BehaviorSubject<boolean>(false);
    private _saving$ = new BehaviorSubject<boolean>(false);
    private _agencias$ = new BehaviorSubject<{ id: number; nombre: string }[]>([]);
    private _tiposPago$ = new BehaviorSubject<TipoPago[]>(TIPOS_PAGO_DEFAULT);

    /** PUBLIC streams */
    readonly factura$ = this._factura$.asObservable();
    readonly detalles$ = this._detalles$.asObservable();
    readonly loading$ = this._loading$.asObservable();
    readonly saving$ = this._saving$.asObservable();
    readonly agencias$ = this._agencias$.asObservable();
    readonly tiposPago$ = this._tiposPago$.asObservable();

    /** total calculado */
    readonly total$ = this.detalles$.pipe(
        map(list => list.reduce((acc, d) => acc + (Number(d.monto) || 0), 0))
    );

    constructor(private api: LiquidacionesPEApi) { }

    /** Iniciales (catálogos) */
    cargarCatalogos() {
        this.api.obtenerAgencias()
            .pipe(
                tap(res => {
                    if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                        this._agencias$.next(res.datos);
                    }
                }),
                catchError(() => of(null))
            )
            .subscribe();

        // TIPOS_PAGO_DEFAULT ya está cargado; si tuvieras un endpoint, lo pones aquí.
    }

    /** Buscar factura y cargar sus detalles */
    buscarFacturaPorDTE(dte: string): Observable<FacturaPE | null> {
        this._loading$.next(true);
        this._factura$.next(null);
        this._detalles$.next([]);

        return this.api.buscarPorNumeroDte(dte).pipe(
            switchMap(res => {
                if (res.respuesta === 'success' && res.datos?.length) {
                    const factura = mapFacturaApi(res.datos[0]);
                    this._factura$.next(factura);
                    if (factura.id) {
                        return this.cargarDetalles(factura.id).pipe(map(() => factura));
                    }
                    return of(factura);
                }
                return of(null);
            }),
            tap(() => this._loading$.next(false)),
            catchError(err => {
                console.error('buscarFacturaPorDTE error', err);
                this._loading$.next(false);
                return of(null);
            })
        );
    }

    /** Cargar detalles por facturaId */
    cargarDetalles(facturaId: number): Observable<DetalleLiquidacionPE[]> {
        this._loading$.next(true);
        this._detalles$.next([]);
        return this.api.obtenerDetallesLiquidacion(facturaId).pipe(
            tap(res => {
                if (res.respuesta === 'success') {
                    const mapped = (res.datos ?? []).map(mapDetalleApi);
                    // Asignar factura_id a todos por seguridad
                    const withFactura = mapped.map(d => ({ ...d, factura_id: facturaId }));
                    this._detalles$.next(withFactura);
                } else {
                    this._detalles$.next([]);
                }
                this._loading$.next(false);
            }),
            map(() => this._detalles$.value),
            catchError(err => {
                console.error('cargarDetalles error', err);
                this._loading$.next(false);
                return of([]);
            })
        );
    }

    /** Agregar (local) */
    agregarDetalle(base?: Partial<DetalleLiquidacionPE>) {
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
        this._detalles$.next([...this._detalles$.value, nuevo]);
    }

    /** Copiar (local) */
    copiarDetalle(index: number) {
        const list = [...this._detalles$.value];
        if (index < 0 || index >= list.length) return;
        const copia = { ...list[index] };
        delete (copia as any).id;
        list.splice(index + 1, 0, copia);
        this._detalles$.next(list);
    }

    /** Actualizar (local) */
    actualizarDetalle(index: number, patch: Partial<DetalleLiquidacionPE>) {
        const list = [...this._detalles$.value];
        if (index < 0 || index >= list.length) return;
        list[index] = { ...list[index], ...patch };
        this._detalles$.next(list);
    }

    /** Eliminar (server si tiene id; si no, local) */
    eliminarDetalle(index: number) {
        const list = [...this._detalles$.value];
        if (index < 0 || index >= list.length) return;

        const item = list[index];
        if (!item.id) {
            list.splice(index, 1);
            this._detalles$.next(list);
            return;
        }

        this._saving$.next(true);
        this.api.eliminarDetalle(item.id).pipe(
            tap(res => {
                if (res.respuesta === 'success') {
                    list.splice(index, 1);
                    this._detalles$.next(list);
                }
                this._saving$.next(false);
            }),
            catchError(err => {
                console.error('eliminarDetalle error', err);
                this._saving$.next(false);
                return of(null);
            })
        ).subscribe();
    }

    /** Guardar todos los detalles (crea/actualiza uno a uno) */
    guardarTodo(): Observable<boolean> {
        const facturaId = this._factura$.value?.id;
        if (!facturaId) return of(false);

        const detalles = this._detalles$.value;
        if (!detalles.length) return of(true);

        this._saving$.next(true);

        // Secuencia: guardar uno por uno. Simplificado en paralelo con forkJoin si prefieres.
        const peticiones = detalles.map(d => this.api.guardarDetalle(mapDetalleToPayload(d)));

        return (peticiones.length
            ? (Promise.all(peticiones.map(req => req.toPromise())) as unknown as Observable<any>)
            : of([])
        ).pipe(
            switchMap(() => this.cargarDetalles(facturaId)),
            map(() => true),
            tap(() => this._saving$.next(false)),
            catchError(err => {
                console.error('guardarTodo error', err);
                this._saving$.next(false);
                return of(false);
            })
        );
    }

    /** Cambiar forma de pago (local) */
    cambiarFormaPago(index: number, tipo: string) {
        this.actualizarDetalle(index, { forma_pago: tipo });
    }
}