// ============================================================================
// TABLA DETALLE LIQUIDACIÓN - CORREGIDO Y SIMPLIFICADO
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicioGeneralService } from '../../../../servicios/servicio-general.service';

// USAR MODELO UNIFICADO
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
  @Input() tiposPago: TipoPago[] = TIPOS_PAGO_DEFAULT; // ✅ USAR MODELO UNIFICADO
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

  constructor(private servicio: ServicioGeneralService) { }

  // ============================================
  // TRACKBY Y UTILIDADES
  // ============================================

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

    // Buscar por ID del tipo
    const tipo = this.tiposPago.find(t => t.id === tipoPago);
    return colores[tipo?.id || 'default'] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }

  // ============================================
  // EDICIÓN DE MONTO
  // ============================================

  iniciarEdicionMonto(index: number) {
    if (!this.habilitarAcciones || this.factura?.estado_id === 2) return;

    const detalle = this.detalles[index];
    if (!detalle) return;

    // Cancelar otras ediciones activas
    this.cancelarTodasLasEdiciones();

    // Preparar edición
    detalle._editandoMonto = true;
    detalle._montoTemp = detalle.monto;

    // Focus en el siguiente tick
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

    // Validaciones básicas
    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
      this.servicio.mensajeServidor('error', 'El monto debe ser mayor a 0', 'Error');
      return;
    }

    // Si no hay cambios, solo cancelar
    if (nuevoMonto === detalle.monto) {
      this.cancelarEdicionMonto(index);
      return;
    }

    // Validar que no exceda el monto de la factura
    if (!this.validarMontoTotal(index, nuevoMonto)) {
      return;
    }

    try {
      this.guardandoCambios = true;

      // Actualizar en el servidor si el detalle ya existe
      if (detalle.id) {
        const resultado = await this.actualizarMontoEnServidor(detalle.id, nuevoMonto);
        if (!resultado) {
          return; // El error ya se mostró
        }
      }

      // Actualizar localmente
      detalle.monto = nuevoMonto;
      detalle._editandoMonto = false;
      delete detalle._montoTemp;

      // Emitir evento para actualizar totales en el componente padre
      this.actualizarDetalle.emit({ index, campo: 'monto', valor: nuevoMonto });

      this.servicio.mensajeServidor('success', 'Monto actualizado correctamente', 'Éxito');

    } catch (error) {
      console.error('Error al guardar monto:', error);
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

  // ============================================
  // EDICIÓN DE AGENCIA
  // ============================================

  iniciarEdicionAgencia(index: number) {
    if (!this.habilitarAcciones || this.factura?.estado_id === 2) return;

    const detalle = this.detalles[index];
    if (!detalle) return;

    // Cancelar otras ediciones activas
    this.cancelarTodasLasEdiciones();

    // Preparar edición
    detalle._editandoAgencia = true;
    detalle._agenciaTemp = detalle.agencia;

    // Focus en el siguiente tick
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

    // Validaciones básicas
    if (!nuevaAgencia) {
      this.servicio.mensajeServidor('error', 'Debe seleccionar una agencia', 'Error');
      return;
    }

    // Si no hay cambios, solo cancelar
    if (nuevaAgencia === detalle.agencia) {
      this.cancelarEdicionAgencia(index);
      return;
    }

    try {
      this.guardandoCambios = true;

      // Actualizar en el servidor si el detalle ya existe
      if (detalle.id) {
        const resultado = await this.actualizarAgenciaEnServidor(detalle.id, nuevaAgencia);
        if (!resultado) {
          return; // El error ya se mostró
        }
      }

      // Actualizar localmente
      detalle.agencia = nuevaAgencia;
      detalle._editandoAgencia = false;
      delete detalle._agenciaTemp;

      // Emitir evento para actualizar en el componente padre
      this.actualizarDetalle.emit({ index, campo: 'agencia', valor: nuevaAgencia });

      this.servicio.mensajeServidor('success', 'Agencia actualizada correctamente', 'Éxito');

    } catch (error) {
      console.error('Error al guardar agencia:', error);
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

  // ============================================
  // VALIDACIONES
  // ============================================

  private validarMontoTotal(index: number, nuevoMonto: number): boolean {
    if (!this.factura?.monto_total) return true;

    // Calcular el total sin el item actual
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

  // ============================================
  // LLAMADAS AL SERVIDOR
  // ============================================

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
      console.error('Error en actualizarMontoEnServidor:', error);
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
      console.error('Error en actualizarAgenciaEnServidor:', error);
      this.servicio.mensajeServidor('error', 'Error de conexión al actualizar la agencia', 'Error');
      return false;
    }
  }

  // ============================================
  // UTILIDADES GENERALES
  // ============================================

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

  // Manejar teclas globales para cancelar ediciones
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.cancelarTodasLasEdiciones();
    }
  }

  // ============================================
  // EVENTOS EXISTENTES (mantener compatibilidad)
  // ============================================

  onCambiarFormaPago(i: number, tipo: string) {
    this.cambiarFormaPago.emit({ index: i, tipo });
  }
}