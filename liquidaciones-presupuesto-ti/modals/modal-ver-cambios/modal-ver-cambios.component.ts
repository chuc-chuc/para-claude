// ============================================================================
// MODAL VER CAMBIOS - ACTUALIZADO PARA LIQUIDACIONES POR PRESUPUESTO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import {
  CambioSolicitado,
  DetalleLiquidacion,
  EstadosHelper,
  FormatHelper
} from '../../models/liquidaciones-presupuesto.models';
import { LiquidacionesPresupuestoService } from '../../services/liquidaciones-presupuesto.service';

@Component({
  selector: 'app-modal-ver-cambios-ti',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-ver-cambios.component.html',
  styles: [`
    /* Estilos adicionales si son necesarios */
    .scrollbar-thin {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      width: 6px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class ModalVerCambiosComponentti implements OnInit {
  @Input() detalle: DetalleLiquidacion | null = null;
  @Output() cerrar = new EventEmitter<void>();

  private readonly service = inject(LiquidacionesPresupuestoService);

  readonly cambios = signal<CambioSolicitado[]>([]);
  readonly cargando = signal<boolean>(false);

  // Métodos helper para el template
  readonly formatMonto = FormatHelper.formatMonto;
  readonly formatFechaHora = FormatHelper.formatFechaHora;
  readonly getTextoTipoCambio = EstadosHelper.getTextoTipoCambio;
  readonly getTextoEstadoCambio = EstadosHelper.getTextoEstadoCambio;
  readonly getColorEstadoCambio = EstadosHelper.getColorEstadoCambio;
  readonly getColorEstadoVerificacion = EstadosHelper.getColorEstadoVerificacion;

  ngOnInit(): void {
    if (this.detalle) {
      this.cargando.set(true);
      this.service.obtenerCambiosDetalle(this.detalle.id).subscribe({
        next: (cambios: CambioSolicitado[]) => {
          this.cambios.set(cambios);
          this.cargando.set(false);
        },
        error: (error) => {
          console.error('Error al obtener cambios:', error);
          this.cambios.set([]);
          this.cargando.set(false);
        }
      });
    }
  }

  /**
   * TrackBy function para optimizar el renderizado de cambios
   */
  trackByCambio(index: number, cambio: CambioSolicitado): number {
    return cambio.id || index;
  }

  /**
   * Obtiene el color para el tipo de cambio
   */
  getColorTipoCambio(tipo: string): string {
    switch (tipo) {
      case 'monto': return 'bg-green-100 text-green-700';
      case 'forma_pago': return 'bg-blue-100 text-blue-700';
      case 'beneficiario': return 'bg-purple-100 text-purple-700';
      case 'cuenta': return 'bg-indigo-100 text-indigo-700';
      case 'descripcion': return 'bg-orange-100 text-orange-700';
      case 'otro': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}