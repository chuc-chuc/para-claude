// ============================================================================
// LIQUIDACIONES-MODULO-TESORERÍA - COMPONENTE PRINCIPAL
// ============================================================================
// Vista única con pestañas por estado: Pendientes | En Proceso | Completadas
// Soporta Plan Empresarial y Presupuesto
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

// Lucide Icons
import { LucideAngularModule, Eye, AlertCircle, Send, RefreshCw, Filter, FileText, CheckCircle, X } from 'lucide-angular';

import {
    FacturaConSolicitud,
    TipoLiquidacion,
    TipoOrden,
    EstadoSolicitud,
    FormatHelper,
    ValidadoresLiquidacion,
    MENSAJES_TESORERIA,
    OPCIONES_TIPO_LIQUIDACION
} from '../../models/liquidaciones-modulo-tesoreria.models';

import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

// Modales (importar cuando se creen)
import { ModalVerDetalleFacturaComponent } from '../../modals/modal-ver-detalle-factura/modal-ver-detalle-factura.component';
import { ModalCrearSolicitudComponent } from '../../modals/modal-crear-solicitud/modal-crear-solicitud.component';
import { ModalRegistrarComprobanteComponent } from '../../modals/modal-registrar-comprobante/modal-registrar-comprobante.component';
//import { ModalSolicitarCorreccionComponent } from '../modals/modal-solicitar-correccion/modal-solicitar-correccion.component';

@Component({
    selector: 'app-liquidaciones-modulo-tesoreria',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        // Modales (descomentar cuando se creen)
        ModalVerDetalleFacturaComponent,
        ModalCrearSolicitudComponent,
        ModalRegistrarComprobanteComponent,
        // ModalSolicitarCorreccionComponent
    ],
    templateUrl: './liquidaciones-modulo-tesoreria.component.html',
    styleUrls: ['./liquidaciones-modulo-tesoreria.component.css']
})
export class LiquidacionesModuloTesoreriaComponent implements OnInit, OnDestroy {

