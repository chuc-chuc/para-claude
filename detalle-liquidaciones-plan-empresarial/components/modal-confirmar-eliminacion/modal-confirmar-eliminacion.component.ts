import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-confirmar-eliminacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-confirmar-eliminacion.component.html'
})
export class ModalConfirmarEliminacionComponent {
  @Input() titulo = 'Confirmar';
  @Input() mensaje = '¿Desea continuar?';
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}