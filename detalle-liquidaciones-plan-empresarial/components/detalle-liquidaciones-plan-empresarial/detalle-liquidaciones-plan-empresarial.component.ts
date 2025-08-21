// components/detalle-liquidaciones-plan-empresarial/detalle-liquidaciones-plan-empresarial.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ToolbarLiquidacionComponent } from '../toolbar-liquidacion/toolbar-liquidacion.component';
import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';
import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';

@Component({
  selector: 'app-detalle-liquidizaciones-pe',
  standalone: true,
  imports: [
    CommonModule,
    ToolbarLiquidacionComponent,
    TablaDetalleLiquidizacionComponent,
    ResumenLiquidacionComponent,
    ModalDetalleLiquidizacionComponent,
    ModalConfirmarEliminacionComponent
  ],
  templateUrl: './detalle-liquidaciones-plan-empresarial.component.html'
})
export class DetalleLiquidizacionesPlanEmpresarialComponent {
  // === DATOS EXTERNOS (del padre/facade) ===
  @Input() factura: any | null = null;
  @Input() detalles: any[] = [];
  @Input() agencias: any[] = [];
  @Input() tiposPago: any[] = [];
  @Input() isLoading = false;
  @Input() isSaving = false; // Nuevo: para mostrar estado de guardado
  @Input() estadoLiquidacion: string | null = null;
  @Input() ocultarBotonLiquidar = false;
  @Input() habilitarAcciones = false;

  // === TOTALES Y ESTADO ===
  @Input() total = 0;
  @Input() montoFactura = 0;
  @Input() estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
  @Input() searchText = '';

  // === EVENTOS HACIA EL PADRE ===
  @Output() buscarDTE = new EventEmitter<string>();
  @Output() liquidarClick = new EventEmitter<void>();
  @Output() registrarFacturaClick = new EventEmitter<void>();
  @Output() limpiarClick = new EventEmitter<void>();

  @Output() agregarDetalle = new EventEmitter<void>();
  @Output() editarDetalle = new EventEmitter<number>();
  @Output() eliminarDetalle = new EventEmitter<number>();
  @Output() copiarDetalle = new EventEmitter<number>();
  @Output() guardarTodo = new EventEmitter<void>();
  @Output() cambiarFormaPago = new EventEmitter<{ index: number; tipo: string }>();

  // === ESTADO DE MODALES (local) ===
  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: any | null = null;
  indexEnEdicion: number | null = null;

  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  // === HANDLERS PARA COORDINAR SUBCOMPONENTES ===
  onAgregar() {
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);

    // Notificar al padre (opcional, para logging o validaciones adicionales)
    this.agregarDetalle.emit();
  }

  onEditar(index: number) {
    this.indexEnEdicion = index;
    this.registroEnEdicion = this.detalles[index] ? { ...this.detalles[index] } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);

    // Notificar al padre
    this.editarDetalle.emit(index);
  }

  onEliminar(index: number) {
    this.indexAEliminar = index;
    this.mostrarModalEliminar.set(true);
  }

  onConfirmarEliminar() {
    if (this.indexAEliminar !== null) {
      this.eliminarDetalle.emit(this.indexAEliminar);
    }
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
  }

  onCancelarEliminar() {
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
  }

  onGuardarDesdeModal(registro: any) {
    // El padre manejará la persistencia real
    // Aquí solo cerramos el modal
    this.mostrarModalDetalle.set(false);

    // Si es modo crear, agregamos localmente al array
    // Si es modo editar, actualizamos el registro
    if (this.modoModal() === 'crear') {
      // El padre ya agregó el registro base, aquí podríamos actualizar con los datos del formulario
      // pero delegamos esa lógica al padre
    } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
      // Similar para edición, el padre maneja la actualización
    }
  }

  onCancelarModal() {
    this.mostrarModalDetalle.set(false);
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
  }

  // === DELEGACIÓN DIRECTA AL PADRE ===
  onCopiar(index: number) {
    this.copiarDetalle.emit(index);
  }

  onCambiarFormaPago(event: { index: number; tipo: string }) {
    this.cambiarFormaPago.emit(event);
  }

  onGuardarTodo() {
    this.guardarTodo.emit();
  }

  onBuscarDTE(numeroDte: string) {
    this.buscarDTE.emit(numeroDte);
  }

  onLiquidar() {
    this.liquidarClick.emit();
  }

  onRegistrarFactura() {
    this.registrarFacturaClick.emit();
  }

  onLimpiar() {
    this.limpiarClick.emit();
  }
}