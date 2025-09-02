// ============================================================================
// TABLA DETALLES SIMPLIFICADA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  DetalleLiquidacion,
  formatearMonto,
  formatearFecha,
  obtenerTextoEstado,
  obtenerColorEstado
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-tabla-detalles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabla-detalles-verificacion.component.html',
})
export class TablaDetallesComponent {
  @Input() detalles: DetalleLiquidacion[] = [];
  @Input() loading = false;

  @Output() verificar = new EventEmitter<DetalleLiquidacion>();

  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;
  readonly obtenerTextoEstado = obtenerTextoEstado;
  readonly obtenerColorEstado = obtenerColorEstado;

  calcularTotal(): number {
    return this.detalles.reduce((sum, detalle) => sum + detalle.monto, 0);
  }

  calcularProgreso(): number {
    if (this.detalles.length === 0) return 0;
    const verificados = this.detalles.filter(d => d.estado_verificacion === 'verificado').length;
    return Math.round((verificados / this.detalles.length) * 100);
  }
}