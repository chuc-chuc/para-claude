// ============================================================================
// SERVICIO PARA LIQUIDACIONES-MODULO-TESORERÍA
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, finalize, tap } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    FacturaConSolicitud,
    BancoUsoPago,
    TipoOrden,
    ApiResponse,
    RespuestaFacturasConSolicitudes,
    ResumenEstadisticas,
    ObtenerFacturasPayload,
    CrearSolicitudTransferenciaPayload,
    EditarSolicitudTransferenciaPayload,
    RegistrarComprobantePayload,
    EditarComprobantePayload,
    CancelarSolicitudPayload,
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

    private readonly _facturas$ = new BehaviorSubject<FacturaConSolicitud[]>([]);
    private readonly _resumen$ = new BehaviorSubject<ResumenEstadisticas | null>(null);
    private readonly _bancos$ = new BehaviorSubject<BancoUsoPago[]>([]);
    private readonly _cargando$ = new BehaviorSubject<boolean>(false);
    private readonly _error$ = new BehaviorSubject<string | null>(null);

    // Observables públicos
    readonly facturas$ = this._facturas$.asObservable();
    readonly resumen$ = this._resumen$.asObservable();
    readonly bancos$ = this._bancos$.asObservable();
    readonly cargando$ = this._cargando$.asObservable();
    readonly error$ = this._error$.asObservable();

    // ============================================================================
    // OBTENER FACTURAS CON SOLICITUDES
    // ============================================================================

    /**
     * Obtiene todas las facturas verificadas con sus solicitudes de transferencia
     * 
     * @param tipoOrden Filtrar por tipo: 1=Plan, 2=Presupuesto, null=ambos
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    obtenerFacturasConSolicitudes(tipoOrden?: TipoOrden | null): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        const payload: ObtenerFacturasPayload = {};
        if (tipoOrden !== undefined && tipoOrden !== null) {
            payload.tipo_orden = tipoOrden;
        }

        return this.api.query({
            ruta: 'tesoreria/obtenerFacturasConSolicitudes',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse<RespuestaFacturasConSolicitudes>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._facturas$.next(response.datos.facturas || []);
                    this._resumen$.next(response.datos.resumen || null);
                    return true;
                } else {
                    throw new Error(response.mensajes?.[0] || 'Error en la respuesta del servidor');
                }
            }),
            catchError((error) => {
                console.error('Error al obtener facturas:', error);
                this._error$.next(MENSAJES_TESORERIA.ERROR.CARGAR_FACTURAS);
                this.api.mensajeServidor('error', MENSAJES_TESORERIA.ERROR.CARGAR_FACTURAS);
                return of(false);
            }),
            finalize(() => this._cargando$.next(false))
        );
    }

    // ============================================================================
    // CREAR SOLICITUD DE TRANSFERENCIA
    // ============================================================================

    /**
     * Crea una nueva solicitud de transferencia desde una factura
     * 
     * @param payload Datos de la solicitud (incluye tipo_solicitud)
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    crearSolicitudTransferencia(payload: CrearSolicitudTransferenciaPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/crearSolicitudTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.CREAR_SOLICITUD,
            MENSAJES_TESORERIA.ERROR.CREAR_SOLICITUD
        );
    }

    /**
     * Edita una solicitud de transferencia rechazada o pendiente
     * 
     * @param payload Datos de la solicitud (puede incluir tipo_solicitud)
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    editarSolicitudTransferencia(payload: EditarSolicitudTransferenciaPayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/editarSolicitudTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.EDITAR_SOLICITUD,
            MENSAJES_TESORERIA.ERROR.EDITAR_SOLICITUD
        );
    }

    // ============================================================================
    // REGISTRAR Y EDITAR COMPROBANTE
    // ============================================================================

    /**
     * Registra comprobante de transferencia y completa la solicitud
     * 
     * @param payload Datos del comprobante
     * @param archivo Archivo opcional (comprobante PDF/imagen)
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    registrarComprobante(payload: RegistrarComprobantePayload, archivo?: File): Observable<boolean> {
        this._cargando$.next(true);
        this._error$.next(null);

        const archivos: { [key: string]: File } = {};
        if (archivo) {
            archivos['archivo'] = archivo;
        }

        return this.api.queryFormData(
            'tesoreria/registrarComprobanteTransferencia',
            payload,
            archivos
        ).pipe(
            map((response: any) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', MENSAJES_TESORERIA.EXITO.REGISTRAR_COMPROBANTE);
                    return true;
                }
                throw new Error(response.mensajes?.[0] || 'Error al registrar comprobante');
            }),
            catchError(this._manejarError(MENSAJES_TESORERIA.ERROR.REGISTRAR_COMPROBANTE)),
            finalize(() => this._cargando$.next(false))
        );
    }

    /**
     * Edita un comprobante de transferencia existente
     * 
     * @param payload Datos del comprobante a editar
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    editarComprobanteTransferencia(payload: EditarComprobantePayload): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/editarComprobanteTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.EDITAR_COMPROBANTE,
            MENSAJES_TESORERIA.ERROR.EDITAR_COMPROBANTE
        );
    }

    // ============================================================================
    // CANCELAR SOLICITUD
    // ============================================================================

    /**
     * Cancela una solicitud pendiente de aprobación
     * 
     * @param solicitudId ID de la solicitud
     * @param motivo Motivo de la cancelación
     * @returns Observable<boolean> true si la operación fue exitosa
     */
    cancelarSolicitud(solicitudId: number, motivo: string): Observable<boolean> {
        const payload: CancelarSolicitudPayload = {
            solicitud_id: solicitudId,
            motivo: motivo
        };

        return this._ejecutarAccion(
            'tesoreria/cancelarSolicitudTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.CANCELAR_SOLICITUD,
            MENSAJES_TESORERIA.ERROR.CANCELAR_SOLICITUD
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
     * Obtiene las facturas actuales del estado
     */
    obtenerFacturasActuales(): FacturaConSolicitud[] {
        return this._facturas$.value;
    }

    /**
     * Obtiene el resumen actual del estado
     */
    obtenerResumenActual(): ResumenEstadisticas | null {
        return this._resumen$.value;
    }

    /**
     * Obtiene los bancos actuales del estado
     */
    obtenerBancosActuales(): BancoUsoPago[] {
        return this._bancos$.value;
    }

    /**
     * Obtiene una factura específica por número
     */
    obtenerFacturaPorNumero(numeroFactura: string): FacturaConSolicitud | undefined {
        return this._facturas$.value.find(f => f.numero_factura === numeroFactura);
    }

    // ============================================================================
    // LIMPIEZA
    // ============================================================================

    /**
     * Limpia el estado del servicio
     */
    limpiarEstado(): void {
        this._facturas$.next([]);
        this._resumen$.next(null);
        this._error$.next(null);
    }

    /**
     * Resetea solo el error
     */
    limpiarError(): void {
        this._error$.next(null);
    }
}