// services/liquidaciones-pe.api.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';
import {
    BuscarFacturaResponse,
    DetalleLiquidacionApi,
    FacturaApi,
    GenericApiResponse,
} from '../models/liquidaciones-pe.models';

@Injectable({ providedIn: 'root' })
export class LiquidacionesPEApi {
    constructor(private http: ServicioGeneralService) { }

    /** Busca factura por número DTE */
    buscarPorNumeroDte(texto: string): Observable<BuscarFacturaResponse> {
        return this.http.query({
            ruta: 'facturas/buscarPorNumeroDte',
            tipo: 'post',
            body: { texto }
        });
    }

    /** Obtiene detalles de liquidación por factura */
    obtenerDetallesLiquidacion(facturaId: number): Observable<GenericApiResponse<DetalleLiquidacionApi[]>> {
        return this.http.query({
            ruta: 'facturas/obtenerDetallesLiquidacion',
            tipo: 'post',
            body: { facturaId }
        });
    }

    /** Guarda (crear/actualizar) un detalle de liquidación */
    guardarDetalle(detalle: any): Observable<GenericApiResponse> {
        // Ajusta la ruta a la que realmente uses para crear/actualizar
        return this.http.query({
            ruta: 'facturas/liquidacion/guardarDetalle',
            tipo: 'post',
            body: detalle
        });
    }

    /** Elimina un detalle de liquidación */
    eliminarDetalle(detalleId: number): Observable<GenericApiResponse> {
        return this.http.query({
            ruta: 'facturas/liquidacion/eliminarDetalle',
            tipo: 'post',
            body: { id: detalleId }
        });
    }

    /** Catálogo de agencias (si lo tienes) */
    obtenerAgencias(): Observable<GenericApiResponse<{ id: number; nombre: string }[]>> {
        // Ajusta la ruta si tu backend es distinto:
        return this.http.query({
            ruta: 'facturas/buscarNombreLiquidacion',
            tipo: 'get'
        });
    }

    /** Órdenes autorizadas (para relacionar con número_orden si lo usas) */
    obtenerOrdenesAutorizadas(): Observable<GenericApiResponse<any[]>> {
        return this.http.query({
            ruta: 'contabilidad/obtenerOrdenesAutorizadas',
            tipo: 'get'
        });
    }
}