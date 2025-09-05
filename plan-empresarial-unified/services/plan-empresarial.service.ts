import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable, BehaviorSubject, of, forkJoin, throwError, EMPTY } from 'rxjs';
import { map, catchError, tap, finalize, switchMap, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { ServicioGeneralService } from '../../../servicios/servicio-general.service';
import { DiasHabilesService, ValidacionVencimiento } from '../../../servicios/dias-habiles.service';

import {
    // Interfaces principales
    FacturaPE, OrdenPE, DetalleLiquidacionPE, AnticipoPendientePE,
    AgenciaPE, BancoPE, TipoCuentaPE, SocioPE, CuentaSocioPE,

    // Payloads
    RegistrarFacturaPayload, SolicitarAutorizacionFacturaPayload,
    GuardarDetalleLiquidacionPayload, SolicitarAutorizacionAnticipoPayload,

    // Respuestas API
    ApiResponse, FacturaApi, DetalleLiquidacionApi,

    // Utilidades
    ValidadorMonto, EstadoDetalle, ResumenLiquidacion, EstadisticasDashboard,

    // Enums y tipos
    EstadoLiquidacionId, AutorizacionEstado, TipoPagoId, TipoAnticipo,
    EstadoLiquidacionAnticipo, EstadoCarga,

    // Constantes
    TIPOS_PAGO_DEFAULT, API_ENDPOINTS, CONFIG, MENSAJES
} from '../models/plan-empresarial.models';

/**
 * 🎯 SERVICIO ÚNICO CONSOLIDADO - PLAN EMPRESARIAL
 * 
 * Maneja todo el estado y lógica del módulo Plan Empresarial de forma centralizada
 * con signals para máxima reactividad y performance.
 */
@Injectable({
    providedIn: 'root'
})
export class PlanEmpresarialService {

    // ============================================================================
    // INYECCIÓN DE DEPENDENCIAS
    // ============================================================================

    private readonly api = inject(ServicioGeneralService);
    private readonly diasHabiles = inject(DiasHabilesService);

    // ============================================================================
    // SIGNALS DE ESTADO PRINCIPAL
    // ============================================================================

    // Estados de carga
    private readonly _estadoCarga = signal<EstadoCarga>('idle');
    private readonly _cargandoFacturas = signal(false);
    private readonly _cargandoOrdenes = signal(false);
    private readonly _cargandoDetalles = signal(false);
    private readonly _guardandoDetalle = signal(false);
    private readonly _cargandoAnticipos = signal(false);

    // Datos principales
    private readonly _facturaActiva = signal<FacturaPE | null>(null);
    private readonly _ordenes = signal<OrdenPE[]>([]);
    private readonly _detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);
    private readonly _anticiposPendientes = signal<AnticipoPendientePE[]>([]);

    // Catálogos
    private readonly _agencias = signal<AgenciaPE[]>([]);
    private readonly _tiposPago = signal(TIPOS_PAGO_DEFAULT);
    private readonly _bancos = signal<BancoPE[]>([]);
    private readonly _tiposCuenta = signal<TipoCuentaPE[]>([]);

    // Control de búsqueda y validación
    private readonly _ultimaBusquedaDte = signal('');
    private readonly _validacionVencimiento = signal<ValidacionVencimiento | null>(null);
    private readonly _ordenSeleccionada = signal<number | null>(null);

    // Mensajes y notificaciones
    private readonly _ultimoMensaje = signal<{ tipo: 'success' | 'error' | 'warning' | 'info', texto: string } | null>(null);

    // ============================================================================
    // COMPUTED SIGNALS (ESTADO DERIVADO)
    // ============================================================================

    // Estados de carga combinados
    readonly cargando = computed(() =>
        this._estadoCarga() === 'loading' ||
        this._cargandoFacturas() ||
        this._cargandoOrdenes() ||
        this._cargandoDetalles() ||
        this._guardandoDetalle()
    );

    readonly estaOcupado = computed(() =>
        this.cargando() || this._cargandoAnticipos()
    );

    // Resumen de liquidación
    readonly resumenLiquidacion = computed((): ResumenLiquidacion => {
        const factura = this._facturaActiva();
        const detalles = this._detallesLiquidacion();

        if (!factura) {
            return {
                cantidad_detalles: 0,
                total_liquidado: 0,
                monto_factura: 0,
                monto_pendiente: 0,
                estado_monto: 'incompleto',
                puede_completar: false
            };
        }

        const totalLiquidado = detalles.reduce((sum, d) => sum + (d.monto || 0), 0);
        const diferencia = Math.abs(factura.monto_total - totalLiquidado);
        const tolerancia = CONFIG.MONTO_MINIMO;

        let estadoMonto: 'completo' | 'incompleto' | 'excedido';
        if (diferencia <= tolerancia) {
            estadoMonto = 'completo';
        } else if (totalLiquidado > factura.monto_total) {
            estadoMonto = 'excedido';
        } else {
            estadoMonto = 'incompleto';
        }

        return {
            cantidad_detalles: detalles.length,
            total_liquidado: totalLiquidado,
            monto_factura: factura.monto_total,
            monto_pendiente: Math.max(0, factura.monto_total - totalLiquidado),
            estado_monto: estadoMonto,
            puede_completar: estadoMonto === 'completo' && detalles.length > 0
        };
    });

    // Estadísticas del dashboard
    readonly estadisticas = computed((): EstadisticasDashboard => {
        const ordenes = this._ordenes();
        const factura = this._facturaActiva();
        const anticipos = this._anticiposPendientes();

        return {
            facturas_pendientes: factura && factura.estado_liquidacion === 'Pendiente' ? 1 : 0,
            ordenes_con_anticipos: ordenes.filter(o => o.anticipos_pendientes > 0).length,
            liquidaciones_completadas: this.resumenLiquidacion().puede_completar ? 1 : 0,
            monto_total_pendiente: this.resumenLiquidacion().monto_pendiente,
            alertas_vencimiento: this._validacionVencimiento()?.requiereAutorizacion ? 1 : 0
        };
    });

    // Estados de permisos
    readonly puedeEditarDetalles = computed(() => {
        const factura = this._facturaActiva();
        return factura && factura.estado_id !== EstadoLiquidacionId.Liquidado;
    });

    readonly puedeLiquidarFactura = computed(() => {
        const factura = this._facturaActiva();
        const validacion = this._validacionVencimiento();

        if (!factura || factura.estado_liquidacion === 'Liquidado') return false;

        if (validacion?.requiereAutorizacion) {
            return factura.estado_autorizacion === AutorizacionEstado.Aprobada;
        }

        return true;
    });

    // ============================================================================
    // SIGNALS PÚBLICOS (READONLY)
    // ============================================================================

    // Estados
    readonly estadoCarga = this._estadoCarga.asReadonly();
    readonly cargandoFacturas = this._cargandoFacturas.asReadonly();
    readonly cargandoOrdenes = this._cargandoOrdenes.asReadonly();
    readonly cargandoDetalles = this._cargandoDetalles.asReadonly();
    readonly guardandoDetalle = this._guardandoDetalle.asReadonly();
    readonly cargandoAnticipos = this._cargandoAnticipos.asReadonly();

    // Datos
    readonly facturaActiva = this._facturaActiva.asReadonly();
    readonly ordenes = this._ordenes.asReadonly();
    readonly detallesLiquidacion = this._detallesLiquidacion.asReadonly();
    readonly anticiposPendientes = this._anticiposPendientes.asReadonly();

    // Catálogos
    readonly agencias = this._agencias.asReadonly();
    readonly tiposPago = this._tiposPago.asReadonly();
    readonly bancos = this._bancos.asReadonly();
    readonly tiposCuenta = this._tiposCuenta.asReadonly();

    // Utilidades
    readonly ultimaBusquedaDte = this._ultimaBusquedaDte.asReadonly();
    readonly validacionVencimiento = this._validacionVencimiento.asReadonly();
    readonly ordenSeleccionada = this._ordenSeleccionada.asReadonly();
    readonly ultimoMensaje = this._ultimoMensaje.asReadonly();

    // ============================================================================
    // INICIALIZACIÓN Y CARGA DE CATÁLOGOS
    // ============================================================================

    /**
     * Inicializa el servicio cargando los catálogos necesarios
     */
    inicializar(): Observable<boolean> {
        this._estadoCarga.set('loading');

        return this.cargarCatalogos().pipe(
            map(() => {
                this._estadoCarga.set('success');
                return true;
            }),
            catchError(error => {
                this._estadoCarga.set('error');
                this.mostrarMensaje('error', MENSAJES.ERROR.ERROR_CARGAR_DATOS);
                console.error('Error al inicializar PlanEmpresarialService:', error);
                return of(false);
            })
        );
    }

    /**
     * Carga todos los catálogos necesarios
     */
    private cargarCatalogos(): Observable<boolean> {
        return forkJoin({
            agencias: this.cargarAgencias(),
            tiposPago: this.cargarTiposPago(),
            bancos: this.cargarBancos(),
            tiposCuenta: this.cargarTiposCuenta()
        }).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    /**
     * Carga el catálogo de agencias
     */
    private cargarAgencias(): Observable<AgenciaPE[]> {
        return this.api.query({
            ruta: API_ENDPOINTS.OBTENER_AGENCIAS,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse<AgenciaPE[]>) => {
                if (res.respuesta === 'success' && res.datos) {
                    const agencias = res.datos.map(item => ({
                        id: item.id || 0,
                        nombre_liquidacion: item.nombre_liquidacion || 'Sin nombre',
                        activa: true
                    }));
                    this._agencias.set(agencias);
                    return agencias;
                }
                return [];
            }),
            catchError(() => of([]))
        );
    }

    /**
     * Carga los tipos de pago desde el backend y los combina con los defaults
     */
    private cargarTiposPago(): Observable<typeof TIPOS_PAGO_DEFAULT> {
        return this.api.query({
            ruta: API_ENDPOINTS.OBTENER_TIPOS_PAGO,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    // Combinar tipos del backend con los defaults
                    const tiposBackend = res.datos.map((item: any) => ({
                        id: item.id || item.tipo || 'deposito',
                        nombre: item.nombre || item.descripcion || 'Sin nombre',
                        requiereFormulario: item.requiere_formulario || false,
                        icono: TIPOS_PAGO_DEFAULT.find(t => t.id === item.id)?.icono || '📄',
                        color: TIPOS_PAGO_DEFAULT.find(t => t.id === item.id)?.color || 'gray'
                    }));

                    // Mantener los defaults y agregar nuevos
                    const tiposCombinados = [...TIPOS_PAGO_DEFAULT];
                    tiposBackend.forEach((tipo: any) => {
                        const exists = tiposCombinados.find(t => t.id === tipo.id);
                        if (!exists) {
                            tiposCombinados.push(tipo);
                        }
                    });

                    this._tiposPago.set(tiposCombinados);
                    return tiposCombinados;
                }

                this._tiposPago.set(TIPOS_PAGO_DEFAULT);
                return TIPOS_PAGO_DEFAULT;
            }),
            catchError(() => {
                this._tiposPago.set(TIPOS_PAGO_DEFAULT);
                return of(TIPOS_PAGO_DEFAULT);
            })
        );
    }

    /**
     * Carga el catálogo de bancos
     */
    private cargarBancos(): Observable<BancoPE[]> {
        return this.api.query({
            ruta: API_ENDPOINTS.LISTA_BANCOS,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse<BancoPE[]>) => {
                if (res.respuesta === 'success' && res.datos) {
                    this._bancos.set(res.datos);
                    return res.datos;
                }
                return [];
            }),
            catchError(() => of([]))
        );
    }

    /**
     * Carga el catálogo de tipos de cuenta
     */
    private cargarTiposCuenta(): Observable<TipoCuentaPE[]> {
        return this.api.query({
            ruta: API_ENDPOINTS.LISTA_TIPOS_CUENTA,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse<TipoCuentaPE[]>) => {
                if (res.respuesta === 'success' && res.datos) {
                    this._tiposCuenta.set(res.datos);
                    return res.datos;
                }
                return [];
            }),
            catchError(() => of([]))
        );
    }

    // ============================================================================
    // GESTIÓN DE FACTURAS
    // ============================================================================

    /**
     * Busca una factura por número DTE
     */
    buscarFactura(numeroDte: string): Observable<FacturaPE | null> {
        const dteNormalizado = (numeroDte || '').trim();

        if (!dteNormalizado) {
            this.limpiarFactura();
            return of(null);
        }

        // Evitar búsquedas duplicadas
        if (this._ultimaBusquedaDte() === dteNormalizado && this._facturaActiva()) {
            return of(this._facturaActiva());
        }

        this._ultimaBusquedaDte.set(dteNormalizado);
        this._cargandoFacturas.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.BUSCAR_FACTURA,
            tipo: 'post',
            body: { texto: dteNormalizado }
        }).pipe(
            switchMap((res: ApiResponse<FacturaApi[]>) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos) && res.datos.length > 0) {
                    const factura = this.mapearFacturaApi(res.datos[0]);
                    this._facturaActiva.set(factura);

                    // Cargar detalles y validar vencimiento en paralelo
                    return forkJoin({
                        detalles: this.cargarDetallesLiquidacion(factura.numero_dte),
                        validacion: this.validarVencimientoFactura(factura)
                    }).pipe(
                        map(() => factura)
                    );
                } else {
                    throw new Error(res.respuesta || MENSAJES.ERROR.FACTURA_NO_ENCONTRADA);
                }
            }),
            catchError(error => {
                this.limpiarFactura();
                this.mostrarMensaje('info', error.message || MENSAJES.ERROR.FACTURA_NO_ENCONTRADA);
                return of(null);
            }),
            finalize(() => this._cargandoFacturas.set(false))
        );
    }

    /**
     * Registra una nueva factura manualmente
     */
    registrarFactura(payload: RegistrarFacturaPayload): Observable<boolean> {
        this._guardandoDetalle.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.REGISTRAR_FACTURA,
            tipo: 'post',
            body: payload
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    this.mostrarMensaje('success', MENSAJES.EXITO.FACTURA_REGISTRADA);

                    // Buscar la factura recién creada después de un breve delay
                    setTimeout(() => {
                        this.buscarFactura(payload.numero_dte).subscribe();
                    }, 500);

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al registrar factura');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            }),
            finalize(() => this._guardandoDetalle.set(false))
        );
    }

    /**
     * Solicita autorización para factura fuera de tiempo
     */
    solicitarAutorizacionFactura(payload: SolicitarAutorizacionFacturaPayload): Observable<boolean> {
        this._cargandoFacturas.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.SOLICITAR_AUTORIZACION_FACTURA,
            tipo: 'post',
            body: payload
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    this.mostrarMensaje('success', MENSAJES.EXITO.AUTORIZACION_ENVIADA);

                    // Refrescar la factura para obtener el estado actualizado
                    setTimeout(() => {
                        this.buscarFactura(payload.numero_dte).subscribe();
                    }, 500);

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al enviar solicitud');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            }),
            finalize(() => this._cargandoFacturas.set(false))
        );
    }

    /**
 * Valida el vencimiento de una factura usando el servicio de días hábiles
 */
    private validarVencimientoFactura(factura: FacturaPE): Observable<ValidacionVencimiento> {
        if (!factura.fecha_emision) {
            return of({
                excedeDias: false,
                diasTranscurridos: 0,
                mensaje: 'Sin fecha de emisión',
                claseCSS: 'text-gray-600 bg-gray-50 border-gray-200',
                requiereAutorizacion: false,
                fechaInicioCalculo: new Date().toISOString()
            });
        }

        const tieneAutorizacion = factura.estado_autorizacion === AutorizacionEstado.Aprobada;

        return this.diasHabiles.validarVencimientoFactura(factura.fecha_emision, tieneAutorizacion).pipe(
            tap(validacion => this._validacionVencimiento.set(validacion)),
            catchError(error => {
                console.error('Error al validar vencimiento:', error);
                const fallback: ValidacionVencimiento = {
                    excedeDias: false,
                    diasTranscurridos: 0,
                    mensaje: 'Error al validar vencimiento',
                    claseCSS: 'text-gray-600 bg-gray-50 border-gray-200',
                    requiereAutorizacion: false,
                    fechaInicioCalculo: new Date().toISOString()
                };
                this._validacionVencimiento.set(fallback);
                return of(fallback);
            })
        );
    }

    // ============================================================================
    // GESTIÓN DE ÓRDENES
    // ============================================================================

    /**
     * Carga las órdenes disponibles
     */
    cargarOrdenes(): Observable<OrdenPE[]> {
        this._cargandoOrdenes.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.LISTAR_ORDENES,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    const ordenes = res.datos.map(item => this.mapearOrdenApi(item));
                    this._ordenes.set(ordenes);
                    return ordenes;
                }
                return [];
            }),
            catchError(error => {
                console.error('Error al cargar órdenes:', error);
                this.mostrarMensaje('error', MENSAJES.ERROR.ERROR_CARGAR_DATOS);
                return of([]);
            }),
            finalize(() => this._cargandoOrdenes.set(false))
        );
    }

    /**
     * Selecciona una orden para trabajar con sus anticipos
     */
    seleccionarOrden(numeroOrden: number): void {
        this._ordenSeleccionada.set(numeroOrden);
        this.cargarAnticiposPendientes(numeroOrden).subscribe();
    }

    // ============================================================================
    // GESTIÓN DE ANTICIPOS
    // ============================================================================

    /**
     * Carga los anticipos pendientes de una orden
     */
    cargarAnticiposPendientes(numeroOrden: number): Observable<AnticipoPendientePE[]> {
        if (!numeroOrden || numeroOrden <= 0) {
            this._anticiposPendientes.set([]);
            return of([]);
        }

        this._cargandoAnticipos.set(true);

        return this.api.query({
            ruta: `${API_ENDPOINTS.LISTAR_ANTICIPOS_PENDIENTES}?numeroOrden=${numeroOrden}`,
            tipo: 'get'
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    const anticipos = res.datos.map(item => this.mapearAnticipoApi(item));
                    this._anticiposPendientes.set(anticipos);
                    return anticipos;
                }
                return [];
            }),
            catchError(error => {
                console.error('Error al cargar anticipos:', error);
                this.mostrarMensaje('error', 'Error al cargar anticipos pendientes');
                return of([]);
            }),
            finalize(() => this._cargandoAnticipos.set(false))
        );
    }

    /**
     * Solicita autorización para un anticipo pendiente
     */
    solicitarAutorizacionAnticipo(payload: SolicitarAutorizacionAnticipoPayload): Observable<boolean> {
        return this.api.query({
            ruta: API_ENDPOINTS.SOLICITAR_AUTORIZACION_ANTICIPO,
            tipo: 'post',
            body: payload
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    this.mostrarMensaje('success', 'Solicitud de autorización enviada correctamente');

                    // Recargar anticipos para reflejar el cambio
                    const ordenActual = this._ordenSeleccionada();
                    if (ordenActual) {
                        this.cargarAnticiposPendientes(ordenActual).subscribe();
                    }

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al enviar solicitud');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || 'Error al enviar la solicitud');
                return of(false);
            })
        );
    }

    // ============================================================================
    // GESTIÓN DE DETALLES DE LIQUIDACIÓN
    // ============================================================================

    /**
     * Carga los detalles de liquidación de una factura
     */
    private cargarDetallesLiquidacion(numeroFactura: string): Observable<DetalleLiquidacionPE[]> {
        this._cargandoDetalles.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.OBTENER_DETALLES,
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            map((res: ApiResponse<DetalleLiquidacionApi[]>) => {
                if (res.respuesta === 'success' && Array.isArray(res.datos)) {
                    const detalles = res.datos.map(item => this.mapearDetalleLiquidacionApi(item));
                    this._detallesLiquidacion.set(detalles);
                    return detalles;
                }
                return [];
            }),
            catchError(error => {
                console.error('Error al cargar detalles:', error);
                this._detallesLiquidacion.set([]);
                return of([]);
            }),
            finalize(() => this._cargandoDetalles.set(false))
        );
    }

    /**
     * Guarda un detalle de liquidación (crear o actualizar)
     */
    guardarDetalleLiquidacion(payload: GuardarDetalleLiquidacionPayload): Observable<boolean> {
        this._guardandoDetalle.set(true);

        return this.api.query({
            ruta: API_ENDPOINTS.GUARDAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    this.mostrarMensaje('success', MENSAJES.EXITO.DETALLE_GUARDADO);

                    // Recargar detalles para reflejar cambios
                    const factura = this._facturaActiva();
                    if (factura) {
                        this.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
                    }

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al guardar detalle');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            }),
            finalize(() => this._guardandoDetalle.set(false))
        );
    }

    /**
     * Actualiza campos específicos de un detalle (monto, agencia)
     */
    actualizarDetalleLiquidacion(id: number, campo: 'monto' | 'agencia', valor: number | string): Observable<boolean> {
        const payload = { id, [campo]: valor };

        return this.api.query({
            ruta: API_ENDPOINTS.ACTUALIZAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    // Actualizar el estado local inmediatamente
                    const detalles = this._detallesLiquidacion();
                    const index = detalles.findIndex(d => d.id === id);
                    if (index >= 0) {
                        const detallesActualizados = [...detalles];
                        detallesActualizados[index] = {
                            ...detallesActualizados[index],
                            [campo]: valor
                        };
                        this._detallesLiquidacion.set(detallesActualizados);
                    }

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al actualizar detalle');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            })
        );
    }

    /**
     * Elimina un detalle de liquidación
     */
    eliminarDetalleLiquidacion(id: number): Observable<boolean> {
        return this.api.query({
            ruta: API_ENDPOINTS.ELIMINAR_DETALLE,
            tipo: 'post',
            body: { id }
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    // Remover del estado local
                    const detalles = this._detallesLiquidacion();
                    const detallesActualizados = detalles.filter(d => d.id !== id);
                    this._detallesLiquidacion.set(detallesActualizados);

                    this.mostrarMensaje('success', MENSAJES.EXITO.DETALLE_ELIMINADO);
                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al eliminar detalle');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            })
        );
    }

    /**
     * Copia un detalle existente
     */
    copiarDetalleLiquidacion(id: number): Observable<boolean> {
        return this.api.query({
            ruta: API_ENDPOINTS.COPIAR_DETALLE,
            tipo: 'post',
            body: { id }
        }).pipe(
            map((res: ApiResponse) => {
                if (res.respuesta === 'success') {
                    this.mostrarMensaje('success', 'Detalle copiado correctamente');

                    // Recargar detalles para mostrar la copia
                    const factura = this._facturaActiva();
                    if (factura) {
                        this.cargarDetallesLiquidacion(factura.numero_dte).subscribe();
                    }

                    return true;
                } else {
                    throw new Error(res.respuesta || 'Error al copiar detalle');
                }
            }),
            catchError(error => {
                this.mostrarMensaje('error', error.message || MENSAJES.ERROR.ERROR_GUARDAR);
                return of(false);
            })
        );
    }

    /**
     * Obtiene el detalle completo con información adicional
     */
    obtenerDetalleCompleto(id: number): Observable<any> {
        return this.api.query({
            ruta: API_ENDPOINTS.OBTENER_DETALLE_COMPLETO,
            tipo: 'post',
            body: { id }
        });
    }

    // ============================================================================
    // VALIDACIONES Y CÁLCULOS
    // ============================================================================

    /**
     * Valida si un monto es válido para un detalle específico
     */
    validarMonto(detalleId: number | null, nuevoMonto: number): ValidadorMonto {
        const factura = this._facturaActiva();
        const detalles = this._detallesLiquidacion();

        if (!factura || nuevoMonto <= 0) {
            return {
                es_valido: false,
                mensaje: MENSAJES.VALIDACION.MONTO_MAYOR_CERO
            };
        }

        // Calcular total sin el detalle actual
        let totalSinDetalle = 0;
        detalles.forEach(detalle => {
            if (detalle.id !== detalleId) {
                totalSinDetalle += detalle.monto || 0;
            }
        });

        const nuevoTotal = totalSinDetalle + nuevoMonto;
        const montoDisponible = factura.monto_total - totalSinDetalle;

        if (nuevoTotal > factura.monto_total) {
            return {
                es_valido: false,
                mensaje: `${MENSAJES.VALIDACION.MONTO_EXCEDE_FACTURA}. Disponible: Q${montoDisponible.toFixed(2)}`,
                monto_disponible: montoDisponible,
                monto_excedente: nuevoTotal - factura.monto_total
            };
        }

        return {
            es_valido: true,
            monto_disponible: montoDisponible
        };
    }

    /**
     * Valida el estado de completitud de un detalle
     */
    validarEstadoDetalle(detalle: DetalleLiquidacionPE): EstadoDetalle {
        const camposFaltantes: string[] = [];

        if (!detalle.numero_orden?.trim()) camposFaltantes.push('Número de orden');
        if (!detalle.agencia?.trim()) camposFaltantes.push('Agencia');
        if (!detalle.descripcion?.trim()) camposFaltantes.push('Descripción');
        if (!detalle.monto || detalle.monto <= 0) camposFaltantes.push('Monto');
        if (!detalle.forma_pago?.trim()) camposFaltantes.push('Forma de pago');

        const esCompleto = camposFaltantes.length === 0;
        const requiereGuardado = !detalle.id;
        const puedeEditarSignal = this.puedeEditarDetalles();

        return {
            es_completo: esCompleto,
            campos_faltantes: camposFaltantes,
            requiere_guardado: requiereGuardado,
            puede_liquidar: esCompleto && Boolean(puedeEditarSignal)
        };
    }

    /**
     * Calcula el monto disponible para nuevos detalles
     */
    calcularMontoDisponible(excluirDetalleId?: number): number {
        const factura = this._facturaActiva();
        const detalles = this._detallesLiquidacion();

        if (!factura) return 0;

        let totalUsado = 0;
        detalles.forEach(detalle => {
            if (detalle.id !== excluirDetalleId) {
                totalUsado += detalle.monto || 0;
            }
        });

        return Math.max(0, factura.monto_total - totalUsado);
    }

    // ============================================================================
    // SERVICIOS AUXILIARES PARA DEPÓSITOS
    // ============================================================================

    /**
     * Busca socios por ID o DPI
     */
    buscarSocios(termino: string): Observable<SocioPE[]> {
        if (!termino || termino.length < 2) {
            return of([]);
        }

        return this.api.query({
            ruta: API_ENDPOINTS.BUSCAR_SOCIOS,
            tipo: 'post',
            body: { termino }
        }).pipe(
            map((res: ApiResponse<SocioPE[]>) => {
                if (res.respuesta === 'success' && res.datos) {
                    return res.datos;
                }
                return [];
            }),
            catchError(error => {
                console.error('Error al buscar socios:', error);
                return of([]);
            })
        );
    }

    /**
     * Obtiene las cuentas de un socio específico
     */
    obtenerCuentasSocio(idSocio: string): Observable<CuentaSocioPE[]> {
        return this.api.query({
            ruta: API_ENDPOINTS.BUSCAR_CUENTAS_SOCIO,
            tipo: 'post',
            body: { id_socio: idSocio }
        }).pipe(
            map((res: ApiResponse<CuentaSocioPE[]>) => {
                if (res.respuesta === 'success' && res.datos) {
                    return res.datos;
                }
                return [];
            }),
            catchError(error => {
                console.error('Error al obtener cuentas del socio:', error);
                return of([]);
            })
        );
    }

    /**
     * Obtiene un socio por su ID
     */
    obtenerSocioPorId(idSocio: string): Observable<SocioPE | null> {
        return this.api.query({
            ruta: API_ENDPOINTS.OBTENER_SOCIO,
            tipo: 'post',
            body: { id_socio: idSocio }
        }).pipe(
            map((res: ApiResponse<SocioPE>) => {
                if (res.respuesta === 'success' && res.datos) {
                    return res.datos;
                }
                return null;
            }),
            catchError(error => {
                console.error('Error al obtener socio:', error);
                return of(null);
            })
        );
    }

    // ============================================================================
    // UTILIDADES Y HELPERS
    // ============================================================================

    /**
     * Limpia todo el estado relacionado con facturas
     */
    limpiarFactura(): void {
        this._facturaActiva.set(null);
        this._detallesLiquidacion.set([]);
        this._validacionVencimiento.set(null);
        this._ultimaBusquedaDte.set('');
    }

    /**
     * Limpia el estado de órdenes y anticipos
     */
    limpiarOrdenes(): void {
        this._ordenes.set([]);
        this._anticiposPendientes.set([]);
        this._ordenSeleccionada.set(null);
    }

    /**
     * Reinicia completamente el estado del servicio
     */
    reiniciarEstado(): void {
        this.limpiarFactura();
        this.limpiarOrdenes();
        this._estadoCarga.set('idle');
        this._ultimoMensaje.set(null);
    }

    /**
     * Muestra un mensaje al usuario usando el ServicioGeneral
     */
    private mostrarMensaje(tipo: 'success' | 'error' | 'warning' | 'info', texto: string): void {
        this._ultimoMensaje.set({ tipo, texto });
        this.api.mensajeServidor(tipo, texto);
    }

    /**
     * Refresca los datos después de cambios importantes
     */
    refrescarDatos(): Observable<boolean> {
        const operaciones: Observable<any>[] = [];

        // Recargar catálogos
        operaciones.push(this.cargarCatalogos());

        // Recargar órdenes si estaban cargadas
        if (this._ordenes().length > 0) {
            operaciones.push(this.cargarOrdenes());
        }

        // Recargar factura actual si existe
        const facturaActual = this._facturaActiva();
        if (facturaActual) {
            operaciones.push(this.buscarFactura(facturaActual.numero_dte));
        }

        if (operaciones.length === 0) {
            return of(true);
        }

        return forkJoin(operaciones).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    // ============================================================================
    // MAPPERS - CONVERSIÓN DE DATOS DE API
    // ============================================================================

    /**
     * Convierte FacturaApi del backend a FacturaPE para la UI
     */
    private mapearFacturaApi(api: FacturaApi): FacturaPE {
        return {
            id: api.id,
            numero_dte: api.numero_dte || '',
            fecha_emision: api.fecha_emision || '',
            numero_autorizacion: api.numero_autorizacion || '',
            tipo_dte: api.tipo_dte || '',
            nombre_emisor: api.nombre_emisor || '',
            monto_total: this.parseNumeroSeguro(api.monto_total, 0),
            moneda: api.moneda || 'GTQ',
            estado: api.estado || '',
            estado_id: api.estado_id || EstadoLiquidacionId.Pendiente,
            estado_liquidacion: this.mapearEstadoLiquidacion(api.estado_id, api.estado_liquidacion),
            monto_liquidado: this.parseNumeroSeguro(api.monto_liquidado, 0),

            // Campos de autorización
            dias_transcurridos: api.dias_transcurridos,
            tiene_autorizacion_tardanza: Boolean(api.tiene_autorizacion_tardanza),
            autorizacion_id: api.autorizacion_id,
            estado_autorizacion: this.mapearEstadoAutorizacion(api.estado_autorizacion),
            motivo_autorizacion: api.motivo_autorizacion,
            solicitado_por: api.solicitado_por,
            fecha_solicitud: api.fecha_solicitud,
            autorizado_por: api.autorizado_por,
            fecha_autorizacion: api.fecha_autorizacion,
            comentarios_autorizacion: api.comentarios_autorizacion
        };
    }

    /**
     * Convierte datos de orden del API a OrdenPE
     */
    private mapearOrdenApi(api: any): OrdenPE {
        const total = this.parseNumeroSeguro(api.total, 0);
        const montoLiquidado = this.parseNumeroSeguro(api.monto_liquidado, 0);

        return {
            id: api.numero_orden || 0,
            numero_orden: String(api.numero_orden || ''),
            total,
            monto_liquidado: montoLiquidado,
            monto_pendiente: Math.max(0, total - montoLiquidado),
            total_anticipos: this.parseNumeroSeguro(api.total_anticipos, 0),
            anticipos_pendientes: api.anticipos_pendientes_o_tardios || 0,
            area: api.area || null,
            presupuesto: api.presupuesto || null,
            estado: api.estado || 'autorizada',
            puede_liquidar: montoLiquidado < total
        };
    }

    /**
     * Convierte DetalleLiquidacionApi a DetalleLiquidacionPE
     */
    private mapearDetalleLiquidacionApi(api: DetalleLiquidacionApi): DetalleLiquidacionPE {
        return {
            id: api.id,
            factura_id: api.factura_id,
            numero_orden: String(api.numero_orden || ''),
            agencia: api.agencia || '',
            descripcion: api.descripcion || '',
            monto: this.parseNumeroSeguro(api.monto, 0),
            correo_proveedor: api.correo_proveedor || '',
            forma_pago: (api.forma_pago?.toLowerCase() as TipoPagoId) || 'deposito',
            banco: api.banco || '',
            cuenta: api.cuenta || '',
            fecha_creacion: api.fecha_creacion,
            fecha_actualizacion: api.fecha_actualizacion,
            datos_especificos: api.datos_especificos,
            informacion_adicional: api.informacion_adicional
        };
    }

    /**
     * Convierte datos de anticipo del API a AnticipoPendientePE
     */
    private mapearAnticipoApi(api: any): AnticipoPendientePE {
        // Mapear tipo de anticipo
        const rawTipo = String(api.tipo_anticipo || '').toUpperCase();
        let tipoAnticipo: TipoAnticipo = TipoAnticipo.CHEQUE;
        if (rawTipo.includes('EFECTIVO')) tipoAnticipo = TipoAnticipo.EFECTIVO;
        else if (rawTipo.includes('TRANS') || rawTipo.includes('DEPOSITO')) tipoAnticipo = TipoAnticipo.TRANSFERENCIA;

        // Mapear seguimiento
        const seg = api.ultimo_seguimiento;
        const ultimoSeguimiento = seg ? {
            fecha_seguimiento: seg.fecha_seguimiento || null,
            id_estado: seg.id_estado || null,
            nombre_estado: seg.nombre_estado || null,
            descripcion_estado: seg.descripcion_estado || null,
            comentario_solicitante: seg.comentario_solicitante || null,
            fecha_autorizacion: seg.fecha_autorizacion || null,
            comentario_autorizador: seg.comentario_autorizador || null
        } : null;

        return {
            id_solicitud: api.id_solicitud || 0,
            numero_orden: api.numero_orden || 0,
            tipo_anticipo: tipoAnticipo,
            monto: this.parseNumeroSeguro(api.monto, 0),
            fecha_liquidacion: api.fecha_liquidacion || null,
            dias_transcurridos: api.dias_transcurridos || null,
            estado_liquidacion: api.estado_liquidacion || EstadoLiquidacionAnticipo.NO_LIQUIDADO,
            estado_solicitud: api.estado_solicitud || null,
            requiere_autorizacion: Boolean(api.requiere_autorizacion),
            motivo_inclusion: api.motivo_inclusion || null,
            ultimo_seguimiento: ultimoSeguimiento
        };
    }

    /**
     * Mapea el estado de liquidación desde el backend
     */
    private mapearEstadoLiquidacion(estadoId?: number, estadoTexto?: string): 'Pendiente' | 'Liquidado' | 'En Revisión' {
        if (estadoId === EstadoLiquidacionId.Liquidado) return 'Liquidado';
        if (estadoId === EstadoLiquidacionId.EnRevision) return 'En Revisión';

        if (estadoTexto) {
            const s = estadoTexto.toLowerCase();
            if (s.includes('liquidado')) return 'Liquidado';
            if (s.includes('revisión') || s.includes('revision')) return 'En Revisión';
        }

        return 'Pendiente';
    }

    /**
     * Mapea el estado de autorización desde el backend
     */
    private mapearEstadoAutorizacion(api?: string): AutorizacionEstado {
        if (!api || api === 'null' || api === 'undefined') return AutorizacionEstado.Ninguna;

        const s = api.toLowerCase();
        if (s === 'aprobada' || s === 'autorizada') return AutorizacionEstado.Aprobada;
        if (s === 'rechazada') return AutorizacionEstado.Rechazada;
        if (s === 'pendiente') return AutorizacionEstado.Pendiente;

        return AutorizacionEstado.Ninguna;
    }

    /**
     * Parsea un número de forma segura desde string o number
     */
    private parseNumeroSeguro(value: any, fallback: number = 0): number {
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? fallback : parsed;
        }
        return fallback;
    }

    // ============================================================================
    // GETTERS PÚBLICOS PARA COMPATIBILIDAD
    // ============================================================================

    /**
     * Obtiene la factura activa actual
     */
    obtenerFacturaActiva(): FacturaPE | null {
        return this._facturaActiva();
    }

    /**
     * Obtiene los detalles de liquidación actuales
     */
    obtenerDetallesActuales(): DetalleLiquidacionPE[] {
        return this._detallesLiquidacion();
    }

    /**
     * Obtiene las órdenes actuales
     */
    obtenerOrdenesActuales(): OrdenPE[] {
        return this._ordenes();
    }

    /**
     * Obtiene los anticipos pendientes actuales
     */
    obtenerAnticiposActuales(): AnticipoPendientePE[] {
        return this._anticiposPendientes();
    }

    /**
     * Verifica si hay una factura cargada
     */
    tieneFacturaCargada(): boolean {
        return this._facturaActiva() !== null;
    }

    /**
     * Obtiene el total actual de liquidación
     */
    obtenerTotalActual(): number {
        return this.resumenLiquidacion().total_liquidado;
    }
}