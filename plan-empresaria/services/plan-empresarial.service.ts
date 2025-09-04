// ============================================================================
// SERVICIO PRINCIPAL - PLAN EMPRESARIAL UNIFICADO
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, map, catchError, tap, switchMap, forkJoin } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';
import { DiasHabilesService } from '../../../servicios/dias-habiles.service';

import {
    OrdenPlanEmpresarial,
    FacturaPE,
    DetalleLiquidacionPE,
    AnticipoPendientePE,
    TipoPago,
    AgenciaPE,
    BancoPE,
    TipoCuentaPE,
    OrdenAutorizadaPE,
    RegistrarFacturaPayload,
    SolicitarAutorizacionPayload,
    GuardarDetalleLiquidacionPayload,
    SolicitudAutorizacionPayload,
    ApiResponse,
    EstadoLiquidacionTexto,
    ENDPOINTS
} from '../models/plan-empresarial.models';

@Injectable({
    providedIn: 'root'
})
export class PlanEmpresarialService {
    private readonly api = inject(ServicioGeneralService);
    private readonly diasHabiles = inject(DiasHabilesService);

    // ============================================================================
    // ESTADO REACTIVO
    // ============================================================================

    // Órdenes
    private readonly _ordenes$ = new BehaviorSubject<OrdenPlanEmpresarial[]>([]);
    private readonly _cargandoOrdenes$ = new BehaviorSubject<boolean>(false);

    // Facturas
    private readonly _facturaActual$ = new BehaviorSubject<FacturaPE | null>(null);
    private readonly _cargandoFactura$ = new BehaviorSubject<boolean>(false);

    // Detalles de liquidación
    private readonly _detalles$ = new BehaviorSubject<DetalleLiquidacionPE[]>([]);
    private readonly _cargandoDetalles$ = new BehaviorSubject<boolean>(false);
    private readonly _guardandoDetalles$ = new BehaviorSubject<boolean>(false);

    // Anticipos
    private readonly _anticipos$ = new BehaviorSubject<AnticipoPendientePE[]>([]);
    private readonly _cargandoAnticipos$ = new BehaviorSubject<boolean>(false);
    private readonly _enviandoSolicitud$ = new BehaviorSubject<boolean>(false);

    // Catálogos
    private readonly _agencias$ = new BehaviorSubject<AgenciaPE[]>([]);
    private readonly _tiposPago$ = new BehaviorSubject<TipoPago[]>([]);
    private readonly _bancos$ = new BehaviorSubject<BancoPE[]>([]);
    private readonly _tiposCuenta$ = new BehaviorSubject<TipoCuentaPE[]>([]);
    private readonly _ordenesAutorizadas$ = new BehaviorSubject<OrdenAutorizadaPE[]>([]);

    // ============================================================================
    // OBSERVABLES PÚBLICOS
    // ============================================================================

    readonly ordenes$ = this._ordenes$.asObservable();
    readonly cargandoOrdenes$ = this._cargandoOrdenes$.asObservable();
    readonly facturaActual$ = this._facturaActual$.asObservable();
    readonly cargandoFactura$ = this._cargandoFactura$.asObservable();
    readonly detalles$ = this._detalles$.asObservable();
    readonly cargandoDetalles$ = this._cargandoDetalles$.asObservable();
    readonly guardandoDetalles$ = this._guardandoDetalles$.asObservable();
    readonly anticipos$ = this._anticipos$.asObservable();
    readonly cargandoAnticipos$ = this._cargandoAnticipos$.asObservable();
    readonly enviandoSolicitud$ = this._enviandoSolicitud$.asObservable();
    readonly agencias$ = this._agencias$.asObservable();
    readonly tiposPago$ = this._tiposPago$.asObservable();
    readonly bancos$ = this._bancos$.asObservable();
    readonly tiposCuenta$ = this._tiposCuenta$.asObservable();
    readonly ordenesAutorizadas$ = this._ordenesAutorizadas$.asObservable();

    // ============================================================================
    // MÉTODOS DE ÓRDENES
    // ============================================================================

