// ============================================================================
// COMPONENTE PRINCIPAL - LIQUIDACIONES DE TESORERÍA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import {
    FacturaTransferenciaTesoreria,
    FormatHelper,
    MENSAJES_TESORERIA
} from '../models/liquidaciones-tesoreria.models';

import { LiquidacionesTesoreriaService } from '../services/liquidaciones-tesoreria.service';
import { ModalVerDetalleTransferenciaComponent } from '../modal-ver-detalle-transferencia/modal-ver-detalle-transferencia.component';

@Component({
    selector: 'app-liquidaciones-tesoreria',
    standalone: true,
    imports: [
        CommonModule,
        ModalVerDetalleTransferenciaComponent
    ],
    templateUrl: './liquidaciones-tesoreria.component.html',
    styleUrls: ['./liquidaciones-tesoreria.component.css']
})
export class LiquidacionesTesoreriaComponent implements OnInit, OnDestroy {

    readonly service = inject(LiquidacionesTesoreriaService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    readonly facturas = signal<FacturaTransferenciaTesoreria[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Estados de modales
    readonly mostrarModalDetalle = signal<boolean>(false);

    // Datos para modales
    readonly facturaSeleccionada = signal<FacturaTransferenciaTesoreria | null>(null);

    // Computed para estadísticas
    readonly estadisticas = computed(() => {
        const facturas = this.facturas();
        const totalFacturas = facturas.length;
        const totalDetalles = facturas.reduce((sum, f) => sum + f.transferencias.length, 0);
        const totalTransferencias = facturas.reduce((sum, f) => sum + f.monto_total_transferencias, 0);
        const totalRetenciones = facturas.reduce((sum, f) => sum + f.monto_total_retenciones, 0);
        const totalPendiente = totalTransferencias - totalRetenciones;

        return {
            totalFacturas,
            totalDetalles,
            totalTransferencias,
            totalRetenciones,
            totalPendiente
        };
    });

    // Helpers para templates
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly truncateText = FormatHelper.truncateText;

    // ============================================================================
    // CICLO DE VIDA
    // ============================================================================

    ngOnInit(): void {
        this.suscribirAServicios();
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private suscribirAServicios(): void {
        this.service.facturas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(facturas => {
                this.facturas.set(facturas);
            });

        this.service.cargando$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => {
                this.cargando.set(cargando);
            });

        this.service.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => {
                this.error.set(error);
            });
    }

    private cargarDatos(): void {
        this.service.cargarTransferencias().subscribe();
    }

    // ============================================================================
    // ACCIONES DE FACTURA
    // ============================================================================

    verDetalleFactura(factura: FacturaTransferenciaTesoreria): void {
        this.facturaSeleccionada.set(factura);
        this.mostrarModalDetalle.set(true);
    }

    solicitarCorreccion(factura: FacturaTransferenciaTesoreria): void {
        Swal.fire({
            title: 'Solicitar Corrección',
            html: `
                <div class="text-left">
                    <div class="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div class="flex gap-2 items-start">
                            <svg class="text-yellow-500 w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="text-sm text-yellow-700">
                                <p class="font-medium mb-1">Importante:</p>
                                <p>Al solicitar una corrección, la factura cambiará a estado "Corrección" y será removida de este listado hasta que se resuelva.</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 mb-3">
                        <p class="text-sm"><strong>Factura:</strong> ${factura.numero_factura}</p>
                        <p class="text-sm"><strong>Emisor:</strong> ${this.truncateText(factura.nombre_emisor, 40)}</p>
                        <p class="text-sm"><strong>Monto Total:</strong> ${this.formatMonto(factura.monto_total_factura)}</p>
                    </div>
                </div>
            `,
            input: 'textarea',
            inputLabel: 'Descripción de la Corrección Requerida *',
            inputPlaceholder: 'Describa detalladamente la corrección que se necesita (mínimo 10 caracteres)...',
            inputAttributes: {
                'aria-label': 'Descripción de la corrección',
                'rows': '4'
            },
            inputValidator: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Debe ingresar una descripción válida (mínimo 10 caracteres)';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Solicitar Corrección',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280',
            icon: 'warning',
            customClass: {
                popup: 'swal2-custom-popup',
                confirmButton: 'swal2-styled',
                cancelButton: 'swal2-styled'
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.service.solicitarCorreccion(
                    factura.primer_detalle_id,
                    factura.numero_factura,
                    result.value.trim()
                ).pipe(takeUntil(this.destroy$))
                    .subscribe(exito => {
                        if (exito) {
                            this.refrescarDatos();
                            Swal.fire({
                                icon: 'success',
                                title: 'Corrección Solicitada',
                                text: 'La solicitud de corrección ha sido enviada correctamente.',
                                confirmButtonColor: '#10b981'
                            });
                        }
                    });
            }
        });
    }

    // ============================================================================
    // MANEJADORES DE MODALES
    // ============================================================================

    cerrarModalDetalle(): void {
        this.mostrarModalDetalle.set(false);
        this.facturaSeleccionada.set(null);
    }

    // ============================================================================
    // MÉTODOS AUXILIARES
    // ============================================================================

    refrescarDatos(): void {
        this.service.refrescarDatos().subscribe();
    }

    trackByFactura(index: number, factura: FacturaTransferenciaTesoreria): string {
        return factura.numero_factura;
    }
}