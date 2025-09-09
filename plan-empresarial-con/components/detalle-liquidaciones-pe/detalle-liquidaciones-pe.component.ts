// ============================================================================
// DETALLE LIQUIDACIONES - USANDO SERVICIO SIMPLIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { TablaDetalleLiquidacionesComponent } from '../tabla-detalle-liquidaciones/tabla-detalle-liquidaciones.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';

import { FacturasPlanEmpresarialService } from '../../services/facturas-plan-empresarial.service';
import { FacturaPE, DetalleLiquidacionPE } from '../../models/facturas-plan-empresarial.models';

@Component({
    selector: 'app-detalle-liquidizaciones-pe',
    standalone: true,
    imports: [
        CommonModule,
        TablaDetalleLiquidacionesComponent,
        ResumenLiquidacionComponent
    ],
    template: `
    <section class="w-full space-y-4 mt-2">
      <!-- Tabla de liquidaciones -->
      <app-tabla-detalle-liquidaciones></app-tabla-detalle-liquidaciones>

      <!-- Resumen -->
      <app-resumen-liquidacion 
        *ngIf="datosResumen() as datos" 
        [count]="datos.cantidad" 
        [total]="datos.total"
        [montoFactura]="datos.montoFactura" 
        [estadoMonto]="datos.estadoMonto">
      </app-resumen-liquidacion>

      <!-- Indicadores de estado -->
      <div *ngIf="cargandoDetalles()" 
        class="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div class="flex items-center space-x-3">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700 dark:text-gray-200">Cargando detalles...</span>
          </div>
        </div>
      </div>

      <div *ngIf="procesandoLiquidacion()" 
        class="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm">Procesando liquidación...</span>
      </div>
    </section>
  `
})
export class DetalleLiquidizacionesPlanEmpresarialComponent implements OnInit, OnDestroy {

    private readonly service = inject(FacturasPlanEmpresarialService);
    private readonly destroy$ = new Subject<void>();

    // ============================================================================
    // ESTADO DEL COMPONENTE CON SIGNALS
    // ============================================================================

    readonly facturaActual = signal<FacturaPE | null>(null);
    readonly detallesLiquidacion = signal<DetalleLiquidacionPE[]>([]);
    readonly cargandoDetalles = signal<boolean>(false);
    readonly procesandoLiquidacion = signal<boolean>(false);
    readonly datosResumen = signal<{
        cantidad: number;
        total: number;
        montoFactura: number;
        estadoMonto: 'completo' | 'incompleto' | 'excedido';
    }>({
        cantidad: 0,
        total: 0,
        montoFactura: 0,
        estadoMonto: 'incompleto'
    });

    ngOnInit(): void {
        this.inicializarSuscripciones();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarSuscripciones(): void {
        // Suscripción a la factura actual
        this.service.facturaActual$
            .pipe(takeUntil(this.destroy$))
            .subscribe(factura => {
                this.facturaActual.set(factura);
                this.actualizarResumen();
            });

        // Suscripción a los detalles de liquidación
        this.service.detallesLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(detalles => {
                this.detallesLiquidacion.set(detalles);
                this.actualizarResumen();
            });

        // Suscripción a estados de carga
        this.service.cargandoDetalles$
            .pipe(takeUntil(this.destroy$))
            .subscribe(cargando => this.cargandoDetalles.set(cargando));

        this.service.procesandoLiquidacion$
            .pipe(takeUntil(this.destroy$))
            .subscribe(procesando => this.procesandoLiquidacion.set(procesando));
    }

    // ============================================================================
    // MÉTODOS PRIVADOS
    // ============================================================================

    private actualizarResumen(): void {
        const factura = this.facturaActual();
        const detalles = this.detallesLiquidacion();

        const total = detalles.reduce((sum, detalle) => sum + (detalle.monto || 0), 0);
        const montoFactura = factura?.monto_total || 0;
        const estadoMonto = this.calcularEstadoMonto(factura, total);

        this.datosResumen.set({
            cantidad: detalles.length,
            total,
            montoFactura,
            estadoMonto
        });
    }

    private calcularEstadoMonto(factura: FacturaPE | null, total: number): 'completo' | 'incompleto' | 'excedido' {
        if (!factura || total <= 0) return 'incompleto';

        const diferencia = Math.abs(total - factura.monto_total);
        if (diferencia < 0.01) return 'completo'; // Tolerancia de 1 centavo
        if (total > factura.monto_total) return 'excedido';

        return 'incompleto';
    }

    // ============================================================================
    // MÉTODOS PÚBLICOS (para acceso desde componentes hijos si es necesario)
    // ============================================================================

    /**
     * Verificar si hay una factura cargada
     */
    tieneFactura(): boolean {
        return this.facturaActual() !== null;
    }

    /**
     * Obtener total de detalles
     */
    getTotalDetalles(): number {
        return this.datosResumen().total;
    }

    /**
     * Verificar si los montos cuadran
     */
    montosCuadran(): boolean {
        return this.datosResumen().estadoMonto === 'completo';
    }

    /**
     * Obtener diferencia de montos
     */
    getDiferenciaMontos(): number {
        const datos = this.datosResumen();
        return Math.abs(datos.total - datos.montoFactura);
    }
}