import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, map } from 'rxjs';
import Swal from 'sweetalert2';

import { ModalDetalleLiquidizacionComponent } from '../modal-detalle-liquidacion/modal-detalle-liquidacion.component';
import { ModalConfirmarEliminacionComponent } from '../modal-confirmar-eliminacion/modal-confirmar-eliminacion.component';
import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import { TipoPago, ValidadorMonto, DetalleLiquidacionPE } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-tabla-detalle-liquidizacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalDetalleLiquidizacionComponent,
    ModalConfirmarEliminacionComponent
  ],
  templateUrl: './tabla-detalle-liquidacion.component.html'
})
export class TablaDetalleLiquidizacionComponent implements OnInit, OnDestroy {
  @ViewChild('montoInput') montoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('agenciaInput') agenciaInput?: ElementRef<HTMLSelectElement>;

  private facade = inject(PlanEmpresarialContainerFacade);
  private servicio = inject(ServicioGeneralService);

  mostrarModalDetalle = signal(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  registroEnEdicion: DetalleLiquidacionPE | null = null;
  indexEnEdicion: number | null = null;
  mostrarModalEliminar = signal(false);
  indexAEliminar: number | null = null;

  factura$ = this.facade.factura$;
  detalles$ = this.facade.detallesLiquidacion$;
  agencias$ = this.facade.agencias$;
  tiposPago$ = this.facade.tiposPago$;
  loadingDetalles$ = this.facade.loadingDetalles$;
  savingDetalles$ = this.facade.savingDetalles$;

  puedeEditarDetalles$ = this.factura$.pipe(
    map(factura => !!factura && factura.estado_id !== 2)
  );

  tiposPagoActuales: TipoPago[] = [];
  guardandoCambios = false;
  cargandoDetalle = false;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.tiposPago$.pipe(takeUntil(this.destroy$)).subscribe(tipos => {
      this.tiposPagoActuales = tipos;
    });

    this.savingDetalles$.pipe(takeUntil(this.destroy$)).subscribe(saving => {
      this.guardandoCambios = saving;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirModal() {
    const factura = this.facade.getFacturaActual();
    if (!factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada para agregar detalles', 'Error');
      return;
    }
    this.registroEnEdicion = this.crearDetalleVacio();
    this.indexEnEdicion = null;
    this.modoModal.set('crear');
    this.mostrarModalDetalle.set(true);
  }

  abrirModalEditar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;

    const detalleAEditar = detalles[index];
    this.indexEnEdicion = index;
    this.registroEnEdicion = detalleAEditar ? { ...detalleAEditar } : null;
    this.modoModal.set('editar');
    this.mostrarModalDetalle.set(true);
  }

  confirmarEliminacion() {
    if (this.indexAEliminar !== null) {
      this.facade.eliminarDetalle(this.indexAEliminar);
      this.cancelarEliminacion();
    }
  }

  cancelarEliminacion() {
    this.indexAEliminar = null;
    this.mostrarModalEliminar.set(false);
  }

  private crearDetalleVacio(): DetalleLiquidacionPE {
    return {
      id: undefined,
      numero_orden: '',
      agencia: '',
      descripcion: '',
      monto: 0,
      correo_proveedor: '',
      forma_pago: '',
      banco: '',
      cuenta: '',
      informacion_adicional: null
    };
  }

  onAgregar() {
    this.abrirModal();
  }

  onEditar(index: number) {
    this.abrirModalEditar(index);
  }

  onEliminar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;

    this.indexAEliminar = index;
    this.mostrarModalEliminar.set(true);
  }

  onCopiar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;
    this.facade.copiarDetalle(index);
  }

  onGuardarTodo() {
    const detalles = this.facade.getDetallesActuales();
    if (detalles.length === 0) {
      this.servicio.mensajeServidor('warning', 'No hay detalles para guardar', 'Atención');
      return;
    }
    this.facade.guardarTodosLosDetalles().pipe(takeUntil(this.destroy$)).subscribe();
  }

  iniciarEdicionMonto(index: number) {
    const factura = this.facade.getFacturaActual();
    if (!factura || factura.estado_id === 2) return;

    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle) return;

    this.cancelarTodasLasEdiciones();
    detalle._editandoMonto = true;
    detalle._montoTemp = detalle.monto;

