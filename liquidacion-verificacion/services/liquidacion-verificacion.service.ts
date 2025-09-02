// ============================================================================
// SERVICIO SIMPLIFICADO - LIQUIDACIÓN Y VERIFICACIÓN
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

import {
    LiquidacionCompleta,
    TipoRetencion,
    VerificarDetallePayload,
    CrearRetencionPayload,
    ActualizarRetencionPayload,
    ApiResponse
} from '../models/liquidacion-verificacion.models';

@Injectable({
    providedIn: 'root'
})
export class LiquidacionVerificacionService {

    private readonly api = inject(ServicioGeneralService);

    // Estado del servicio
    private readonly _liquidacionActual$ = new BehaviorSubject<LiquidacionCompleta | null>(null);
    private readonly _tiposRetencion$ = new BehaviorSubject<TipoRetencion[]>([]);
    private readonly _loading$ = new BehaviorSubject<boolean>(false);

    // Observables públicos
    readonly liquidacionActual$ = this._liquidacionActual$.asObservable();
    readonly tiposRetencion$ = this._tiposRetencion$.asObservable();
    readonly loading$ = this._loading$.asObservable();

    constructor() {
        this.cargarTiposRetencion();
    }

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Buscar liquidación por número de factura
     */
    buscarLiquidacion(numeroFactura: string): Observable<LiquidacionCompleta | null> {
        if (!numeroFactura?.trim()) {
            this._liquidacionActual$.next(null);
            return of(null);
        }

        this._loading$.next(true);

        return this.api.query({
            ruta: 'contabilidad/obtenerLiquidacionCompleta',
            tipo: 'post',
            body: { numero_factura: numeroFactura.trim() }
        }).pipe(
            map((response: ApiResponse<LiquidacionCompleta>) => {
                if (response.respuesta === 'success' && response.datos) {
                    // Calcular totales
                    const liquidacion = this.calcularTotales(response.datos);
                    this._liquidacionActual$.next(liquidacion);
                    return liquidacion;
                } else {
                    throw new Error('Factura no encontrada');
                }
            }),
            catchError(() => {
                this._liquidacionActual$.next(null);
                this.api.mensajeServidor('info', 'Factura no encontrada', 'Información');
                return of(null);
            })
        ).pipe(
            // Siempre apagar loading
            map(result => {
                this._loading$.next(false);
                return result;
            })
        );
    }

