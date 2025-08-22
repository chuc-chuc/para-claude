// services/facturas-pe.facade.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, map, of, tap } from 'rxjs';
import { FacturasPEApi } from './facturas-pe.api';
import { FacturaPE, RegistrarFacturaPayload, SolicitarAutorizacionPayload } from '../models/facturas-pe.models';
import { mapFacturaApi } from './facturas-pe.mapper';
import Swal from 'sweetalert2';
import { ServicioGeneralService } from '../../../servicios/servicio-general.service';

@Injectable({ providedIn: 'root' })
export class FacturasPEFacade {
    private facturaSub = new BehaviorSubject<FacturaPE | null>(null);
    private loadingSub = new BehaviorSubject<boolean>(false);
    private errorSub = new BehaviorSubject<string | null>(null);

    factura$ = this.facturaSub.asObservable();
    loading$ = this.loadingSub.asObservable();
    error$ = this.errorSub.asObservable();

    constructor(private api: FacturasPEApi, private feedback: ServicioGeneralService) { }

    buscarPorDte(numero: string) {
        if (!numero || !numero.trim()) {
            this.facturaSub.next(null);
            this.errorSub.next(null);
            return;
        }

        this.loadingSub.next(true);
        this.errorSub.next(null);

        this.api.buscarPorNumeroDte(numero.trim())
            .pipe(
                map((res) => {
                    if (res.respuesta === 'success' && Array.isArray(res.datos) && res.datos.length) {
                        return mapFacturaApi(res.datos[0], 'GTQ');
                    }
                    throw new Error(res.mensaje || 'Factura no encontrada');
                }),
                tap((f) => {
                    // Factura encontrada exitosamente
                    this.errorSub.next(null);
                    return f;
                }),
                catchError((err) => {
                    this.errorSub.next(err.message || 'Error al buscar factura');
                    this.feedback.mensajeServidor('info', err.message || 'Factura no encontrada', 'Información');
                    return of(null);
                }),
                finalize(() => this.loadingSub.next(false))
            )
            .subscribe((fact) => this.facturaSub.next(fact));
    }

    registrarFactura(payload: RegistrarFacturaPayload, onOk?: () => void) {
        this.loadingSub.next(true);
        this.errorSub.next(null);

        this.api.registrarFactura(payload).pipe(
            finalize(() => this.loadingSub.next(false)),
            catchError((e) => {
                const errorMsg = e?.error?.mensaje || e?.message || 'Error al registrar la factura';
                this.feedback.mensajeServidor('error', errorMsg);
                this.errorSub.next(errorMsg);
                return of({ respuesta: 'error', mensaje: errorMsg });
            })
        ).subscribe((res) => {
            if (res.respuesta === 'success') {
                this.feedback.mensajeServidor('success', 'Factura registrada correctamente');
                this.errorSub.next(null);

                // Ejecutar callback si existe
                if (onOk) onOk();

                // Buscar automáticamente la factura recién registrada
                setTimeout(() => {
                    this.buscarPorDte(payload.numero_dte);
                }, 500);
            } else {
                const errorMsg = res.mensaje || 'No se pudo registrar la factura';
                this.feedback.mensajeServidor(res.respuesta || 'error', errorMsg);
                this.errorSub.next(errorMsg);
            }
        });
    }

    solicitarAutorizacion(payload: SolicitarAutorizacionPayload, onOk?: () => void) {
        this.loadingSub.next(true);
        this.errorSub.next(null);

        this.api.solicitarAutorizacion(payload).pipe(
            finalize(() => this.loadingSub.next(false)),
            catchError((e) => {
                const errorMsg = e?.error?.mensaje || e?.message || 'Error al enviar la solicitud';
                Swal.fire('Error', errorMsg, 'error');
                this.errorSub.next(errorMsg);
                return of({ respuesta: 'error', mensaje: errorMsg });
            })
        ).subscribe((r) => {
            if (r.respuesta === 'success') {
                Swal.fire('Solicitud enviada', 'Se envió la solicitud de autorización', 'success').then(() => {
                    this.errorSub.next(null);
                    if (onOk) onOk();

                    // Refrescar factura por número DTE
                    setTimeout(() => {
                        this.buscarPorDte(payload.numero_dte);
                    }, 500);
                });
            } else {
                const errorMsg = r.mensaje || 'No se pudo enviar la solicitud';
                Swal.fire('Error', errorMsg, 'error');
                this.errorSub.next(errorMsg);
            }
        });
    }

    /**
     * Limpia el estado actual de la factura
     */
    limpiarFactura() {
        this.facturaSub.next(null);
        this.errorSub.next(null);
    }

    /**
     * Obtiene la factura actual sin suscripción
     */
    getFacturaActual(): FacturaPE | null {
        return this.facturaSub.value;
    }

    /**
     * Verifica si hay una factura cargada
     */
    tieneFactura(): boolean {
        return this.facturaSub.value !== null;
    }
    }