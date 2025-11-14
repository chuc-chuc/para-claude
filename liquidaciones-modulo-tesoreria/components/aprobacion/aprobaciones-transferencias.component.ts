// ============================================================================
// MÓDULO DE APROBACIONES - COMPONENTE PRINCIPAL
// ============================================================================
// Para Gerencia Financiera y Jefe de Contabilidad
// Permite aprobar o rechazar solicitudes de transferencia
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

// Lucide Icons
import { LucideAngularModule, Eye, CheckCircle, XCircle, RefreshCw, AlertCircle, FileText, Clock } from 'lucide-angular';

import {
    SolicitudTransferencia,
    FacturaConSolicitud,
    FormatHelper,
    MENSAJES_TESORERIA
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

// Modales
import { ModalAprobarRechazarSolicitudComponent } from '../../modals/modal-aprobar-rechazar-solicitud/modal-aprobar-rechazar-solicitud.component';
import { ModalVerDetalleFacturaComponent } from '../../modals/modal-ver-detalle-factura/modal-ver-detalle-factura.component';

@Component({
    selector: 'app-aprobaciones-transferencias',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        ModalAprobarRechazarSolicitudComponent,
        ModalVerDetalleFacturaComponent
    ],
    templateUrl: './aprobaciones-transferencias.component.html',
    styleUrls: ['./aprobaciones-transferencias.component.css']
})
export class AprobacionesTransferenciasComponent implements OnInit, OnDestroy {

