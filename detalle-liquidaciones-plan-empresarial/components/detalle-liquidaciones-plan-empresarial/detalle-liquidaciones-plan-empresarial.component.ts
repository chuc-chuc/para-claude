import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ChangeDetectorRef } from '@angular/core';
import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';


@Component({
  selector: 'app-detalle-liquidizaciones-pe',
  standalone: true,
  imports: [
    CommonModule,
    TablaDetalleLiquidizacionComponent,
    ModalDetalleLiquidizacionComponent,
    ModalConfirmarEliminacionComponent,
    ResumenLiquidacionComponent
  ],
  templateUrl: './detalle-liquidaciones-plan-empresarial.component.html'
})
export class DetalleLiquidizacionesPlanEmpresarialComponent {
  // === DATOS EXTERNOS (mínimos) ===
  @Input() factura: any | null = null;
  @Input() detalles: any[] = [];
  @Input() agencias: any[] = [];
  @Input() tiposPago: any[] = [];
  @Input() total = 0;
  @Input() montoFactura = 0;
  @Input() isLoading = false;
  @Input() isSaving = false;
  @Input() habilitarAcciones = false;
  @Input() estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
  @Input() ordenesAutorizadas: any[] = [];

  // === EVENTOS HACIA EL PADRE ===
  @Output() agregarDetalle = new EventEmitter<void>();
  @Output() editarDetalle = new EventEmitter<number>();
  @Output() eliminarDetalle = new EventEmitter<number>();
  @Output() copiarDetalle = new EventEmitter<number>();
  @Output() guardarTodo = new EventEmitter<void>();
  @Output() cambiarFormaPago = new EventEmitter<{ index: number; tipo: string }>();

  // === ESTADO DE MODALES ===
  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: any | null = null;
  indexEnEdicion: number | null = null;

  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  constructor(private cdr: ChangeDetectorRef) { }

  // === HANDLERS DE TABLA ===
  onAgregar() {
    this.agregarDetalle.emit();
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);
  }

  onEditar(index: number) {
    if (index < 0 || index >= this.detalles.length) return;
    this.editarDetalle.emit(index);
    this.indexEnEdicion = index;
    this.registroEnEdicion = this.detalles[index] ? { ...this.detalles[index] } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);
  }

  onEliminar(index: number) {
    if (index < 0 || index >= this.detalles.length) return;
    this.indexAEliminar = index;
    this.mostrarModalEliminar.set(true);
  }

  onCopiar(index: number) {
    if (index < 0 || index >= this.detalles.length) return;
    this.copiarDetalle.emit(index);
  }

  onCambiarFormaPago(event: { index: number; tipo: string }) {
    if (event.index < 0 || event.index >= this.detalles.length) return;
    this.cambiarFormaPago.emit(event);
  }

  onGuardarTodo() {
    if (this.detalles.length === 0) return;
    this.guardarTodo.emit();
  }

  // === HANDLERS MODAL DETALLE ===
  onGuardarDesdeModal(registro: any) {
    if (this.modoModal() === 'crear') {
      this.agregarDetalle.emit();
    } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
      registro.index = this.indexEnEdicion;
      this.editarDetalle.emit(this.indexEnEdicion);
    }
    this.cerrarModalDetalle();
  }

  onCancelarModal() {
    if (this.modoModal() === 'crear') {
      const ultimoIndex = this.detalles.length - 1;
      if (ultimoIndex >= 0) this.eliminarDetalle.emit(ultimoIndex);
    }
    this.cerrarModalDetalle();
  }

  private cerrarModalDetalle() {
    this.mostrarModalDetalle.set(false);
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.cdr.detectChanges();
  }

  // === HANDLERS MODAL ELIMINACIÓN ===
  onConfirmarEliminar() {
    if (this.indexAEliminar !== null) this.eliminarDetalle.emit(this.indexAEliminar);
    this.cerrarModalEliminar();
  }

  onCancelarEliminar() {
    this.cerrarModalEliminar();
  }

  private cerrarModalEliminar() {
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
    this.cdr.detectChanges();
  }

  // === Utilidades ===
  obtenerFacturaActualId(): number | null {
    return this.factura?.id || null;
  }

  obtenerTotalMontoRegistros(): number {
    return this.total;
  }
}