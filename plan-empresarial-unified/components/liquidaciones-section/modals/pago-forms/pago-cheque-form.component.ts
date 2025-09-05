import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DatosFormularioPago, PayloadCheque } from '../../../../models/plan-empresarial.models';

/**
 * Formulario específico para pagos por cheque
 */
@Component({
    selector: 'app-pago-cheque-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="bg-gray-50 rounded-lg p-4">
      <form [formGroup]="formulario" class="space-y-4">
        
        <!-- Información del beneficiario -->
        <div class="bg-green-50 p-4 rounded-md border border-green-100">
          <h3 class="text-sm font-medium text-green-800 mb-3 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Información del beneficiario
          </h3>
          
          <!-- Nombre del Beneficiario -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Beneficiario <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              formControlName="nombre_beneficiario"
              class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              [class.border-red-300]="esInvalido('nombre_beneficiario')"
              placeholder="Ingrese el nombre completo del beneficiario del cheque">
            <div *ngIf="esInvalido('nombre_beneficiario')" class="text-red-500 text-xs mt-1">
              {{ obtenerMensajeError('nombre_beneficiario') }}
            </div>
          </div>

          <!-- Consignación -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <svg class="inline w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Tipo de Consignación <span class="text-red-500">*</span>
            </label>
            <p class="text-xs text-gray-600 mb-3">
              Seleccione si el cheque será negociable (puede ser endosado) o no negociable (solo para el beneficiario)
            </p>
            <div class="flex items-center space-x-6">
              <div class="flex items-center">
                <input
                  type="radio"
                  id="negociable"
                  value="Negociable"
                  formControlName="consignacion"
                  class="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500">
                <label for="negociable" class="ml-2 text-sm text-gray-700 cursor-pointer">
                  Negociable
                </label>
              </div>
              <div class="flex items-center">
                <input
                  type="radio"
                  id="no_negociable"
                  value="No Negociable"
                  formControlName="consignacion"
                  class="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500">
                <label for="no_negociable" class="ml-2 text-sm text-gray-700 cursor-pointer">
                  No Negociable
                </label>
              </div>
            </div>
            <div *ngIf="esInvalido('consignacion')" class="text-red-500 text-xs mt-1">
              {{ obtenerMensajeError('consignacion') }}
            </div>
          </div>
        </div>

        <!-- Observaciones -->
        <div class="bg-yellow-50 p-4 rounded-md border border-yellow-100">
          <h3 class="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Observaciones adicionales
          </h3>
          <div>
            <textarea
              formControlName="observaciones"
              rows="3"
              class="w-full text-sm border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              [class.border-red-300]="esInvalido('observaciones')"
              placeholder="Ingrese cualquier observación o nota adicional sobre este cheque...">
            </textarea>
            <div class="flex justify-between items-center mt-1">
              <div *ngIf="esInvalido('observaciones')" class="text-red-500 text-xs">
                {{ obtenerMensajeError('observaciones') }}
              </div>
              <div class="text-xs text-gray-500">
                {{ obtenerContadorCaracteres() }} / 500 caracteres
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen del cheque -->
        <div *ngIf="formulario.valid" class="bg-gray-100 p-4 rounded-md border">
          <h3 class="text-sm font-medium text-gray-800 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Resumen del cheque
          </h3>
          <div class="space-y-1 text-xs text-gray-600">
            <div class="flex justify-between">
              <span class="font-medium">Beneficiario:</span>
              <span>{{ formulario.get('nombre_beneficiario')?.value }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Tipo:</span>
              <span class="px-2 py-1 rounded text-xs"
                    [ngClass]="obtenerClaseConsignacion()">
                {{ formulario.get('consignacion')?.value }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="cancelar.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="formulario.invalid"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Confirmar pago con cheque
          </button>
        </div>
      </form>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
    
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    input:focus, textarea:focus {
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.1);
    }
    
    button:disabled {
      cursor: not-allowed;
    }
    
    /* Radio buttons personalizados */
    input[type="radio"]:checked {
      background-color: #059669;
      border-color: #059669;
    }
  `]
})
export class PagoChequeFormComponent implements OnInit {

    // ============================================================================
    // DEPENDENCIAS Y INPUTS/OUTPUTS
    // ============================================================================

    private readonly fb = inject(FormBuilder);

    readonly data = input<DatosFormularioPago | null>(null);
    readonly guardar = output<PayloadCheque>();
    readonly cancelar = output<void>();

    // ============================================================================
    // FORMULARIO
    // ============================================================================

    formulario!: FormGroup;

    // ============================================================================
    // LIFECYCLE
    // ============================================================================

    ngOnInit(): void {
        this.inicializarFormulario();
        this.cargarDatosExistentes();
    }

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    private inicializarFormulario(): void {
        this.formulario = this.fb.group({
            nombre_beneficiario: ['', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(100)
            ]],
            consignacion: ['Negociable', [Validators.required]],
            observaciones: ['', [Validators.maxLength(500)]]
        });
    }

    private cargarDatosExistentes(): void {
        const datos = this.data();
        if (!datos) return;

        // Para la consignación, si viene no_negociable=true, ponemos "No Negociable"
        let consignacion = datos.consignacion || 'Negociable';
        if (datos.no_negociable === true) {
            consignacion = 'No Negociable';
        }

        this.formulario.patchValue({
            nombre_beneficiario: datos.nombre_beneficiario || '',
            consignacion: consignacion,
            observaciones: datos.observaciones || ''
        });
    }

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    esInvalido(campo: string): boolean {
        const control = this.formulario.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obtenerMensajeError(campo: string): string {
        const control = this.formulario.get(campo);
        if (!control || !control.errors) return '';

        const errores = control.errors;

        if (errores['required']) {
            const mensajes: { [key: string]: string } = {
                'nombre_beneficiario': 'El nombre del beneficiario es obligatorio',
                'consignacion': 'Debe seleccionar el tipo de consignación'
            };
            return mensajes[campo] || 'Este campo es obligatorio';
        }

        if (errores['minlength']) {
            const requiredLength = errores['minlength'].requiredLength;
            return `Mínimo ${requiredLength} caracteres`;
        }

        if (errores['maxlength']) {
            const requiredLength = errores['maxlength'].requiredLength;
            return `Máximo ${requiredLength} caracteres`;
        }

        return 'Campo inválido';
    }

    obtenerContadorCaracteres(): number {
        return this.formulario.get('observaciones')?.value?.length || 0;
    }

    // ============================================================================
    // UTILIDADES DE UI
    // ============================================================================

    obtenerClaseConsignacion(): string {
        const consignacion = this.formulario.get('consignacion')?.value;
        return consignacion === 'Negociable'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800';
    }

    // ============================================================================
    // ENVÍO
    // ============================================================================

    onSubmit(): void {
        if (this.formulario.invalid) {
            this.marcarTodoComoTocado();
            return;
        }

        const valores = this.formulario.value;
        const payload: PayloadCheque = {
            ...this.data(), // Datos base del formulario principal
            nombre_beneficiario: valores.nombre_beneficiario,
            consignacion: valores.consignacion,
            no_negociable: valores.consignacion === 'No Negociable',
            observaciones: valores.observaciones || undefined
        };

        this.guardar.emit(payload);
    }

    private marcarTodoComoTocado(): void {
        Object.keys(this.formulario.controls).forEach(key => {
            this.formulario.get(key)?.markAsTouched();
        });
    }
}