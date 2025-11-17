import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CheckCircle, XCircle, X, AlertCircle } from 'lucide-angular';

import { SolicitudTransferencia, FormatHelper } from '../../models/liquidaciones-modulo-tesoreria.models';
import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

@Component({
    selector: 'app-modal-aprobar-rechazar-solicitud',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,           // ← para [(ngModel)]
        LucideAngularModule    // ← para lucide-icon
    ],
    templateUrl: './modal-aprobar-rechazar-solicitud.component.html',
})
export class ModalAprobarRechazarSolicitudComponent {
    @Input({ required: true }) solicitud!: SolicitudTransferencia;
    @Input({ required: true }) accion!: 'aprobar' | 'rechazar';
    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    private readonly service = inject(LiquidacionesModuloTesoreriaService);

    comentario = '';
    procesando = signal(false);
    error = signal<string | null>(null);

    // Íconos
    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;
    readonly X = X;
    readonly AlertCircle = AlertCircle;

    // Helper estático → se accede con FormatHelper directamente
    readonly formatMonto = FormatHelper.formatMonto;

    confirmar(): void {
        if (this.procesando()) return;

        this.procesando.set(true);
        this.error.set(null);

        const observable = this.accion === 'aprobar'
            ? this.service.aprobarSolicitudTransferencia(this.solicitud.id, this.comentario.trim() || undefined)
            : this.service.rechazarSolicitudTransferencia(this.solicitud.id, this.comentario.trim());

        observable.subscribe({
            next: (exito: boolean) => {  // ← tipado explícito
                if (exito) {
                    this.confirmado.emit();
                } else {
                    this.error.set('Ocurrió un error al procesar la solicitud');
                }
            },
            error: () => this.error.set('Error de conexión o servidor'),
            complete: () => this.procesando.set(false)
        });
    }
}