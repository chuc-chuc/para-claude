import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    @Input({ required: true }) factura!: FacturaConSolicitud; // ← Siempre llega (el *ngIf lo garantiza)
    @Output() cerrar = new EventEmitter<void>();

    // Iconos agrupados
    readonly icons = { X, FileText, DollarSign, MinusCircle, CheckCircle2, AlertCircle };

    // Helpers expuestos al template
    readonly FormatHelper = FormatHelper;

    // Computed reactivos
    readonly tieneSolicitud = computed(() => !!this.factura.solicitud);
    readonly tieneTransferencias = computed(() => this.factura.transferencias.length > 0);
    readonly tieneRetenciones = computed(() => this.factura.retenciones.length > 0);

    onCerrar(): void {
        this.cerrar.emit();
    }

    onClickModal(event: Event): void {
        event.stopPropagation();
    }
}