// ============================================================================
// SERVICIO PARA TRANSFERENCIAS BANCARIAS (OPTIMIZADO)
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, finalize, tap } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    SolicitudTransferencia,
    ApiResponse,
    CrearSolicitudPayload,
    EditarSolicitudPayload,
    RegistrarComprobantePayload,
    AprobarRechazarPayload,
    CancelarSolicitudPayload,
    FiltrosSolicitudes,
    DetalleSolicitudResponse,
    BancoUsoPago,
    MENSAJES_TRANSFERENCIAS
} from '../models/transferencias.models';

@Injectable({
    providedIn: 'root'
})
export class TransferenciasService {

    private readonly api = inject(ServicioGeneralService);

    // Estado
    private readonly _solicitudes$ = new BehaviorSubject<SolicitudTransferencia[]>([]);
    private readonly _bancos$ = new BehaviorSubject<BancoUsoPago[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly solicitudes$ = this._solicitudes$.asObservable();
    readonly bancos$ = this._bancos$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // OPERACIONES CRUD
    // ============================================================================

    crearSolicitud(payload: CrearSolicitudPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/crearSolicitudTransferencia',
            payload,
            MENSAJES_TRANSFERENCIAS.EXITO.CREAR,
            MENSAJES_TRANSFERENCIAS.ERROR.CREAR
        );
    }

    editarSolicitud(payload: EditarSolicitudPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/editarSolicitudTransferencia',
            payload,
            MENSAJES_TRANSFERENCIAS.EXITO.EDITAR,
            MENSAJES_TRANSFERENCIAS.ERROR.EDITAR
        );
    }

    registrarComprobante(payload: RegistrarComprobantePayload, archivo?: File): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        const archivos: { [key: string]: File } = {};
        if (archivo) archivos['archivo'] = archivo;

        return this.api.queryFormData(
            'tesoreria/registrarComprobanteTransferencia',
            payload,
            archivos
        ).pipe(
            map((response: any) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.COMPLETAR);
                    return true;
                }
                throw new Error(response.mensajes?.[0] || 'Error al registrar comprobante');
            }),
            catchError(this._manejarError(MENSAJES_TRANSFERENCIAS.ERROR.REGISTRAR_COMPROBANTE)),
            finalize(() => this._cargando$.next(false))
        );
    }

    cancelarSolicitud(payload: CancelarSolicitudPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/cancelarSolicitudTransferencia',
            payload,
            MENSAJES_TRANSFERENCIAS.EXITO.CANCELAR,
            MENSAJES_TRANSFERENCIAS.ERROR.CANCELAR
        );
    }

    // ============================================================================
    // APROBACIÓN
    // ============================================================================

    aprobarSolicitud(payload: AprobarRechazarPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/aprobarRechazarSolicitudTransferencia',
            { ...payload, accion: 'aprobado' },
            MENSAJES_TRANSFERENCIAS.EXITO.APROBAR,
            MENSAJES_TRANSFERENCIAS.ERROR.APROBAR
        );
    }

    rechazarSolicitud(payload: AprobarRechazarPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/aprobarRechazarSolicitudTransferencia',
            { ...payload, accion: 'rechazado' },
            MENSAJES_TRANSFERENCIAS.EXITO.RECHAZAR,
            MENSAJES_TRANSFERENCIAS.ERROR.RECHAZAR
        );
    }

    listarSolicitudesPendientes(): Observable<boolean> {
        return this._listar('tesoreria/listarSolicitudesPendientesAprobacion', {});
    }

    // ============================================================================
    // CONSULTAS
    // ============================================================================

    listarSolicitudes(filtros?: FiltrosSolicitudes): Observable<boolean> {
        return this._listar('tesoreria/listarSolicitudesTransferencia', filtros || {});
    }

    obtenerDetalleSolicitud(solicitudId: number): Observable<DetalleSolicitudResponse | null> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/obtenerDetalleSolicitudTransferencia',
            tipo: 'post',
            body: { solicitud_id: solicitudId }
        }).pipe(
            map((response: ApiResponse<DetalleSolicitudResponse>) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos;
                }
                throw new Error(response.mensajes?.[0] || 'Error al obtener detalle');
            }),
            catchError((error: any) => {
                console.error('Error en servicio:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                return of(null);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

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
            catchError(() => of(false))
        );
    }

    // ============================================================================
    // HELPERS PRIVADOS
    // ============================================================================

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

    private _listar(ruta: string, body: any): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({ ruta, tipo: 'post', body }).pipe(
            map((response: ApiResponse<{ solicitudes: SolicitudTransferencia[] }>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._solicitudes$.next(response.datos.solicitudes || []);
                    return true;
                }
                throw new Error(response.mensajes?.[0] || 'Error al listar');
            }),
            catchError(this._manejarError(MENSAJES_TRANSFERENCIAS.ERROR.CARGAR)),
            finalize(() => this._cargando$.next(false))
        );
    }

    private _manejarError(mensaje: string) {
        return (error: any) => {
            console.error('Error en servicio:', error);
            this._error$.next(mensaje);
            this.api.mensajeServidor('error', mensaje);
            return of(false);
        };
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    limpiarEstado(): void {
        this._solicitudes$.next([]);
        this._error$.next(null);
    }

    obtenerSolicitudesActuales(): SolicitudTransferencia[] {
        return this._solicitudes$.value;
    }

    obtenerBancosActuales(): BancoUsoPago[] {
        return this._bancos$.value;
    }
}