// ============================================================================
// LIQUIDACIONES-MODULO-TESORERÍA - COMPONENTE PRINCIPAL
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { LucideAngularModule, Eye, AlertCircle, Send, RefreshCw, FileText, CheckCircle, X, PencilLine } from 'lucide-angular';

import {
    FacturaConSolicitud,
    TipoLiquidacion,
    TipoOrden,
    FormatHelper,
    ValidadoresLiquidacion
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

import { ModalVerDetalleFacturaComponent } from '../../modals/modal-ver-detalle-factura/modal-ver-detalle-factura.component';
import { ModalCrearSolicitudComponent } from '../../modals/modal-crear-solicitud/modal-crear-solicitud.component';
import { ModalRegistrarComprobanteComponent } from '../../modals/modal-registrar-comprobante/modal-registrar-comprobante.component';

type TipoTab = 'plan' | 'presupuesto';
type EstadoTab = 'pendientes' | 'en_proceso' | 'completadas';

@Component({
    selector: 'app-liquidaciones-modulo-tesoreria',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        ModalVerDetalleFacturaComponent,
        ModalCrearSolicitudComponent,
        ModalRegistrarComprobanteComponent,
    ],
    templateUrl: './liquidaciones-modulo-tesoreria.component.html',
    styleUrls: ['./liquidaciones-modulo-tesoreria.component.css']
})
export class LiquidacionesModuloTesoreriaComponent implements OnInit, OnDestroy {

