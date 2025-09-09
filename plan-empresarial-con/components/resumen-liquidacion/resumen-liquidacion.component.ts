// ============================================================================
// COMPONENTE RESUMEN LIQUIDACIÓN - SIMPLIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-resumen-liquidacion',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div class="text-sm text-gray-700">
        <span class="font-medium">{{ count }}</span> registros
      </div>
      <div class="text-sm text-gray-700">
        <span class="font-semibold">Q{{ total | number:'1.2-2' }}</span>
        <span class="mx-1">/</span>
        <span>Q{{ montoFactura | number:'1.2-2' }}</span>
      </div>
      <span class="text-xs px-2 py-1 rounded-md" [ngClass]="claseEstado()">
        {{ estadoMonto | titlecase }}
      </span>
    </div>
  `
})
export class ResumenLiquidacionComponent {
    @Input() count = 0;
    @Input() total = 0;
    @Input() montoFactura = 0;
    @Input() estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';

    claseEstado(): string {
        const clases = {
            'completo': 'bg-green-100 text-green-800',
            'incompleto': 'bg-yellow-100 text-yellow-800',
            'excedido': 'bg-red-100 text-red-800'
        };
        return clases[this.estadoMonto] || 'bg-gray-100 text-gray-800';
    }
}