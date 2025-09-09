// ============================================================================
// COMPONENTE PRINCIPAL - FACTURAS GESTIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import { ModalRegistrarFacturaComponent } from '../modal-registrar-factura/modal-registrar-factura.component';
import { ModalSolicitarAutorizacionComponent } from '../modal-solicitar-autorizacion/modal-solicitar-autorizacion.component';

import {
    FacturaPE,
    DetalleLiquidacionPE,
    formatearMonto,
    formatearFecha,
    obtenerColorEstadoLiquidacion,
    obtenerColorEstadoAutorizacion
} from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-facturas-gestion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ModalRegistrarFacturaComponent,
        ModalSolicitarAutorizacionComponent
    ],
    templateUrl: './facturas-gestion.component.html',
    styleUrls: ['./facturas-gestion.component.css']
})
export class FacturasGestionComponent implements OnInit, OnDestroy {

    private readonly service = inject(FacturasPlanEmpresarialService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    readonly searchControl = new FormControl<string>('');
    readonly cargandoFactura = signal<boolean>(false);
    readonly cargandoDetalles = signal<boolean>(false);
    readonly procesandoLiquidacion = signal<boolean>(false);
    readonly facturaActual = signal<FacturaPE | null>(null);
    readonly detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);

    // Estados de modales
    readonly mostrarModalRegistrar = signal<boolean>(false);
    readonly mostrarModalAutorizacion = signal<boolean>(false);

    // Utilidades de formato
    readonly formatearMonto = formatearMonto;
    readonly formatearFecha = formatearFecha;
    readonly obtenerColorEstadoLiquidacion = obtenerColorEstadoLiquidacion;
    readonly obtenerColorEstadoAutorizacion = obtenerColorEstadoAutorizacion;

    ngOnInit(): void {
        this.inicializarSuscripciones();
        this.configurarBusquedaAutomatica();
        this.service.cargarCatalogos().subscribe();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarSuscripciones(): void {
        // Suscripciones a los estados del servicio
        this.service.cargandoFactura$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoFactura.set(cargando));

        this.service.cargandoDetalles$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoDetalles.set(cargando));

