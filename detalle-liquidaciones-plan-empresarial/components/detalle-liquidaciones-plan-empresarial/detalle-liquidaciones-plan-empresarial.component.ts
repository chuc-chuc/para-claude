// components/detalle-liquidaciones-plan-empresarial/detalle-liquidaciones-plan-empresarial.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ChangeDetectorRef } from '@angular/core';
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

  // === DATOS EXTERNOS (del contenedor padre) ===
  @Input() factura: any | null = null;
  @Input() detalles: any[] = [];
  @Input() agencias: any[] = [];
  @Input() tiposPago: any[] = [];
  @Input() total = 0;
  @Input() montoFactura = 0;
  @Input() isLoading = false;
  @Input() isSaving = false;
  @Input() estadoLiquidacion: string | null = null;
  @Input() habilitarAcciones = false;
  @Input() estadoMonto: 'completo' | 'incompleto' | 'excedido' = 'incompleto';
  @Input() ocultarBotonLiquidar = false;
  @Input() searchText = '';
  @Input() ordenesAutorizadas: any[] = [];

  // === EVENTOS HACIA EL CONTENEDOR PADRE ===
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

  // === ESTADO DE MODALES (local al componente) ===
  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: any | null = null;
  indexEnEdicion: number | null = null;

  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  constructor(private cdr: ChangeDetectorRef) { }

  // === HANDLERS PARA GESTIÓN DE DETALLES ===

  onAgregar() {
    console.log('🟢 Agregando nuevo detalle');

    // Notificar al padre que agregue un detalle temporal
    this.agregarDetalle.emit();

    // Preparar modal para crear
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);

    console.log('🟢 Modal de detalle abierto para crear');
  }

  onEditar(index: number) {
    console.log('🟡 Editando detalle en índice:', index);

    if (index < 0 || index >= this.detalles.length) {
      console.error('❌ Índice de edición inválido:', index);
      return;
    }

    // Notificar al padre (opcional, para logging)
    this.editarDetalle.emit(index);

    // Preparar modal para editar
    this.indexEnEdicion = index;
    this.registroEnEdicion = this.detalles[index] ? { ...this.detalles[index] } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);

    console.log('🟡 Modal de detalle abierto para editar:', this.registroEnEdicion);
  }

  onEliminar(index: number) {
    console.log('🔴 Solicitando eliminar detalle en índice:', index);

    if (index < 0 || index >= this.detalles.length) {
      console.error('❌ Índice de eliminación inválido:', index);
      return;
    }

    this.indexAEliminar = index;
    this.mostrarModalEliminar.set(true);
  }

  onCopiar(index: number) {
    console.log('📋 Copiando detalle en índice:', index);

    if (index < 0 || index >= this.detalles.length) {
      console.error('❌ Índice de copia inválido:', index);
      return;
    }

    // Delegar al padre
    this.copiarDetalle.emit(index);
  }

  // === HANDLERS PARA MODALES ===

  onGuardarDesdeModal(registro: any) {
    console.log('💾 Guardando registro desde modal:', registro);
    console.log('🔧 Modo actual:', this.modoModal());

    try {
      if (this.modoModal() === 'crear') {
        // Para crear, el padre maneja la lógica
        console.log('📝 Creando nuevo registro');
        // El padre ya agregó el registro temporal, aquí solo enviamos los datos
      } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
        // Para editar, enviar índice y datos al padre
        console.log('✏️ Editando registro existente en índice:', this.indexEnEdicion);
        registro.index = this.indexEnEdicion; // Agregar índice al registro
      }

      // Emitir evento al padre con los datos
      if (this.modoModal() === 'crear') {
        this.agregarDetalle.emit(); // El padre maneja la creación
      } else {
        this.editarDetalle.emit(this.indexEnEdicion!); // El padre maneja la edición
      }

      // Cerrar modal
      this.cerrarModalDetalle();

      console.log('✅ Registro enviado al padre exitosamente');
    } catch (error) {
      console.error('❌ Error al guardar registro desde modal:', error);
    }
  }

  onCancelarModal() {
    console.log('❌ Cancelando modal de detalle');

    // Si estamos creando, notificar al padre para que elimine el temporal
    if (this.modoModal() === 'crear') {
      const ultimoIndex = this.detalles.length - 1;
      if (ultimoIndex >= 0) {
        console.log('🗑️ Solicitando eliminar registro temporal en índice:', ultimoIndex);
        this.eliminarDetalle.emit(ultimoIndex);
      }
    }

    this.cerrarModalDetalle();
  }

  private cerrarModalDetalle() {
    this.mostrarModalDetalle.set(false);
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.cdr.detectChanges();
  }

  // === HANDLERS PARA MODAL DE ELIMINACIÓN ===

  onConfirmarEliminar() {
    if (this.indexAEliminar !== null) {
      console.log('🗑️ Confirmando eliminación en índice:', this.indexAEliminar);

      // Delegar al padre
      this.eliminarDetalle.emit(this.indexAEliminar);

      console.log('✅ Solicitud de eliminación enviada al padre');
    }

    this.cerrarModalEliminar();
  }

  onCancelarEliminar() {
    console.log('❌ Cancelando eliminación');
    this.cerrarModalEliminar();
  }

  private cerrarModalEliminar() {
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
    this.cdr.detectChanges();
  }

  // === HANDLERS PARA ACCIONES DE TABLA ===

  onCambiarFormaPago(event: { index: number; tipo: string }) {
    console.log('🔄 Cambiando forma de pago:', event);

    if (event.index < 0 || event.index >= this.detalles.length) {
      console.error('❌ Índice inválido para cambio de forma de pago:', event.index);
      return;
    }

    // Delegar al padre
    this.cambiarFormaPago.emit(event);
  }

  onGuardarTodo() {
    console.log('💾 Solicitando guardar todos los detalles');

    if (this.detalles.length === 0) {
      console.warn('⚠️ No hay detalles para guardar');
      return;
    }

    // Delegar al padre
    this.guardarTodo.emit();
  }

  // === HANDLERS PARA TOOLBAR (DELEGACIÓN AL CONTENEDOR) ===

  onBuscarDTE(numeroDte: string) {
    console.log('🔍 Buscando DTE:', numeroDte);
    this.buscarDTE.emit(numeroDte);
  }

  onLiquidar() {
    console.log('💰 Solicitando liquidación de factura');
    this.liquidarClick.emit();
  }

  onRegistrarFactura() {
    console.log('📝 Solicitando registro de nueva factura');
    this.registrarFacturaClick.emit();
  }

  onLimpiar() {
    console.log('🧹 Limpiando búsqueda y datos');
    this.limpiarClick.emit();
  }

  // === MÉTODOS DE UTILIDAD ===

  obtenerFacturaActualId(): number | null {
    return this.factura?.id || null;
  }

  obtenerTotalMontoRegistros(): number {
    return this.total;
  }

  // === GETTERS PARA EL TEMPLATE ===

  get hayFactura(): boolean {
    return this.factura !== null;
  }

  get hayDetalles(): boolean {
    return this.detalles.length > 0;
  }

  get puedeAgregar(): boolean {
    return this.hayFactura && this.habilitarAcciones && !this.isSaving;
  }

  get puedeGuardar(): boolean {
    return this.hayDetalles && this.habilitarAcciones && !this.isSaving;
  }

  get textoEstadoMonto(): string {
    switch (this.estadoMonto) {
      case 'completo':
        return 'Monto completo';
      case 'incompleto':
        return 'Monto incompleto';
      case 'excedido':
        return 'Monto excedido';
      default:
        return 'Sin validar';
    }
  }

  // === MÉTODOS DE DEBUGGING (OPCIONAL - REMOVER EN PRODUCCIÓN) ===

  debug() {
    console.log('🐛 Estado actual del componente:');
    console.log('- Factura:', this.factura);
    console.log('- Detalles:', this.detalles);
    console.log('- Total:', this.total);
    console.log('- Estado monto:', this.estadoMonto);
    console.log('- Cargando:', this.isLoading);
    console.log('- Guardando:', this.isSaving);
    console.log('- Habilitar acciones:', this.habilitarAcciones);
  }
}