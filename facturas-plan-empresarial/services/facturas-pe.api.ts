// services/facturas-pe.api.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';
import {
    BuscarFacturaResponse,
    RegistrarFacturaPayload,
    SolicitarAutorizacionPayload
} from '../models/facturas-pe.models';

@Injectable({ providedIn: 'root' })
export class FacturasPEApi {
    constructor(private api: ServicioGeneralService) { }

    buscarPorNumeroDte(texto: string): Observable<BuscarFacturaResponse> {
        return this.api.query({
            ruta: 'facturas/buscarPorNumeroDte',
            tipo: 'post',
            body: { texto }
        });
    }

    registrarFactura(payload: RegistrarFacturaPayload): Observable<any> {
        return this.api.query({
            ruta: 'facturas/registro/facturaManual',
            tipo: 'post',
            body: payload
        });
    }

    solicitarAutorizacion(payload: SolicitarAutorizacionPayload): Observable<any> {
        // Usa tu endpoint real
        return this.api.query({
            ruta: 'facturas/solicitarAutorizacionTardanza',
            tipo: 'post',
            body: payload
        });
    }
}