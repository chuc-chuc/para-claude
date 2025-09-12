// ============================================================================
// FACTURAS GESTIÓN COMPONENT - CON VALIDACIÓN DE DÍAS HÁBILES AL BUSCAR
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import { DiasHabilesService } from '../../../../servicios/dias-habiles.service';
import { ModalRegistrarFacturaComponent } from '../modal-registrar-factura/modal-registrar-factura.component';
import { ModalSolicitarAutorizacionComponent } from '../modal-solicitar-autorizacion/modal-solicitar-autorizacion.component';

import {
    FacturaPE,
    DetalleLiquidacionPE,
    formatearMonto,
    formatearFecha,
    obtenerColorEstadoLiquidacion,
    obtenerColorEstadoAutorizacion,
    obtenerColorEstadoFactura,
    validarPermisosEdicion,
    PermisosEdicion
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
    private readonly diasHabilesService = inject(DiasHabilesService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE
    // ============================================================================

    readonly searchControl = new FormControl<string>('');
    readonly cargandoFactura = signal(false);
    readonly facturaActual = signal<FacturaPE | null>(null);
    readonly detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);
    readonly validacionDiasHabiles = signal<any>(null);

    // Estados de modales
    readonly mostrarModalRegistrar = signal(false);
    readonly mostrarModalAutorizacion = signal(false);

    // Utilidades de formato
    readonly formatearMonto = formatearMonto;
    readonly formatearFecha = formatearFecha;
    readonly obtenerColorEstadoLiquidacion = obtenerColorEstadoLiquidacion;
    readonly obtenerColorEstadoAutorizacion = obtenerColorEstadoAutorizacion;
    readonly obtenerColorEstadoFactura = obtenerColorEstadoFactura;

    // Computed para permisos de edición
    readonly permisosEdicion = computed(() => this.calcularPermisosEdicion());

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
        this.service.cargandoFactura$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoFactura.set(cargando));

        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => {
                console.log('FACTURA RECIBIDA EN COMPONENT:', factura);
                this.facturaActual.set(factura);

                // NUEVA LÓGICA: Validar días hábiles solo cuando se recibe una nueva factura
                if (factura && factura.fecha_emision) {
                    this.validarDiasHabiles(factura);
                } else {
                    this.validacionDiasHabiles.set(null);
                }
            });

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
    // NUEVA VALIDACIÓN DE DÍAS HÁBILES
    // ============================================================================

    private validarDiasHabiles(factura: FacturaPE): void {
        if (!factura.fecha_emision) {
            this.validacionDiasHabiles.set(null);
            return;
        }

        // Llamar al servicio de días hábiles solo una vez al buscar la factura
        this.diasHabilesService.validarVencimientoFactura(
            factura.fecha_emision,
            factura.estado_autorizacion === 'aprobada'
        ).subscribe({
            next: (validacion) => {
                console.log('VALIDACION DIAS HABILES:', validacion);
                this.validacionDiasHabiles.set(validacion);
            },
            error: (error) => {
                console.error('Error al validar días hábiles:', error);
                // En caso de error, crear validación básica usando datos del backend
                this.crearValidacionBasica(factura);
            }
        });
    }

    private crearValidacionBasica(factura: FacturaPE): void {
        const diasTranscurridos = factura.dias_transcurridos || 0;
        const diasPermitidos = 30; // Valor por defecto
        const excedeDias = diasTranscurridos > diasPermitidos;

        const validacionBasica = {
            excedeDias,
            diasTranscurridos,
            requiereAutorizacion: excedeDias && factura.estado_autorizacion !== 'aprobada',
            mensaje: excedeDias
                ? (factura.estado_autorizacion === 'aprobada'
                    ? `Factura autorizada para liquidación tardía (${diasTranscurridos} días hábiles)`
                    : `Fuera de tiempo (${diasTranscurridos} días hábiles)`)
                : `Dentro de tiempo (${diasTranscurridos} días hábiles)`,
            claseCSS: excedeDias
                ? (factura.estado_autorizacion === 'aprobada'
                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                    : 'text-red-700 bg-red-50 border-red-200')
                : 'text-green-700 bg-green-50 border-green-200',
            fechaInicioCalculo: factura.fecha_emision
        };

        console.log('VALIDACION BASICA CREADA:', validacionBasica);
        this.validacionDiasHabiles.set(validacionBasica);
    }

    // ============================================================================
    // CÁLCULO DE PERMISOS DE EDICIÓN
    // ============================================================================

    private calcularPermisosEdicion(): PermisosEdicion {
        const factura = this.facturaActual();
        const validacionDias = this.validacionDiasHabiles();

        console.log('CALCULANDO PERMISOS CON:', {
            factura: factura,
            validacionDias: validacionDias
        });

        const permisos = validarPermisosEdicion(factura, validacionDias);
        console.log('PERMISOS CALCULADOS:', permisos);

        return permisos;
    }

    // ============================================================================
    // ACCIONES PRINCIPALES
    // ============================================================================

    buscarManual(): void {
        const termino = (this.searchControl.value || '').trim();
        if (termino) {
            this.buscarFactura(termino);
        }
    }

    private buscarFactura(numeroDte: string): void {
        this.service.buscarFactura(numeroDte).subscribe();
    }

    limpiarBusqueda(): void {
        this.searchControl.setValue('', { emitEvent: false });
        this.service.limpiarFactura();
        this.validacionDiasHabiles.set(null);
    }

    // ============================================================================
    // GESTIÓN DE MODALES
    // ============================================================================

    abrirModalRegistrar(): void {
        this.mostrarModalRegistrar.set(true);
    }

    cerrarModalRegistrar(): void {
        this.mostrarModalRegistrar.set(false);
    }

    abrirModalAutorizacion(): void {
        this.mostrarModalAutorizacion.set(true);
    }

    cerrarModalAutorizacion(): void {
        this.mostrarModalAutorizacion.set(false);
    }

    // ============================================================================
    // LÓGICA DE VALIDACIÓN Y UTILIDADES
    // ============================================================================

    requiereAutorizacion(factura: FacturaPE): boolean {
        const validacion = this.validacionDiasHabiles();
        return validacion?.requiereAutorizacion || false;
    }

    calcularTotalDetalles(): number {
        const total = this.detallesLiquidacion().reduce((total, d) => total + (d.monto || 0), 0);
        return total;
    }

    hayDiferenciaMontos(): boolean {
        const factura = this.facturaActual();
        if (!factura) return false;
        const diferencia = Math.abs(factura.monto_total - this.calcularTotalDetalles());
        return diferencia > 0.01;
    }

    obtenerMensajeEstado(): string {
        const factura = this.facturaActual();
        if (!factura) return '';

        if (factura.estado_liquidacion === 'Liquidado') {
            return 'Factura completamente liquidada';
        }
        if (factura.estado_liquidacion === 'Pagado') {
            return 'Factura liquidada y pagada';
        }
        if (factura.estado_liquidacion === 'Verificado') {
            return 'Factura verificada, pendiente de pago';
        }
        if (this.hayDiferenciaMontos()) {
            const diferencia = Math.abs(factura.monto_total - this.calcularTotalDetalles());
            return `Diferencia de ${this.formatearMonto(diferencia)} entre factura y liquidación`;
        }
        if (this.detallesLiquidacion().length === 0) {
            return 'Sin detalles de liquidación registrados';
        }
        return 'Factura lista para liquidación';
    }

    obtenerInfoVencimiento(): { mensaje: string; clase: string } {
        const validacion = this.validacionDiasHabiles();
        if (!validacion) {
            return { mensaje: 'Validando tiempo...', clase: 'text-gray-600 bg-gray-50 border-gray-200' };
        }
        return { mensaje: validacion.mensaje, clase: validacion.claseCSS };
    }

    obtenerMontoRetencion(): number {
        const factura = this.facturaActual();
        return factura?.monto_retencion || 0;
    }

    // ============================================================================
    // MÉTODOS PARA PERMISOS DE EDICIÓN
    // ============================================================================

    puedeEditarDetalles(): boolean {
        return this.permisosEdicion().puedeEditar;
    }

    puedeAgregarDetalles(): boolean {
        return this.permisosEdicion().puedeAgregar;
    }

    puedeEliminarDetalles(): boolean {
        return this.permisosEdicion().puedeEliminar;
    }

    obtenerMensajePermisos(): string {
        return this.permisosEdicion().razon;
    }

    obtenerClasePermisos(): string {
        return this.permisosEdicion().claseCSS;
    }

    // ============================================================================
    // EVENTOS DE COMPONENTES HIJOS
    // ============================================================================

    onFacturaRegistrada(): void {
        this.cerrarModalRegistrar();
    }

    onSolicitudEnviada(): void {
        this.cerrarModalAutorizacion();
        const factura = this.facturaActual();
        if (factura?.numero_dte) {
            this.buscarFactura(factura.numero_dte);
        }
    }

    // ============================================================================
    // INFORMACIÓN ADICIONAL DE LA FACTURA
    // ============================================================================

    obtenerEstadisticasFactura(): any {
        const factura = this.facturaActual();
        const detalles = this.detallesLiquidacion();

        if (!factura) return null;

        const totalLiquidado = this.calcularTotalDetalles();
        const montoRetencion = this.obtenerMontoRetencion();
        const montoPendiente = factura.monto_total - totalLiquidado;

        return {
            montoTotal: factura.monto_total || 0,
            montoLiquidado: totalLiquidado || 0,
            totalLiquidado: totalLiquidado || 0,
            montoRetencion: montoRetencion || 0,
            montoPendiente: montoPendiente || 0,
            cantidadDetalles: detalles.length || 0,
            cantidadLiquidacionesRegistradas: factura.cantidad_liquidaciones || 0,
            porcentajeLiquidado: factura.monto_total > 0 ? (totalLiquidado / factura.monto_total) * 100 : 0
        };
    }
}