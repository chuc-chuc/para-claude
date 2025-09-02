// ============================================================================
// TABLA RETENCIONES SIMPLIFICADA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  Retencion,
  formatearMonto,
  formatearFecha
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-tabla-retenciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabla-retenciones.component.html',
})
export class TablaRetencionesComponent {
  @Input() retenciones: Retencion[] = [];
  @Input() loading = false;

  @Output() agregar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<Retencion>();
  @Output() eliminar = new EventEmitter<Retencion>();

  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;

  calcularTotal(): number {
    return this.retenciones.reduce((sum, ret) => sum + ret.monto, 0);
  }

  obtenerColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'ISR': 'bg-red-100 text-red-800',
      'IVA': 'bg-blue-100 text-blue-800',
      'IETAAP': 'bg-purple-100 text-purple-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  }

  obtenerTiposSummary(): { codigo: string; count: number }[] {
    const tipos = new Map<string, number>();

    this.retenciones.forEach(ret => {
      const codigo = ret.tipo_codigo || 'OTROS';
      tipos.set(codigo, (tipos.get(codigo) || 0) + 1);
    });

    return Array.from(tipos.entries()).map(([codigo, count]) => ({
      codigo,
      count
    }));
  }
}