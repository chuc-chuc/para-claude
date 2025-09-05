import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PlanEmpresarialService } from '../../../services/plan-empresarial.service';
import {
    RegistrarFacturaPayload,
    Moneda,
    MENSAJES
} from '../../../models/plan-empresarial.models';

/**
 * Modal para registrar nueva factura manualmente
 * Estilo minimalista y funcional
 */
@Component({
    selector: 'app-modal-registrar-factura',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Registrar Nueva Factura</h3>
              <p class="text-sm text-gray-500">Complete la información de la factura</p>
            </div>
          </div>
          
          <button 
            (click)="cerrar.emit()" 
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Contenido -->
        <div class="p-4">
          <form [formGroup]="formulario" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <!-- Número DTE y Fecha -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Número DTE <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="numero_dte"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('numero_dte')"
                  placeholder="Ej: 123456789">
                <div *ngIf="esInvalido('numero_dte')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('numero_dte') }}
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión <span class="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  formControlName="fecha_emision"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('fecha_emision')">
                <div *ngIf="esInvalido('fecha_emision')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('fecha_emision') }}
                </div>
              </div>
            </div>

            <!-- Número de Autorización y Tipo DTE -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Número de Autorización <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="numero_autorizacion"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('numero_autorizacion')"
                  placeholder="Ej: 12345678901234567890">
                <div *ngIf="esInvalido('numero_autorizacion')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('numero_autorizacion') }}
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de DTE <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="tipo_dte"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('tipo_dte')">
                  <option value="">Seleccione un tipo</option>
                  <option *ngFor="let tipo of tiposDte" [value]="tipo.codigo">
                    {{ tipo.nombre }}
                  </option>
                </select>
                <div *ngIf="esInvalido('tipo_dte')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('tipo_dte') }}
                </div>
              </div>
            </div>

            <!-- Nombre del Emisor -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Emisor <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                formControlName="nombre_emisor"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                [class.border-red-300]="esInvalido('nombre_emisor')"
                placeholder="Nombre completo del emisor de la factura">
              <div *ngIf="esInvalido('nombre_emisor')" class="mt-1 text-xs text-red-600">
                {{ obtenerMensajeError('nombre_emisor') }}
              </div>
            </div>

            <!-- Moneda y Monto -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Moneda <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="moneda"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  [class.border-red-300]="esInvalido('moneda')">
                  <option *ngFor="let moneda of monedas" [value]="moneda.codigo">
                    {{ moneda.nombre }}
                  </option>
                </select>
                <div *ngIf="esInvalido('moneda')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('moneda') }}
                </div>
              </div>
              
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    {{ obtenerSimboloMoneda() }}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    formControlName="monto_total"
                    class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    [class.border-red-300]="esInvalido('monto_total')"
                    placeholder="0.00">
                </div>
                <div *ngIf="esInvalido('monto_total')" class="mt-1 text-xs text-red-600">
                  {{ obtenerMensajeError('monto_total') }}
                </div>
              </div>
            </div>

            <!-- Información adicional -->
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="ml-3 text-sm">
                  <p class="text-blue-800 font-medium">Información importante</p>
                  <p class="text-blue-700 mt-1">
                    Una vez registrada la factura, podrá proceder con la creación de detalles de liquidación.
                    Asegúrese de que todos los datos sean correctos antes de continuar.
                  </p>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- Footer con acciones -->
        <div class="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            (click)="cerrar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="formulario.invalid || enviando()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2">
            <svg *ngIf="enviando()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            <span>{{ enviando() ? 'Registrando...' : 'Registrar Factura' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
    
    /* Overlay backdrop */
    .fixed.inset-0 {
      backdrop-filter: blur(4px);
    }
    
    /* Modal animation */
    .relative.bg-white {
      animation: modalSlideIn 0.2s ease-out;
    }
    
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    /* Input focus states */
    input:focus,
    select:focus {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    /* Disabled state */
    button:disabled {
      cursor: not-allowed;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-2,
      .grid-cols-3 {
        grid-template-columns: 1fr;
      }
      
      .max-w-2xl {
        max-width: 100%;
        margin: 1rem;
      }
    }
  `]
})
export class ModalRegistrarFacturaComponent implements OnInit {

    // ============================================================================
    // DEPENDENCIAS Y OUTPUTS
    // ============================================================================

    private readonly servicio = inject(PlanEmpresarialService);
    private readonly fb = inject(FormBuilder);

    readonly cerrar = output<void>();
    readonly facturaRegistrada = output<RegistrarFacturaPayload>();

    // ============================================================================
    // ESTADO
    // ============================================================================

    readonly enviando = signal(false);

    formulario!: FormGroup;

    // ============================================================================
    // CATÁLOGOS
    // ============================================================================

    readonly tiposDte = [
        { codigo: 'FACT', nombre: 'Factura' },
        { codigo: 'FCAM', nombre: 'Factura Cambiaria' },
        { codigo: 'FPEQ', nombre: 'Factura Pequeño Contribuyente' },
        { codigo: 'FCAP', nombre: 'Factura Contribuyente Agropecuario' },
        { codigo: 'FESP', nombre: 'Factura Especial' }
    ];

    readonly monedas = [
        { codigo: 'GTQ' as Moneda, nombre: 'Quetzales (GTQ)' },
        { codigo: 'USD' as Moneda, nombre: 'Dólares (USD)' }
    ];

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormulario();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.formulario = this.fb.group({
            numero_dte: ['', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(25),
                Validators.pattern(/^[A-Za-z0-9\-]+$/)
            ]],
            fecha_emision: [this.obtenerFechaHoy(), [
                Validators.required
            ]],
            numero_autorizacion: ['', [
                Validators.required,
                Validators.minLength(10),
                Validators.maxLength(50),
                Validators.pattern(/^[A-Za-z0-9\-]+$/)
            ]],
            tipo_dte: ['', [
                Validators.required
            ]],
            nombre_emisor: ['', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(200)
            ]],
            moneda: ['GTQ', [
                Validators.required
            ]],
            monto_total: [null, [
                Validators.required,
                Validators.min(0.01),
                Validators.max(999999999.99)
            ]]
        });
    }

    // ============================================================================
    // ENVÍO DEL FORMULARIO
    // ============================================================================

    onSubmit(): void {
        if (this.formulario.invalid) {
            this.marcarTodoComoTocado();
            return;
        }

        this.enviando.set(true);

        const valores = this.formulario.value;
        const payload: RegistrarFacturaPayload = {
            numero_dte: valores.numero_dte.trim().toUpperCase(),
            fecha_emision: valores.fecha_emision,
            numero_autorizacion: valores.numero_autorizacion.trim().toUpperCase(),
            tipo_dte: valores.tipo_dte,
            nombre_emisor: valores.nombre_emisor.trim().toUpperCase(),
            monto_total: parseFloat(valores.monto_total),
            moneda: valores.moneda
        };

        // Usar el servicio para registrar
        this.servicio.registrarFactura(payload).subscribe({
            next: (exito) => {
                this.enviando.set(false);
                if (exito) {
                    this.facturaRegistrada.emit(payload);
                }
            },
            error: () => {
                this.enviando.set(false);
            }
        });
    }

    // ============================================================================
    // VALIDACIÓN Y ERRORES
    // ============================================================================

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) return 'Este campo es obligatorio';
        if (errores['minlength']) return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
        if (errores['maxlength']) return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
        if (errores['pattern']) return 'Formato inválido (solo letras, números y guiones)';
        if (errores['min']) return `El valor mínimo es ${errores['min'].min}`;
        if (errores['max']) return `El valor máximo es ${errores['max'].max}`;

        return 'Campo inválido';
    }

    private marcarTodoComoTocado(): void {
        Object.keys(this.formulario.controls).forEach(key => {
            this.formulario.get(key)?.markAsTouched();
        });
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    private obtenerFechaHoy(): string {
        return new Date().toISOString().split('T')[0];
    }

    obtenerSimboloMoneda(): string {
        const moneda = this.formulario.get('moneda')?.value;
        return moneda === 'USD' ? '$' : 'Q';
    }
}