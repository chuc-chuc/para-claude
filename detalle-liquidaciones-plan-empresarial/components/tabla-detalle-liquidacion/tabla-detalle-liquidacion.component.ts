import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tabla-detalle-liquidizacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tabla-detalle-liquidacion.component.html'
})
export class TablaDetalleLiquidizacionComponent {
  @Input() factura: any | null = null;
  @Input() detalles: any[] = [];
  @Input() agencias: any[] = [];
  @Input() tiposPago: any[] = [];
  @Input() habilitarAcciones = false;

  @Output() agregar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<number>();
  @Output() eliminar = new EventEmitter<number>();
  @Output() copiar = new EventEmitter<number>();
  @Output() guardarTodo = new EventEmitter<void>();
  @Output() cambiarFormaPago = new EventEmitter<{ index: number; tipo: string }>();

  trackById(i: number, r: any) { return r?.id ?? i; }

  onCambiarFormaPago(i: number, tipo: string) {
    this.cambiarFormaPago.emit({ index: i, tipo });
  }
}