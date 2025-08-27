// ============================================================================
// SERVICIO - LIQUIDACIÓN Y VERIFICACIÓN CON RETENCIONES
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, of, finalize } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

// Importar modelos
import {
    LiquidacionCompleta,
    DetalleLiquidacionVerificacion,
    RetencionFactura,
    TipoRetencion,
    VerificarDetallePayload,
    CrearRetencionPayload,
    ActualizarRetencionPayload,
    BuscarLiquidacionPayload,
    ResumenLiquidacionesPayload,
    LiquidacionCompletaResponse,
    TiposRetencionResponse,
    CrearRetencionResponse,
    ResumenLiquidacionesResponse,
    ApiResponse,
    EstadisticasVerificacion,
    TotalesLiquidacion,
    LIQUIDACION_VERIFICACION_ENDPOINTS
} from '../models/liquidacion-verificacion.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionVerificacionService {

    private readonly api = inject(ServicioGeneralService);

    // ============================================================================
    // ESTADO DEL SERVICIO
    // ============================================================================

    private readonly _liquidacionActual$ = new BehaviorSubject<LiquidacionCompleta | null>(null);
    private readonly _tiposRetencion$ = new BehaviorSubject<TipoRetencion[]>([]);
    private readonly _loading$ = new BehaviorSubject<boolean>(false);
    private readonly _loadingRetenciones$ = new BehaviorSubject<boolean>(false);

    // Streams públicos
    readonly liquidacionActual$ = this._liquidacionActual$.asObservable();
    readonly tiposRetencion$ = this._tiposRetencion$.asObservable();
    readonly loading$ = this._loading$.asObservable();
    readonly loadingRetenciones$ = this._loadingRetenciones$.asObservable();

    // Cache
    private ultimaFacturaBuscada = '';
    private cacheTimeout = 5 * 60 * 1000; // 5 minutos
    private ultimaActualizacionCache = 0;

    constructor() {
        this.cargarTiposRetencion();
    }

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Busca y obtiene la liquidación completa de una factura
     */
    buscarLiquidacion(numeroFactura: string): Observable<LiquidacionCompleta | null> {
        const numeroNormalizado = numeroFactura?.trim();

        if (!numeroNormalizado) {
            this.limpiarLiquidacion();
            return of(null);
        }

        // Verificar cache
        if (this.esValidoCache(numeroNormalizado)) {
            return this.liquidacionActual$;
        }

        this._loading$.next(true);

        const payload: BuscarLiquidacionPayload = {
            numero_factura: numeroNormalizado
        };

        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.OBTENER_LIQUIDACION_COMPLETA,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: LiquidacionCompletaResponse) => {
                if (response.respuesta === 'success' && response.datos) {
                    const liquidacion = response.datos;
                    this._liquidacionActual$.next(liquidacion);
                    this.actualizarCache(numeroNormalizado);
                    return liquidacion;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Factura no encontrada');
                }
            }),
            catchError((error) => {
                this.limpiarLiquidacion();
                this.api.mensajeServidor('info', error.message || 'Factura no encontrada', 'Información');
                return of(null);
            }),
            finalize(() => this._loading$.next(false)),
            tap((liquidacion) => {
                if (liquidacion) {
                    this.api.mensajeServidor('success', 'Liquidación cargada correctamente', 'Éxito');
                }
            })
        );
    }

    /**
     * Verifica un detalle de liquidación
     */
    verificarDetalle(payload: VerificarDetallePayload): Observable<boolean> {
        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.VERIFICAR_DETALLE,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarDetalleEnCache(payload.id, {
                        comprobante_contabilidad: payload.comprobante_contabilidad,
                        fecha_registro_contabilidad: payload.fecha_registro_contabilidad || null,
                        numero_acta: payload.numero_acta || null,
                        estado_verificacion: payload.estado_verificacion || 'verificado',
                        fecha_verificacion: new Date().toISOString(),
                        verificado_por: 'Usuario actual' // TODO: obtener del contexto
                    });

                    this.api.mensajeServidor('success', 'Detalle verificado correctamente', 'Éxito');
                    return true;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Error al verificar detalle');
                }
            }),
            catchError((error) => {
                this.api.mensajeServidor('error', error.message || 'Error al verificar detalle', 'Error');
                return of(false);
            })
        );
    }

    /**
     * Crea una nueva retención
     */
    crearRetencion(payload: CrearRetencionPayload): Observable<boolean> {
        this._loadingRetenciones$.next(true);

        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.CREAR_RETENCION,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: CrearRetencionResponse) => {
                if (response.respuesta === 'success') {
                    // Recargar liquidación para obtener la retención creada
                    this.recargarLiquidacionActual();
                    this.api.mensajeServidor('success', 'Retención creada correctamente', 'Éxito');
                    return true;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Error al crear retención');
                }
            }),
            catchError((error) => {
                this.api.mensajeServidor('error', error.message || 'Error al crear retención', 'Error');
                return of(false);
            }),
            finalize(() => this._loadingRetenciones$.next(false))
        );
    }

    /**
     * Actualiza una retención existente
     */
    actualizarRetencion(payload: ActualizarRetencionPayload): Observable<boolean> {
        this._loadingRetenciones$.next(true);

        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.ACTUALIZAR_RETENCION,
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    // Actualizar retención en cache
                    this.actualizarRetencionEnCache(payload.id, payload);
                    this.api.mensajeServidor('success', 'Retención actualizada correctamente', 'Éxito');
                    return true;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Error al actualizar retención');
                }
            }),
            catchError((error) => {
                this.api.mensajeServidor('error', error.message || 'Error al actualizar retención', 'Error');
                return of(false);
            }),
            finalize(() => this._loadingRetenciones$.next(false))
        );
    }

    /**
     * Elimina una retención
     */
    eliminarRetencion(id: number): Observable<boolean> {
        this._loadingRetenciones$.next(true);

        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.ELIMINAR_RETENCION,
            tipo: 'post',
            body: { id }
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    // Remover retención del cache
                    this.removerRetencionDelCache(id);
                    this.api.mensajeServidor('success', 'Retención eliminada correctamente', 'Éxito');
                    return true;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Error al eliminar retención');
                }
            }),
            catchError((error) => {
                this.api.mensajeServidor('error', error.message || 'Error al eliminar retención', 'Error');
                return of(false);
            }),
            finalize(() => this._loadingRetenciones$.next(false))
        );
    }

    /**
     * Obtiene el resumen de liquidaciones por fechas
     */
    obtenerResumenLiquidaciones(payload?: ResumenLiquidacionesPayload): Observable<any> {
        return this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.OBTENER_RESUMEN_LIQUIDACIONES,
            tipo: 'post',
            body: payload || {}
        }).pipe(
            map((response: ResumenLiquidacionesResponse) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos;
                } else {
                    throw new Error(this.extraerMensaje(response.mensaje) || 'Error al obtener resumen');
                }
            }),
            catchError((error) => {
                this.api.mensajeServidor('error', error.message || 'Error al obtener resumen', 'Error');
                return of(null);
            })
        );
    }

    // ============================================================================
    // GESTIÓN DE CATÁLOGOS
    // ============================================================================

    /**
     * Carga los tipos de retención
     */
    private cargarTiposRetencion(): void {
        this.api.query({
            ruta: LIQUIDACION_VERIFICACION_ENDPOINTS.OBTENER_TIPOS_RETENCION,
            tipo: 'get'
        }).pipe(
            map((response: TiposRetencionResponse) => {
                if (response.respuesta === 'success' && response.datos) {
                    return response.datos;
                }
                return [];
            }),
            catchError(() => of([]))
        ).subscribe(tipos => {
            this._tiposRetencion$.next(tipos);
        });
    }

    /**
     * Recarga los tipos de retención
     */
    recargarTiposRetencion(): void {
        this.cargarTiposRetencion();
    }

    // ============================================================================
    // UTILIDADES DE CACHE
    // ============================================================================

    private esValidoCache(numeroFactura: string): boolean {
        const tiempoActual = Date.now();
        const cacheValido = (tiempoActual - this.ultimaActualizacionCache) < this.cacheTimeout;
        const facturaCoincide = this.ultimaFacturaBuscada === numeroFactura;
        const tieneDatos = this._liquidacionActual$.value !== null;

        return cacheValido && facturaCoincide && tieneDatos;
    }

    private actualizarCache(numeroFactura: string): void {
        this.ultimaFacturaBuscada = numeroFactura;
        this.ultimaActualizacionCache = Date.now();
    }

    private limpiarCache(): void {
        this.ultimaFacturaBuscada = '';
        this.ultimaActualizacionCache = 0;
    }

    // ============================================================================
    // ACTUALIZACIÓN DE CACHE LOCAL
    // ============================================================================

    private actualizarDetalleEnCache(
        detalleId: number,
        campos: Partial<DetalleLiquidacionVerificacion>
    ): void {
        const liquidacionActual = this._liquidacionActual$.value;
        if (!liquidacionActual) return;

        const detalleIndex = liquidacionActual.detalles.findIndex(d => d.id === detalleId);
        if (detalleIndex === -1) return;

        // Actualizar detalle
        liquidacionActual.detalles[detalleIndex] = {
            ...liquidacionActual.detalles[detalleIndex],
            ...campos,
            fecha_actualizacion: new Date().toISOString()
        };

        // Recalcular estadísticas
        liquidacionActual.estadisticas_verificacion = this.calcularEstadisticas(
            liquidacionActual.detalles
        );

        this._liquidacionActual$.next({ ...liquidacionActual });
    }

    private actualizarRetencionEnCache(
        retencionId: number,
        campos: Partial<ActualizarRetencionPayload>
    ): void {
        const liquidacionActual = this._liquidacionActual$.value;
        if (!liquidacionActual) return;

        const retencionIndex = liquidacionActual.retenciones.findIndex(r => r.id === retencionId);
        if (retencionIndex === -1) return;

        // Actualizar retención
        liquidacionActual.retenciones[retencionIndex] = {
            ...liquidacionActual.retenciones[retencionIndex],
            ...campos,
            fecha_actualizacion: new Date().toISOString()
        } as RetencionFactura;

        // Recalcular totales
        this.recalcularTotales(liquidacionActual);
        this._liquidacionActual$.next({ ...liquidacionActual });
    }

    private removerRetencionDelCache(retencionId: number): void {
        const liquidacionActual = this._liquidacionActual$.value;
        if (!liquidacionActual) return;

        liquidacionActual.retenciones = liquidacionActual.retenciones.filter(r => r.id !== retencionId);

        // Recalcular totales
        this.recalcularTotales(liquidacionActual);
        this._liquidacionActual$.next({ ...liquidacionActual });
    }

    private recalcularTotales(liquidacion: LiquidacionCompleta): void {
        const totalDetalles = liquidacion.detalles.reduce((sum, d) => sum + d.monto, 0);
        const totalRetenciones = liquidacion.retenciones.reduce((sum, r) => sum + r.monto, 0);

        liquidacion.totales = {
            total_detalles: totalDetalles,
            total_retenciones: totalRetenciones,
            monto_neto: totalDetalles - totalRetenciones,
            cantidad_detalles: liquidacion.detalles.length,
            cantidad_retenciones: liquidacion.retenciones.length
        };
    }

    private calcularEstadisticas(detalles: DetalleLiquidacionVerificacion[]): EstadisticasVerificacion {
        const total = detalles.length;
        const verificados = detalles.filter(d => d.estado_verificacion === 'verificado').length;
        const pendientes = detalles.filter(d => d.estado_verificacion === 'pendiente').length;
        const rechazados = detalles.filter(d => d.estado_verificacion === 'rechazado').length;

        return {
            total,
            verificados,
            pendientes,
            rechazados,
            porcentaje_verificados: total > 0 ? Math.round((verificados / total) * 100 * 100) / 100 : 0,
            porcentaje_pendientes: total > 0 ? Math.round((pendientes / total) * 100 * 100) / 100 : 0
        };
    }

    // ============================================================================
    // MÉTODOS DE CONVENIENCIA
    // ============================================================================

    /**
     * Recarga la liquidación actual
     */
    private recargarLiquidacionActual(): void {
        if (this.ultimaFacturaBuscada) {
            this.limpiarCache();
            this.buscarLiquidacion(this.ultimaFacturaBuscada).subscribe();
        }
    }

    /**
     * Limpia la liquidación actual
     */
    limpiarLiquidacion(): void {
        this._liquidacionActual$.next(null);
        this.limpiarCache();
    }

    /**
     * Obtiene la liquidación actual sin Observable
     */
    obtenerLiquidacionActual(): LiquidacionCompleta | null {
        return this._liquidacionActual$.value;
    }

    /**
     * Obtiene los tipos de retención sin Observable
     */
    obtenerTiposRetencion(): TipoRetencion[] {
        return this._tiposRetencion$.value;
    }

    /**
     * Verifica si hay una liquidación cargada
     */
    tieneLiquidacionCargada(): boolean {
        return this._liquidacionActual$.value !== null;
    }

    /**
     * Obtiene el monto disponible para retenciones
     */
    obtenerMontoDisponibleRetenciones(): number {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) return 0;

        const montoFactura = liquidacion.factura.monto_total;
        const totalRetenciones = liquidacion.totales.total_retenciones;

        return Math.max(0, montoFactura - totalRetenciones);
    }

    /**
     * Valida si se puede agregar una retención con el monto especificado
     */
    validarMontoRetencion(monto: number, retencionExcluirId?: number): { valido: boolean; mensaje?: string } {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) {
            return { valido: false, mensaje: 'No hay liquidación cargada' };
        }

        if (!monto || monto <= 0) {
            return { valido: false, mensaje: 'El monto debe ser mayor a cero' };
        }

        // Calcular total actual excluyendo la retención si se especifica
        let totalRetenciones = liquidacion.retenciones
            .filter(r => r.id !== retencionExcluirId)
            .reduce((sum, r) => sum + r.monto, 0);

        const nuevoTotal = totalRetenciones + monto;
        const montoFactura = liquidacion.factura.monto_total;

        if (nuevoTotal > montoFactura) {
            const disponible = montoFactura - totalRetenciones;
            return {
                valido: false,
                mensaje: `El monto excede el valor de la factura. Disponible: Q${disponible.toFixed(2)}`
            };
        }

        return { valido: true };
    }

    /**
     * Obtiene estadísticas resumidas
     */
    obtenerEstadisticasResumidas(): {
        totalFacturas: number;
        progresoVerificacion: number;
        montoTotal: number;
        montoNeto: number;
    } {
        const liquidacion = this._liquidacionActual$.value;

        if (!liquidacion) {
            return {
                totalFacturas: 0,
                progresoVerificacion: 0,
                montoTotal: 0,
                montoNeto: 0
            };
        }

        return {
            totalFacturas: 1,
            progresoVerificacion: liquidacion.estadisticas_verificacion.porcentaje_verificados,
            montoTotal: liquidacion.totales.total_detalles,
            montoNeto: liquidacion.totales.monto_neto
        };
    }

    // ============================================================================
    // UTILIDADES PRIVADAS
    // ============================================================================

    private extraerMensaje(mensaje: string | string[] | undefined): string {
        if (!mensaje) return '';
        if (Array.isArray(mensaje)) return mensaje.join(', ');
        return mensaje;
    }

    /**
     * Formatea montos para mostrar
     */
    formatearMonto(monto: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(monto);
    }

    /**
     * Formatea fechas para mostrar
     */
    formatearFecha(fecha: string | null): string {
        if (!fecha) return '-';

        try {
            return new Date(fecha).toLocaleDateString('es-GT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    // ============================================================================
    // GESTIÓN DE ERRORES Y LOGGING
    // ============================================================================

    private manejarError(error: any, contexto: string): Observable<any> {
        console.error(`Error en ${contexto}:`, error);

        let mensaje = 'Error inesperado';
        if (error?.message) {
            mensaje = error.message;
        } else if (error?.error?.mensaje) {
            mensaje = this.extraerMensaje(error.error.mensaje);
        }

        this.api.mensajeServidor('error', mensaje, 'Error');
        return of(null);
    }

    // ============================================================================
    // VALIDACIONES ESPECÍFICAS DEL NEGOCIO
    // ============================================================================

    /**
     * Valida los datos de verificación de un detalle
     */
    validarDatosVerificacion(datos: Partial<VerificarDetallePayload>): { valido: boolean; errores: string[] } {
        const errores: string[] = [];

        if (!datos.comprobante_contabilidad?.trim()) {
            errores.push('El número de comprobante es obligatorio');
        } else if (datos.comprobante_contabilidad.length < 3) {
            errores.push('El número de comprobante debe tener al menos 3 caracteres');
        }

        if (datos.fecha_registro_contabilidad) {
            const fecha = new Date(datos.fecha_registro_contabilidad);
            if (isNaN(fecha.getTime())) {
                errores.push('La fecha de registro no tiene un formato válido');
            } else if (fecha > new Date()) {
                errores.push('La fecha de registro no puede ser futura');
            }
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    /**
     * Valida los datos de una retención
     */
    validarDatosRetencion(datos: Partial<CrearRetencionPayload>): { valido: boolean; errores: string[] } {
        const errores: string[] = [];

        if (!datos.tipo_retencion_id || datos.tipo_retencion_id <= 0) {
            errores.push('Debe seleccionar un tipo de retención');
        }

        if (!datos.numero_retencion?.trim()) {
            errores.push('El número de retención es obligatorio');
        } else if (datos.numero_retencion.length < 3) {
            errores.push('El número de retención debe tener al menos 3 caracteres');
        }

        if (!datos.monto || datos.monto <= 0) {
            errores.push('El monto debe ser mayor a cero');
        } else {
            const validacionMonto = this.validarMontoRetencion(datos.monto);
            if (!validacionMonto.valido) {
                errores.push(validacionMonto.mensaje || 'Monto inválido');
            }
        }

        if (datos.fecha_retencion) {
            const fecha = new Date(datos.fecha_retencion);
            if (isNaN(fecha.getTime())) {
                errores.push('La fecha de retención no tiene un formato válido');
            }
        } else {
            errores.push('La fecha de retención es obligatoria');
        }

        if (datos.porcentaje && (datos.porcentaje < 0 || datos.porcentaje > 100)) {
            errores.push('El porcentaje debe estar entre 0 y 100');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    // ============================================================================
    // EXPORTACIÓN Y REPORTES
    // ============================================================================

    /**
     * Exporta los datos de liquidación a CSV
     */
    exportarLiquidacionCSV(): void {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) {
            this.api.mensajeServidor('warning', 'No hay datos para exportar', 'Advertencia');
            return;
        }

        try {
            const csvContent = this.generarCSVLiquidacion(liquidacion);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const fileName = `liquidacion_${liquidacion.factura.numero_dte}_${new Date().toISOString().split('T')[0]}.csv`;

            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.api.mensajeServidor('success', 'Liquidación exportada correctamente', 'Éxito');
        } catch (error) {
            this.api.mensajeServidor('error', 'Error al exportar liquidación', 'Error');
        }
    }

    private generarCSVLiquidacion(liquidacion: LiquidacionCompleta): string {
        const headers = [
            'Tipo',
            'ID',
            'Descripción',
            'Monto',
            'Estado',
            'Fecha Creación',
            'Comprobante',
            'Fecha Registro'
        ];

        let csvContent = headers.join(',') + '\n';

        // Agregar detalles
        liquidacion.detalles.forEach(detalle => {
            const fila = [
                'Detalle',
                detalle.id.toString(),
                `"${detalle.descripcion}"`,
                detalle.monto.toString(),
                detalle.estado_verificacion,
                detalle.fecha_creacion,
                detalle.comprobante_contabilidad || '-',
                detalle.fecha_registro_contabilidad || '-'
            ];
            csvContent += fila.join(',') + '\n';
        });

        // Agregar retenciones
        liquidacion.retenciones.forEach(retencion => {
            const fila = [
                'Retención',
                retencion.id.toString(),
                `"${retencion.tipo_nombre} - ${retencion.numero_retencion}"`,
                retencion.monto.toString(),
                'Aplicada',
                retencion.fecha_creacion,
                retencion.documento_soporte || '-',
                retencion.fecha_retencion
            ];
            csvContent += fila.join(',') + '\n';
        });

        return csvContent;
    }

    // ============================================================================
    // CLEANUP Y DESTRUCCIÓN
    // ============================================================================

    /**
     * Limpia todos los datos y subscripciones
     */
    limpiarTodo(): void {
        this._liquidacionActual$.next(null);
        this.limpiarCache();
    }

    /**
     * Destruye el servicio y limpia recursos
     */
    destruir(): void {
        this.limpiarTodo();
        // Los BehaviorSubjects se completarán automáticamente cuando Angular destruya el servicio
    }
}