    readonly service = inject(LiquidacionesModuloTesoreriaService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ICONOS
    // ============================================================================
    readonly Eye = Eye;
    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;
    readonly RefreshCw = RefreshCw;
    readonly AlertCircle = AlertCircle;
    readonly FileText = FileText;
    readonly Clock = Clock;

    // ============================================================================
    // ESTADO
    // ============================================================================
    readonly solicitudesPendientes = signal<any[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Modales
    readonly mostrarModalAprobacion = signal<boolean>(false);
    readonly mostrarModalDetalle = signal<boolean>(false);
    readonly solicitudSeleccionada = signal<any | null>(null);
    readonly facturaSeleccionada = signal<FacturaConSolicitud | null>(null);
    readonly accionModal = signal<'aprobar' | 'rechazar'>('aprobar');

    // ============================================================================
    // HELPERS
    // ============================================================================
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly truncateText = FormatHelper.truncateText;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstadoSolicitud;
    readonly getColorEstado = FormatHelper.getColorEstadoSolicitud;
    readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

    // ============================================================================
    // COMPUTED
    // ============================================================================
    readonly totalSolicitudes = computed(() => this.solicitudesPendientes().length);
    readonly montoTotalPendiente = computed(() =>
        this.solicitudesPendientes().reduce((sum, s) => sum + (s.monto_total_solicitud || 0), 0)
    );

    // ============================================================================
    // LIFECYCLE
    // ============================================================================
    ngOnInit(): void {
        this.cargarSolicitudesPendientes();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // CARGA DE DATOS
    // ============================================================================
    cargarSolicitudesPendientes(): void {
        this.cargando.set(true);
        this.error.set(null);

        this.service.listarSolicitudesPendientesAprobacion().subscribe({
            next: (response: any) => {
                if (response.respuesta === 'success' && response.datos) {
                    this.solicitudesPendientes.set(response.datos.solicitudes || []);
                } else {
                    this.solicitudesPendientes.set([]);
                }
                this.cargando.set(false);
            },
            error: (error) => {
                console.error('Error al cargar solicitudes:', error);
                this.error.set('Error al cargar solicitudes pendientes');
                this.cargando.set(false);
            }
        });
    }

    refrescarDatos(): void {
        this.cargarSolicitudesPendientes();
    }

    // ============================================================================
    // ACCIONES DE SOLICITUD
    // ============================================================================

    /**
     * Ver detalle completo de la solicitud con sus facturas
     */
    async verDetalleSolicitud(solicitud: any): Promise<void> {
        // Obtener detalle completo con facturas
        this.service.obtenerDetalleSolicitudTransferencia({ solicitud_id: solicitud.id }).subscribe({
            next: (response: any) => {
                if (response.respuesta === 'success' && response.datos) {
                    // Mostrar en modal con detalle completo
                    Swal.fire({
                        title: `Solicitud ${solicitud.codigo_solicitud}`,
                        html: this.generarHTMLDetalleSolicitud(response.datos),
                        icon: 'info',
                        width: '800px',
                        confirmButtonText: 'Cerrar',
                        confirmButtonColor: '#3b82f6'
                    });
                }
            },
            error: (error) => {
                console.error('Error al obtener detalle:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar el detalle de la solicitud',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }

    private generarHTMLDetalleSolicitud(detalle: any): string {
        const solicitud = detalle.solicitud;
        const facturas = detalle.facturas_detalle || [];

        let facturasHTML = '';
        if (facturas.length > 0) {
            facturasHTML = facturas.map((f: any) => `
                <div class="bg-blue-50 rounded p-3 mb-2">
                    <p class="text-sm"><strong>Factura:</strong> ${f.numero_factura}</p>
                    <p class="text-sm"><strong>Emisor:</strong> ${f.nombre_emisor}</p>
                    <p class="text-sm"><strong>Monto:</strong> ${this.formatMonto(f.monto_total_factura)}</p>
                    <p class="text-sm"><strong>Fecha:</strong> ${this.formatFecha(f.fecha_emision)}</p>
                </div>
            `).join('');
        }

        return `
            <div class="text-left space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm mb-2"><strong>Código:</strong> ${solicitud.codigo_solicitud}</p>
                    <p class="text-sm mb-2"><strong>Banco:</strong> ${solicitud.banco_nombre} - ${solicitud.banco_cuenta}</p>
                    <p class="text-sm mb-2"><strong>Monto:</strong> ${this.formatMonto(solicitud.monto_total_solicitud)}</p>
                    <p class="text-sm mb-2"><strong>Área:</strong> ${this.getEtiquetaArea(solicitud.area_aprobacion)}</p>
                    <p class="text-sm"><strong>Fecha Creación:</strong> ${this.formatFechaHora(solicitud.fecha_creacion)}</p>
                </div>

                ${facturas.length > 0 ? `
                    <div>
                        <p class="font-semibold text-gray-900 mb-2">Facturas Asociadas:</p>
                        ${facturasHTML}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Abrir modal para aprobar solicitud
     */
    aprobarSolicitud(solicitud: any): void {
        this.solicitudSeleccionada.set(solicitud);
        this.accionModal.set('aprobar');
        this.mostrarModalAprobacion.set(true);
    }

    /**
     * Abrir modal para rechazar solicitud
     */
    rechazarSolicitud(solicitud: any): void {
        this.solicitudSeleccionada.set(solicitud);
        this.accionModal.set('rechazar');
        this.mostrarModalAprobacion.set(true);
    }

    // ============================================================================
    // MANEJADORES DE MODALES
    // ============================================================================
    cerrarModalAprobacion(): void {
        this.mostrarModalAprobacion.set(false);
        this.solicitudSeleccionada.set(null);
    }

    cerrarModalDetalle(): void {
        this.mostrarModalDetalle.set(false);
        this.facturaSeleccionada.set(null);
    }

    onAccionCompletada(): void {
        this.cerrarModalAprobacion();
        this.refrescarDatos();
    }

    // ============================================================================
    // AUXILIARES
    // ============================================================================
    trackBySolicitud(index: number, solicitud: any): number {
        return solicitud.id;
    }

    /**
     * Calcula los días transcurridos desde la creación
     */
    diasDesdeCreacion(fechaCreacion: string): number {
        const fecha = new Date(fechaCreacion);
        const hoy = new Date();
        const diff = hoy.getTime() - fecha.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Devuelve clase de color según antigüedad
     */
    getColorAntiguedad(dias: number): string {
        if (dias >= 7) return 'bg-red-100 text-red-800';
        if (dias >= 3) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    }
}