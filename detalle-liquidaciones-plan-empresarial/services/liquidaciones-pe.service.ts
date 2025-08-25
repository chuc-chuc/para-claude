// services/liquidaciones-pe.service.ts
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

export interface DetalleLiquidacion {
    id?: number;
    numero_factura: string;
    numero_orden: string;
    agencia: string;
    descripcion: string;
    monto: number;
    correo_proveedor?: string;
    forma_pago: string;
    banco?: string;
    cuenta?: string;
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    datos_especificos?: any;
}

export interface TipoPago {
    id: string;
    nombre: string;
    requiere_formulario: boolean;
}

export interface Agencia {
    id: number;
    nombre_liquidacion: string;
}

export interface EstadisticasLiquidacion {
    total_detalles: number;
    total_liquidado: number;
    primera_liquidacion?: string;
    ultima_actualizacion?: string;
    tipos_pago_utilizados: number;
    distribucion_por_tipo: Array<{
        forma_pago: string;
        nombre_forma_pago: string;
        cantidad: number;
        monto_total: number;
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class LiquidacionesPEService {

    // Estados reactivos
    private _detalles$ = new BehaviorSubject<DetalleLiquidacion[]>([]);
    private _loading$ = new BehaviorSubject<boolean>(false);
    private _saving$ = new BehaviorSubject<boolean>(false);
    private _tiposPago$ = new BehaviorSubject<TipoPago[]>([]);
    private _agencias$ = new BehaviorSubject<Agencia[]>([]);

    // Observables públicos
    public readonly detalles$ = this._detalles$.asObservable();
    public readonly loading$ = this._loading$.asObservable();
    public readonly saving$ = this._saving$.asObservable();
    public readonly tiposPago$ = this._tiposPago$.asObservable();
    public readonly agencias$ = this._agencias$.asObservable();

    // Total calculado
    public readonly total$ = this.detalles$.pipe(
        map(detalles => detalles.reduce((sum, d) => sum + (d.monto || 0), 0))
    );

    constructor(private http: ServicioGeneralService) {
        this.cargarCatalogos();
    }

    // ============================================
    // MÉTODOS DE CATÁLOGOS
    // ============================================

    /**
     * Carga los catálogos iniciales
     */
    private cargarCatalogos(): void {
        this.cargarTiposPago();
        this.cargarAgencias();
    }

    /**
     * Obtiene los tipos de pago
     */
    cargarTiposPago(): Observable<TipoPago[]> {
        return this.http.query({
            ruta: 'contabilidad/obtenerTiposPago',
            tipo: 'get'
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    this._tiposPago$.next(res.datos || []);
                }
            }),
            map((res: any) => res.datos || []),
            catchError(err => {
                console.error('Error al cargar tipos de pago:', err);
                return of([]);
            })
        );
    }