    setTimeout(() => {
      if (this.montoInput?.nativeElement) {
        this.montoInput.nativeElement.focus();
        this.montoInput.nativeElement.select();
      }
    }, 0);
  }

  guardarMonto(index: number) {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle || !detalle._editandoMonto) return;

    const nuevoMonto = parseFloat(String(detalle._montoTemp || 0));

    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
      this.servicio.mensajeServidor('error', 'El monto debe ser mayor a 0', 'Error');
      return;
    }

    if (nuevoMonto === detalle.monto) {
      this.cancelarEdicionMonto(index);
      return;
    }

    const validacion: ValidadorMonto = this.facade.validarMonto(index, nuevoMonto);
    if (!validacion.esValido) {
      this.servicio.mensajeServidor('error', validacion.mensaje || 'Monto inválido', 'Error');
      return;
    }

    detalle.monto = nuevoMonto;
    detalle._editandoMonto = false;
    delete detalle._montoTemp;

    this.facade.actualizarDetalle(index, { monto: nuevoMonto });
  }

  cancelarEdicionMonto(index: number) {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (detalle) {
      detalle._editandoMonto = false;
      delete detalle._montoTemp;
    }
  }

  iniciarEdicionAgencia(index: number) {
    const factura = this.facade.getFacturaActual();
    if (!factura || factura.estado_id === 2) return;

    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle) return;

    this.cancelarTodasLasEdiciones();
    detalle._editandoAgencia = true;
    detalle._agenciaTemp = detalle.agencia;

    setTimeout(() => {
      if (this.agenciaInput?.nativeElement) {
        this.agenciaInput.nativeElement.focus();
      }
    }, 0);
  }

  guardarAgencia(index: number) {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle || !detalle._editandoAgencia) return;

    const nuevaAgencia = detalle._agenciaTemp?.trim();

    if (!nuevaAgencia) {
      this.servicio.mensajeServidor('error', 'Debe seleccionar una agencia', 'Error');
      return;
    }

    if (nuevaAgencia === detalle.agencia) {
      this.cancelarEdicionAgencia(index);
      return;
    }

    detalle.agencia = nuevaAgencia;
    detalle._editandoAgencia = false;
    delete detalle._agenciaTemp;

    this.facade.actualizarDetalle(index, { agencia: nuevaAgencia });
  }

  cancelarEdicionAgencia(index: number) {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (detalle) {
      detalle._editandoAgencia = false;
      delete detalle._agenciaTemp;
    }
  }

  private cancelarTodasLasEdiciones() {
    const detalles = this.facade.getDetallesActuales();
    detalles.forEach(detalle => {
      if (detalle._editandoMonto) {
        detalle._editandoMonto = false;
        delete detalle._montoTemp;
      }
      if (detalle._editandoAgencia) {
        detalle._editandoAgencia = false;
        delete detalle._agenciaTemp;
      }
    });
  }

  async verDetalleCompleto(index: number): Promise<void> {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle || !detalle.id) return;

    try {
      this.cargandoDetalle = true;

      Swal.fire({
        title: 'Cargando detalle...',
        html: 'Obteniendo información completa del registro',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await this.facade.obtenerDetalleCompleto(detalle.id).toPromise();

      Swal.close();

      if (response && response.respuesta === 'success' && response.datos) {
        this.mostrarDetalleCompleto(response.datos);
      } else {
        this.servicio.mensajeServidor('error', 'No se pudo obtener el detalle completo.', 'Error');
      }
    } catch (error) {
      Swal.close();
      this.servicio.mensajeServidor('warning', 'Error al obtener el detalle.', 'Advertencia');
    } finally {
      this.cargandoDetalle = false;
    }
  }

  private mostrarDetalleCompleto(detalleCompleto: any): void {
    const tipoPago = detalleCompleto.informacion_adicional?.forma_pago_texto || this.obtenerTextoTipoPago(detalleCompleto.forma_pago);
    const datosEspecificos = detalleCompleto.datos_especificos || {};
    const informacionAdicional = detalleCompleto.informacion_adicional || {};

    let generalInfoHtml = `
    <div class="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 class="font-semibold text-gray-800 mb-3">Información General</h4>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Número de Factura:</strong><br>${detalleCompleto.numero_factura || 'No especificado'}</div>
        <div><strong>Número de Orden:</strong><br>${detalleCompleto.numero_orden || 'No especificado'}</div>
        <div><strong>Monto:</strong><br>Q${parseFloat(String(detalleCompleto.monto || 0)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
        <div><strong>Agencia:</strong><br>${detalleCompleto.agencia || 'No especificada'}</div>
        <div class="col-span-2"><strong>Descripción:</strong><br>${detalleCompleto.descripcion || 'Sin descripción'}</div>
        <div><strong>Correo del Proveedor:</strong><br>${detalleCompleto.correo_proveedor || 'No especificado'}</div>
        <div><strong>Fecha de Creación:</strong><br>${detalleCompleto.fecha_creacion || 'No especificada'}</div>
        <div><strong>Fecha de Actualización:</strong><br>${detalleCompleto.fecha_actualizacion || 'No especificada'}</div>
      </div>
    </div>
  `;

    let paymentInfoHtml = `
    <div class="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 class="font-semibold text-gray-800 mb-3">Información de Pago</h4>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Forma de Pago:</strong><br>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${this.obtenerClaseTipoPago(detalleCompleto.forma_pago)}">
            ${tipoPago}
          </span>
        </div>
        <div><strong>Tipo de Detalle:</strong><br>${informacionAdicional.tipo_detalle || 'No especificado'}</div>
      </div>
    </div>
  `;

    let datosEspecificosHtml = '';
    switch (detalleCompleto.forma_pago) {
      case 'deposito':
        datosEspecificosHtml = `
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Detalles de Depósito</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>ID Socio:</strong><br>${datosEspecificos.id_socio || 'No especificado'}</div>
            <div><strong>Nombre del Socio:</strong><br>${datosEspecificos.nombre_socio || 'No especificado'}</div>
            <div><strong>Número de Cuenta:</strong><br>${datosEspecificos.numero_cuenta_deposito || 'No especificado'}</div>
            <div><strong>Producto de Cuenta:</strong><br>${datosEspecificos.producto_cuenta || 'No especificado'}</div>
            <div><strong>Observaciones:</strong><br>${datosEspecificos.observaciones || 'Ninguna'}</div>
          </div>
        </div>
      `;
        break;
      case 'cheque':
        datosEspecificosHtml = `
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Detalles de Cheque</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Nombre del Beneficiario:</strong><br>${datosEspecificos.nombre_beneficiario || 'No especificado'}</div>
            <div><strong>Consignación:</strong><br>${datosEspecificos.consignacion || 'No especificado'}</div>
            <div><strong>No Negociable:</strong><br>${datosEspecificos.no_negociable ? 'Sí' : 'No'}</div>
            <div><strong>Observaciones:</strong><br>${datosEspecificos.observaciones || 'Ninguna'}</div>
          </div>
        </div>
      `;
        break;
      case 'transferencia':
        datosEspecificosHtml = `
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Detalles de Transferencia</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Nombre de la Cuenta:</strong><br>${datosEspecificos.nombre_cuenta || 'No especificado'}</div>
            <div><strong>Número de Cuenta:</strong><br>${datosEspecificos.numero_cuenta || 'No especificado'}</div>
            <div><strong>Banco:</strong><br>${datosEspecificos.banco || 'No especificado'}</div>
            <div><strong>Tipo de Cuenta:</strong><br>${datosEspecificos.tipo_cuenta || 'No especificado'}</div>
            <div><strong>Observaciones:</strong><br>${datosEspecificos.observaciones || 'Ninguna'}</div>
          </div>
        </div>
      `;
        break;
      case 'tarjeta':
      case 'anticipo':
        datosEspecificosHtml = `
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Detalles Específicos</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Nota:</strong><br>${datosEspecificos.nota || 'No especificada'}</div>
          </div>
        </div>
      `;
        break;
      default:
        datosEspecificosHtml = `
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Detalles Específicos</h4>
          <div class="text-sm">No hay detalles específicos disponibles.</div>
        </div>
      `;
    }

    const html = `
    <div class="text-left max-h-96 overflow-y-auto">
      ${generalInfoHtml}
      ${paymentInfoHtml}
      ${datosEspecificosHtml}
    </div>
  `;

    Swal.fire({
      title: `Detalle de Liquidación #${detalleCompleto.id}`,
      html: html,
      width: '700px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280'
    });
  }

  trackById(i: number, r: any) {
    return r?.id ?? i;
  }

  trackByAgencia(i: number, agencia: any) {
    return agencia?.id ?? i;
  }

  obtenerTextoTipoPago(tipoPago: string | undefined): string {
    if (!tipoPago) return 'Sin especificar';
    const tipo = this.tiposPagoActuales.find(t => t.id === tipoPago || t.nombre === tipoPago);
    return tipo?.nombre || tipoPago || 'Sin especificar';
  }

  obtenerClaseTipoPago(tipoPago: string | undefined): string {
    if (!tipoPago) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';

    const colores: { [key: string]: string } = {
      'deposito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'transferencia': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'cheque': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'tarjeta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'anticipo': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };

    const tipo = this.tiposPagoActuales.find(t => t.id === tipoPago);
    return colores[tipo?.id || 'default'] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
}