    readonly service = inject(LiquidacionesModuloTesoreriaService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ICONOS
    // ============================================================================
    readonly Eye = Eye;
    readonly AlertCircle = AlertCircle;
    readonly Send = Send;
    readonly RefreshCw = RefreshCw;
    readonly FileText = FileText;
    readonly CheckCircle = CheckCircle;
    readonly X = X;
    readonly PencilLine = PencilLine;

    // ============================================================================
    // ESTADO
    // ============================================================================
    readonly facturas = signal<FacturaConSolicitud[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Pestañas
    readonly tipoTab = signal<TipoTab>('presupuesto'); // por defecto
    readonly estadoTab = signal<EstadoTab>('pendientes');

    // Modales
    readonly mostrarModalDetalle = signal<boolean>(false);
    readonly mostrarModalCrear = signal<boolean>(false);
    readonly mostrarModalComprobante = signal<boolean>(false);
    readonly facturaSeleccionada = signal<FacturaConSolicitud | null>(null);
    readonly modoEdicionSolicitud = signal<boolean>(false);
    readonly modoEdicionComprobante = signal<boolean>(false);

    // ============================================================================
    // COMPUTED
    // ============================================================================

    private readonly facturasFiltradas = computed(() => {
        const tipo = this.tipoTab();
        return this.facturas().filter(f => f.tipo_liquidacion === tipo);
    });

    readonly facturasPendientes = computed(() => {
        return this.facturasFiltradas().filter(f => !f.solicitud);
    });

    readonly facturasEnProceso = computed(() => {
        return this.facturasFiltradas().filter(f =>
            f.solicitud && ['pendiente_aprobacion', 'aprobado', 'rechazado'].includes(f.solicitud.estado)
        );
    });

    readonly facturasCompletadas = computed(() => {
        return this.facturasFiltradas().filter(f =>
            f.solicitud && ['completado', 'cancelado'].includes(f.solicitud.estado)
        );
    });

    readonly estadisticas = computed(() => {
        const todas = this.facturasFiltradas();
        const pendientes = todas.filter(f => !f.solicitud);
        const enAprobacion = todas.filter(f => f.solicitud?.estado === 'pendiente_aprobacion');
        const aprobadas = todas.filter(f => f.solicitud?.estado === 'aprobado');
        const completadas = todas.filter(f => f.solicitud?.estado === 'completado');

        return {
            totalPendientes: pendientes.length,
            montoPendientes: pendientes.reduce((sum, f) => sum + f.monto_pendiente_pago, 0),

            totalEnAprobacion: enAprobacion.length,
            montoEnAprobacion: enAprobacion.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),

            totalAprobadas: aprobadas.length,
            montoAprobadas: aprobadas.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),

            totalCompletadas: completadas.length,
            montoCompletadas: completadas.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),

            total: todas.length,
            montoTotal: todas.reduce((sum, f) => sum + f.monto_pendiente_pago, 0)
        };
    });

    // Helpers
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly truncateText = FormatHelper.truncateText;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstadoSolicitud;
    readonly getColorEstado = FormatHelper.getColorEstadoSolicitud;

    readonly puedeCrearSolicitud = ValidadoresLiquidacion.puedeCrearSolicitud;
    readonly puedeRegistrarComprobante = ValidadoresLiquidacion.puedeRegistrarComprobante;
    readonly puedeCancelarSolicitud = ValidadoresLiquidacion.puedeCancelarSolicitud;

    // ============================================================================
    // PESTAÑAS
    // ============================================================================
    readonly tipoTabs: Array<{ key: TipoTab; label: string }> = [
        { key: 'plan', label: 'Plan Empresarial' },
        { key: 'presupuesto', label: 'Presupuesto' }
    ];

    readonly estadoTabs: Array<{ key: EstadoTab; label: string }> = [
        { key: 'pendientes', label: 'Pendientes' },
        { key: 'en_proceso', label: 'En Proceso' },
        { key: 'completadas', label: 'Completadas' }
    ];

    getContador(tab: EstadoTab): number {
        return {
            pendientes: this.facturasPendientes().length,
            en_proceso: this.facturasEnProceso().length,
            completadas: this.facturasCompletadas().length
        }[tab];
    }

    // ============================================================================
    // CICLO DE VIDA
    // ============================================================================
    ngOnInit(): void {
        this.suscribirAServicios();
        this.cargarDatosIniciales();
        this.cargarBancos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private suscribirAServicios(): void {
        this.service.facturas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(facturas => this.facturas.set(facturas));

        this.service.cargando$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargando.set(cargando));

        this.service.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => this.error.set(error));
    }

    private cargarDatosIniciales(): void {
        this.cambiarTipoTab('presupuesto'); // carga por defecto
    }

    private cargarBancos(): void {
        this.service.cargarBancos().subscribe();
    }

    // ============================================================================
    // ACCIONES
    // ============================================================================

    cambiarTipoTab(tipo: TipoTab): void {
        this.tipoTab.set(tipo);
        const tipoOrden: TipoOrden = tipo === 'plan' ? 1 : 2;
        this.service.obtenerFacturasConSolicitudes(tipoOrden).subscribe();
        this.estadoTab.set('pendientes'); // reset a pendientes
    }

    cambiarEstadoTab(tab: EstadoTab): void {
        this.estadoTab.set(tab);
    }

    refrescarDatos(): void {
        const tipo = this.tipoTab();
        const tipoOrden: TipoOrden = tipo === 'plan' ? 1 : 2;
        this.service.obtenerFacturasConSolicitudes(tipoOrden).subscribe();
    }

    verDetalleFactura(factura: FacturaConSolicitud): void {
        this.facturaSeleccionada.set(factura);
        this.mostrarModalDetalle.set(true);
    }

    crearSolicitudTransferencia(factura: FacturaConSolicitud): void {
        if (!this.puedeCrearSolicitud(factura)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Esta factura ya tiene una solicitud o no tiene monto pendiente.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        this.facturaSeleccionada.set(factura);
        this.modoEdicionSolicitud.set(false);
        this.mostrarModalCrear.set(true);
    }

    editarSolicitud(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || !['rechazado', 'pendiente_aprobacion'].includes(factura.solicitud.estado)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se pueden editar solicitudes rechazadas o pendientes.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        this.facturaSeleccionada.set(factura);
        this.modoEdicionSolicitud.set(true);
        this.mostrarModalCrear.set(true);
    }

    registrarComprobante(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || !this.puedeRegistrarComprobante(factura.solicitud)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se puede registrar en solicitudes aprobadas.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        this.facturaSeleccionada.set(factura);
        this.modoEdicionComprobante.set(false);
        this.mostrarModalComprobante.set(true);
    }

    editarComprobante(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || factura.solicitud.estado !== 'completado') {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se pueden editar comprobantes completados.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        this.facturaSeleccionada.set(factura);
        this.modoEdicionComprobante.set(true);
        this.mostrarModalComprobante.set(true);
    }

    cancelarSolicitud(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || !this.puedeCancelarSolicitud(factura.solicitud)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se pueden cancelar solicitudes pendientes.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        Swal.fire({
            title: '¿Cancelar solicitud?',
            html: `
                <div class="text-left space-y-3">
                    <div class="bg-red-50 rounded p-3 border-l-4 border-red-500">
                        <p class="text-sm"><strong>Código:</strong> ${factura.solicitud.codigo_solicitud}</p>
                        <p class="text-sm"><strong>Monto:</strong> ${this.formatMonto(factura.solicitud.monto_total_solicitud)}</p>
                    </div>
                </div>
            `,
            input: 'textarea',
            inputLabel: 'Motivo de cancelación *',
            inputPlaceholder: 'Especifique el motivo (mínimo 10 caracteres)...',
            inputValidator: (value) => !value || value.trim().length < 10 ? 'Motivo requerido (mín. 10 caracteres)' : null,
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            icon: 'warning'
        }).then(result => {
            if (result.isConfirmed && result.value) {
                this.service.cancelarSolicitud(factura.solicitud!.id, result.value.trim())
                    .pipe(takeUntil(this.destroy$))
                    .subscribe(() => this.refrescarDatos());
            }
        });
    }

    // ============================================================================
    // MODALES
    // ============================================================================
    cerrarModalDetalle(): void {
        this.mostrarModalDetalle.set(false);
        this.facturaSeleccionada.set(null);
    }

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
        this.facturaSeleccionada.set(null);
        this.modoEdicionSolicitud.set(false);
    }

    cerrarModalComprobante(): void {
        this.mostrarModalComprobante.set(false);
        this.facturaSeleccionada.set(null);
        this.modoEdicionComprobante.set(false);
    }

    onSolicitudCreada(): void {
        this.cerrarModalCrear();
        this.refrescarDatos();
    }

    onComprobanteRegistrado(): void {
        this.cerrarModalComprobante();
        this.refrescarDatos();
    }

    // ============================================================================
    // AUXILIARES
    // ============================================================================
    trackByFactura = (_: number, f: FacturaConSolicitud) => f.numero_factura;

    getFacturasPestana(): FacturaConSolicitud[] {
        const tab = this.estadoTab();
        return tab === 'pendientes' ? this.facturasPendientes() :
            tab === 'en_proceso' ? this.facturasEnProceso() :
                this.facturasCompletadas();
    }

    getColumnas() {
        const tab = this.estadoTab();
        if (tab === 'pendientes') {
            return [
                { key: 'factura', label: 'Factura' },
                { key: 'emisor', label: 'Emisor' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'monto', label: 'Pendiente' }
            ];
        }
        if (tab === 'en_proceso') {
            return [
                { key: 'factura', label: 'Factura' },
                { key: 'codigo', label: 'Código' },
                { key: 'estado', label: 'Estado' },
                { key: 'monto', label: 'Monto' },
                { key: 'banco', label: 'Banco' }
            ];
        }
        return [
            { key: 'codigo', label: 'Código' },
            { key: 'factura', label: 'Factura' },
            { key: 'estado', label: 'Estado' },
            { key: 'monto', label: 'Monto' },
            { key: 'fecha_comp', label: 'Completado' }
        ];
    }

    mostrarBotonCrearSolicitud(f: FacturaConSolicitud) {
        return !f.solicitud && f.monto_pendiente_pago > 0;
    }

    mostrarBotonEditarSolicitud(f: FacturaConSolicitud) {
        return f.solicitud?.estado === 'rechazado' || f.solicitud?.estado === 'pendiente_aprobacion';
    }

    mostrarBotonRegistrarComprobante(f: FacturaConSolicitud) {
        return f.solicitud?.estado === 'aprobado';
    }

    mostrarBotonEditarComprobante(f: FacturaConSolicitud) {
        return f.solicitud?.estado === 'completado';
    }

    mostrarBotonCancelar(f: FacturaConSolicitud) {
        return f.solicitud?.estado === 'pendiente_aprobacion';
    }
}