    /**
     * Obtiene las agencias
     */
    cargarAgencias(): Observable<Agencia[]> {
        return this.http.query({
            ruta: 'contabilidad/buscarNombreLiquidacion',
            tipo: 'get'
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    const agencias = res.datos?.map((a: any) => ({
                        id: a.id,
                        nombre_liquidacion: a.nombre_liquidacion
                    })) || [];
                    this._agencias$.next(agencias);
                }
            }),
            map((res: any) => res.datos || []),
            catchError(err => {
                console.error('Error al cargar agencias:', err);
                return of([]);
            })
        );
    }

    // ============================================
    // MÉTODOS DE DETALLES DE LIQUIDACIÓN
    // ============================================

    /**
     * Obtiene los detalles de liquidación de una factura
     */
    obtenerDetallesLiquidacion(numeroFactura: string): Observable<DetalleLiquidacion[]> {
        this._loading$.next(true);

        return this.http.query({
            ruta: 'contabilidad/obtenerDetallesLiquidacion',
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    const detalles = res.datos?.map(this.mapearDetalleDesdeAPI) || [];
                    this._detalles$.next(detalles);
                } else {
                    this._detalles$.next([]);
                }
                this._loading$.next(false);
            }),
            map((res: any) => res.datos?.map(this.mapearDetalleDesdeAPI) || []),
            catchError(err => {
                console.error('Error al obtener detalles:', err);
                this._loading$.next(false);
                this._detalles$.next([]);
                return of([]);
            })
        );
    }

    /**
     * Guarda un detalle de liquidación (crear o actualizar)
     */
    guardarDetalleLiquidacion(detalle: Partial<DetalleLiquidacion>): Observable<any> {
        this._saving$.next(true);

        return this.http.query({
            ruta: 'contabilidad/guardarDetalleLiquidacion',
            tipo: 'post',
            body: detalle
        }).pipe(
            tap((res: any) => {
                this._saving$.next(false);
                if (res.respuesta === 'success') {
                    // Actualizar la lista local si es necesario
                    this.actualizarDetalleLocal(detalle, res.datos?.id);
                }
            }),
            catchError(err => {
                console.error('Error al guardar detalle:', err);
                this._saving$.next(false);
                throw err;
            })
        );
    }

    /**
     * Actualiza solo monto y/o agencia de un detalle
     */
    actualizarMontoAgencia(id: number, monto?: number, agencia?: string): Observable<any> {
        const body: any = { id };
        if (monto !== undefined) body.monto = monto;
        if (agencia !== undefined) body.agencia = agencia;

        return this.http.query({
            ruta: 'contabilidad/actualizarMontoAgencia',
            tipo: 'post',
            body
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    // Actualizar el detalle en la lista local
                    const detallesActuales = this._detalles$.value;
                    const index = detallesActuales.findIndex(d => d.id === id);
                    if (index >= 0) {
                        const detalleActualizado = { ...detallesActuales[index] };
                        if (monto !== undefined) detalleActualizado.monto = monto;
                        if (agencia !== undefined) detalleActualizado.agencia = agencia;

                        detallesActuales[index] = detalleActualizado;
                        this._detalles$.next([...detallesActuales]);
                    }
                }
            }),
            catchError(err => {
                console.error('Error al actualizar monto/agencia:', err);
                throw err;
            })
        );
    }

    /**
     * Elimina un detalle de liquidación
     */
    eliminarDetalleLiquidacion(id: number): Observable<any> {
        return this.http.query({
            ruta: 'contabilidad/eliminarDetalleLiquidacion',
            tipo: 'post',
            body: { id }
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    // Remover de la lista local
                    const detallesActuales = this._detalles$.value;
                    const detallesFiltrados = detallesActuales.filter(d => d.id !== id);
                    this._detalles$.next(detallesFiltrados);
                }
            }),
            catchError(err => {
                console.error('Error al eliminar detalle:', err);
                throw err;
            })
        );
    }

    /**
     * Copia un detalle de liquidación
     */
    copiarDetalleLiquidacion(id: number): Observable<any> {
        return this.http.query({
            ruta: 'contabilidad/copiarDetalleLiquidacion',
            tipo: 'post',
            body: { id }
        }).pipe(
            tap((res: any) => {
                if (res.respuesta === 'success') {
                    // Agregar la copia a la lista local
                    const nuevoCopia = this.mapearDetalleDesdeAPI(res.datos);
                    const detallesActuales = this._detalles$.value;
                    this._detalles$.next([...detallesActuales, nuevoCopia]);
                }
            }),
            catchError(err => {
                console.error('Error al copiar detalle:', err);
                throw err;
            })
        );
    }

    // ============================================
    // MÉTODOS DE ESTADÍSTICAS Y TOTALES
    // ============================================

    /**
     * Obtiene el total liquidado de una factura
     */
    obtenerTotalLiquidado(numeroFactura: string): Observable<any> {
        return this.http.query({
            ruta: 'contabilidad/obtenerTotalLiquidado',
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            catchError(err => {
                console.error('Error al obtener total liquidado:', err);
                return of(null);
            })
        );
    }

    /**
     * Obtiene estadísticas de liquidación de una factura
     */
    obtenerEstadisticasLiquidacion(numeroFactura: string): Observable<EstadisticasLiquidacion | null> {
        return this.http.query({
            ruta: 'contabilidad/obtenerEstadisticasLiquidacion',
            tipo: 'post',
            body: { numero_factura: numeroFactura }
        }).pipe(
            map((res: any) => {
                if (res.respuesta === 'success') {
                    return {
                        ...res.datos.estadisticas_generales,
                        distribucion_por_tipo: res.datos.distribucion_por_tipo || []
                    };
                }
                return null;
            }),
            catchError(err => {
                console.error('Error al obtener estadísticas:', err);
                return of(null);
            })
        );
    }

    // ============================================
    // MÉTODOS DE MANIPULACIÓN LOCAL
    // ============================================

    /**
     * Agrega un detalle a la lista local
     */
    agregarDetalleLocal(detalle: Partial<DetalleLiquidacion>): void {
        const detallesActuales = this._detalles$.value;
        const nuevoDetalle: DetalleLiquidacion = {
            id: undefined,
            numero_factura: '',
            numero_orden: '',
            agencia: '',
            descripcion: '',
            monto: 0,
            correo_proveedor: '',
            forma_pago: 'deposito',
            banco: '',
            cuenta: '',
            ...detalle
        };

        this._detalles$.next([...detallesActuales, nuevoDetalle]);
    }

    /**
     * Actualiza un detalle en la lista local
     */
    actualizarDetalleLocal(detalle: Partial<DetalleLiquidacion>, nuevoId?: number): void {
        const detallesActuales = this._detalles$.value;
        let index = -1;

        if (detalle.id) {
            index = detallesActuales.findIndex(d => d.id === detalle.id);
        } else if (nuevoId) {
            // Es un detalle nuevo que acaba de recibir ID del servidor
            index = detallesActuales.findIndex(d => !d.id && d.numero_orden === detalle.numero_orden);
        }

        if (index >= 0) {
            const detalleActualizado = { ...detallesActuales[index], ...detalle };
            if (nuevoId) detalleActualizado.id = nuevoId;

            detallesActuales[index] = detalleActualizado;
            this._detalles$.next([...detallesActuales]);
        }
    }

    /**
     * Elimina un detalle de la lista local
     */
    eliminarDetalleLocal(id: number | undefined, index?: number): void {
        const detallesActuales = this._detalles$.value;
        let indexToRemove = index;

        if (indexToRemove === undefined) {
            indexToRemove = detallesActuales.findIndex(d => d.id === id);
        }

        if (indexToRemove >= 0) {
            detallesActuales.splice(indexToRemove, 1);
            this._detalles$.next([...detallesActuales]);
        }
    }

    /**
     * Copia un detalle en la lista local
     */
    copiarDetalleLocal(index: number): void {
        const detallesActuales = this._detalles$.value;
        if (index < 0 || index >= detallesActuales.length) return;

        const detalleOriginal = detallesActuales[index];
        const copia = {
            ...detalleOriginal,
            id: undefined, // Nuevo registro
            descripcion: `[COPIA] ${detalleOriginal.descripcion}`
        };

        detallesActuales.splice(index + 1, 0, copia);
        this._detalles$.next([...detallesActuales]);
    }

    /**
     * Limpia la lista de detalles
     */
    limpiarDetalles(): void {
        this._detalles$.next([]);
    }

    // ============================================
    // MÉTODOS DE VALIDACIÓN
    // ============================================

    /**
     * Valida que un detalle esté completo
     */
    esDetalleCompleto(detalle: Partial<DetalleLiquidacion>): boolean {
        return !!(
            detalle.numero_orden?.trim() &&
            detalle.agencia?.trim() &&
            detalle.descripcion?.trim() &&
            detalle.monto && detalle.monto > 0 &&
            detalle.forma_pago?.trim()
        );
    }

    /**
     * Valida que el total no exceda el monto de la factura
     */
    validarMontoTotal(montoFactura: number, montoNuevo: number, detalleIdExcluir?: number): { valido: boolean; mensaje?: string } {
        const detallesActuales = this._detalles$.value;

        let totalSinDetalle = 0;
        detallesActuales.forEach(detalle => {
            if (detalle.id !== detalleIdExcluir) {
                totalSinDetalle += detalle.monto || 0;
            }
        });

        const nuevoTotal = totalSinDetalle + montoNuevo;

        if (nuevoTotal > montoFactura) {
            const disponible = montoFactura - totalSinDetalle;
            return {
                valido: false,
                mensaje: `El monto excede lo disponible. Máximo disponible: Q${disponible.toFixed(2)}`
            };
        }

        return { valido: true };
    }

    // ============================================
    // MÉTODOS DE MAPEO DE DATOS
    // ============================================

    /**
     * Mapea un detalle desde la API al formato local
     */
    private mapearDetalleDesdeAPI(apiData: any): DetalleLiquidacion {
        return {
            id: apiData.id,
            numero_factura: apiData.numero_factura || '',
            numero_orden: apiData.numero_orden || '',
            agencia: apiData.agencia || '',
            descripcion: apiData.descripcion || '',
            monto: parseFloat(apiData.monto) || 0,
            correo_proveedor: apiData.correo_proveedor || '',
            forma_pago: apiData.forma_pago || 'deposito',
            banco: apiData.banco || '',
            cuenta: apiData.cuenta || '',
            fecha_creacion: apiData.fecha_creacion,
            fecha_actualizacion: apiData.fecha_actualizacion,
            datos_especificos: apiData.datos_especificos
        };
    }

    /**
     * Mapea un detalle local al formato de API
     */
    private mapearDetalleParaAPI(detalle: Partial<DetalleLiquidacion>): any {
        return {
            id: detalle.id || null,
            numero_factura: detalle.numero_factura,
            numero_orden: detalle.numero_orden,
            agencia: detalle.agencia,
            descripcion: detalle.descripcion,
            monto: detalle.monto,
            correo_proveedor: detalle.correo_proveedor || null,
            forma_pago: detalle.forma_pago,
            banco: detalle.banco || null,
            cuenta: detalle.cuenta || null
        };
    }

    // ============================================
    // GETTERS PARA VALORES ACTUALES
    // ============================================

    /**
     * Obtiene los detalles actuales
     */
    get detallesActuales(): DetalleLiquidacion[] {
        return this._detalles$.value;
    }

    /**
     * Obtiene los tipos de pago actuales
     */
    get tiposPagoActuales(): TipoPago[] {
        return this._tiposPago$.value;
    }

    /**
     * Obtiene las agencias actuales
     */
    get agenciasActuales(): Agencia[] {
        return this._agencias$.value;
    }

    /**
     * Obtiene el total actual
     */
    get totalActual(): number {
        return this._detalles$.value.reduce((sum, d) => sum + (d.monto || 0), 0);
    }

    /**
     * Obtiene el estado de carga
     */
    get estaCargando(): boolean {
        return this._loading$.value;
    }

    /**
     * Obtiene el estado de guardado
     */
    get estaGuardando(): boolean {
        return this._saving$.value;
    }
}