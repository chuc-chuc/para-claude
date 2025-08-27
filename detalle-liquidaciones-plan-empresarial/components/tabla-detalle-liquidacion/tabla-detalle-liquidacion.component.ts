// ============================================================================
// TABLA DETALLE LIQUIDACIÓN - INTERACCIÓN DIRECTA CON FACADE
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, map } from 'rxjs';
import Swal from 'sweetalert2';

import { PlanEmpresarialContainerFacade } from '../../../plan-empresarial-container/plan-empresarial-container.facade';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';

// USAR ÚNICAMENTE MODELOS DEL CONTAINER
import { TipoPago, ValidadorMonto } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

@Component({
  selector: 'app-tabla-detalle-liquidizacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tabla-detalle-liquidacion.component.html'
})
export class TablaDetalleLiquidizacionComponent implements OnInit, OnDestroy {
  @Input() habilitarAcciones = false;

  @Output() mostrarModal = new EventEmitter<void>();
  @Output() editarDetalle = new EventEmitter<number>();

  @ViewChild('montoInput') montoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('agenciaInput') agenciaInput?: ElementRef<HTMLSelectElement>;

  // INYECCIÓN DEL FACADE - INTERACCIÓN DIRECTA
  private facade = inject(PlanEmpresarialContainerFacade);
  private servicio = inject(ServicioGeneralService);

  // STREAMS DIRECTOS DEL FACADE
  factura$ = this.facade.factura$;
  detalles$ = this.facade.detallesLiquidacion$;
  agencias$ = this.facade.agencias$;
  tiposPago$ = this.facade.tiposPago$;
  loadingDetalles$ = this.facade.loadingDetalles$;
  savingDetalles$ = this.facade.savingDetalles$;

  puedeEditarDetalles$ = this.factura$.pipe(
    map(factura => !!factura && factura.estado_id !== 2)
  );

  // PROPIEDADES LOCALES
  tiposPagoActuales: TipoPago[] = [];
  guardandoCambios = false;
  cargandoDetalle = false;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Sincronizar tipos de pago
    this.tiposPago$.pipe(takeUntil(this.destroy$)).subscribe(tipos => {
      this.tiposPagoActuales = tipos;
    });

    // Sincronizar estado de guardado
    this.savingDetalles$.pipe(takeUntil(this.destroy$)).subscribe(saving => {
      this.guardandoCambios = saving;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // ACCIONES PRINCIPALES
  // ============================================================================

  onAgregar() {
    const factura = this.facade.getFacturaActual();
    if (!factura?.numero_dte) {
      this.servicio.mensajeServidor('error', 'No hay factura seleccionada para agregar detalles', 'Error');
      return;
    }
    this.mostrarModal.emit();
  }

  onEditar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;
    this.editarDetalle.emit(index);
  }

  onEliminar(index: number) {
    const detalles = this.facade.getDetallesActuales();
    if (index < 0 || index >= detalles.length) return;

    const detalle = detalles[index];
    const mensaje = detalle.id
      ? `¿Está seguro de eliminar el detalle "${detalle.descripcion}"?`
      : `¿Está seguro de eliminar este detalle temporal?`;

    Swal.fire({
      title: 'Confirmar eliminación',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.facade.eliminarDetalle(index);
      }
    });
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

  // ============================================================================
  // EDICIÓN INLINE
  // ============================================================================

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

  // ============================================================================
  // VER DETALLE COMPLETO
  // ============================================================================

  async verDetalleCompleto(index: number): Promise<void> {
    const detalles = this.facade.getDetallesActuales();
    const detalle = detalles[index];
    if (!detalle) return;

    if (!detalle.id) {
      this.mostrarDetalleLocal(detalle);
      return;
    }

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
        this.mostrarDetalleCompleto(response || detalle);
      }

    } catch (error) {
      Swal.close();
      this.mostrarDetalleLocal(detalle);
      this.servicio.mensajeServidor('warning', 'Error al obtener el detalle. Mostrando información básica.', 'Advertencia');
    } finally {
      this.cargandoDetalle = false;
    }
  }

  private mostrarDetalleCompleto(detalleCompleto: any): void {
    const tipoPago = detalleCompleto.informacion_adicional?.forma_pago_texto || this.obtenerTextoTipoPago(detalleCompleto.forma_pago);

    const html = `
      <div class="text-left max-h-96 overflow-y-auto">
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Información General</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Número de Orden:</strong><br>${detalleCompleto.numero_orden || 'No especificado'}</div>
            <div><strong>Monto:</strong><br>Q${parseFloat(String(detalleCompleto.monto || 0)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
            <div class="col-span-2"><strong>Agencia:</strong><br>${detalleCompleto.agencia || 'No especificada'}</div>
            <div class="col-span-2"><strong>Descripción:</strong><br>${detalleCompleto.descripcion || 'Sin descripción'}</div>
          </div>
        </div>
        
        <div class="mb-4">
          <h4 class="font-semibold text-gray-800 mb-2">Forma de Pago</h4>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${this.obtenerClaseTipoPago(detalleCompleto.forma_pago)}">
            ${tipoPago}
          </span>
        </div>
      </div>
    `;

    Swal.fire({
      title: `Detalle de Liquidación #${detalleCompleto.id}`,
      html: html,
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280'
    });
  }

  private mostrarDetalleLocal(detalle: any): void {
    const tipoPago = this.obtenerTextoTipoPago(detalle.forma_pago);

    const html = `
      <div class="text-left">
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Información Básica</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Orden:</strong> ${detalle.numero_orden || 'No especificado'}</div>
            <div><strong>Monto:</strong> Q${parseFloat(String(detalle.monto || 0)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
            <div class="col-span-2"><strong>Agencia:</strong> ${detalle.agencia || 'No especificada'}</div>
            <div class="col-span-2"><strong>Descripción:</strong> ${detalle.descripcion || 'Sin descripción'}</div>
          </div>
        </div>
        
        <div class="mb-4">
          <strong>Forma de pago:</strong> 
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.obtenerClaseTipoPago(detalle.forma_pago)}">${tipoPago}</span>
        </div>
        
        ${!detalle.id ? '<div class="bg-orange-100 border border-orange-300 p-3 rounded text-sm"><strong>Nota:</strong> Este registro aún no se ha guardado.</div>' : ''}
      </div>
    `;

    Swal.fire({
      title: `Detalle ${detalle.id ? '#' + detalle.id : '(Pendiente)'}`,
      html: html,
      width: '500px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280'
    });
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

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