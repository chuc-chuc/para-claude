import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';
import {
    AnticipoPendientePE,
    ApiResponse,
    ORDENES_PE_ENDPOINTS,
    OrdenPlanEmpresarial,
    ResumenOrdenesPE,
    SolicitudAutorizacionPayload
} from '../models/ordenes-pe.models';
import { mapAnticiposApi, mapOrdenesApi } from './ordenes-pe.mapper';

@Injectable({ providedIn: 'root' })
export class OrdenesPEFacade {
    private readonly _ordenes$ = new BehaviorSubject<OrdenPlanEmpresarial[]>([]);
    private readonly _cargandoOrdenes$ = new BehaviorSubject<boolean>(false);

    private readonly _anticipos$ = new BehaviorSubject<AnticipoPendientePE[]>([]);
    private readonly _cargandoAnticipos$ = new BehaviorSubject<boolean>(false);
    private readonly _enviandoSolicitud$ = new BehaviorSubject<boolean>(false);

    // Expuestos como observables
    readonly ordenes$: Observable<OrdenPlanEmpresarial[]> = this._ordenes$.asObservable();
    readonly cargandoOrdenes$: Observable<boolean> = this._cargandoOrdenes$.asObservable();

    readonly anticipos$: Observable<AnticipoPendientePE[]> = this._anticipos$.asObservable();
    readonly cargandoAnticipos$: Observable<boolean> = this._cargandoAnticipos$.asObservable();
    readonly enviandoSolicitud$: Observable<boolean> = this._enviandoSolicitud$.asObservable();

    constructor(private api: ServicioGeneralService) { }

    /** Carga órdenes de backend */
    cargarOrdenes(): void {
        this._cargandoOrdenes$.next(true);

        this.api.query({
            ruta: ORDENES_PE_ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((resp: ApiResponse<any[]>) => {
                if ((resp as any)?.respuesta === 'success') {
                    return mapOrdenesApi((resp as any).datos || []);
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

    /** Carga anticipos para una orden */
    cargarAnticipos(numeroOrden: number): void {
        if (!numeroOrden || numeroOrden <= 0) {
            this._anticipos$.next([]);
            return;
        }

        this._cargandoAnticipos$.next(true);

        this.api.query({
            ruta: `${ORDENES_PE_ENDPOINTS.LISTAR_ANTICIPOS_PENDIENTES}?numeroOrden=${numeroOrden}`,
            tipo: 'get'
        }).pipe(
            map((resp: ApiResponse<any[]>) => {
                if ((resp as any)?.respuesta === 'success') {
                    return mapAnticiposApi((resp as any).datos || []);
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

    /** Envía solicitud de autorización para un anticipo tardío */
    solicitarAutorizacion(payload: SolicitudAutorizacionPayload, onSuccess?: () => void): void {
        this._enviandoSolicitud$.next(true);

        this.api.query({
            ruta: ORDENES_PE_ENDPOINTS.SOLICITAR_AUTORIZACION,
            tipo: 'post',
            body: payload
        }).pipe(
            map((resp: ApiResponse) => {
                if ((resp as any)?.respuesta === 'success') return true;
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

    /** Resumen rápido para pie o badges */
    getResumenOrdenes(lista: OrdenPlanEmpresarial[]): ResumenOrdenesPE {
        const totalOrdenes = lista.length;
        const totalPendientes = lista.filter(o => o.montoPendiente > 0).length;
        return { totalOrdenes, totalPendientes };
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