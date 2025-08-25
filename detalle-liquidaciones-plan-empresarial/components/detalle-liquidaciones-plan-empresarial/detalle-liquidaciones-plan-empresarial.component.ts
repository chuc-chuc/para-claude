import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { TablaDetalleLiquidizacionComponent } from '../tabla-detalle-liquidacion/tabla-detalle-liquidacion.component';
import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';
import { ResumenLiquidacionComponent } from '../resumen-liquidacion/resumen-liquidacion.component';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';

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
export class DetalleLiquidizacionesPlanEmpresarialComponent implements OnInit {
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
  private autoGuardadoTimeout: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private servicio: ServicioGeneralService
  ) { }

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // === INICIALIZACIÓN ===

  private cargarDatosIniciales() {
    // Cargar catálogos si no están disponibles
    if (this.tiposPago.length === 0) {
      this.cargarTiposPago();
    }

    // Si hay una factura pero no hay detalles, cargarlos
    if (this.factura?.numero_dte && this.detalles.length === 0) {
      this.cargarDetallesLiquidacion();
    }
  }

  private cargarTiposPago() {
    this.servicio.query({
      ruta: 'contabilidad/obtenerTiposPago',
      tipo: 'get'
    }).subscribe({
      next: (res: any) => {
        if (res.respuesta === 'success') {
          this.tiposPago = res.datos || [];
        }
      },
      error: (err) => {
        console.error('Error al cargar tipos de pago:', err);
      }
    });
  }

  private cargarDetallesLiquidacion() {
    if (!this.factura?.numero_dte) return;

    this.servicio.query({
      ruta: 'contabilidad/obtenerDetallesLiquidacion',
      tipo: 'post',
      body: { numero_factura: this.factura.numero_dte }
    }).subscribe({
      next: (res: any) => {
        if (res.respuesta === 'success') {
          this.detalles = res.datos || [];
          this.recalcularTotales();
        }
      },
      error: (err) => {
        console.error('Error al cargar detalles:', err);
        this.servicio.mensajeServidor('error', 'Error al cargar los detalles de liquidación', 'Error');
      }
    });
  }

  // === HANDLERS DE TABLA ===

  onAgregar() {
    this.agregarDetalle.emit();
    this.registroEnEdicion = this.crearDetalleVacio();
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

    const detalleOriginal = this.detalles[index];
    const nuevoCopia = {
      ...detalleOriginal,
      id: null, // Nuevo registro
      descripcion: `[COPIA] ${detalleOriginal.descripcion}`
    };

    // Agregar la copia a la lista local
    this.detalles.push(nuevoCopia);
    this.recalcularTotales();

    // Si el detalle tiene datos completos, auto-guardarlo
    if (this.esDetalleCompleto(nuevoCopia)) {
      this.autoGuardarDetalle(nuevoCopia, this.detalles.length - 1);
    }

    this.copiarDetalle.emit(index);
  }

  onCambiarFormaPago(event: { index: number; tipo: string }) {
    if (event.index < 0 || event.index >= this.detalles.length) return;

    // Actualizar localmente
    this.detalles[event.index].forma_pago = event.tipo;

    // Emitir evento al padre si es necesario
    this.cambiarFormaPago.emit(event);
  }

  onActualizarDetalle(event: { index: number; campo: string; valor: any }) {
    if (event.index < 0 || event.index >= this.detalles.length) return;

    // Actualizar localmente
    this.detalles[event.index][event.campo] = event.valor;
    this.recalcularTotales();

    // Auto-guardar si el detalle está completo
    const detalle = this.detalles[event.index];
    if (this.esDetalleCompleto(detalle) && detalle.id) {
      this.programarAutoGuardado(detalle, event.index);
    }

    this.actualizarDetalle.emit(event);
  }

  onGuardarTodo() {
    if (this.detalles.length === 0) return;

    // Filtrar solo los detalles completos para guardar
    const detallesCompletos = this.detalles.filter(this.esDetalleCompleto);

    if (detallesCompletos.length === 0) {
      this.servicio.mensajeServidor('warning', 'No hay detalles completos para guardar', 'Atención');
      return;
    }

    this.guardarTodosLosDetalles(detallesCompletos);
  }

  // === HANDLERS MODAL DETALLE ===

  onGuardarDesdeModal(registro: any) {
    if (this.modoModal() === 'crear') {
      // Agregar nuevo detalle
      const nuevoDetalle = { ...registro, id: null };
      this.detalles.push(nuevoDetalle);

      // Auto-guardar si está completo
      if (this.esDetalleCompleto(nuevoDetalle)) {
        this.autoGuardarDetalle(nuevoDetalle, this.detalles.length - 1);
      }

    } else if (this.modoModal() === 'editar' && this.indexEnEdicion !== null) {
      // Actualizar detalle existente
      const index = this.indexEnEdicion;
      this.detalles[index] = { ...registro };

      // Auto-guardar si está completo
      if (this.esDetalleCompleto(this.detalles[index])) {
        this.autoGuardarDetalle(this.detalles[index], index);
      }
    }

    this.recalcularTotales();
    this.cerrarModalDetalle();
  }

  onCancelarModal() {
    if (this.modoModal() === 'crear') {
      // Si era creación, eliminar el último detalle agregado si está vacío
      const ultimoIndex = this.detalles.length - 1;
      if (ultimoIndex >= 0 && !this.esDetalleCompleto(this.detalles[ultimoIndex])) {
        this.detalles.splice(ultimoIndex, 1);
        this.recalcularTotales();
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

  // === HANDLERS MODAL ELIMINACIÓN ===

  onConfirmarEliminar() {
    if (this.indexAEliminar !== null) {
      const detalle = this.detalles[this.indexAEliminar];

      if (detalle?.id) {
        // Si tiene ID, eliminar del servidor
        this.eliminarDetalleEnServidor(detalle.id, this.indexAEliminar);
      } else {
        // Si no tiene ID, solo eliminar localmente
        this.detalles.splice(this.indexAEliminar, 1);
        this.recalcularTotales();
      }
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

  // === AUTO-GUARDADO Y PERSISTENCIA ===

  private programarAutoGuardado(detalle: any, index: number) {
    // Cancelar auto-guardado pendiente
    if (this.autoGuardadoTimeout) {
      clearTimeout(this.autoGuardadoTimeout);
    }

    // Programar nuevo auto-guardado después de 1 segundo de inactividad
    this.autoGuardadoTimeout = setTimeout(() => {
      this.autoGuardarDetalle(detalle, index);
    }, 1000);
  }

  private async autoGuardarDetalle(detalle: any, index: number) {
    if (!this.esDetalleCompleto(detalle)) return;

    try {
      const payload = {
        ...detalle,
        numero_factura: this.factura?.numero_dte
      };

      const response = await this.servicio.query({
        ruta: 'contabilidad/guardarDetalleLiquidacion',
        tipo: 'post',
        body: payload
      }).toPromise();

      if (response?.respuesta === 'success') {
        // Actualizar el ID si es un nuevo registro
        if (!detalle.id && response.datos?.id) {
          this.detalles[index].id = response.datos.id;
        }

        // Mostrar mensaje discreto de éxito
        this.mostrarMensajeAutoGuardado('success');
      } else {
        this.mostrarMensajeAutoGuardado('error', response?.mensaje);
      }

    } catch (error) {
      console.error('Error en auto-guardado:', error);
      this.mostrarMensajeAutoGuardado('error', 'Error de conexión');
    }
  }

  private async guardarTodosLosDetalles(detalles: any[]) {
    this.isSaving = true;

    try {
      const promesas = detalles.map(detalle => {
        const payload = {
          ...detalle,
          numero_factura: this.factura?.numero_dte
        };

        return this.servicio.query({
          ruta: 'contabilidad/guardarDetalleLiquidacion',
          tipo: 'post',
          body: payload
        }).toPromise();
      });

      const resultados = await Promise.all(promesas);

      let exitosos = 0;
      let errores = 0;

      resultados.forEach((resultado, index) => {
        if (resultado?.respuesta === 'success') {
          exitosos++;
          // Actualizar ID si es nuevo registro
          if (!detalles[index].id && resultado.datos?.id) {
            const detalleIndex = this.detalles.indexOf(detalles[index]);
            if (detalleIndex >= 0) {
              this.detalles[detalleIndex].id = resultado.datos.id;
            }
          }
        } else {
          errores++;
        }
      });

      if (errores === 0) {
        this.servicio.mensajeServidor('success', `${exitosos} detalles guardados correctamente`, 'Éxito');
      } else {
        this.servicio.mensajeServidor('warning', `${exitosos} guardados, ${errores} con errores`, 'Atención');
      }

      // Recargar detalles para sincronizar
      this.cargarDetallesLiquidacion();

    } catch (error) {
      console.error('Error al guardar todos los detalles:', error);
      this.servicio.mensajeServidor('error', 'Error al guardar los detalles', 'Error');
    } finally {
      this.isSaving = false;
    }
  }

  private async eliminarDetalleEnServidor(detalleId: number, index: number) {
    try {
      const response = await this.servicio.query({
        ruta: 'contabilidad/eliminarDetalleLiquidacion',
        tipo: 'post',
        body: { id: detalleId }
      }).toPromise();

      if (response?.respuesta === 'success') {
        this.detalles.splice(index, 1);
        this.recalcularTotales();
        this.servicio.mensajeServidor('success', 'Detalle eliminado correctamente', 'Éxito');
      } else {
        this.servicio.mensajeServidor('error', response?.mensaje || 'Error al eliminar', 'Error');
      }

    } catch (error) {
      console.error('Error al eliminar detalle:', error);
      this.servicio.mensajeServidor('error', 'Error de conexión al eliminar', 'Error');
    }
  }

  // === UTILIDADES ===

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

  private esDetalleCompleto(detalle: any): boolean {
    return !!(
      detalle?.numero_orden?.trim() &&
      detalle?.agencia?.trim() &&
      detalle?.descripcion?.trim() &&
      detalle?.monto > 0 &&
      detalle?.forma_pago?.trim()
    );
  }

  private recalcularTotales() {
    this.total = this.detalles.reduce((sum, detalle) => {
      return sum + (parseFloat(detalle.monto) || 0);
    }, 0);

    // Recalcular estado del monto
    if (this.montoFactura > 0) {
      if (this.total === this.montoFactura) {
        this.estadoMonto = 'completo';
      } else if (this.total > this.montoFactura) {
        this.estadoMonto = 'excedido';
      } else {
        this.estadoMonto = 'incompleto';
      }
    }
  }

  private mostrarMensajeAutoGuardado(tipo: 'success' | 'error', mensaje?: string) {
    // Mensaje discreto que se auto-oculta
    const texto = tipo === 'success'
      ? 'Guardado automáticamente'
      : `Error: ${mensaje || 'No se pudo guardar'}`;

    // Usar un toast discreto o similar
    this.servicio.mensajeServidor(tipo, texto, tipo === 'success' ? 'Guardado' : 'Error');
  }

  // === GETTERS PARA EL TEMPLATE ===

  obtenerFacturaActualId(): number | null {
    return this.factura?.id || null;
  }

  obtenerTotalMontoRegistros(): number {
    return this.total;
  }
}