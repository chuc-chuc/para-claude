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
    SolicitarCorreccionPayload,
    CrearSolicitudTransferenciaPayload,
    EditarSolicitudTransferenciaPayload,
    RegistrarComprobantePayload,
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
    // MÉTODO PRINCIPAL - OBTENER FACTURAS CON SOLICITUDES
    // ============================================================================

    /**
     * Obtiene todas las facturas verificadas con sus solicitudes de transferencia
     * 
     * @param tipoOrden Filtrar por tipo: 1=Plan, 2=Presupuesto, null=ambos
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * // Obtener todas las facturas
     * this.service.obtenerFacturasConSolicitudes().subscribe();
     * 
     * @example
     * // Filtrar solo Plan Empresarial
     * this.service.obtenerFacturasConSolicitudes(1).subscribe();
     * 
     * @example
     * // Filtrar solo Presupuesto
     * this.service.obtenerFacturasConSolicitudes(2).subscribe();
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

    /**
     * Refresca los datos (alias para obtenerFacturasConSolicitudes sin filtro)
     */
    refrescarDatos(): Observable<boolean> {
        return this.obtenerFacturasConSolicitudes();
    }

    // ============================================================================
    // SOLICITAR CORRECCIÓN
    // ============================================================================

    /**
     * Solicita corrección de una factura verificada
     * Devuelve la factura a liquidaciones para revisión
     * 
     * @param detalleId ID del detalle de liquidación
     * @param numeroFactura Número de la factura
     * @param descripcionCambio Descripción del cambio solicitado
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * this.service.solicitarCorreccion(123, 'FAC-001', 'Corregir monto').subscribe(
     *   exito => {
     *     if (exito) {
     *       // La factura desaparece de la lista
     *       this.refrescarDatos();
     *     }
     *   }
     * );
     */
    solicitarCorreccion(
        detalleId: number,
        numeroFactura: string,
        descripcionCambio: string
    ): Observable<boolean> {
        const payload: SolicitarCorreccionPayload = {
            detalle_liquidacion_id: detalleId,
            numero_factura: numeroFactura,
            descripcion_cambio: descripcionCambio
        };

        return this._ejecutarAccion(
            'tesoreria/solicitarCorreccionTransferencia',
            payload,
            MENSAJES_TESORERIA.EXITO.SOLICITAR_CORRECCION,
            MENSAJES_TESORERIA.ERROR.SOLICITAR_CORRECCION
        ).pipe(
            tap(exito => {
                if (exito) {
                    // Eliminar la factura del estado local
                    this._eliminarFacturaLocal(numeroFactura);
                }
            })
        );
    }

    /**
     * Elimina una factura del estado local después de solicitar corrección
     */
    private _eliminarFacturaLocal(numeroFactura: string): void {
        const facturas = this._facturas$.value.filter(f => f.numero_factura !== numeroFactura);
        this._facturas$.next(facturas);
        
        // Recalcular resumen
        this._recalcularResumen(facturas);
    }

    /**
     * Recalcula el resumen después de eliminar una factura
     */
    private _recalcularResumen(facturas: FacturaConSolicitud[]): void {
        const resumenActual = this._resumen$.value;
        if (!resumenActual) return;

        // Actualizar totales
        resumenActual.total_facturas = facturas.length;
        resumenActual.monto_total = facturas.reduce((sum, f) => sum + f.monto_pendiente_pago, 0);
        
        this._resumen$.next({ ...resumenActual });
    }

    // ============================================================================
    // CREAR SOLICITUD DE TRANSFERENCIA
    // ============================================================================

    /**
     * Crea una nueva solicitud de transferencia desde una factura
     * 
     * @param payload Datos de la solicitud
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * const payload = {
     *   facturas: [{
     *     numero_factura: 'FAC-001',
     *     detalle_liquidacion_id: 123
     *   }],
     *   banco_origen_id: 1,
     *   area_aprobacion: 'gerencia_financiera',
     *   monto_total_solicitud: 5000.00
     * };
     * 
     * this.service.crearSolicitudTransferencia(payload).subscribe(
     *   exito => {
     *     if (exito) {
     *       // La factura ahora tiene solicitud
     *       this.refrescarDatos();
     *     }
     *   }
     * );
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
    // REGISTRAR COMPROBANTE
    // ============================================================================

    /**
     * Registra comprobante de transferencia y completa la solicitud
     * 
     * @param payload Datos del comprobante
     * @param archivo Archivo opcional (comprobante PDF/imagen)
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * const payload = {
     *   solicitud_id: 1,
     *   numero_registro_transferencia: 'REG-001',
     *   fecha_transferencia: '2025-01-14',
     *   referencia_bancaria: 'REF123',
     *   observaciones: 'Pago completo'
     * };
     * 
     * this.service.registrarComprobante(payload, archivoFile).subscribe(
     *   exito => {
     *     if (exito) {
     *       // Solicitud completada
     *       this.refrescarDatos();
     *     }
     *   }
     * );
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

    // ============================================================================
    // CANCELAR SOLICITUD
    // ============================================================================

    /**
     * Cancela una solicitud pendiente de aprobación
     * 
     * @param solicitudId ID de la solicitud
     * @param motivo Motivo de la cancelación
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * this.service.cancelarSolicitud(1, 'Error en datos').subscribe(
     *   exito => {
     *     if (exito) {
     *       // Solicitud cancelada
     *       this.refrescarDatos();
     *     }
     *   }
     * );
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
     * 
     * @example
     * this.service.cargarBancos().subscribe();
     * // Luego acceder con: this.service.bancos$
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

    /**
 * Lista solicitudes pendientes de aprobación para el área del usuario actual
 * 
 * @returns Observable<any> Respuesta con solicitudes pendientes
 * 
 * @example
 * this.service.listarSolicitudesPendientesAprobacion().subscribe(
 *   response => {
 *     if (response.respuesta === 'success') {
 *       const solicitudes = response.datos.solicitudes;
 *     }
 *   }
 * );
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

    /**
     * Obtiene detalle completo de una solicitud con sus facturas
     * 
     * @param payload Datos de la solicitud
     * @returns Observable<any> Respuesta con detalle completo
     * 
     * @example
     * this.service.obtenerDetalleSolicitudTransferencia({ solicitud_id: 1 }).subscribe(
     *   response => {
     *     if (response.respuesta === 'success') {
     *       const detalle = response.datos;
     *       console.log(detalle.solicitud);
     *       console.log(detalle.facturas_detalle);
     *     }
     *   }
     * );
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

    /**
     * Aprueba una solicitud de transferencia
     * 
     * @param solicitudId ID de la solicitud
     * @param comentario Comentario opcional de aprobación
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * this.service.aprobarSolicitudTransferencia(1, 'Aprobado correctamente').subscribe(
     *   exito => {
     *     if (exito) {
     *       // Solicitud aprobada
     *       this.refrescarDatos();
     *     }
     *   }
     * );
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

    /**
     * Rechaza una solicitud de transferencia
     * 
     * @param solicitudId ID de la solicitud
     * @param comentario Motivo del rechazo (requerido)
     * @returns Observable<boolean> true si la operación fue exitosa
     * 
     * @example
     * this.service.rechazarSolicitudTransferencia(1, 'Datos incorrectos').subscribe(
     *   exito => {
     *     if (exito) {
     *       // Solicitud rechazada
     *       this.refrescarDatos();
     *     }
     *   }
     * );
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

    // En liquidaciones-modulo-tesoreria.service.ts

    /**
 * Editar comprobante de transferencia
 */
    editarComprobanteTransferencia(payload: any): Observable<boolean> {
        return this._ejecutarAccion(
            'tesoreria/editarComprobanteTransferencia',
            payload,
            'Comprobante actualizado correctamente',
            'Error al actualizar comprobante'
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

    /**
     * Obtiene facturas por tipo de liquidación
     */
    obtenerFacturasPorTipo(tipo: 'plan' | 'presupuesto'): FacturaConSolicitud[] {
        return this._facturas$.value.filter(f => f.tipo_liquidacion === tipo);
    }

    /**
     * Obtiene facturas sin solicitud (pendientes de crear solicitud)
     */
    obtenerFacturasSinSolicitud(): FacturaConSolicitud[] {
        return this._facturas$.value.filter(f => !f.solicitud);
    }

    /**
     * Obtiene facturas con solicitud en un estado específico
     */
    obtenerFacturasPorEstadoSolicitud(estado: string): FacturaConSolicitud[] {
        return this._facturas$.value.filter(f => f.solicitud?.estado === estado);
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