    readonly service = inject(LiquidacionesModuloTesoreriaService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ICONOS LUCIDE
    // ============================================================================
    readonly Eye = Eye;
    readonly AlertCircle = AlertCircle;
    readonly Send = Send;
    readonly RefreshCw = RefreshCw;
    readonly Filter = Filter;
    readonly FileText = FileText;
    readonly CheckCircle = CheckCircle;
    readonly X = X;

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    // Datos principales
    readonly facturas = signal<FacturaConSolicitud[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Filtros
    readonly tipoFiltro = signal<TipoOrden | 'todos'>('todos');
    readonly busqueda = signal<string>('');
    readonly pestanaActiva = signal<'pendientes' | 'en_proceso' | 'completadas'>('pendientes');

    // Modales
    readonly mostrarModalDetalle = signal<boolean>(false);
    readonly mostrarModalCrear = signal<boolean>(false);
    readonly mostrarModalComprobante = signal<boolean>(false);
    readonly mostrarModalCorreccion = signal<boolean>(false);
    readonly facturaSeleccionada = signal<FacturaConSolicitud | null>(null);

    // Opciones para filtros
    readonly opcionesTipo = OPCIONES_TIPO_LIQUIDACION;

    // ============================================================================
    // COMPUTED - FILTROS Y AGRUPACIONES
    // ============================================================================

    /**
     * Facturas filtradas por tipo de liquidación y búsqueda
     */
    private readonly facturasFiltradas = computed(() => {
        let facturas = this.facturas();
        
        // Filtrar por tipo de liquidación
        const tipo = this.tipoFiltro();
        if (tipo !== 'todos') {
            const tipoLiq: TipoLiquidacion = tipo === 1 ? 'plan' : 'presupuesto';
            facturas = facturas.filter(f => f.tipo_liquidacion === tipoLiq);
        }

        // Filtrar por búsqueda
        const busqueda = this.busqueda().toLowerCase().trim();
        if (busqueda) {
            facturas = facturas.filter(f =>
                f.numero_factura.toLowerCase().includes(busqueda) ||
                f.nombre_emisor.toLowerCase().includes(busqueda) ||
                f.solicitud?.codigo_solicitud?.toLowerCase().includes(busqueda)
            );
        }

        return facturas;
    });

    /**
     * PESTAÑA 1: Facturas sin solicitud (Pendientes de crear solicitud)
     */
    readonly facturasPendientes = computed(() => {
        return this.facturasFiltradas().filter(f => !f.solicitud);
    });

    /**
     * PESTAÑA 2: Facturas con solicitud en proceso
     * Estados: pendiente_aprobacion, aprobado, rechazado
     */
    readonly facturasEnProceso = computed(() => {
        return this.facturasFiltradas().filter(f => 
            f.solicitud && ['pendiente_aprobacion', 'aprobado', 'rechazado'].includes(f.solicitud.estado)
        );
    });

    /**
     * PESTAÑA 3: Facturas con solicitud completada o cancelada
     */
    readonly facturasCompletadas = computed(() => {
        return this.facturasFiltradas().filter(f => 
            f.solicitud && ['completado', 'cancelado'].includes(f.solicitud.estado)
        );
    });

    /**
     * Estadísticas globales
     */
    readonly estadisticas = computed(() => {
        const todas = this.facturas();
        const pendientes = todas.filter(f => !f.solicitud);
        const enAprobacion = todas.filter(f => f.solicitud?.estado === 'pendiente_aprobacion');
        const aprobadas = todas.filter(f => f.solicitud?.estado === 'aprobado');
        const completadas = todas.filter(f => f.solicitud?.estado === 'completado');

        // Por tipo de liquidación
        const porPlan = todas.filter(f => f.tipo_liquidacion === 'plan');
        const porPresupuesto = todas.filter(f => f.tipo_liquidacion === 'presupuesto');

        return {
            // Por estado
            totalPendientes: pendientes.length,
            montoPendientes: pendientes.reduce((sum, f) => sum + f.monto_pendiente_pago, 0),
            
            totalEnAprobacion: enAprobacion.length,
            montoEnAprobacion: enAprobacion.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),
            
            totalAprobadas: aprobadas.length,
            montoAprobadas: aprobadas.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),
            
            totalCompletadas: completadas.length,
            montoCompletadas: completadas.reduce((sum, f) => sum + (f.solicitud?.monto_total_solicitud || 0), 0),

            // Por tipo
            totalPlan: porPlan.length,
            montoPlan: porPlan.reduce((sum, f) => sum + f.monto_pendiente_pago, 0),
            
            totalPresupuesto: porPresupuesto.length,
            montoPresupuesto: porPresupuesto.reduce((sum, f) => sum + f.monto_pendiente_pago, 0),

            // Totales
            total: todas.length,
            montoTotal: todas.reduce((sum, f) => sum + f.monto_pendiente_pago, 0)
        };
    });

    /**
     * Contadores por pestaña (para badges)
     */
    readonly contadores = computed(() => ({
        pendientes: this.facturasPendientes().length,
        enProceso: this.facturasEnProceso().length,
        completadas: this.facturasCompletadas().length
    }));

    // Helpers para templates
    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly truncateText = FormatHelper.truncateText;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstadoSolicitud;
    readonly getColorEstado = FormatHelper.getColorEstadoSolicitud;

    // Validadores
    readonly puedeCrearSolicitud = ValidadoresLiquidacion.puedeCrearSolicitud;
    readonly puedeRegistrarComprobante = ValidadoresLiquidacion.puedeRegistrarComprobante;
    readonly puedeCancelarSolicitud = ValidadoresLiquidacion.puedeCancelarSolicitud;

    // ============================================================================
    // CICLO DE VIDA
    // ============================================================================

