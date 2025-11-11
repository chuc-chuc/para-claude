// ============================================================================
// SERVICIO PARA TRANSFERENCIAS BANCARIAS
// Archivo: src/app/modules/transferencias/services/transferencias.service.ts
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, finalize } from 'rxjs';
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
    ListadoSolicitudesResponse,
    DetalleSolicitudResponse,
    BancoUsoPago,
    MENSAJES_TRANSFERENCIAS
} from '../models/transferencias.models';

@Injectable({
    providedIn: 'root'
})
export class TransferenciasService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _solicitudes$ = new BehaviorSubject<SolicitudTransferencia[]>([]);
    private readonly _solicitudActual$ = new BehaviorSubject<SolicitudTransferencia | null>(null);
    private readonly _bancos$ = new BehaviorSubject<BancoUsoPago[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly solicitudes$ = this._solicitudes$.asObservable();
    readonly solicitudActual$ = this._solicitudActual$.asObservable();
    readonly bancos$ = this._bancos$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // MÉTODOS PRINCIPALES - TESORERÍA
    // ============================================================================

    /**
     * Crear nueva solicitud de transferencia
     */
    crearSolicitud(payload: CrearSolicitudPayload): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/crearSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.CREAR);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al crear solicitud');
                }
            }),
            catchError((error) => {
                console.error('Error al crear solicitud:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CREAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CREAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Editar solicitud existente (solo rechazadas)
     */
    editarSolicitud(payload: EditarSolicitudPayload): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/editarSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.EDITAR);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al editar solicitud');
                }
            }),
            catchError((error) => {
                console.error('Error al editar solicitud:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.EDITAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.EDITAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
  * Registrar comprobante y completar solicitud
  * Incluye subida de archivo opcional, utilizando queryFormData.
  */
    registrarComprobante(payload: RegistrarComprobantePayload, archivo?: File): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        // 1. Preparar los datos para el 'dato' (JSON) de queryFormData
        // Incluimos solo las propiedades necesarias para el JSON
        const datosParaJSON = {
            solicitud_id: payload.solicitud_id,
            numero_registro_transferencia: payload.numero_registro_transferencia,
            fecha_transferencia: payload.fecha_transferencia,
            referencia_bancaria: payload.referencia_bancaria,
            observaciones: payload.observaciones
        };

        // 2. Preparar el objeto de archivos para queryFormData
        // Usamos la clave 'archivo' que es la que se espera en el backend
        const archivos: { [key: string]: File } = {};
        if (archivo) {
            archivos['archivo'] = archivo;
        }

        // 3. Llamar a queryFormData
        return this.api.queryFormData(
            'tesoreria/registrarComprobanteTransferencia', // Ruta
            datosParaJSON,                                 // Datos para el JSON ('dato')
            archivos                                       // Archivos
        ).pipe(
            map((response: any) => {
                // Asume que el servicio base ya maneja los errores HTTP y sesión expirada
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.COMPLETAR);
                    return true;
                } else {
                    // Manejo de errores lógicos del backend (si respuesta no es success)
                    throw new Error(response.mensajes?.[0] || 'Error al registrar comprobante');
                }
            }),
            catchError((error) => {
                console.error('Error al registrar comprobante:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.REGISTRAR_COMPROBANTE);
                // El api.mensajeServidor ya se debe haber llamado en el catchError de queryFormData
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Cancelar solicitud
     */
    cancelarSolicitud(payload: CancelarSolicitudPayload): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/cancelarSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.CANCELAR);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al cancelar solicitud');
                }
            }),
            catchError((error) => {
                console.error('Error al cancelar solicitud:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CANCELAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CANCELAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Listar solicitudes con filtros
     */
    listarSolicitudes(filtros?: FiltrosSolicitudes): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/listarSolicitudesTransferencia',
            tipo: 'post',
            body: filtros || {}
        }).pipe(
            map((response: ApiResponse<ListadoSolicitudesResponse>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._solicitudes$.next(response.datos.solicitudes || []);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al listar solicitudes');
                }
            }),
            catchError((error) => {
                console.error('Error al listar solicitudes:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Obtener detalle de solicitud
     */
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
                    this._solicitudActual$.next(response.datos.solicitud);
                    return response.datos;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al obtener detalle');
                }
            }),
            catchError((error) => {
                console.error('Error al obtener detalle:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                return of(null);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    // ============================================================================
    // MÉTODOS DE APROBACIÓN
    // ============================================================================

    /**
     * Aprobar solicitud
     */
    aprobarSolicitud(payload: AprobarRechazarPayload): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/aprobarSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.APROBAR);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al aprobar');
                }
            }),
            catchError((error) => {
                console.error('Error al aprobar:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.APROBAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.APROBAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Rechazar solicitud
     */
    rechazarSolicitud(payload: AprobarRechazarPayload): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/rechazarSolicitudTransferencia',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TRANSFERENCIAS.EXITO.RECHAZAR);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al rechazar');
                }
            }),
            catchError((error) => {
                console.error('Error al rechazar:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.RECHAZAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.RECHAZAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Listar solicitudes pendientes de aprobación
     */
    listarSolicitudesPendientes(): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        return this.api.query({
            ruta: 'tesoreria/listarSolicitudesPendientesAprobacion',
            tipo: 'post',
            body: {}
        }).pipe(
            map((response: ApiResponse<ListadoSolicitudesResponse>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._solicitudes$.next(response.datos.solicitudes || []);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error al listar pendientes');
                }
            }),
            catchError((error) => {
                console.error('Error al listar pendientes:', error);
                this._error$.next(MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                this.api.mensajeServidor('error', MENSAJES_TRANSFERENCIAS.ERROR.CARGAR);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    // ============================================================================
    // MÉTODOS AUXILIARES
    // ============================================================================

    /**
     * Cargar bancos activos
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
                } else {
                    throw new Error('Error al cargar bancos');
                }
            }),
            catchError((error) => {
                console.error('Error al cargar bancos:', error);
                return of(false);
            })
        );
    }

    /**
     * Limpiar estado
     */
    limpiarEstado(): void {
        this._solicitudes$.next([]);
        this._solicitudActual$.next(null);
        this._error$.next(null);
    }

    /**
     * Obtener solicitudes actuales (valor síncrono)
     */
    obtenerSolicitudesActuales(): SolicitudTransferencia[] {
        return this._solicitudes$.value;
    }

    /**
     * Obtener bancos actuales (valor síncrono)
     */
    obtenerBancosActuales(): BancoUsoPago[] {
        return this._bancos$.value;
    }
}

// ============================================================================
// FIN DEL SERVICIO
// ============================================================================