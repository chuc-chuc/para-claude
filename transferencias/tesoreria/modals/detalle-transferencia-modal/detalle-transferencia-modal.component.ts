// detalle-transferencia-modal.component.ts (NUEVO)

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PreviewJustificacionModalComponent } from '../../../../preview-justificacion-modal/preview-justificacion-modal.component';

import { TransferenciasService } from '../../../services/transferencias.service';
import {
    DetalleSolicitudResponse,
    FormatHelper
} from '../../../models/transferencias.models';

@Component({
    selector: 'app-detalle-transferencia-modal',
    standalone: true,
    imports: [CommonModule, PreviewJustificacionModalComponent],
    templateUrl: './detalle-transferencia-modal.component.html',
})
export class DetalleTransferenciaModalComponent implements OnInit, OnDestroy {

    @Input() solicitudId!: number;
    @Output() cerrar = new EventEmitter<void>();

    private readonly service = inject(TransferenciasService);
    private readonly destroy$ = new Subject<void>();

    readonly detalle = signal<DetalleSolicitudResponse | null>(null);
    readonly cargando = signal<boolean>(false);
    readonly mostrarPreview = signal<boolean>(false);
    readonly driveIdPreview = signal<string>('');

    readonly formatMonto = FormatHelper.formatMonto;
    readonly formatFecha = FormatHelper.formatFecha;
    readonly formatFechaHora = FormatHelper.formatFechaHora;
    readonly formatTamano = FormatHelper.formatTamano;
    readonly getEtiquetaEstado = FormatHelper.getEtiquetaEstado;
    readonly getColorEstado = FormatHelper.getColorEstado;
    readonly getEtiquetaArea = FormatHelper.getEtiquetaArea;

    ngOnInit(): void {
        this.cargarDetalle();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private cargarDetalle(): void {
        this.cargando.set(true);
        this.service.obtenerDetalleSolicitud(this.solicitudId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(detalle => {
                this.cargando.set(false);
                if (detalle) {
                    this.detalle.set(detalle);
                }
            });
    }

    verArchivo(driveId: string): void {
        this.driveIdPreview.set(driveId);
        this.mostrarPreview.set(true);
    }

    cerrarPreview(): void {
        this.mostrarPreview.set(false);
        this.driveIdPreview.set('');
    }

    onCerrar(): void {
        this.cerrar.emit();
    }
}