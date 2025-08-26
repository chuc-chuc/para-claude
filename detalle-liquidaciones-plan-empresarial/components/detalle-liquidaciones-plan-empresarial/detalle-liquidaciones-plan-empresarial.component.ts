// ============================================================================
// DETALLE LIQUIDACIONES - CORREGIDO PARA FUNCIONAR CON EL BACKEND
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { Subject, takeUntil } from 'rxjs';

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
export class DetalleLiquidizacionesPlanEmpresarialComponent implements OnInit, OnDestroy {
  // === DATOS EXTERNOS ===
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
  @Output() actualizarDetalle = new EventEmitter<{ index: number; campo: string; valor: any }>();
  @Output() cargarDetalles = new EventEmitter<void>();

  // === ESTADO DE MODALES ===
  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: any | null = null;
  indexEnEdicion: number | null = null;

  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  // === ESTADO LOCAL ===
  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private servicio: ServicioGeneralService
  ) { }

  ngOnInit() {
    console.log('🔧 Componente detalle liquidaciones inicializado');
    console.log('📊 Factura actual:', this.factura);
    console.log('📊 Detalles actuales:', this.detalles.length);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // HANDLERS DE TABLA - ✅ CORREGIDOS PARA EL BACKEND
  // ============================================================================

  onAgregar() {
    console.log('➕ Iniciando creación de nuevo detalle...');

    if (!this.factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada para agregar detalles', 'Error');
      return;
    }

    // ✅ NO emitir agregarDetalle aquí - el detalle se crea cuando se guarda desde el modal
    this.registroEnEdicion = this.crearDetalleVacio();
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);

    console.log('📝 Modal de creación abierto');
  }

  onEditar(index: number) {
    if (index < 0 || index >= this.detalles.length) {
      console.warn('⚠️ Índice de edición inválido:', index);
      return;
    }

    console.log('✏️ Editando detalle en índice:', index);

    const detalleAEditar = this.detalles[index];
    this.editarDetalle.emit(index);

    this.indexEnEdicion = index;
    this.registroEnEdicion = detalleAEditar ? { ...detalleAEditar } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);

    console.log('📝 Modal de edición abierto para:', detalleAEditar);
  }

  onEliminar(index: number) {
    if (index < 0 || index >= this.detalles.length) {
      console.warn('⚠️ Índice de eliminación inválido:', index);
      return;
    }

    console.log('🗑️ Solicitando confirmación para eliminar índice:', index);
    this.indexAEliminar = index;
    this.mostrarModalEliminar.set(true);
  }

  onCopiar(index: number) {
    if (index < 0 || index >= this.detalles.length) {
      console.warn('⚠️ Índice de copia inválido:', index);
      return;
    }

    console.log('📋 Copiando detalle en índice:', index);
    this.copiarDetalle.emit(index);
  }

  onCambiarFormaPago(event: { index: number; tipo: string }) {
    if (event.index < 0 || event.index >= this.detalles.length) {
      console.warn('⚠️ Índice de cambio de forma de pago inválido:', event.index);
      return;
    }

    console.log('💳 Cambiando forma de pago:', event);
    this.cambiarFormaPago.emit(event);
  }

  onActualizarDetalle(event: { index: number; campo: string; valor: any }) {
    if (event.index < 0 || event.index >= this.detalles.length) {
      console.warn('⚠️ Índice de actualización inválido:', event.index);
      return;
    }

    console.log('🔄 Actualizando detalle:', event);
    this.actualizarDetalle.emit(event);
  }

  onGuardarTodo() {
    if (this.detalles.length === 0) {
      this.servicio.mensajeServidor('warning', 'No hay detalles para guardar', 'Atención');
      return;
    }

    console.log('💾 Guardando todos los detalles...');
    this.guardarTodo.emit();
  }

  // ============================================================================
  // HANDLERS MODAL DETALLE - ✅ CORREGIDOS PARA CREAR/ACTUALIZAR VÍA API
  // ============================================================================

  onGuardarDesdeModal(registro: any) {
    console.log('💾 Guardando desde modal - Modo:', this.modoModal(), 'Registro:', registro);

    if (!this.factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada', 'Error');
      return;
    }

    // ✅ Validar datos requeridos según backend
    if (!this.validarDatosRequeridos(registro)) {
      return;
    }

    // ✅ Preparar payload para el backend
    const payload = this.prepararPayloadParaBackend(registro);

    if (this.modoModal() === 'crear') {
      this.crearDetalleEnServidor(payload);
    } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
      this.actualizarDetalleEnServidor(payload);
    }
  }

  onCancelarModal() {
    console.log('❌ Cancelando modal - Modo:', this.modoModal());
    this.cerrarModalDetalle();
  }

  private cerrarModalDetalle() {
    this.mostrarModalDetalle.set(false);
    this.registroEnEdicion = null;
    this.indexEnEdicion = null;
    this.cdr.detectChanges();
  }

  // ============================================================================
  // HANDLERS MODAL ELIMINACIÓN
  // ============================================================================

  onConfirmarEliminar() {
    if (this.indexAEliminar !== null) {
      console.log('🗑️ Confirmando eliminación del índice:', this.indexAEliminar);
      this.eliminarDetalle.emit(this.indexAEliminar);
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

  // ============================================================================
  // MÉTODOS PARA INTERACTUAR DIRECTAMENTE CON EL BACKEND
  // ============================================================================

  private validarDatosRequeridos(registro: any): boolean {
    const camposRequeridos = ['numero_orden', 'agencia', 'descripcion', 'monto', 'forma_pago'];

    for (const campo of camposRequeridos) {
      if (!registro[campo] || (campo === 'monto' && registro[campo] <= 0)) {
        const nombreCampo = this.obtenerNombreCampoLegible(campo);
        this.servicio.mensajeServidor('error', `${nombreCampo} es requerido`, 'Validación');
        console.error('❌ Campo requerido faltante:', campo);
        return false;
      }
    }

    // Validar monto numérico
    if (isNaN(parseFloat(registro.monto))) {
      this.servicio.mensajeServidor('error', 'El monto debe ser un número válido', 'Validación');
      return false;
    }

    return true;
  }

  private prepararPayloadParaBackend(registro: any): any {
    const payload: any = {
      numero_factura: this.factura!.numero_dte,
      numero_orden: registro.numero_orden,
      agencia: registro.agencia,
      descripcion: registro.descripcion,
      monto: parseFloat(registro.monto),
      correo_proveedor: registro.correo_proveedor || null,
      forma_pago: registro.forma_pago,
      banco: registro.banco || null,
      cuenta: registro.cuenta || null,
    };

    // ✅ Agregar ID solo si es edición
    if (this.modoModal() === 'editar' && registro.id) {
      payload.id = registro.id;
    }

    // ✅ Agregar campos específicos según el tipo de pago
    this.agregarCamposEspecificos(payload, registro);

    console.log('📦 Payload preparado para backend:', payload);
    return payload;
  }

  private agregarCamposEspecificos(payload: any, registro: any) {
    switch (registro.forma_pago) {
      case 'deposito':
        if (registro.id_socio) payload.id_socio = registro.id_socio;
        if (registro.nombre_socio) payload.nombre_socio = registro.nombre_socio;
        if (registro.numero_cuenta_deposito) payload.numero_cuenta_deposito = registro.numero_cuenta_deposito;
        if (registro.producto_cuenta) payload.producto_cuenta = registro.producto_cuenta;
        if (registro.observaciones) payload.observaciones = registro.observaciones;
        break;

      case 'transferencia':
        if (registro.nombre_cuenta) payload.nombre_cuenta = registro.nombre_cuenta;
        if (registro.numero_cuenta) payload.numero_cuenta = registro.numero_cuenta;
        if (registro.banco) payload.banco = registro.banco;
        if (registro.tipo_cuenta) payload.tipo_cuenta = registro.tipo_cuenta;
        if (registro.observaciones) payload.observaciones = registro.observaciones;
        break;

      case 'cheque':
        if (registro.nombre_beneficiario) payload.nombre_beneficiario = registro.nombre_beneficiario;
        if (registro.consignacion) payload.consignacion = registro.consignacion;
        if (registro.no_negociable !== undefined) payload.no_negociable = registro.no_negociable;
        if (registro.observaciones) payload.observaciones = registro.observaciones;
        break;

      case 'tarjeta':
      case 'anticipo':
        if (registro.nota) payload.nota = registro.nota;
        break;
    }
  }

  private crearDetalleEnServidor(payload: any) {
    console.log('🔨 Creando detalle en servidor...');

    this.servicio.query({
      ruta: 'contabilidad/guardarDetalleLiquidacion',
      tipo: 'post',
      body: payload
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('📥 Respuesta del servidor (crear):', response);

        if (response.respuesta === 'success') {
          this.servicio.mensajeServidor('success', 'Detalle creado correctamente', 'Éxito');
          this.cerrarModalDetalle();

          // ✅ Recargar detalles desde el servidor
          this.cargarDetalles.emit();

          console.log('✅ Detalle creado exitosamente con ID:', response.datos?.id);
        } else {
          const mensaje = Array.isArray(response.mensaje) ? response.mensaje.join(', ') : response.mensaje;
          this.servicio.mensajeServidor('error', mensaje || 'Error al crear detalle', 'Error');
          console.error('❌ Error en respuesta del servidor:', response);
        }
      },
      error: (error) => {
        console.error('❌ Error al crear detalle:', error);
        this.servicio.mensajeServidor('error', 'Error de conexión al crear detalle', 'Error');
      }
    });
  }

  private actualizarDetalleEnServidor(payload: any) {
    console.log('🔨 Actualizando detalle en servidor...');

    this.servicio.query({
      ruta: 'contabilidad/guardarDetalleLiquidacion',
      tipo: 'post',
      body: payload
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('📥 Respuesta del servidor (actualizar):', response);

        if (response.respuesta === 'success') {
          this.servicio.mensajeServidor('success', 'Detalle actualizado correctamente', 'Éxito');
          this.cerrarModalDetalle();

          // ✅ Recargar detalles desde el servidor
          this.cargarDetalles.emit();

          console.log('✅ Detalle actualizado exitosamente');
        } else {
          const mensaje = Array.isArray(response.mensaje) ? response.mensaje.join(', ') : response.mensaje;
          this.servicio.mensajeServidor('error', mensaje || 'Error al actualizar detalle', 'Error');
          console.error('❌ Error en respuesta del servidor:', response);
        }
      },
      error: (error) => {
        console.error('❌ Error al actualizar detalle:', error);
        this.servicio.mensajeServidor('error', 'Error de conexión al actualizar detalle', 'Error');
      }
    });
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  private crearDetalleVacio() {
    return {
      id: null,
      numero_orden: '',
      agencia: '',
      descripcion: '',
      monto: 0,
      correo_proveedor: '',
      forma_pago: 'deposito',
      banco: '',
      cuenta: '',
      numero_factura: this.factura?.numero_dte
    };
  }

  private obtenerNombreCampoLegible(campo: string): string {
    const nombres: { [key: string]: string } = {
      'numero_orden': 'Número de orden',
      'agencia': 'Agencia',
      'descripcion': 'Descripción',
      'monto': 'Monto',
      'forma_pago': 'Forma de pago',
      'correo_proveedor': 'Correo del proveedor'
    };
    return nombres[campo] || campo;
  }

  private esDetalleCompleto(detalle: any): boolean {
    return !!(
      detalle?.numero_orden?.trim() &&
      detalle?.agencia?.trim() &&
      detalle?.descripcion?.trim() &&
      detalle?.monto > 0 &&
      detalle?.forma_pago?.trim()
    );
  }

  // ============================================================================
  // GETTERS PARA EL TEMPLATE
  // ============================================================================

  obtenerFacturaActualId(): number | null {
    return this.factura?.id || null;
  }

  obtenerTotalMontoRegistros(): number {
    return this.total;
  }

  validarMontoDisponible(nuevoMonto: number, excluirIndice?: number): boolean {
    if (!this.factura?.monto_total) return true;

    let totalSinExcluir = 0;
    this.detalles.forEach((detalle, i) => {
      if (i !== excluirIndice) {
        totalSinExcluir += parseFloat(detalle.monto) || 0;
      }
    });

    const nuevoTotal = totalSinExcluir + nuevoMonto;
    const montoFactura = parseFloat(this.factura.monto_total);

    return nuevoTotal <= montoFactura;
  }

  calcularMontoDisponible(excluirIndice?: number): number {
    if (!this.factura?.monto_total) return 0;

    let totalUsado = 0;
    this.detalles.forEach((detalle, i) => {
      if (i !== excluirIndice) {
        totalUsado += parseFloat(detalle.monto) || 0;
      }
    });

    const montoFactura = parseFloat(this.factura.monto_total);
    return Math.max(0, montoFactura - totalUsado);
  }

  // ============================================================================
  // INFO PARA DEBUGGING
  // ============================================================================

  get infoEstado() {
    return {
      totalDetalles: this.detalles.length,
      montoTotal: this.total,
      montoFactura: this.montoFactura,
      estadoMonto: this.estadoMonto,
      habilitarAcciones: this.habilitarAcciones,
      isLoading: this.isLoading,
      isSaving: this.isSaving,
      facturaPresente: !!this.factura,
      numeroFactura: this.factura?.numero_dte || 'ninguna'
    };
  }
}