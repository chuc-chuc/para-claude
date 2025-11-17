// ============================================================================
// SERVICIO PARA LIQUIDACIONES-MODULO-TESORERÍA
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    BancoUsoPago,
    ApiResponse,
    MENSAJES_TESORERIA
} from '../models/liquidaciones-modulo-tesoreria.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionesModuloTesoreriaService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _bancos$ = new BehaviorSubject<BancoUsoPago[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly bancos$ = this._bancos$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // LISTAR SOLICITUDES PENDIENTES DE APROBACIÓN
    // ============================================================================

    /**
     * Lista solicitudes pendientes de aprobación para el área del usuario actual
     * 
     * @returns Observable<any> Respuesta con solicitudes pendientes
     */
    listarSolicitudesPendientesAprobacion(): Observable<any> {
        return this.api.query({
            ruta: 'tesoreria/listarSolicitudesPendientesAprobacion',
            tipo: 'post',
            body: {}
        }).pipe(
            catchError((error) => {
                console.error('Error al listar solicitudes pendientes:', error);
                this.api.mensajeServidor('error', 'Error al cargar solicitudes pendientes de aprobación');
                return of({ respuesta: 'error', mensajes: ['Error al cargar solicitudes'], datos: null });
            })
        );
    }

    // ============================================================================
    // OBTENER DETALLE DE SOLICITUD
    // ============================================================================

    /**
     * Obtiene detalle completo de una solicitud con sus facturas
     * 
     * @param payload Datos de la solicitud
     * @returns Observable<any> Respuesta con detalle completo
     */
    obtenerDetalleSolicitudTransferencia(payload: { solicitud_id: number }): Observable<any> {
        return this.api.query({
            ruta: 'tesoreria/obtenerDetalleSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            catchError((error) => {
                console.error('Error al obtener detalle de solicitud:', error);
                this.api.mensajeServidor('error', 'Error al cargar detalle de la solicitud');
                return of({ respuesta: 'error', mensajes: ['Error al cargar detalle'], datos: null });
            })
        );
    }

    // ============================================================================
    // APROBAR SOLICITUD
    // ============================================================================

    /**
     * Aprueba una solicitud de transferencia
     * 
     * @param solicitudId ID de la solicitud
     * @param comentario Comentario opcional de aprobación
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    aprobarSolicitudTransferencia(solicitudId: number, comentario?: string): Observable<boolean> {
        const payload = {
            solicitud_id: solicitudId,
            comentario: comentario || null
        };

        return this._ejecutarAccion(
            'tesoreria/aprobarSolicitudTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.APROBAR_SOLICITUD,
            MENSAJES_TESORERIA.ERROR.APROBAR_SOLICITUD
        );
    }

    // ============================================================================
    // RECHAZAR SOLICITUD
    // ============================================================================

    /**
     * Rechaza una solicitud de transferencia
     * 
     * @param solicitudId ID de la solicitud
     * @param comentario Motivo del rechazo (requerido)
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    rechazarSolicitudTransferencia(solicitudId: number, comentario: string): Observable<boolean> {
        if (!comentario || comentario.trim() === '') {
            this.api.mensajeServidor('error', 'El comentario es requerido para rechazar');
            return of(false);
        }

        const payload = {
            solicitud_id: solicitudId,
            comentario: comentario
        };

        return this._ejecutarAccion(
            'tesoreria/rechazarSolicitudTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.RECHAZAR_SOLICITUD,
            MENSAJES_TESORERIA.ERROR.RECHAZAR_SOLICITUD
        );
    }

    // ============================================================================
    // CARGAR BANCOS
    // ============================================================================

    /**
     * Carga la lista de bancos activos para transferencias
     * 
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    cargarBancos(): Observable<boolean> {
        return this.api.query({
            ruta: 'tesoreria/listarBancosActivosTransferencia',
            tipo: 'post',
            body: {}
        }).pipe(
            map((response: ApiResponse<{ bancos: BancoUsoPago[] }>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._bancos$.next(response.datos.bancos || []);
                    return true;
                }
                throw new Error('Error al cargar bancos');
            }),
            catchError((error) => {
                console.error('Error al cargar bancos:', error);
                return of(false);
            })
        );
    }

    // ============================================================================
    // MÉTODOS AUXILIARES PRIVADOS
    // ============================================================================

    /**
     * Ejecuta una acción genérica con manejo de errores estándar
     */
    private _ejecutarAccion(
        ruta: string,
        payload: any,
        mensajeExito: string,
        mensajeError: string
    ): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', mensajeExito);
                    return true;
                }
                throw new Error(response.mensajes?.[0] || mensajeError);
            }),
            catchError(this._manejarError(mensajeError)),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Manejador de errores estándar
     */
    private _manejarError(mensaje: string) {
        return (error: any) => {
            console.error('Error en servicio:', error);
            this._error$.next(mensaje);
            this.api.mensajeServidor('error', mensaje);
            return of(false);
        };
    }

    // ============================================================================
    // GETTERS PARA ACCESO DIRECTO AL ESTADO
    // ============================================================================

    /**
     * Obtiene los bancos actuales del estado
     */
    obtenerBancosActuales(): BancoUsoPago[] {
        return this._bancos$.value;
    }

    // ============================================================================
    // LIMPIEZA
    // ============================================================================

    /**
     * Limpia el estado del servicio
     */
    limpiarEstado(): void {
        this._error$.next(null);
    }

    /**
     * Resetea solo el error
     */
    limpiarError(): void {
        this._error$.next(null);
    }
}