// ============================================================================
// TABLA DETALLE LIQUIDACIÓN - CON SERVICIO PARA OBTENER DETALLE COMPLETO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';
import Swal from 'sweetalert2';

import { TipoPago, TIPOS_PAGO_DEFAULT } from '../../../plan-empresarial-container/shared/models/plan-empresarial.models';

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
  @Input() tiposPago: TipoPago[] = TIPOS_PAGO_DEFAULT;
  @Input() habilitarAcciones = false;

  @Output() agregar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<number>();
  @Output() eliminar = new EventEmitter<number>();
  @Output() copiar = new EventEmitter<number>();
  @Output() guardarTodo = new EventEmitter<void>();
  @Output() cambiarFormaPago = new EventEmitter<{ index: number; tipo: string }>();
  @Output() actualizarDetalle = new EventEmitter<{ index: number; campo: string; valor: any }>();

  @ViewChild('montoInput') montoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('agenciaInput') agenciaInput?: ElementRef<HTMLSelectElement>;

  guardandoCambios = false;
  cargandoDetalle = false;

  constructor(private servicio: ServicioGeneralService) { }

  // ============================================
  // VER DETALLE COMPLETO CON SERVICIO
  // ============================================

  async verDetalleCompleto(index: number): Promise<void> {
    const detalle = this.detalles[index];
    if (!detalle) return;

    // Si el detalle no tiene ID, mostrar información local
    if (!detalle.id) {
      this.mostrarDetalleLocal(detalle);
      return;
    }

    try {
      this.cargandoDetalle = true;

      // Mostrar loading
      Swal.fire({
        title: 'Cargando detalle...',
        html: 'Obteniendo información completa del registro',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Llamar al servicio para obtener el detalle completo
      const response = await this.servicio.query({
        ruta: 'contabilidad/obtenerDetalleCompleto',
        tipo: 'post',
        body: { id: detalle.id }
      }).toPromise();

      Swal.close();

      if (response?.respuesta === 'success' && response.datos) {
        this.mostrarDetalleCompleto(response.datos);
      } else {
        // Si falla el servicio, mostrar información local
        this.mostrarDetalleLocal(detalle);
        this.servicio.mensajeServidor('warning', 'No se pudo obtener el detalle completo. Mostrando información básica.', 'Advertencia');
      }

    } catch (error) {
      Swal.close();
      // Si hay error, mostrar información local
      this.mostrarDetalleLocal(detalle);
      this.servicio.mensajeServidor('warning', 'Error al obtener el detalle. Mostrando información básica.', 'Advertencia');
    } finally {
      this.cargandoDetalle = false;
    }
  }

  private mostrarDetalleCompleto(detalleCompleto: any): void {
    const tipoPago = detalleCompleto.informacion_adicional?.forma_pago_texto || this.obtenerTextoTipoPago(detalleCompleto.forma_pago);

    // Información básica
    let infoBasica = `
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Información General
        </h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Número de Orden:</strong><br>${detalleCompleto.numero_orden || 'No especificado'}</div>
          <div><strong>Monto:</strong><br>Q${parseFloat(detalleCompleto.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
          <div class="col-span-2"><strong>Agencia:</strong><br>${detalleCompleto.agencia || 'No especificada'}</div>
          <div class="col-span-2"><strong>Descripción:</strong><br>${detalleCompleto.descripcion || 'Sin descripción'}</div>
          ${detalleCompleto.correo_proveedor ? `<div class="col-span-2"><strong>Correo Proveedor:</strong><br>${detalleCompleto.correo_proveedor}</div>` : ''}
        </div>
      </div>
    `;

    // Información específica del tipo de pago
    let datosEspecificos = this.generarSeccionDatosEspecificos(detalleCompleto);

    // Información de auditoría
    let infoAuditoria = `
      <div class="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-4">
        <h5 class="font-medium text-gray-700 mb-2 text-sm">Información de Auditoría</h5>
        <div class="text-xs text-gray-500 space-y-1">
          ${detalleCompleto.fecha_creacion ? `<div><strong>Creado:</strong> ${new Date(detalleCompleto.fecha_creacion).toLocaleString('es-GT')}</div>` : ''}
          ${detalleCompleto.fecha_actualizacion ? `<div><strong>Última actualización:</strong> ${new Date(detalleCompleto.fecha_actualizacion).toLocaleString('es-GT')}</div>` : ''}
          <div><strong>ID del registro:</strong> ${detalleCompleto.id}</div>
          ${detalleCompleto.informacion_adicional?.requiere_validacion ? '<div class="text-blue-600"><strong>Estado:</strong> Requiere validación</div>' : ''}
        </div>
      </div>
    `;

    const html = `
      <div class="text-left max-h-96 overflow-y-auto">
        ${infoBasica}
        
        <div class="mb-4">
          <h4 class="font-semibold text-gray-800 mb-2">Forma de Pago</h4>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${this.obtenerClaseTipoPago(detalleCompleto.forma_pago)}">
            ${tipoPago}
          </span>
          ${detalleCompleto.informacion_adicional?.tipo_detalle ? `<p class="text-sm text-gray-600 mt-1">${detalleCompleto.informacion_adicional.tipo_detalle}</p>` : ''}
        </div>
        
        ${datosEspecificos}
        
        ${infoAuditoria}
      </div>
    `;

    Swal.fire({
      title: `Detalle de Liquidación #${detalleCompleto.id}`,
      html: html,
      width: '700px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      customClass: {
        popup: 'text-left'
      }
    });
  }

  private generarSeccionDatosEspecificos(detalleCompleto: any): string {
    const datosEspecificos = detalleCompleto.datos_especificos;
    const informacionAdicional = detalleCompleto.informacion_adicional;

    if (!datosEspecificos) {
      return `
        <div class="bg-gray-100 border border-gray-300 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-600 mb-2">Información del Pago</h4>
          <p class="text-sm text-gray-500">No hay información específica disponible para este tipo de pago.</p>
          ${detalleCompleto.banco ? `<p class="text-sm mt-2"><strong>Banco:</strong> ${detalleCompleto.banco}</p>` : ''}
          ${detalleCompleto.cuenta ? `<p class="text-sm"><strong>Cuenta:</strong> ${detalleCompleto.cuenta}</p>` : ''}
        </div>
      `;
    }

    switch (detalleCompleto.forma_pago) {
      case 'deposito':
        return `
          <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <rect x="1" y="3" width="22" height="18" rx="2" ry="2"/>
                <line x1="1" y1="9" x2="23" y2="9"/>
              </svg>
              Información del Depósito
            </h4>
            <div class="space-y-2 text-sm">
              <div><strong>ID del Socio:</strong> ${datosEspecificos.id_socio || 'No disponible'}</div>
              <div><strong>Nombre del Socio:</strong> ${datosEspecificos.nombre_socio || 'No disponible'}</div>
              <div><strong>Número de Cuenta:</strong> ${datosEspecificos.numero_cuenta_deposito || 'No disponible'}</div>
              <div><strong>Producto/Tipo de Cuenta:</strong> ${datosEspecificos.producto_cuenta || 'No disponible'}</div>
              ${datosEspecificos.observaciones ? `<div><strong>Observaciones:</strong> ${datosEspecificos.observaciones}</div>` : ''}
            </div>
          </div>
        `;

      case 'transferencia':
        return `
          <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 class="font-semibold text-green-800 mb-3 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <path d="M7 10l5 5 5-5"/>
                <path d="M12 15V3"/>
              </svg>
              Información de la Transferencia
            </h4>
            <div class="space-y-2 text-sm">
              <div><strong>Nombre del Titular:</strong> ${datosEspecificos.nombre_cuenta || 'No disponible'}</div>
              <div><strong>Número de Cuenta:</strong> ${datosEspecificos.numero_cuenta || 'No disponible'}</div>
              <div><strong>Banco:</strong> ${informacionAdicional?.nombre_banco || `ID: ${datosEspecificos.banco}` || 'No disponible'}</div>
              <div><strong>Tipo de Cuenta:</strong> ${informacionAdicional?.nombre_tipo_cuenta || `ID: ${datosEspecificos.tipo_cuenta}` || 'No disponible'}</div>
              ${datosEspecificos.observaciones ? `<div><strong>Observaciones:</strong> ${datosEspecificos.observaciones}</div>` : ''}
            </div>
          </div>
        `;

      case 'cheque':
        return `
          <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <h4 class="font-semibold text-purple-800 mb-3 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Información del Cheque
            </h4>
            <div class="space-y-2 text-sm">
              <div><strong>Nombre del Beneficiario:</strong> ${datosEspecificos.nombre_beneficiario || 'No disponible'}</div>
              <div><strong>Tipo de Consignación:</strong> 
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${informacionAdicional?.es_negociable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }">
                  ${datosEspecificos.consignacion || 'No especificado'}
                </span>
              </div>
              <div><strong>Es No Negociable:</strong> ${datosEspecificos.no_negociable ? 'Sí' : 'No'}</div>
              ${datosEspecificos.observaciones ? `<div><strong>Observaciones:</strong> ${datosEspecificos.observaciones}</div>` : ''}
            </div>
          </div>
        `;

      case 'tarjeta':
        return `
          <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-800 mb-3 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <rect x="1" y="5" width="22" height="14" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pago con Tarjeta de Crédito
            </h4>
            ${datosEspecificos && datosEspecificos.nota ? `
              <div class="text-sm">
                <strong>Nota:</strong> ${datosEspecificos.nota}
              </div>
            ` : '<p class="text-sm text-gray-600">Pago realizado con tarjeta de crédito. Sin notas adicionales.</p>'}
          </div>
        `;

      case 'anticipo':
        return `
          <div class="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <h4 class="font-semibold text-orange-800 mb-3 flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Pago por Anticipo
            </h4>
            ${datosEspecificos && datosEspecificos.nota ? `
              <div class="text-sm">
                <strong>Nota:</strong> ${datosEspecificos.nota}
              </div>
            ` : '<p class="text-sm text-gray-600">Pago realizado mediante anticipo. Sin notas adicionales.</p>'}
          </div>
        `;

      default:
        return `
          <div class="bg-gray-100 border border-gray-300 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-600 mb-2">Información del Pago</h4>
            <p class="text-sm text-gray-500">Tipo de pago: ${informacionAdicional?.forma_pago_texto || detalleCompleto.forma_pago}</p>
          </div>
        `;
    }
  }

  private mostrarDetalleLocal(detalle: any): void {
    // Fallback: mostrar información básica disponible localmente
    const tipoPago = this.obtenerTextoTipoPago(detalle.forma_pago);

    const html = `
      <div class="text-left">
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 class="font-semibold text-gray-800 mb-3">Información Básica</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Orden:</strong> ${detalle.numero_orden || 'No especificado'}</div>
            <div><strong>Monto:</strong> Q${parseFloat(detalle.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
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
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280'
    });
  }

  // Resto de métodos existentes...
  trackById(i: number, r: any) {
    return r?.id ?? i;
  }

  obtenerTextoTipoPago(tipoPago: string): string {
    const tipo = this.tiposPago.find(t => t.id === tipoPago || t.nombre === tipoPago);
    return tipo?.nombre || tipoPago || 'Sin especificar';
  }

  obtenerClaseTipoPago(tipoPago: string): string {
    const colores: { [key: string]: string } = {
      'deposito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'transferencia': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'cheque': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'tarjeta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'anticipo': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };

    const tipo = this.tiposPago.find(t => t.id === tipoPago);
    return colores[tipo?.id || 'default'] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }

  // [Aquí van todos los métodos existentes de edición de monto y agencia que ya teníamos]
  // ... (mantener todos los métodos de edición, validación y servidor que ya funcionan)

  // ============================================
  // MÉTODOS DE EDICIÓN (MANTENER LOS EXISTENTES)
  // ============================================

  iniciarEdicionMonto(index: number) {
    if (!this.habilitarAcciones || this.factura?.estado_id === 2) return;

    const detalle = this.detalles[index];
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

  async guardarMonto(index: number) {
    const detalle = this.detalles[index];
    if (!detalle || !detalle._editandoMonto) return;

    const nuevoMonto = parseFloat(detalle._montoTemp);

    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
      this.servicio.mensajeServidor('error', 'El monto debe ser mayor a 0', 'Error');
      return;
    }

    if (nuevoMonto === detalle.monto) {
      this.cancelarEdicionMonto(index);
      return;
    }

    if (!this.validarMontoTotal(index, nuevoMonto)) {
      return;
    }

    try {
      this.guardandoCambios = true;

      if (detalle.id) {
        const resultado = await this.actualizarMontoEnServidor(detalle.id, nuevoMonto);
        if (!resultado) {
          return;
        }
      }

      detalle.monto = nuevoMonto;
      detalle._editandoMonto = false;
      delete detalle._montoTemp;

      this.actualizarDetalle.emit({ index, campo: 'monto', valor: nuevoMonto });
      this.servicio.mensajeServidor('success', 'Monto actualizado correctamente', 'Éxito');

    } catch (error) {
      this.servicio.mensajeServidor('error', 'Error al actualizar el monto', 'Error');
    } finally {
      this.guardandoCambios = false;
    }
  }

  cancelarEdicionMonto(index: number) {
    const detalle = this.detalles[index];
    if (detalle) {
      detalle._editandoMonto = false;
      delete detalle._montoTemp;
    }
  }

  iniciarEdicionAgencia(index: number) {
    if (!this.habilitarAcciones || this.factura?.estado_id === 2) return;

    const detalle = this.detalles[index];
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

  async guardarAgencia(index: number) {
    const detalle = this.detalles[index];
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

    try {
      this.guardandoCambios = true;

      if (detalle.id) {
        const resultado = await this.actualizarAgenciaEnServidor(detalle.id, nuevaAgencia);
        if (!resultado) {
          return;
        }
      }

      detalle.agencia = nuevaAgencia;
      detalle._editandoAgencia = false;
      delete detalle._agenciaTemp;

      this.actualizarDetalle.emit({ index, campo: 'agencia', valor: nuevaAgencia });
      this.servicio.mensajeServidor('success', 'Agencia actualizada correctamente', 'Éxito');

    } catch (error) {
      this.servicio.mensajeServidor('error', 'Error al actualizar la agencia', 'Error');
    } finally {
      this.guardandoCambios = false;
    }
  }

  cancelarEdicionAgencia(index: number) {
    const detalle = this.detalles[index];
    if (detalle) {
      detalle._editandoAgencia = false;
      delete detalle._agenciaTemp;
    }
  }

  private validarMontoTotal(index: number, nuevoMonto: number): boolean {
    if (!this.factura?.monto_total) return true;

    let totalSinItem = 0;
    this.detalles.forEach((detalle, i) => {
      if (i !== index) {
        totalSinItem += parseFloat(detalle.monto) || 0;
      }
    });

    const nuevoTotal = totalSinItem + nuevoMonto;
    const montoFactura = parseFloat(this.factura.monto_total);

    if (nuevoTotal > montoFactura) {
      const disponible = montoFactura - totalSinItem;
      this.servicio.mensajeServidor(
        'error',
        `El monto excede lo disponible. Máximo disponible: Q${disponible.toFixed(2)}`,
        'Error'
      );
      return false;
    }

    return true;
  }

  private async actualizarMontoEnServidor(detalleId: number, nuevoMonto: number): Promise<boolean> {
    try {
      const response = await this.servicio.query({
        ruta: 'contabilidad/actualizarMontoAgencia',
        tipo: 'post',
        body: {
          id: detalleId,
          monto: nuevoMonto
        }
      }).toPromise();

      if (response?.respuesta === 'success') {
        return true;
      } else {
        const mensaje = response?.mensaje || 'Error al actualizar el monto';
        this.servicio.mensajeServidor('error', mensaje, 'Error');
        return false;
      }
    } catch (error) {
      this.servicio.mensajeServidor('error', 'Error de conexión al actualizar el monto', 'Error');
      return false;
    }
  }

  private async actualizarAgenciaEnServidor(detalleId: number, nuevaAgencia: string): Promise<boolean> {
    try {
      const response = await this.servicio.query({
        ruta: 'contabilidad/actualizarMontoAgencia',
        tipo: 'post',
        body: {
          id: detalleId,
          agencia: nuevaAgencia
        }
      }).toPromise();

      if (response?.respuesta === 'success') {
        return true;
      } else {
        const mensaje = response?.mensaje || 'Error al actualizar la agencia';
        this.servicio.mensajeServidor('error', mensaje, 'Error');
        return false;
      }
    } catch (error) {
      this.servicio.mensajeServidor('error', 'Error de conexión al actualizar la agencia', 'Error');
      return false;
    }
  }

  private cancelarTodasLasEdiciones() {
    this.detalles.forEach(detalle => {
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

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.cancelarTodasLasEdiciones();
    }
  }

  onCambiarFormaPago(i: number, tipo: string) {
    this.cambiarFormaPago.emit({ index: i, tipo });
  }
}