// ============================================================================
// MÓDULO DE APROBACIONES - COMPONENTE PRINCIPAL
// ============================================================================
// Para Gerencia Financiera y Jefe de Contabilidad
// Permite aprobar o rechazar solicitudes de transferencia
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

// Lucide Icons
import { LucideAngularModule, CheckCircle, XCircle, RefreshCw, AlertCircle, FileText } from 'lucide-angular';

import {
    SolicitudTransferencia,
    FormatHelper
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

// Modales
import { ModalAprobarRechazarSolicitudComponent } from '../../modals/modal-aprobar-rechazar-solicitud/modal-aprobar-rechazar-solicitud.component';
import { ModalDetalleSolicitudAprobacionComponent } from '../../modals/modal-detalle-solicitud-aprobacion/modal-detalle-solicitud-aprobacion.component';

@Component({
    selector: 'app-aprobaciones-transferencias',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        FormsModule,
        ModalAprobarRechazarSolicitudComponent,
        ModalDetalleSolicitudAprobacionComponent
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
    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;
    readonly RefreshCw = RefreshCw;
    readonly AlertCircle = AlertCircle;
    readonly FileText = FileText;

    // ============================================================================
    // ESTADO
    // ============================================================================
    readonly solicitudesPendientes = signal<SolicitudTransferencia[]>([]);
    readonly solicitudSeleccionada = signal<SolicitudTransferencia | null>(null);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Modales
    readonly mostrarModalAprobacion = signal<boolean>(false);
    readonly mostrarModalDetalle = signal<boolean>(false);
    readonly solicitudIdSeleccionada = signal<number | null>(null);
    readonly accionModal = signal<'aprobar' | 'rechazar'>('aprobar');

    // ============================================================================
    // HELPERS
    // ============================================================================
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;

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
                    const solicitudes: SolicitudTransferencia[] = (response.datos.solicitudes || []).map((s: any) => ({
                        id: s.id,
                        codigo_solicitud: s.codigo_solicitud,
                        tipo_solicitud: s.tipo_solicitud || 'presupuesto',
                        banco_origen_id: 0,
                        banco_nombre: s.banco_nombre,
                        banco_cuenta: s.banco_cuenta,
                        monto_total_solicitud: s.monto_total_solicitud,
                        area_aprobacion: s.area_aprobacion,
                        estado: 'pendiente_aprobacion' as const,
                        fecha_creacion: s.fecha_creacion,
                        creado_por: 0,
                        creado_por_nombre: s.creado_por_nombre ?? null,
                        creado_por_puesto: s.creado_por_puesto ?? null,
                    } as SolicitudTransferencia));

                    this.solicitudesPendientes.set(solicitudes);
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

    verDetalleSolicitud(solicitud: SolicitudTransferencia): void {
        this.solicitudIdSeleccionada.set(solicitud.id);
        this.mostrarModalDetalle.set(true);
    }

    aprobarSolicitud(solicitud: SolicitudTransferencia): void {
        this.solicitudSeleccionada.set(solicitud);
        this.accionModal.set('aprobar');
        this.mostrarModalAprobacion.set(true);
    }

    rechazarSolicitud(solicitud: SolicitudTransferencia): void {
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
        this.solicitudIdSeleccionada.set(null);
    }

    onAccionCompletada(): void {
        this.cerrarModalAprobacion();
        this.refrescarDatos();
    }

    // ============================================================================
    // AUXILIARES
    // ============================================================================
    trackBySolicitud(_index: number, solicitud: SolicitudTransferencia): number {
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