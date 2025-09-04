import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';

import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { FacturaPE } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-detalle-liquidizaciones-pe',
  standalone: true,
  imports: [
    CommonModule,
    TablaDetalleLiquidizacionComponent,
    ResumenLiquidacionComponent
  ],
  templateUrl: './detalle-liquidaciones-plan-empresarial.component.html',
})
export class DetalleLiquidizacionesPlanEmpresarialComponent {
  private facade = inject(PlanEmpresarialContainerFacade);

  factura$ = this.facade.factura$;
  detalles$ = this.facade.detallesLiquidacion$;
  total$ = this.facade.total$;
  loadingDetalles$ = this.facade.loadingDetalles$;
  savingDetalles$ = this.facade.savingDetalles$;

  datosResumen$ = combineLatest([
    this.factura$,
    this.detalles$,
    this.total$
  ]).pipe(
    map(([factura, detalles, total]) => ({
      cantidad: detalles.length,
      total,
      montoFactura: factura?.monto_total || 0,
      estadoMonto: this.calcularEstadoMonto(factura, total)
    }))
  );

  private calcularEstadoMonto(factura: FacturaPE | null, total: number): 'completo' | 'incompleto' | 'excedido' {
    if (!factura || total <= 0) return 'incompleto';
    const diff = Math.abs(total - factura.monto_total);
    if (diff < 0.01) return 'completo';
    if (total > factura.monto_total) return 'excedido';
    return 'incompleto';
  }
}