    ngOnInit(): void {
        this.suscribirAServicios();
        this.cargarDatos();
        this.cargarBancos();
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
        this.service.obtenerFacturasConSolicitudes().subscribe();
    }

    private cargarBancos(): void {
        this.service.cargarBancos().subscribe();
    }

    // ============================================================================
    // FILTROS Y BÚSQUEDA
    // ============================================================================

    cambiarTipoFiltro(tipo: TipoOrden | 'todos'): void {
        this.tipoFiltro.set(tipo);
        
        // Si se filtra por tipo específico, llamar al API con filtro
        if (tipo !== 'todos') {
            this.service.obtenerFacturasConSolicitudes(tipo as TipoOrden).subscribe();
        } else {
            // Sin filtro, obtener todas
            this.service.obtenerFacturasConSolicitudes().subscribe();
        }
    }

    buscar(termino: string): void {
        this.busqueda.set(termino);
    }

    cambiarPestana(pestana: 'pendientes' | 'en_proceso' | 'completadas'): void {
        this.pestanaActiva.set(pestana);
    }

    refrescarDatos(): void {
        const tipoActual = this.tipoFiltro();
        if (tipoActual !== 'todos') {
            this.service.obtenerFacturasConSolicitudes(tipoActual as TipoOrden).subscribe();
        } else {
            this.service.refrescarDatos().subscribe();
        }
    }

    // ============================================================================
    // ACCIONES DE FACTURA
    // ============================================================================

    /**
     * Ver detalle completo de la factura
     */
    verDetalleFactura(factura: FacturaConSolicitud): void {
        this.facturaSeleccionada.set(factura);
        this.mostrarModalDetalle.set(true);
    }

    /**
     * Abrir modal para crear solicitud de transferencia
     */
    crearSolicitudTransferencia(factura: FacturaConSolicitud): void {
        if (!this.puedeCrearSolicitud(factura)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Esta factura ya tiene una solicitud de transferencia o no tiene monto pendiente.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        this.facturaSeleccionada.set(factura);
        this.mostrarModalCrear.set(true);
    }

    /**
     * Solicitar corrección de la factura
     */
    solicitarCorreccion(factura: FacturaConSolicitud): void {
        Swal.fire({
            title: 'Solicitar Corrección',
            html: `
                <div class="text-left space-y-3">
                    <div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                        <div class="flex gap-2 items-start">
                            <svg class="text-yellow-500 w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="text-sm text-yellow-800">
                                <p class="font-semibold mb-1">Importante:</p>
                                <p>La factura cambiará a estado "Corrección" y será removida de este listado hasta que se resuelva.</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded p-3">
                        <p class="text-sm mb-1"><strong>Factura:</strong> ${factura.numero_factura}</p>
                        <p class="text-sm mb-1"><strong>Emisor:</strong> ${this.truncateText(factura.nombre_emisor, 40)}</p>
                        <p class="text-sm mb-1"><strong>Tipo:</strong> ${this.getEtiquetaTipo(factura.tipo_liquidacion)}</p>
                        <p class="text-sm"><strong>Monto:</strong> ${this.formatMonto(factura.monto_total_factura)}</p>
                    </div>
                </div>
            `,
            input: 'textarea',
            inputLabel: 'Descripción de la Corrección Requerida *',
            inputPlaceholder: 'Describa detalladamente la corrección necesaria (mínimo 10 caracteres)...',
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
            width: '600px'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.ejecutarSolicitudCorreccion(factura, result.value.trim());
            }
        });
    }

