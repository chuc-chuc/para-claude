// ============================================================================
// MODAL VER DETALLE COMPLETO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
    DetalleLiquidacion,
    FacturaResumen,
    RetencionFactura,
    FormatHelper,
    EstadosHelper
} from '../../models/liquidaciones-presupuesto.models';

@Component({
  selector: 'app-modal-ver-detalle-ti',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal-ver-detalle.component.html',
    styles: [`
    /* Estilos adicionales si son necesarios */
    .scrollbar-thin {
      scrollbar-width: thin;
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
export class ModalVerDetalleComponentti {
    @Input() detalle: DetalleLiquidacion | null = null;
    @Input() factura: FacturaResumen | null = null;
    @Input() retenciones: RetencionFactura[] = [];

    @Output() cerrar = new EventEmitter<void>();

    // Métodos de formato y colores
    formatMonto = FormatHelper.formatMonto;
    formatFecha = FormatHelper.formatFecha;
    formatFechaHora = FormatHelper.formatFechaHora;
    getColorEstadoVerificacion = EstadosHelper.getColorEstadoVerificacion;
    getColorEstadoLiquidacion = EstadosHelper.getColorEstadoLiquidacion;
    getColorFormaPago = EstadosHelper.getColorFormaPago;

    /**
     * Verifica si el detalle tiene información de pago
     */
    tieneInfoPago(): boolean {
        if (!this.detalle) return false;

        const { forma_pago } = this.detalle;

        switch (forma_pago) {
            case 'deposito':
                return !!(this.detalle.id_socio || this.detalle.nombre_socio || this.detalle.numero_cuenta_deposito);

            case 'transferencia':
                return !!(this.detalle.nombre_cuenta || this.detalle.numero_cuenta || this.detalle.nombre_banco);

            case 'cheque':
                return !!(this.detalle.nombre_beneficiario || this.detalle.consignacion);

            default:
                return false;
        }
    }

    /**
     * Verifica si el detalle tiene información de presupuesto
     */
    tieneInfoPresupuesto(): boolean {
        if (!this.detalle) return false;

        return !!(
            this.detalle.nombre_presupuesto ||
            this.detalle.cuenta_contable ||
            this.detalle.area_presupuesto ||
            this.detalle.total_anticipos > 0
        );
    }

    /**
     * Verifica si el detalle tiene información de tesorería
     */
    tieneInfoTesoreria(): boolean {
        if (!this.detalle) return false;

        return !!(
            this.detalle.comprobante_tesoreria ||
            this.detalle.fecha_transferencia ||
            this.detalle.nombre
        );
    }
}