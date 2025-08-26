// ============================================================================
// COMPONENTE CONTENEDOR - CON RECARGA AUTOMÁTICA CORREGIDA
// ============================================================================

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

  currentSearchText: string = '';

  private facturaActualValue: FacturaPE | null = null;
  private detallesActualesValue: DetalleLiquidacionPE[] = [];

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

    this.factura$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(factura => {
      this.facturaActualValue = factura;
    });

    this.detallesLiquidacion$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(detalles => {
      this.detallesActualesValue = detalles;
    });

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
        const habilitarAcciones = !!factura && factura.estado_id !== 2;

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

  // ============================================================================
  // EVENTOS DESDE EL COMPONENTE DE FACTURAS
  // ============================================================================

  onFacturaBuscada(numeroDte: string): void {
    this.currentSearchText = numeroDte;
    this.facade.buscarFactura(numeroDte);
  }

  onSearchTextChanged(searchText: string): void {
    this.currentSearchText = searchText;
  }

  onLiquidarFactura(): void {
    const facturaActual = this.facturaActual;

    if (facturaActual) {
      // Lógica adicional para el proceso de liquidación si es necesaria
    }
  }

  // ============================================================================
  // EVENTOS PARA LA TABLA DE LIQUIDACIONES - CORREGIDOS
  // ============================================================================

  onAgregarDetalle(): void {
    // El componente maneja la creación directamente
  }

  onEditarDetalle(index: number): void {
    if (index < 0 || index >= this.detallesActuales.length) return;
    // El modal es manejado dentro del componente de liquidaciones
  }

  onEliminarDetalle(index: number): void {
    if (index < 0 || index >= this.detallesActuales.length) return;

    const detalle = this.detallesActuales[index];
    this.facade.eliminarDetalle(index);
  }

  onCopiarDetalle(index: number): void {
    if (index < 0 || index >= this.detallesActuales.length) return;

    this.facade.copiarDetalle(index);
  }

  onGuardarTodo(): void {
    const totalDetalles = this.detallesActuales.length;
    if (totalDetalles === 0) return;

    this.facade.guardarTodosLosDetalles().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  onCambiarFormaPago(event: { index: number; tipo: string }): void {
    if (event.index < 0 || event.index >= this.detallesActuales.length) return;

    this.facade.cambiarFormaPago(event.index, event.tipo);
  }

  // ✅ NUEVO MÉTODO PARA ACTUALIZAR DETALLES LOCALMENTE
  onActualizarDetalle(event: { index: number; campo: string; valor: any }): void {
    if (event.index < 0 || event.index >= this.detallesActuales.length) return;

    // Actualizar el facade directamente
    const patch: any = {};
    patch[event.campo] = event.valor;
    this.facade.actualizarDetalle(event.index, patch);
  }

  // ✅ MÉTODO CORREGIDO PARA RECARGAR DETALLES
  onCargarDetalles(): void {
    // Debug: verificar que se está ejecutando
    const factura = this.facturaActual;
    if (factura) {
      // Llamar al facade para recargar
      this.facade.recargarDetalles();
    }
  }

  // ============================================================================
  // ACCIONES ADICIONALES
  // ============================================================================

  onLimpiarDatos(): void {
    this.currentSearchText = '';
    this.facade.limpiarDatos();
  }

  onRefrescarOrdenes(): void {
    this.facade.cargarOrdenes();
  }

  onRefrescarCatalogos(): void {
    this.facade.cargarCatalogos();
  }

  // ============================================================================
  // GETTERS PÚBLICOS
  // ============================================================================

  get facturaActual(): FacturaPE | null {
    return this.facturaActualValue;
  }

  get detallesActuales(): DetalleLiquidacionPE[] {
    return this.detallesActualesValue;
  }

  get tieneFacturaCargada(): boolean {
    return this.facturaActualValue !== null;
  }

  get totalActual(): number {
    return this.detallesActualesValue.reduce((sum, detalle) => sum + (detalle.monto || 0), 0);
  }

  get puedeEditarDetalles(): boolean {
    return this.tieneFacturaCargada && (this.facturaActual?.estado_id !== 2);
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS ADICIONALES
  // ============================================================================

  obtenerFacturaActual(): Observable<FacturaPE | null> {
    return this.facade.factura$;
  }

  obtenerDetallesActuales(): Observable<DetalleLiquidacionPE[]> {
    return this.facade.detallesLiquidacion$;
  }

  obtenerInfoEstadoFactura(): { texto: string; color: string; puedeEditar: boolean } {
    const factura = this.facturaActual;

    if (!factura) {
      return { texto: 'Sin factura', color: 'gray', puedeEditar: false };
    }

    switch (factura.estado_liquidacion) {
      case 'Liquidado':
        return { texto: 'Liquidado', color: 'green', puedeEditar: false };
      case 'En Revisión':
        return { texto: 'En Revisión', color: 'yellow', puedeEditar: true };
      case 'Pendiente':
      default:
        return { texto: 'Pendiente', color: 'blue', puedeEditar: true };
    }
  }

  obtenerResumenDetalles(): {
    total: number;
    cantidad: number;
    completos: number;
    incompletos: number;
    conId: number;
    sinId: number;
  } {
    const detalles = this.detallesActuales;

    return {
      total: this.totalActual,
      cantidad: detalles.length,
      completos: detalles.filter(d => d.numero_orden && d.agencia && d.descripcion && d.monto > 0).length,
      incompletos: detalles.filter(d => !d.numero_orden || !d.agencia || !d.descripcion || d.monto <= 0).length,
      conId: detalles.filter(d => d.id).length,
      sinId: detalles.filter(d => !d.id).length
    };
  }

  get infoEstado() {
    const resumen = this.obtenerResumenDetalles();
    const infoFactura = this.obtenerInfoEstadoFactura();

    return {
      factura: {
        existe: this.tieneFacturaCargada,
        numero: this.facturaActual?.numero_dte || 'ninguna',
        estado: infoFactura.texto,
        monto: this.facturaActual?.monto_total || 0
      },
      detalles: resumen,
      ui: {
        searchText: this.currentSearchText,
        puedeEditar: this.puedeEditarDetalles
      },
      facade: {
        cacheActivo: !!this.facade.getFacturaActual(),
        totalEnCache: this.facade.getTotalActual()
      }
    };
  }

  forzarRecarga(): void {
    this.facade.limpiarDatos();
    this.facade.cargarCatalogos();
    this.facade.cargarOrdenes();

    if (this.currentSearchText) {
      setTimeout(() => {
        this.facade.buscarFactura(this.currentSearchText);
      }, 1000);
    }
  }

  obtenerEstadoCompleto(): any {
    return {
      contenedor: this.infoEstado,
      facade: {
        ordenes: this.facade.getOrdenesActuales().length,
        factura: this.facade.getFacturaActual()?.numero_dte || null,
        detalles: this.facade.getDetallesActuales().length,
        total: this.facade.getTotalActual()
      }
    };
  }

  validarConsistencia(): boolean {
    const factureFacade = this.facade.getFacturaActual();
    const detallesFacade = this.facade.getDetallesActuales();
    const totalFacade = this.facade.getTotalActual();

    const facturaConsistente = this.facturaActual === factureFacade;
    const detallesConsistentes = this.detallesActuales.length === detallesFacade.length;
    const totalConsistente = Math.abs(this.totalActual - totalFacade) < 0.01;

    return facturaConsistente && detallesConsistentes && totalConsistente;
  }
}