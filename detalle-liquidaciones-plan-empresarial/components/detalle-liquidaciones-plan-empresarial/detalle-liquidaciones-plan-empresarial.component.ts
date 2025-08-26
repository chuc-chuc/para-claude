// ============================================================================
// DETALLE LIQUIDACIONES - LIMPIO SIN DUPLICADOS
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
    // Componente inicializado
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // HANDLERS DE TABLA
  // ============================================================================

  onAgregar() {
    if (!this.factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada para agregar detalles', 'Error');
      return;
    }

    this.registroEnEdicion = this.crearDetalleVacio();
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);
  }

  onEditar(index: number) {
    if (index < 0 || index >= this.detalles.length) return;

    const detalleAEditar = this.detalles[index];
    this.editarDetalle.emit(index);

    this.indexEnEdicion = index;
    this.registroEnEdicion = detalleAEditar ? { ...detalleAEditar } : null;
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

  onActualizarDetalle(event: { index: number; campo: string; valor: any }) {
    if (event.index < 0 || event.index >= this.detalles.length) return;

    // Actualizar localmente primero
    if (event.campo === 'monto' || event.campo === 'agencia') {
      const detalleActual = this.detalles[event.index];
      detalleActual[event.campo] = event.valor;

      this.actualizarDetalle.emit(event);
      this.cdr.detectChanges();
    }
  }

  onGuardarTodo() {
    if (this.detalles.length === 0) {
      this.servicio.mensajeServidor('warning', 'No hay detalles para guardar', 'Atención');
      return;
    }

    this.guardarTodo.emit();
  }

  // ============================================================================
  // HANDLERS MODAL DETALLE
  // ============================================================================

  onGuardarDesdeModal(registro: any) {
    if (!this.factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada', 'Error');
      return;
    }

    if (!this.validarDatosRequeridos(registro)) {
      return;
    }

    const payload = this.prepararPayloadParaBackend(registro);

    if (this.modoModal() === 'crear') {
      this.crearDetalleEnServidor(payload);
    } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
      this.actualizarDetalleEnServidor(payload);
    }
  }

  onCancelarModal() {
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
      this.eliminarDetalle.emit(this.indexAEliminar);
    }
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

  // ============================================================================
  // MÉTODOS DE BACKEND - ÚNICOS Y LIMPIOS
  // ============================================================================

  private validarDatosRequeridos(registro: any): boolean {
    const camposRequeridos = ['numero_orden', 'agencia', 'descripcion', 'monto', 'forma_pago'];

    for (const campo of camposRequeridos) {
      if (!registro[campo] || (campo === 'monto' && registro[campo] <= 0)) {
        const nombreCampo = this.obtenerNombreCampoLegible(campo);
        this.servicio.mensajeServidor('error', `${nombreCampo} es requerido`, 'Validación');
        return false;
      }
    }

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

    if (this.modoModal() === 'editar' && registro.id) {
      payload.id = registro.id;
    }

    this.agregarCamposEspecificos(payload, registro);

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
    this.servicio.query({
      ruta: 'contabilidad/guardarDetalleLiquidacion',
      tipo: 'post',
      body: payload
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.respuesta === 'success') {
          this.servicio.mensajeServidor('success', 'Detalle creado correctamente', 'Éxito');
          this.cerrarModalDetalle();
          this.recargarDetalles(); // 🔑 emite al padre
        } else {
          this.servicio.mensajeServidor('error', response.mensaje || 'Error al crear detalle', 'Error');
        }
      },
      error: () => {
        this.servicio.mensajeServidor('error', 'Error de conexión al crear detalle', 'Error');
      }
    });
  }


  private actualizarDetalleEnServidor(payload: any) {
    this.servicio.query({
      ruta: 'contabilidad/guardarDetalleLiquidacion',
      tipo: 'post',
      body: payload
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.respuesta === 'success') {
          this.servicio.mensajeServidor('success', 'Detalle actualizado correctamente', 'Éxito');
          this.cerrarModalDetalle();
          this.recargarDetalles(); // 🔑 emite al padre
        } else {
          this.servicio.mensajeServidor('error', response.mensaje || 'Error al actualizar detalle', 'Error');
        }
      },
      error: () => {
        this.servicio.mensajeServidor('error', 'Error de conexión al actualizar detalle', 'Error');
      }
    });
  }

  private recargarDetalles(): void {
    this.cargarDetalles.emit();
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