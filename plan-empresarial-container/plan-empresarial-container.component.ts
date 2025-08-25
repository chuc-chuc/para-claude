import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map } from 'rxjs';

import { OrdenesPlanEmpresarialComponent } from '../liquidacion-plan-empresarial/components/ordenes-plan-empresarial/ordenes-plan-empresarial.component';
import { DetalleFacturaPEComponent } from '../facturas-plan-empresarial/components/detalle-factura/detalle-factura.component';
import { DetalleLiquidizacionesPlanEmpresarialComponent } from '../detalle-liquidaciones-plan-empresarial/components/detalle-liquidaciones-plan-empresarial/detalle-liquidaciones-plan-empresarial.component';
import { PlanEmpresarialContainerFacade } from './plan-empresarial-container.facade';
import { FacturaPE, OrdenPlanEmpresarial, DetalleLiquidacionPE } from './shared/models/plan-empresarial.models';

@Component({
  selector: 'app-plan-empresarial-container',
  standalone: true,
  imports: [
    CommonModule,
    OrdenesPlanEmpresarialComponent,
    DetalleFacturaPEComponent,
    DetalleLiquidizacionesPlanEmpresarialComponent
  ],
  templateUrl: './plan-empresarial-container.component.html'
})
export class PlanEmpresarialContainerComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  // Streams del facade
  readonly ordenes$: Observable<OrdenPlanEmpresarial[]>;
  readonly cargandoOrdenes$: Observable<boolean>;

  readonly factura$: Observable<FacturaPE | null>;
  readonly loadingFactura$: Observable<boolean>;

  readonly detallesLiquidacion$: Observable<DetalleLiquidacionPE[]>;
  readonly loadingDetalles$: Observable<boolean>;
  readonly savingDetalles$: Observable<boolean>;

  readonly agencias$: Observable<any[]>;
  readonly tiposPago$: Observable<any[]>;
  readonly total$: Observable<number>;

  // Estado para sincronizar búsqueda entre componentes
  currentSearchText: string = '';

  // Estado derivado para liquidaciones (solo datos necesarios para la tabla)
  readonly datosLiquidacion$: Observable<{
    factura: FacturaPE | null;
    detalles: DetalleLiquidacionPE[];
    agencias: any[];
    tiposPago: any[];
    total: number;
    isLoading: boolean;
    isSaving: boolean;
    habilitarAcciones: boolean;
    estadoMonto: 'completo' | 'incompleto' | 'excedido';
  }>;

  constructor(private facade: PlanEmpresarialContainerFacade) {
    this.ordenes$ = this.facade.ordenes$;
    this.cargandoOrdenes$ = this.facade.cargandoOrdenes$;

    this.factura$ = this.facade.factura$;
    this.loadingFactura$ = this.facade.loadingFactura$;

    this.detallesLiquidacion$ = this.facade.detallesLiquidacion$;
    this.loadingDetalles$ = this.facade.loadingDetalles$;
    this.savingDetalles$ = this.facade.savingDetalles$;

    this.agencias$ = this.facade.agencias$;
    this.tiposPago$ = this.facade.tiposPago$;
    this.total$ = this.facade.total$;

    this.datosLiquidacion$ = combineLatest([
      this.factura$,
      this.detallesLiquidacion$,
      this.agencias$,
      this.tiposPago$,
      this.total$,
      this.loadingDetalles$,
      this.savingDetalles$
    ]).pipe(
      map(([factura, detalles, agencias, tiposPago, total, loading, saving]) => {
        const habilitarAcciones = !!factura && factura.estado_id !== 2; // 2 = Liquidado

        let estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
        if (factura && total > 0) {
          const diff = Math.abs(total - factura.monto_total);
          if (diff < 0.01) estadoMonto = 'completo';
          else if (total > factura.monto_total) estadoMonto = 'excedido';
        }

        return {
          factura,
          detalles,
          agencias,
          tiposPago,
          total,
          isLoading: loading,
          isSaving: saving,
          habilitarAcciones,
          estadoMonto
        };
      })
    );
  }

  ngOnInit(): void {
    this.facade.cargarCatalogos();
    this.facade.cargarOrdenes();
  }

  ngOnDestroy(): void {
    // Limpieza automática con takeUntilDestroyed
  }

  // === Eventos desde el componente de facturas ===
  onFacturaBuscada(numeroDte: string): void {
    this.currentSearchText = numeroDte;
    this.facade.buscarFactura(numeroDte);
  }

  onSearchTextChanged(searchText: string): void {
    this.currentSearchText = searchText;
  }

  onLiquidarFactura(): void {
    console.log('Liquidar factura solicitado');
  }

  // === Eventos para la tabla de liquidaciones ===
  onAgregarDetalle(): void {
    this.facade.agregarDetalle();
  }

  onEditarDetalle(index: number): void {
    // El modal es manejado dentro del componente de liquidaciones
  }

  onEliminarDetalle(index: number): void {
    this.facade.eliminarDetalle(index);
  }

  onCopiarDetalle(index: number): void {
    this.facade.copiarDetalle(index);
  }

  onGuardarTodo(): void {
    this.facade.guardarTodosLosDetalles().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(success => {
      if (success) console.log('Detalles guardados exitosamente');
    });
  }

  onCambiarFormaPago(event: { index: number; tipo: string }): void {
    this.facade.cambiarFormaPago(event.index, event.tipo);
  }

  onLimpiarDatos(): void {
    this.currentSearchText = '';
    this.facade.limpiarDatos();
  }

  onRefrescarOrdenes(): void {
    this.facade.cargarOrdenes();
  }
}