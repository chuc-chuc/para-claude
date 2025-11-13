// ============================================================================
// SERVICIO PARA LIQUIDACIONES DE TESORERÍA
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    FacturaTransferenciaTesoreria,
    ApiResponse,
    RespuestaTransferenciasTesoreria,
    SolicitarCambioTesoreriaPayload,
    MENSAJES_TESORERIA
} from '../models/liquidaciones-tesoreria.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionesTesoreriaService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _facturas$ = new BehaviorSubject<FacturaTransferenciaTesoreria[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly facturas$ = this._facturas$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Cargar facturas con transferencias verificadas
     */
    cargarTransferencias(): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/obtenerFacturasTransferenciasVerificadas',
            tipo: 'post',
            body: {}
        }).pipe(
            map((response: ApiResponse<RespuestaTransferenciasTesoreria>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const facturas = response.datos.facturas_transferencias || [];
                    this._facturas$.next(facturas);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error en la respuesta del servidor');
                }
            }),
            catchError((error) => {
                console.error('Error al cargar transferencias:', error);
                this._error$.next(MENSAJES_TESORERIA.ERROR.CARGAR_TRANSFERENCIAS);
                this.api.mensajeServidor('error', MENSAJES_TESORERIA.ERROR.CARGAR_TRANSFERENCIAS);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Solicitar corrección para una factura
     */
    solicitarCorreccion(detalleId: number, numeroFactura: string, descripcion: string): Observable<boolean> {
        const payload: SolicitarCambioTesoreriaPayload = {
            detalle_liquidacion_id: detalleId,
            numero_factura: numeroFactura,
            descripcion_cambio: descripcion
        };

        return this.api.query({
            ruta: 'tesoreria/solicitarCorreccionTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    // Eliminar la factura del listado local
                    this._eliminarFacturaLocal(numeroFactura);
                    this.api.mensajeServidor('success', MENSAJES_TESORERIA.EXITO.CAMBIO_SOLICITADO);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al solicitar corrección');
                }
            }),
            catchError((error) => {
                console.error('Error al solicitar corrección:', error);
                this.api.mensajeServidor('error', MENSAJES_TESORERIA.ERROR.SOLICITAR_CAMBIO);
                return of(false);
            })
        );
    }

    /**
     * Eliminar factura del estado local después de solicitar corrección
     */
    private _eliminarFacturaLocal(numeroFactura: string): void {
        const facturas = this._facturas$.value.filter(f => f.numero_factura !== numeroFactura);
        this._facturas$.next(facturas);
    }

    /**
     * Refrescar datos
     */
    refrescarDatos(): Observable<boolean> {
        return this.cargarTransferencias();
    }

    /**
     * Obtener facturas actuales
     */
    obtenerFacturasActuales(): FacturaTransferenciaTesoreria[] {
        return this._facturas$.value;
    }

    /**
     * Limpiar estado del servicio
     */
    limpiarEstado(): void {
        this._facturas$.next([]);
        this._error$.next(null);
    }
}