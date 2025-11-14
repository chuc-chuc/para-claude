import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CheckCircle, XCircle, X } from 'lucide-angular';
import { LiquidacionesModuloTesoreriaService } from '../../services/liquidaciones-modulo-tesoreria.service';

@Component({
    selector: 'app-modal-aprobar-rechazar-solicitud',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './modal-aprobar-rechazar-solicitud.component.html',
})
export class ModalAprobarRechazarSolicitudComponent {
    readonly service = inject(LiquidacionesModuloTesoreriaService);

    // ✅ CAMBIO: Ahora son @Input normales, no signals
    @Input({ required: true }) solicitud: any = null;
    @Input({ required: true }) accion: 'aprobar' | 'rechazar' = 'aprobar';

    @Output() cerrar = new EventEmitter<void>();
    @Output() confirmado = new EventEmitter<void>();

    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;
    readonly X = X;

    comentario = '';
    readonly procesando = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    confirmar(): void {
        this.error.set(null);

        // Validar comentario para rechazo
        if (this.accion === 'rechazar' && !this.comentario.trim()) {
            this.error.set('El comentario es requerido para rechazar');
            return;
        }

        this.procesando.set(true);

        const observable = this.accion === 'aprobar'
            ? this.service.aprobarSolicitudTransferencia(this.solicitud?.id, this.comentario)
            : this.service.rechazarSolicitudTransferencia(this.solicitud?.id, this.comentario);

        observable.subscribe({
            next: (exito) => {
                if (exito) {
                    this.confirmado.emit();
                } else {
                    this.error.set('Error al procesar la solicitud');
                }
                this.procesando.set(false);
            },
            error: (err) => {
                console.error('Error:', err);
                this.error.set('Error al procesar la solicitud');
                this.procesando.set(false);
            }
        });
    }
}