    /**
     * Verificar detalle de liquidación
     */
    verificarDetalle(payload: VerificarDetallePayload): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/verificarDetalleLiquidacion',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarDetalleLocal(payload);
                    this.api.mensajeServidor('success', 'Detalle verificado correctamente');
                    return true;
                } else {
                    throw new Error('Error al verificar detalle');
                }
            }),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al verificar detalle');
                return of(false);
            })
        );
    }

    /**
     * Crear retención
     */
    crearRetencion(payload: CrearRetencionPayload): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/crearRetencion',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    // Recargar liquidación
                    this.buscarLiquidacion(payload.numero_factura).subscribe();
                    this.api.mensajeServidor('success', 'Retención creada correctamente');
                    return true;
                } else {
                    throw new Error('Error al crear retención');
                }
            }),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al crear retención');
                return of(false);
            })
        );
    }

    /**
     * Actualizar retención
     */
    actualizarRetencion(payload: ActualizarRetencionPayload): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/actualizarRetencion',
            tipo: 'post',
            body: payload
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.actualizarRetencionLocal(payload);
                    this.api.mensajeServidor('success', 'Retención actualizada correctamente');
                    return true;
                } else {
                    throw new Error('Error al actualizar retención');
                }
            }),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al actualizar retención');
                return of(false);
            })
        );
    }

    /**
     * Eliminar retención
     */
    eliminarRetencion(id: number): Observable<boolean> {
        return this.api.query({
            ruta: 'contabilidad/eliminarRetencion',
            tipo: 'post',
            body: { id }
        }).pipe(
            map((response: ApiResponse) => {
                if (response.respuesta === 'success') {
                    this.removerRetencionLocal(id);
                    this.api.mensajeServidor('success', 'Retención eliminada correctamente');
                    return true;
                } else {
                    throw new Error('Error al eliminar retención');
                }
            }),
            catchError(() => {
                this.api.mensajeServidor('error', 'Error al eliminar retención');
                return of(false);
            })
        );
    }

    // ============================================================================
    // MÉTODOS PRIVADOS
    // ============================================================================

    private cargarTiposRetencion(): void {
        this.api.query({
            ruta: 'contabilidad/obtenerTiposRetencion',
            tipo: 'get'
        }).pipe(
            map((response: ApiResponse<TipoRetencion[]>) => {
                return response.respuesta === 'success' && response.datos ? response.datos : [];
            }),
            catchError(() => of([]))
        ).subscribe(tipos => {
            this._tiposRetencion$.next(tipos);
        });
    }

    private calcularTotales(liquidacion: any): LiquidacionCompleta {
        const totalDetalles = liquidacion.detalles?.reduce((sum: number, d: any) => sum + d.monto, 0) || 0;
        const totalRetenciones = liquidacion.retenciones?.reduce((sum: number, r: any) => sum + r.monto, 0) || 0;

        const verificados = liquidacion.detalles?.filter((d: any) => d.estado_verificacion === 'verificado').length || 0;
        const pendientes = liquidacion.detalles?.filter((d: any) => d.estado_verificacion === 'pendiente').length || 0;
        const total = liquidacion.detalles?.length || 0;

        return {
            ...liquidacion,
            total_detalles: totalDetalles,
            total_retenciones: totalRetenciones,
            monto_neto: totalDetalles - totalRetenciones,
            total_verificados: verificados,
            total_pendientes: pendientes,
            porcentaje_completado: total > 0 ? Math.round((verificados / total) * 100) : 0
        };
    }

    private actualizarDetalleLocal(payload: VerificarDetallePayload): void {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) return;

        const detalle = liquidacion.detalles.find(d => d.id === payload.id);
        if (detalle) {
            Object.assign(detalle, payload);
            detalle.verificado_por = 'Usuario actual'; // TODO: obtener del contexto

            // Recalcular estadísticas
            const liquidacionActualizada = this.calcularTotales(liquidacion);
            this._liquidacionActual$.next(liquidacionActualizada);
        }
    }

    private actualizarRetencionLocal(payload: ActualizarRetencionPayload): void {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) return;

        const retencion = liquidacion.retenciones.find(r => r.id === payload.id);
        if (retencion) {
            Object.assign(retencion, payload);

            // Recalcular totales
            const liquidacionActualizada = this.calcularTotales(liquidacion);
            this._liquidacionActual$.next(liquidacionActualizada);
        }
    }

    private removerRetencionLocal(id: number): void {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) return;

        liquidacion.retenciones = liquidacion.retenciones.filter(r => r.id !== id);

        // Recalcular totales
        const liquidacionActualizada = this.calcularTotales(liquidacion);
        this._liquidacionActual$.next(liquidacionActualizada);
    }

    // ============================================================================
    // MÉTODOS DE UTILIDAD
    // ============================================================================

    limpiarLiquidacion(): void {
        this._liquidacionActual$.next(null);
    }

    obtenerLiquidacionActual(): LiquidacionCompleta | null {
        return this._liquidacionActual$.value;
    }

    validarMontoRetencion(monto: number): { valido: boolean; mensaje?: string } {
        const liquidacion = this._liquidacionActual$.value;
        if (!liquidacion) {
            return { valido: false, mensaje: 'No hay liquidación cargada' };
        }

        const totalRetenciones = liquidacion.total_retenciones;
        const montoFactura = liquidacion.factura.monto_total;

        if (totalRetenciones + monto > montoFactura) {
            const disponible = montoFactura - totalRetenciones;
            return {
                valido: false,
                mensaje: `Monto excede el disponible: Q${disponible.toFixed(2)}`
            };
        }

        return { valido: true };
    }
}