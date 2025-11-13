// ============================================================================
// MODAL VER DETALLE DE TRANSFERENCIA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FacturaTransferenciaTesoreria, FormatHelper } from '../models/liquidaciones-tesoreria.models';

@Component({
    selector: 'app-modal-ver-detalle-transferencia',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal-ver-detalle-transferencia.component.html'
})
export class ModalVerDetalleTransferenciaComponent {
    @Input() factura: FacturaTransferenciaTesoreria | null = null;
    @Output() cerrar = new EventEmitter<void>();

    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
}