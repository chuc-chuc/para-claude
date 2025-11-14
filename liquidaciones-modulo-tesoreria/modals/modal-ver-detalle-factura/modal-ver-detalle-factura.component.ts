// ============================================================================
// MODAL: VER DETALLE COMPLETO DE FACTURA
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { LucideAngularModule, X, FileText, DollarSign, MinusCircle, CheckCircle2, AlertCircle } from 'lucide-angular';

import {
    FacturaConSolicitud,
    FormatHelper
} from '../../models/liquidaciones-modulo-tesoreria.models';

@Component({
    selector: 'app-modal-ver-detalle-factura',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './modal-ver-detalle-factura.component.html',
    styleUrls: ['./modal-ver-detalle-factura.component.css']
})
export class ModalVerDetalleFacturaComponent {

    @Input() factura: FacturaConSolicitud | null = null;
    @Output() cerrar = new EventEmitter<void>();

    readonly X = X;
    readonly FileText = FileText;
    readonly DollarSign = DollarSign;
    readonly MinusCircle = MinusCircle;
    readonly CheckCircle2 = CheckCircle2;
    readonly AlertCircle = AlertCircle;

    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly truncateText = FormatHelper.truncateText;
    readonly getEtiquetaTipo = FormatHelper.getEtiquetaTipo;
    readonly getColorTipo = FormatHelper.getColorTipo;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstadoSolicitud;
    readonly getColorEstado = FormatHelper.getColorEstadoSolicitud;
    readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

    tieneSolicitud = computed(() => this.factura?.solicitud !== null);
    tieneTransferencias = computed(() => this.factura && this.factura.transferencias.length > 0);
    tieneRetenciones = computed(() => this.factura && this.factura.retenciones.length > 0);

    onCerrar(): void {
        this.cerrar.emit();
    }

    onClickModal(event: Event): void {
        event.stopPropagation();
    }
}