        this.service.procesandoLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(procesando => this.procesandoLiquidacion.set(procesando));

        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => this.facturaActual.set(factura));

        this.service.detallesLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(detalles => this.detallesLiquidacion.set(detalles));
    }

    private configurarBusquedaAutomatica(): void {
        this.searchControl.valueChanges
            .pipe(
                debounceTime(1000),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(valor => {
                const termino = (valor || '').trim();
                if (termino.length >= 3) {
                    this.buscarFactura(termino);
                } else if (termino.length === 0) {
                    this.limpiarBusqueda();
                }
            });
    }

    // ============================================================================
    // ACCIONES PRINCIPALES
    // ============================================================================

    /**
     * Buscar factura manualmente
     */
    buscarManual(): void {
        const termino = (this.searchControl.value || '').trim();
        if (termino) {
            this.buscarFactura(termino);
        }
    }

    /**
     * Buscar factura por número DTE
     */
    private buscarFactura(numeroDte: string): void {
        this.service.buscarFactura(numeroDte).subscribe();
    }

    /**
     * Liquidar factura actual - CORREGIDO
     */
    liquidarFactura(): void {
        const factura = this.facturaActual();
        if (!factura) return;

        if (!this.puedeLiquidar(factura)) {
            if (this.requiereAutorizacion(factura)) {
                this.abrirModalAutorizacion();
            }
            return;
        }

        // Ejecutar liquidación real
        this.service.liquidarFactura(factura.numero_dte).subscribe(exito => {
            if (exito) {
                // La factura se actualiza automáticamente desde el servicio
                console.log('Factura liquidada exitosamente');
            }
        });
    }

    /**
     * Limpiar búsqueda y estado
     */
    limpiarBusqueda(): void {
        this.searchControl.setValue('', { emitEvent: false });
        this.service.limpiarFactura();
    }

    // ============================================================================
    // GESTIÓN DE MODALES
    // ============================================================================

    /**
     * Abrir modal de registro de factura
     */
    abrirModalRegistrar(): void {
        this.mostrarModalRegistrar.set(true);
    }

    /**
     * Cerrar modal de registro
     */
    cerrarModalRegistrar(): void {
        this.mostrarModalRegistrar.set(false);
    }

    /**
     * Evento cuando se registra una factura
     */
    onFacturaRegistrada(): void {
        this.cerrarModalRegistrar();
        // Opcionalmente buscar la factura recién registrada
    }

    /**
     * Abrir modal de solicitud de autorización
     */
    abrirModalAutorizacion(): void {
        this.mostrarModalAutorizacion.set(true);
    }

    /**
     * Cerrar modal de autorización
     */
    cerrarModalAutorizacion(): void {
        this.mostrarModalAutorizacion.set(false);
    }

    /**
     * Evento cuando se envía solicitud de autorización
     */
    onSolicitudEnviada(): void {
        this.cerrarModalAutorizacion();
    }

    // ============================================================================
    // LÓGICA DE VALIDACIÓN
    // ============================================================================

    /**
     * Verificar si se puede liquidar la factura
     */
    puedeLiquidar(factura: FacturaPE): boolean {
        if (factura.estado_liquidacion === 'Liquidado') return false;

        // Si requiere autorización, debe estar aprobada
        if (this.requiereAutorizacion(factura)) {
            return factura.estado_autorizacion === 'aprobada';
        }

        return true;
    }

    /**
     * Verificar si requiere autorización por tardanza
     */
    requiereAutorizacion(factura: FacturaPE): boolean {
        // Lógica para determinar si requiere autorización
        // Por ejemplo, si han pasado más de X días
        return (factura.dias_transcurridos || 0) > 30 &&
            factura.estado_autorizacion !== 'aprobada';
    }

    /**
     * Verificar si el botón liquidar debe estar deshabilitado
     */
    liquidarDeshabilitado(factura: FacturaPE): boolean {
        return !this.puedeLiquidar(factura) &&
            (!this.requiereAutorizacion(factura) ||
                factura.estado_autorizacion === 'rechazada');
    }

    /**
     * Obtener texto del botón liquidar
     */
    obtenerTextoBotonLiquidar(factura: FacturaPE): string {
        if (factura.estado_liquidacion === 'Liquidado') return 'Liquidado';
        if (this.requiereAutorizacion(factura)) return 'Solicitar Autorización';
        if (this.liquidarDeshabilitado(factura)) return 'No Liquidable';
        return 'Liquidar';
    }

    /**
     * Obtener clase CSS del botón liquidar
     */
    obtenerClaseBotonLiquidar(factura: FacturaPE): string {
        if (factura.estado_liquidacion === 'Liquidado') {
            return 'px-3 py-2 text-xs bg-gray-300 text-gray-500 rounded-md cursor-not-allowed';
        }
        if (this.requiereAutorizacion(factura)) {
            return 'px-3 py-2 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors';
        }
        if (this.liquidarDeshabilitado(factura)) {
            return 'px-3 py-2 text-xs bg-gray-300 text-gray-500 rounded-md cursor-not-allowed';
        }
        return 'px-3 py-2 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors';
    }

    // ============================================================================
    // CÁLCULOS Y UTILIDADES
    // ============================================================================

    /**
     * Calcular total de detalles de liquidación
     */
    calcularTotalDetalles(): number {
        return this.detallesLiquidacion().reduce((total, detalle) => total + detalle.monto, 0);
    }

    /**
     * Verificar si hay diferencia entre factura y liquidación
     */
    hayDiferenciaMontos(): boolean {
        const factura = this.facturaActual();
        if (!factura) return false;

        const totalDetalles = this.calcularTotalDetalles();
        const diferencia = Math.abs(factura.monto_total - totalDetalles);
        return diferencia > 0.01; // Tolerancia de 1 centavo
    }

    /**
     * Obtener mensaje de estado de la factura
     */
    obtenerMensajeEstado(): string {
        const factura = this.facturaActual();
        if (!factura) return '';

        if (factura.estado_liquidacion === 'Liquidado') {
            return 'Factura completamente liquidada';
        }

        if (this.hayDiferenciaMontos()) {
            const diferencia = Math.abs(factura.monto_total - this.calcularTotalDetalles());
            return `Diferencia de ${this.formatearMonto(diferencia)} entre factura y liquidación`;
        }

        const detalles = this.detallesLiquidacion();
        if (detalles.length === 0) {
            return 'Sin detalles de liquidación registrados';
        }

        return 'Factura lista para liquidación';
    }

    /**
     * Obtener información de vencimiento
     */
    obtenerInfoVencimiento(): { mensaje: string; clase: string } {
        const factura = this.facturaActual();
        if (!factura || !factura.dias_transcurridos) {
            return { mensaje: 'Sin validar', clase: 'text-gray-600 bg-gray-50 border-gray-200' };
        }

        const dias = factura.dias_transcurridos;
        if (dias <= 30) {
            return {
                mensaje: `Dentro de tiempo (${dias} días)`,
                clase: 'text-green-700 bg-green-50 border-green-200'
            };
        } else {
            return {
                mensaje: `Fuera de tiempo (${dias} días)`,
                clase: 'text-red-700 bg-red-50 border-red-200'
            };
        }
    }
}