    private ejecutarSolicitudCorreccion(factura: FacturaConSolicitud, descripcion: string): void {
        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            html: 'Solicitando corrección',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        this.service.solicitarCorreccion(
            factura.primer_detalle_id,
            factura.numero_factura,
            descripcion
        ).pipe(takeUntil(this.destroy$))
            .subscribe(exito => {
                if (exito) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Corrección Solicitada',
                        text: 'La solicitud ha sido enviada correctamente. La factura será revisada por liquidaciones.',
                        confirmButtonColor: '#10b981',
                        timer: 3000
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo solicitar la corrección. Intente nuevamente.',
                        confirmButtonColor: '#ef4444'
                    });
                }
            });
    }

    /**
     * Registrar comprobante de transferencia
     */
    registrarComprobante(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || !this.puedeRegistrarComprobante(factura.solicitud)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se puede registrar comprobante en solicitudes aprobadas.',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        this.facturaSeleccionada.set(factura);
        this.mostrarModalComprobante.set(true);
    }

    /**
     * Cancelar solicitud de transferencia
     */
    cancelarSolicitud(factura: FacturaConSolicitud): void {
        if (!factura.solicitud || !this.puedeCancelarSolicitud(factura.solicitud)) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Solo se pueden cancelar solicitudes pendientes de aprobación.',
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
                        <p class="text-sm"><strong>Banco:</strong> ${factura.solicitud.banco_nombre}</p>
                    </div>
                </div>
            `,
            input: 'textarea',
            inputLabel: 'Motivo de cancelación *',
            inputPlaceholder: 'Especifique el motivo (mínimo 10 caracteres)...',
            inputAttributes: {
                'aria-label': 'Motivo de cancelación',
                'rows': '3'
            },
            inputValidator: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Debe ingresar un motivo válido (mínimo 10 caracteres)';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            icon: 'warning'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.ejecutarCancelacion(factura.solicitud!.id, result.value.trim());
            }
        });
    }

    private ejecutarCancelacion(solicitudId: number, motivo: string): void {
        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            html: 'Cancelando solicitud',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        this.service.cancelarSolicitud(solicitudId, motivo)
            .pipe(takeUntil(this.destroy$))
            .subscribe(exito => {
                if (exito) {
                    this.refrescarDatos();
                    Swal.fire({
                        icon: 'success',
                        title: 'Cancelada',
                        text: 'La solicitud ha sido cancelada correctamente.',
                        confirmButtonColor: '#10b981',
                        timer: 2000
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cancelar la solicitud. Intente nuevamente.',
                        confirmButtonColor: '#ef4444'
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

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
        this.facturaSeleccionada.set(null);
    }

    cerrarModalComprobante(): void {
        this.mostrarModalComprobante.set(false);
        this.facturaSeleccionada.set(null);
    }

    cerrarModalCorreccion(): void {
        this.mostrarModalCorreccion.set(false);
        this.facturaSeleccionada.set(null);
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
    // MÉTODOS AUXILIARES
    // ============================================================================

    trackByFactura(index: number, factura: FacturaConSolicitud): string {
        return factura.numero_factura;
    }

    /**
     * Obtiene el badge de estado según la solicitud
     */
    getEstadoBadge(factura: FacturaConSolicitud): { texto: string; clase: string } {
        if (!factura.solicitud) {
            return {
                texto: 'Sin Solicitud',
                clase: 'bg-gray-100 text-gray-800'
            };
        }

        const colors = this.getColorEstado(factura.solicitud.estado);
        return {
            texto: this.getEtiquetaEstado(factura.solicitud.estado),
            clase: `${colors.bg} ${colors.text}`
        };
    }

    /**
     * Determina si mostrar botón de crear solicitud
     */
    mostrarBotonCrearSolicitud(factura: FacturaConSolicitud): boolean {
        return !factura.solicitud;
    }

    /**
     * Determina si mostrar botón de registrar comprobante
     */
    mostrarBotonRegistrarComprobante(factura: FacturaConSolicitud): boolean {
        return factura.solicitud?.estado === 'aprobado';
    }

    /**
     * Determina si mostrar botón de cancelar
     */
    mostrarBotonCancelar(factura: FacturaConSolicitud): boolean {
        return factura.solicitud?.estado === 'pendiente_aprobacion';
    }
}