    cargarOrdenes(): Observable<boolean> {
        this._cargandoOrdenes$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const ordenes = this.mapearOrdenes(response.datos);
                    this._ordenes$.next(ordenes);
                    return true;
                }
                throw new Error('Error al cargar órdenes');
            }),
            catchError((error) => {
                console.error('Error al cargar órdenes:', error);
                this.api.mensajeServidor('error', 'Error al cargar las órdenes');
                return of(false);
            }),
            tap(() => this._cargandoOrdenes$.next(false))
        );
    }

    private mapearOrdenes(data: any[]): OrdenPlanEmpresarial[] {
        return data.map(item => ({
            numeroOrden: this.toNumber(item.numero_orden),
            total: this.toNumber(item.total),
            montoLiquidado: this.toNumber(item.monto_liquidado),
            montoPendiente: this.toNumber(item.monto_pendiente || (item.total - item.monto_liquidado)),
            totalAnticipos: this.toNumber(item.total_anticipos),
            anticiposPendientesOTardios: this.toNumber(item.anticipos_pendientes_o_tardios),
            area: item.area || null,
            presupuesto: item.presupuesto || null
        })).filter(orden => orden.numeroOrden > 0);
    }

    // ============================================================================
    // MÉTODOS DE FACTURAS
    // ============================================================================

    buscarFactura(numeroDte: string): Observable<boolean> {
        const dteNormalizado = (numeroDte || '').trim();

        if (!dteNormalizado) {
            this.limpiarFactura();
            return of(false);
        }

        this._cargandoFactura$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.BUSCAR_FACTURA,
            tipo: 'post',
            body: { texto: dteNormalizado }
        }).pipe(
            switchMap((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos?.length) {
                    const factura = this.mapearFactura(response.datos[0]);
                    this._facturaActual$.next(factura);

                    // Validar vencimiento
                    this.validarVencimientoFactura(factura);

                    // Cargar detalles
                    return this.cargarDetalles(factura.numero_dte);
                }
                throw new Error('Factura no encontrada');
            }),
            map(() => true),
            catchError((error) => {
                console.error('Error al buscar factura:', error);
                this.limpiarFactura();
                this.api.mensajeServidor('info', 'Factura no encontrada');
                return of(false);
            }),
            tap(() => this._cargandoFactura$.next(false))
        );
    }

    registrarFactura(payload: RegistrarFacturaPayload): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.REGISTRAR_FACTURA,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Factura registrada correctamente');
                    return true;
                }
                else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                    throw new Error(response.respuesta || 'Error al registrar factura');
                }
                
            }),
            catchError((error) => {
                console.error('Error al registrar factura:', error);
                this.api.mensajeServidor('error', error.message || 'Error al registrar factura');
                return of(false);
            })
        );
    }

    solicitarAutorizacion(payload: SolicitarAutorizacionPayload): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.SOLICITAR_AUTORIZACION,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Solicitud de autorización enviada correctamente');
                    return true;
                } 
                else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                    throw new Error(response.respuesta || 'Error al registrar factura');
                }
            }),
            catchError((error) => {
                console.error('Error al solicitar autorización:', error);
                this.api.mensajeServidor('error', error.message || 'Error al solicitar autorización');
                return of(false);
            })
        );
    }

    private mapearFactura(data: any): FacturaPE {
        return {
            id: data.id,
            numero_dte: data.numero_dte || '',
            fecha_emision: data.fecha_emision || '',
            numero_autorizacion: data.numero_autorizacion || '',
            tipo_dte: data.tipo_dte || '',
            nombre_emisor: data.nombre_emisor || '',
            monto_total: this.toNumber(data.monto_total),
            estado: data.estado || '',
            estado_id: data.estado_id,
            estado_liquidacion: this.mapearEstadoLiquidacion(data.estado_id, data.estado_liquidacion),
            monto_liquidado: this.toNumber(data.monto_liquidado),
            moneda: data.moneda || 'GTQ',
            dias_transcurridos: data.dias_transcurridos,
            tiene_autorizacion_tardanza: Boolean(data.tiene_autorizacion_tardanza),
            autorizacion_id: data.autorizacion_id,
            estado_autorizacion: this.mapearEstadoAutorizacion(data.estado_autorizacion),
            motivo_autorizacion: data.motivo_autorizacion,
            solicitado_por: data.solicitado_por,
            fecha_solicitud: data.fecha_solicitud,
            autorizado_por: data.autorizado_por,
            fecha_autorizacion: data.fecha_autorizacion,
            comentarios_autorizacion: data.comentarios_autorizacion
        };
    }

    private mapearEstadoLiquidacion(estadoId: number, estadoTexto?: string): EstadoLiquidacionTexto {
        if (estadoId === 2) return 'Liquidado';
        if (estadoId === 3) return 'En Revisión';
        if (estadoTexto) {
            const texto = estadoTexto.toLowerCase();
            if (texto.includes('liquidado')) return 'Liquidado';
            if (texto.includes('revisión') || texto.includes('revision')) return 'En Revisión';
        }
        return 'Pendiente';
    }

    private mapearEstadoAutorizacion(estado: any): string {
        const estadoStr = String(estado || '').toLowerCase();
        if (estadoStr === 'aprobada' || estadoStr === 'autorizada') return 'aprobada';
        if (estadoStr === 'rechazada') return 'rechazada';
        if (estadoStr === 'pendiente') return 'pendiente';
        return 'ninguna';
    }

    private validarVencimientoFactura(factura: FacturaPE): void {
        if (factura.fecha_emision) {
            this.diasHabiles.validarVencimientoFactura(
                factura.fecha_emision,
                factura.estado_autorizacion === 'aprobada'
            ).subscribe(validacion => {
                // Emitir validación para uso en componentes
                // Se puede agregar un BehaviorSubject si es necesario
            });
        }
    }

    limpiarFactura(): void {
        this._facturaActual$.next(null);
        this._detalles$.next([]);
    }

    // ============================================================================
    // MÉTODOS DE DETALLES
    // ============================================================================

    cargarDetalles(numeroFactura: string): Observable<boolean> {
        this._cargandoDetalles$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.OBTENER_DETALLES,
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success') {
                    const detalles = (response.datos || []).map(item => this.mapearDetalle(item));
                    this._detalles$.next(detalles);
                    return true;
                }
                throw new Error('Error al cargar detalles');
            }),
            catchError((error) => {
                console.error('Error al cargar detalles:', error);
                this._detalles$.next([]);
                return of(false);
            }),
            tap(() => this._cargandoDetalles$.next(false))
        );
    }

    recargarDetalles(): Observable<boolean> {
        const factura = this._facturaActual$.value;
        if (factura?.numero_dte) {
            return this.cargarDetalles(factura.numero_dte);
        }
        return of(false);
    }

    guardarDetalle(payload: GuardarDetalleLiquidacionPayload): Observable<boolean> {
        this._guardandoDetalles$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.GUARDAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Detalle guardado correctamente');
                    return true;
                }
                else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                    throw new Error(response.respuesta || 'Error al registrar factura');
                }
            }),
            catchError((error) => {
                console.error('Error al guardar detalle:', error);
                this.api.mensajeServidor('error', error.message || 'Error al guardar detalle');
                return of(false);
            }),
            tap(() => this._guardandoDetalles$.next(false))
        );
    }

    actualizarDetalle(index: number, cambios: Partial<DetalleLiquidacionPE>): Observable<boolean> {
        const detalles = this._detalles$.value;
        const detalle = detalles[index];

        if (!detalle) return of(false);

        // Si tiene ID, actualizar en servidor
        if (detalle.id) {
            return this.api.query({
                ruta: ENDPOINTS.ACTUALIZAR_DETALLE,
                tipo: 'post',
                body: { id: detalle.id, ...cambios }
            }).pipe(
                map((response: ApiResponse) => {
                    if (response.respuesta === 'success') {
                        // Actualizar localmente
                        const nuevosDetalles = [...detalles];
                        nuevosDetalles[index] = { ...detalle, ...cambios };
                        this._detalles$.next(nuevosDetalles);
                        this.api.mensajeServidor('success', 'Detalle actualizado correctamente');
                        return true;
                    }
                    else {
                        this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                        throw new Error(response.respuesta || 'Error al registrar factura');
                    }
                }),
                catchError((error) => {
                    console.error('Error al actualizar detalle:', error);
                    this.api.mensajeServidor('error', error.message || 'Error al actualizar detalle');
                    return of(false);
                })
            );
        } else {
            // Solo actualizar localmente si no tiene ID
            const nuevosDetalles = [...detalles];
            nuevosDetalles[index] = { ...detalle, ...cambios };
            this._detalles$.next(nuevosDetalles);
            return of(true);
        }
    }

    copiarDetalle(index: number): Observable<boolean> {
        const detalles = this._detalles$.value;
        const detalle = detalles[index];

        if (!detalle) return of(false);

        if (detalle.id) {
            return this.api.query({
                ruta: ENDPOINTS.COPIAR_DETALLE,
                tipo: 'post',
                body: { id: detalle.id }
            }).pipe(
                map((response: ApiResponse) => {
                    if (response.respuesta === 'success') {
                        this.api.mensajeServidor('success', 'Detalle copiado correctamente');
                        this.recargarDetalles().subscribe();
                        return true;
                    }
                    else {
                        this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                        throw new Error(response.respuesta || 'Error al registrar factura');
                    }
                }),
                catchError((error) => {
                    console.error('Error al copiar detalle:', error);
                    this.api.mensajeServidor('error', error.message || 'Error al copiar detalle');
                    return of(false);
                })
            );
        } else {
            // Copia local
            const copia: DetalleLiquidacionPE = {
                ...detalle,
                id: undefined,
                descripcion: '[COPIA] ' + detalle.descripcion
            };
            const nuevosDetalles = [...detalles];
            nuevosDetalles.splice(index + 1, 0, copia);
            this._detalles$.next(nuevosDetalles);
            this.api.mensajeServidor('success', 'Detalle copiado');
            return of(true);
        }
    }

    eliminarDetalle(index: number): Observable<boolean> {
        const detalles = this._detalles$.value;
        const detalle = detalles[index];

        if (!detalle) return of(false);

        if (detalle.id) {
            return this.api.query({
                ruta: ENDPOINTS.ELIMINAR_DETALLE,
                tipo: 'post',
                body: { id: detalle.id }
            }).pipe(
                map((response: ApiResponse) => {
                    if (response.respuesta === 'success') {
                        const nuevosDetalles = [...detalles];
                        nuevosDetalles.splice(index, 1);
                        this._detalles$.next(nuevosDetalles);
                        this.api.mensajeServidor('success', 'Detalle eliminado correctamente');
                        return true;
                    }
                    else {
                        this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                        throw new Error(response.respuesta || 'Error al registrar factura');
                    }
                }),
                catchError((error) => {
                    console.error('Error al eliminar detalle:', error);
                    this.api.mensajeServidor('error', error.message || 'Error al eliminar detalle');
                    return of(false);
                })
            );
        } else {
            // Eliminación local
            const nuevosDetalles = [...detalles];
            nuevosDetalles.splice(index, 1);
            this._detalles$.next(nuevosDetalles);
            this.api.mensajeServidor('success', 'Detalle eliminado');
            return of(true);
        }
    }

    private mapearDetalle(data: any): DetalleLiquidacionPE {
        return {
            id: data.id,
            numero_orden: String(data.numero_orden || ''),
            agencia: data.agencia || '',
            descripcion: data.descripcion || '',
            monto: this.toNumber(data.monto),
            correo_proveedor: data.correo_proveedor || '',
            forma_pago: data.forma_pago || 'deposito',
            banco: data.banco || '',
            cuenta: data.cuenta || '',
            factura_id: data.factura_id,
            fecha_creacion: data.fecha_creacion,
            fecha_actualizacion: data.fecha_actualizacion,
            datos_especificos: data.datos_especificos,
            informacion_adicional: data.informacion_adicional
        };
    }

    // ============================================================================
    // MÉTODOS DE ANTICIPOS
    // ============================================================================

    cargarAnticipos(numeroOrden: number): Observable<boolean> {
        if (!numeroOrden || numeroOrden <= 0) {
            this._anticipos$.next([]);
            return of(false);
        }

        this._cargandoAnticipos$.next(true);

        return this.api.query({
            ruta: `${ENDPOINTS.LISTAR_ANTICIPOS}?numeroOrden=${numeroOrden}`,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const anticipos = this.mapearAnticipos(response.datos);
                    this._anticipos$.next(anticipos);
                    return true;
                }
                this._anticipos$.next([]);
                return false;
            }),
            catchError((error) => {
                console.error('Error al cargar anticipos:', error);
                this._anticipos$.next([]);
                return of(false);
            }),
            tap(() => this._cargandoAnticipos$.next(false))
        );
    }

    solicitarAutorizacionAnticipo(payload: SolicitudAutorizacionPayload): Observable<boolean> {
        this._enviandoSolicitud$.next(true);

        return this.api.query({
            ruta: ENDPOINTS.SOLICITAR_AUTORIZACION_ANTICIPO,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.api.mensajeServidor('success', 'Solicitud de autorización enviada correctamente');
                    return true;
                }
                else {
                    this.api.mensajeServidor('error', response.respuesta || 'Error al registrar factura');
                    throw new Error(response.respuesta || 'Error al registrar factura');
                }
            }),
            catchError((error) => {
                console.error('Error al solicitar autorización de anticipo:', error);
                this.api.mensajeServidor('error', error.message || 'Error al enviar solicitud');
                return of(false);
            }),
            tap(() => this._enviandoSolicitud$.next(false))
        );
    }

    private mapearAnticipos(data: any[]): AnticipoPendientePE[] {
        return data.map(item => ({
            idSolicitud: this.toNumber(item.id_solicitud),
            numeroOrden: this.toNumber(item.numero_orden),
            tipoAnticipo: this.mapearTipoAnticipo(item.tipo_anticipo),
            monto: this.toNumber(item.monto),
            fechaLiquidacion: item.fecha_liquidacion,
            diasTranscurridos: item.dias_transcurridos,
            estadoLiquidacion: item.estado_liquidacion || 'NO_LIQUIDADO',
            estadoSolicitud: item.estado_solicitud,
            requiereAutorizacion: Boolean(item.requiere_autorizacion),
            diasPermitidos: item.dias_permitidos,
            motivoInclusion: item.motivo_inclusion,
            ultimoSeguimiento: item.ultimo_seguimiento ? {
                fechaSeguimiento: item.ultimo_seguimiento.fecha_seguimiento,
                idEstado: item.ultimo_seguimiento.id_estado,
                nombreEstado: item.ultimo_seguimiento.nombre_estado,
                descripcionEstado: item.ultimo_seguimiento.descripcion_estado,
                comentarioSolicitante: item.ultimo_seguimiento.comentario_solicitante,
                fechaAutorizacion: item.ultimo_seguimiento.fecha_autorizacion,
                comentarioAutorizador: item.ultimo_seguimiento.comentario_autorizador
            } : null
        })).filter(anticipo => anticipo.idSolicitud > 0);
    }

    private mapearTipoAnticipo(tipo: string): string {
        const tipoUpper = String(tipo || '').toUpperCase();
        if (tipoUpper.includes('EFECTIVO')) return 'EFECTIVO';
        if (tipoUpper.includes('TRANS') || tipoUpper.includes('DEPOSITO')) return 'TRANSFERENCIA';
        return 'CHEQUE';
    }

    // ============================================================================
    // MÉTODOS DE CATÁLOGOS
    // ============================================================================

    cargarCatalogos(): Observable<boolean> {
        return forkJoin([
            this.cargarAgencias(),
            this.cargarTiposPago(),
            this.cargarBancos(),
            this.cargarTiposCuenta(),
            this.cargarOrdenesAutorizadas()
        ]).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    private cargarAgencias(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_AGENCIAS,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const agencias: AgenciaPE[] = response.datos.map(item => ({
                        id: item.id || 0,
                        nombre_liquidacion: item.nombre_liquidacion || 'Sin nombre'
                    }));
                    this._agencias$.next(agencias);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    private cargarTiposPago(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.OBTENER_TIPOS_PAGO,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const tipos: TipoPago[] = response.datos.map(item => ({
                        id: item.id || item.tipo || 'deposito',
                        nombre: item.nombre || item.descripcion || 'Sin nombre',
                        requiereFormulario: Boolean(item.requiere_formulario)
                    }));
                    this._tiposPago$.next(tipos);
                    return true;
                } else {
                    // Valores por defecto
                    this._tiposPago$.next([
                        { id: 'deposito', nombre: 'Por depósito a cuenta', requiereFormulario: true },
                        { id: 'transferencia', nombre: 'Por transferencia', requiereFormulario: true },
                        { id: 'cheque', nombre: 'Por cheque', requiereFormulario: true },
                        { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiereFormulario: false },
                        { id: 'anticipo', nombre: 'Por anticipo', requiereFormulario: false }
                    ]);
                    return true;
                }
            }),
            catchError(() => {
                // Valores por defecto en caso de error
                this._tiposPago$.next([
                    { id: 'deposito', nombre: 'Por depósito a cuenta', requiereFormulario: true },
                    { id: 'transferencia', nombre: 'Por transferencia', requiereFormulario: true },
                    { id: 'cheque', nombre: 'Por cheque', requiereFormulario: true },
                    { id: 'tarjeta', nombre: 'Por tarjeta de crédito', requiereFormulario: false },
                    { id: 'anticipo', nombre: 'Por anticipo', requiereFormulario: false }
                ]);
                return of(true);
            })
        );
    }

    private cargarBancos(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.LISTA_BANCOS,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<BancoPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._bancos$.next(response.datos);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    private cargarTiposCuenta(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.LISTA_TIPOS_CUENTA,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<TipoCuentaPE[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    this._tiposCuenta$.next(response.datos);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    private cargarOrdenesAutorizadas(): Observable<boolean> {
        return this.api.query({
            ruta: ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<any[]>) => {
                if (response.respuesta === 'success' && response.datos) {
                    const ordenes: OrdenAutorizadaPE[] = response.datos
                        .filter(orden => orden.anticipos_pendientes_o_tardios === 0)
                        .map(orden => ({
                            id: orden.numero_orden,
                            numero_orden: String(orden.numero_orden),
                            estado: 'autorizada',
                            total: this.toNumber(orden.total),
                            total_liquidado: this.toNumber(orden.monto_liquidado),
                            monto_pendiente: this.toNumber(orden.total) - this.toNumber(orden.monto_liquidado),
                            puede_finalizar: (this.toNumber(orden.total) - this.toNumber(orden.monto_liquidado)) <= 0,
                            anticipos_pendientes_o_tardios: orden.anticipos_pendientes_o_tardios || 0,
                            area: orden.area || null,
                            presupuesto: orden.presupuesto || null
                        }));

                    this._ordenesAutorizadas$.next(ordenes);
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    // ============================================================================
    // MÉTODOS DE VALIDACIÓN
    // ============================================================================

    validarMonto(index: number, nuevoMonto: number): { esValido: boolean; mensaje?: string; montoDisponible?: number } {
        const factura = this._facturaActual$.value;
        if (!factura?.monto_total) {
            return { esValido: true };
        }

        const detalles = this._detalles$.value;
        let totalSinItem = 0;

        detalles.forEach((detalle, i) => {
            if (i !== index) {
                totalSinItem += this.toNumber(detalle.monto);
            }
        });

        const nuevoTotal = totalSinItem + nuevoMonto;
        const montoFactura = this.toNumber(factura.monto_total);
        const montoDisponible = montoFactura - totalSinItem;

        if (nuevoMonto <= 0) {
            return {
                esValido: false,
                mensaje: 'El monto debe ser mayor a 0'
            };
        }

        if (nuevoTotal > montoFactura) {
            return {
                esValido: false,
                mensaje: `El monto excede lo disponible. Máximo disponible: Q${montoDisponible.toFixed(2)}`,
                montoDisponible
            };
        }

        return { esValido: true, montoDisponible };
    }

    calcularMontoDisponible(excluirIndice?: number): number {
        const factura = this._facturaActual$.value;
        if (!factura?.monto_total) return 0;

        const detalles = this._detalles$.value;
        let totalUsado = 0;

        detalles.forEach((detalle, i) => {
            if (i !== excluirIndice) {
                totalUsado += this.toNumber(detalle.monto);
            }
        });

        const montoFactura = this.toNumber(factura.monto_total);
        return Math.max(0, montoFactura - totalUsado);
    }

    // ============================================================================
    // MÉTODOS DE UTILIDAD
    // ============================================================================

    private toNumber(value: any, defaultValue: number = 0): number {
        if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
    }

    // ============================================================================
    // GETTERS PARA ACCESO DIRECTO
    // ============================================================================

    get ordenesActuales(): OrdenPlanEmpresarial[] {
        return this._ordenes$.value;
    }

    get facturaActual(): FacturaPE | null {
        return this._facturaActual$.value;
    }

    get detallesActuales(): DetalleLiquidacionPE[] {
        return this._detalles$.value;
    }

    get anticiposActuales(): AnticipoPendientePE[] {
        return this._anticipos$.value;
    }

    get agenciasActuales(): AgenciaPE[] {
        return this._agencias$.value;
    }

    get tiposPagoActuales(): TipoPago[] {
        return this._tiposPago$.value;
    }

    get bancosActuales(): BancoPE[] {
        return this._bancos$.value;
    }

    get tiposCuentaActuales(): TipoCuentaPE[] {
        return this._tiposCuenta$.value;
    }

    get ordenesAutorizadasActuales(): OrdenAutorizadaPE[] {
        return this._ordenesAutorizadas$.value;
    }
}