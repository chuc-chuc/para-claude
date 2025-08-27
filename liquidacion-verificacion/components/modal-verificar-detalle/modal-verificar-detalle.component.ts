// ============================================================================
// MODAL - VERIFICAR DETALLE DE LIQUIDACIÓN
// ============================================================================

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  DetalleLiquidacionVerificacion,
  EstadoVerificacion,
  VerificarDetallePayload,
  formatearMonto,
  formatearFecha,
  validarNumeroComprobante,
  validarFecha
} from '../../models/liquidacion-verificacion.models';

@Component({
  selector: 'app-modal-verificar-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="visible" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 transition-opacity" (click)="onCancelar()"></div>

      <!-- Modal Container -->
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Icono -->
              <div class="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <svg class="text-green-600 dark:text-green-400" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
              
              <!-- Título e información -->
              <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                  {{ esModoEdicion() ? 'Editar Verificación' : 'Verificar Detalle' }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Orden #{{ detalle?.numero_orden }} - {{ formatearMonto(detalle?.monto || 0) }}
                </p>
              </div>
            </div>

            <!-- Botón cerrar -->
            <button 
              (click)="onCancelar()"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-300 p-2 rounded-lg transition-colors">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          <!-- Información del detalle -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Información del Detalle
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Número de Orden:</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ detalle?.numero_orden }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Agencia:</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ detalle?.agencia }}</p>
              </div>
              <div class="md:col-span-2">
                <span class="text-gray-500 dark:text-gray-400">Descripción:</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ detalle?.descripcion }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Forma de Pago:</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ detalle?.forma_pago | titlecase }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Estado Actual:</span>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2"
                      [ngClass]="obtenerColorEstado(detalle?.estado_verificacion!)">
                  {{ obtenerTextoEstado(detalle?.estado_verificacion!) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Formulario de verificación -->
          <form [formGroup]="formulario" class="space-y-4">
            
            <!-- Comprobante Contabilidad -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Comprobante Contable <span class="text-red-500">*</span>
              </label>
              <input 
                type="text"
                formControlName="comprobante_contabilidad"
                placeholder="Ej: COMP-2024-001234"
                class="w-full text-sm border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
                [class.border-red-300]="campoInvalido('comprobante_contabilidad')"
                [class.dark:border-red-500]="campoInvalido('comprobante_contabilidad')">
              
              <div *ngIf="campoInvalido('comprobante_contabilidad')" class="text-red-500 text-xs mt-1">
                {{ obtenerErrorMensaje('comprobante_contabilidad') }}
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Ingrese el número del comprobante contable registrado en el sistema
              </p>
            </div>

            <!-- Fecha de Registro -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha de Registro en Contabilidad <span class="text-red-500">*</span>
              </label>
              <input 
                type="date"
                formControlName="fecha_registro_contabilidad"
                class="w-full text-sm border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                [class.border-red-300]="campoInvalido('fecha_registro_contabilidad')"
                [class.dark:border-red-500]="campoInvalido('fecha_registro_contabilidad')"
                [max]="fechaMaxima">
              
              <div *ngIf="campoInvalido('fecha_registro_contabilidad')" class="text-red-500 text-xs mt-1">
                {{ obtenerErrorMensaje('fecha_registro_contabilidad') }}
              </div>
            </div>

            <!-- Número de Acta -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Acta (Opcional)
              </label>
              <input 
                type="text"
                formControlName="numero_acta"
                placeholder="Ej: ACTA-2024-056"
                class="w-full text-sm border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400">
              
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                📋 Campo opcional para referenciar actas contables
              </p>
            </div>

            <!-- Estado de Verificación -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado de Verificación <span class="text-red-500">*</span>
              </label>
              
              <div class="grid grid-cols-1 gap-3">
                <!-- Opción Verificado -->
                <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                       [class.border-green-500]="formulario.get('estado_verificacion')?.value === 'verificado'"
                       [class.bg-green-50]="formulario.get('estado_verificacion')?.value === 'verificado'"
                       [class.dark:bg-green-900/20]="formulario.get('estado_verificacion')?.value === 'verificado'">
                  <input 
                    type="radio" 
                    value="verificado" 
                    formControlName="estado_verificacion"
                    class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500">
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">✅ Verificado</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      El detalle ha sido revisado y aprobado contablemente
                    </div>
                  </div>
                </label>

                <!-- Opción Rechazado -->
                <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                       [class.border-red-500]="formulario.get('estado_verificacion')?.value === 'rechazado'"
                       [class.bg-red-50]="formulario.get('estado_verificacion')?.value === 'rechazado'"
                       [class.dark:bg-red-900/20]="formulario.get('estado_verificacion')?.value === 'rechazado'">
                  <input 
                    type="radio" 
                    value="rechazado" 
                    formControlName="estado_verificacion"
                    class="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500">
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">❌ Rechazado</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      El detalle requiere correcciones antes de ser aprobado
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Información adicional si está editando -->
            <div *ngIf="esModoEdicion() && detalle?.fecha_verificacion" 
                 class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
              <h5 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Información de Verificación Anterior
              </h5>
              <div class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Verificado por:</strong> {{ detalle?.verificado_por }}</p>
                <p><strong>Fecha:</strong> {{ formatearFecha(detalle?.fecha_verificacion!) }}</p>
                <p><strong>Estado anterior:</strong> {{ obtenerTextoEstado(detalle?.estado_verificacion!) }}</p>
              </div>
            </div>
          </form>
        </div>

        <!-- Footer con botones -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
          <!-- Botón Cancelar -->
          <button 
            type="button" 
            (click)="onCancelar()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 flex items-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancelar</span>
          </button>

          <!-- Botón Verificar/Actualizar -->
          <button 
            type="button" 
            (click)="onConfirmar()" 
            [disabled]="formulario.invalid || guardando()"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <!-- Spinner de carga -->
            <svg *ngIf="guardando()" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            
            <!-- Icono normal -->
            <svg *ngIf="!guardando()" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            
            <span>{{ guardando() ? 'Guardando...' : (esModoEdicion() ? 'Actualizar' : 'Verificar') }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ModalVerificarDetalleComponent implements OnInit, OnDestroy {
  @Input() detalle: DetalleLiquidacionVerificacion | null = null;
  @Input() visible = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() verificar = new EventEmitter<VerificarDetallePayload>();

  // === ESTADO ===
  readonly guardando = signal<boolean>(false);
  formulario!: FormGroup;

  // === UTILIDADES ===
  readonly formatearMonto = formatearMonto;
  readonly formatearFecha = formatearFecha;

  private readonly destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatosDetalle();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      comprobante_contabilidad: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      fecha_registro_contabilidad: [this.fechaHoy, [
        Validators.required
      ]],
      numero_acta: ['', [
        Validators.maxLength(50)
      ]],
      estado_verificacion: ['verificado', [
        Validators.required
      ]]
    });
  }

  private cargarDatosDetalle(): void {
    if (!this.detalle) return;

    // Si está en modo edición, cargar datos existentes
    if (this.esModoEdicion()) {
      this.formulario.patchValue({
        comprobante_contabilidad: this.detalle.comprobante_contabilidad || '',
        fecha_registro_contabilidad: this.detalle.fecha_registro_contabilidad || this.fechaHoy,
        numero_acta: this.detalle.numero_acta || '',
        estado_verificacion: this.detalle.estado_verificacion || 'verificado'
      });
    }
  }

  // ============================================================================
  // ACCIONES
  // ============================================================================

  onConfirmar(): void {
    if (this.formulario.invalid || !this.detalle) return;

    // Validaciones adicionales
    const datosFormulario = this.formulario.value;

    const validacionComprobante = validarNumeroComprobante(datosFormulario.comprobante_contabilidad);
    if (!validacionComprobante.valido) {
      this.mostrarError(validacionComprobante.mensaje || 'Comprobante inválido');
      return;
    }

    const validacionFecha = validarFecha(datosFormulario.fecha_registro_contabilidad);
    if (!validacionFecha.valido) {
      this.mostrarError(validacionFecha.mensaje || 'Fecha inválida');
      return;
    }

    this.guardando.set(true);

    const payload: VerificarDetallePayload = {
      id: this.detalle.id,
      comprobante_contabilidad: datosFormulario.comprobante_contabilidad.trim(),
      fecha_registro_contabilidad: datosFormulario.fecha_registro_contabilidad,
      numero_acta: datosFormulario.numero_acta?.trim() || undefined,
      estado_verificacion: datosFormulario.estado_verificacion as EstadoVerificacion
    };

    // Simular delay de guardado
    setTimeout(() => {
      this.guardando.set(false);
      this.verificar.emit(payload);
    }, 1000);
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario.get(nombreCampo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerErrorMensaje(nombreCampo: string): string {
    const control = this.formulario.get(nombreCampo);

    if (!control || !control.errors) {
      return '';
    }

    const errores = control.errors;

    if (errores['required']) {
      switch (nombreCampo) {
        case 'comprobante_contabilidad': return 'El número de comprobante es obligatorio';
        case 'fecha_registro_contabilidad': return 'La fecha de registro es obligatoria';
        case 'estado_verificacion': return 'Debe seleccionar un estado';
        default: return 'Este campo es obligatorio';
      }
    }

    if (errores['minlength']) {
      return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    }

    if (errores['maxlength']) {
      return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  private mostrarError(mensaje: string): void {
    // Implementar notificación de error
    console.error('Error de validación:', mensaje);
    alert(mensaje); // Temporal - usar toast/notification en producción
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  esModoEdicion(): boolean {
    return !!(this.detalle?.comprobante_contabilidad || this.detalle?.estado_verificacion === 'verificado');
  }

  obtenerTextoEstado(estado: EstadoVerificacion): string {
    const textos = {
      'pendiente': 'Pendiente',
      'verificado': 'Verificado',
      'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
  }

  obtenerColorEstado(estado: EstadoVerificacion): string {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'verificado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'rechazado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colores[estado] || colores['pendiente'];
  }

  get fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  get fechaMaxima(): string {
    return this.fechaHoy;
  }

  // ============================================================================
  // INFORMACIÓN CONTEXTUAL
  // ============================================================================

  get infoDetalle(): any {
    if (!this.detalle) return null;

    return {
      id: this.detalle.id,
      numero_orden: this.detalle.numero_orden,
      agencia: this.detalle.agencia,
      monto: this.detalle.monto,
      descripcion: this.detalle.descripcion,
      forma_pago: this.detalle.forma_pago,
      estado_actual: this.detalle.estado_verificacion,
      comprobante_actual: this.detalle.comprobante_contabilidad,
      fecha_actual: this.detalle.fecha_registro_contabilidad,
      verificado_por: this.detalle.verificado_por,
      fecha_verificacion: this.detalle.fecha_verificacion
    };
  }

  get resumenCambios(): string[] {
    const cambios: string[] = [];

    if (!this.detalle || this.formulario.invalid) return cambios;

    const valoresFormulario = this.formulario.value;

    if (valoresFormulario.comprobante_contabilidad !== this.detalle.comprobante_contabilidad) {
      cambios.push(`Comprobante: ${valoresFormulario.comprobante_contabilidad}`);
    }

    if (valoresFormulario.fecha_registro_contabilidad !== this.detalle.fecha_registro_contabilidad) {
      cambios.push(`Fecha: ${valoresFormulario.fecha_registro_contabilidad}`);
    }

    if (valoresFormulario.estado_verificacion !== this.detalle.estado_verificacion) {
      cambios.push(`Estado: ${this.obtenerTextoEstado(valoresFormulario.estado_verificacion)}`);
    }

    return cambios;
  }
}