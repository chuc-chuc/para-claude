import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-resumen-liquidacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-liquidacion.component.html'
})
export class ResumenLiquidacionComponent {
  @Input() count = 0;
  @Input() total = 0;
  @Input() montoFactura = 0;
  @Input() estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';

  claseEstado() {
    return {
      'completo': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'incompleto': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'excedido': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }[this.estadoMonto] || '';
  }
}